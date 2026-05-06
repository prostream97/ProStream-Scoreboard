import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { tournaments, tournamentAccess, overlayLinks, pricingConfig, wallets, walletTransactions } from '@/lib/db/schema'
import { getTournamentList, getAccessibleTournaments } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    if (isAdminSession(session)) {
      const rows = await getTournamentList()
      return NextResponse.json(rows)
    }
    const userId = parseInt(session.user.id, 10)
    const rows = await getAccessibleTournaments(userId)
    return NextResponse.json(rows)
  } catch (err) {
    console.error('Tournaments fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = isAdminSession(session)
  const userId = parseInt(session.user.id, 10)
  const body = await req.json()
  const { name, shortName, format = 'T20', totalOvers = 20, ballsPerOver = 6, logoCloudinaryId } = body

  if (!name?.trim() || !shortName?.trim()) {
    return NextResponse.json({ error: 'name and shortName are required' }, { status: 400 })
  }

  // ── Plan validation (operators only) ──────────────────────────────────────
  const planType: 'tournament' | 'match' | 'daily' = body.planType ?? 'tournament'
  if (!['tournament', 'match', 'daily'].includes(planType)) {
    return NextResponse.json({ error: 'Invalid planType' }, { status: 400 })
  }

  let matchLimit: number | null = null
  let planDay: string | null = null
  let matchDaysFrom: string | null = body.match_days_from ?? null
  let matchDaysTo: string | null = body.match_days_to ?? null

  if (!isAdmin) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (planType === 'daily') {
      if (!body.plan_day) {
        return NextResponse.json({ error: 'plan_day is required for daily plan' }, { status: 400 })
      }
      const day = new Date(body.plan_day + 'T00:00:00')
      if (isNaN(day.getTime())) {
        return NextResponse.json({ error: 'Invalid plan_day format' }, { status: 400 })
      }
      if (day < today) {
        return NextResponse.json({ error: 'plan_day cannot be in the past' }, { status: 400 })
      }
      planDay = body.plan_day
      matchDaysFrom = body.plan_day
      matchDaysTo = body.plan_day

    } else if (planType === 'match') {
      const limit = parseInt(body.matchLimit, 10)
      if (isNaN(limit) || limit < 1 || limit > 99) {
        return NextResponse.json({ error: 'matchLimit must be between 1 and 99' }, { status: 400 })
      }
      matchLimit = limit

      if (!body.match_days_from || !body.match_days_to) {
        return NextResponse.json({ error: 'match_days_from and match_days_to are required for match plan' }, { status: 400 })
      }
      const from = new Date(body.match_days_from + 'T00:00:00')
      const to = new Date(body.match_days_to + 'T00:00:00')
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      if (from < today) {
        return NextResponse.json({ error: 'match_days_from cannot be in the past' }, { status: 400 })
      }
      if (to < from) {
        return NextResponse.json({ error: 'match_days_to must be on or after match_days_from' }, { status: 400 })
      }

    } else {
      // tournament plan
      if (!body.match_days_from || !body.match_days_to) {
        return NextResponse.json({ error: 'match_days_from and match_days_to are required' }, { status: 400 })
      }
      const from = new Date(body.match_days_from + 'T00:00:00')
      const to = new Date(body.match_days_to + 'T00:00:00')
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      if (from < today) {
        return NextResponse.json({ error: 'match_days_from cannot be in the past' }, { status: 400 })
      }
      if (to < from) {
        return NextResponse.json({ error: 'match_days_to must be on or after match_days_from' }, { status: 400 })
      }
    }

    if (planType !== 'tournament') {
      // ── Wallet deduction for match / daily plans ────────────────────────────
      const priceKey = planType === 'daily' ? 'overlay_per_day' : 'overlay_per_match'
      const priceDefaults: Record<string, number> = { overlay_per_match: 100, overlay_per_day: 200 }

      const priceRow = await db.query.pricingConfig.findFirst({ where: eq(pricingConfig.key, priceKey) })
      const unitPrice = priceRow?.value ?? priceDefaults[priceKey]
      const totalCost = planType === 'match' ? unitPrice * matchLimit! : unitPrice

      const wallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) })
      const balance = wallet?.balance ?? 0
      if (balance < totalCost) {
        return NextResponse.json({ error: `Insufficient credits. Required: ${totalCost} LKR, available: ${balance} LKR` }, { status: 402 })
      }

      try {
        return await db.transaction(async (tx) => {
          const [tournament] = await tx
            .insert(tournaments)
            .values({
              name: name.trim(),
              shortName: shortName.trim(),
              format,
              totalOvers,
              ballsPerOver,
              logoCloudinaryId: logoCloudinaryId || null,
              status: 'upcoming',
              createdBy: userId,
              matchDaysFrom,
              matchDaysTo,
              planType,
              matchLimit,
              planDay,
            })
            .returning()

          await tx
            .insert(tournamentAccess)
            .values({ userId, tournamentId: tournament.id, grantedBy: null })
            .onConflictDoNothing()

          const token = randomBytes(32).toString('hex')
          const [link] = await tx
            .insert(overlayLinks)
            .values({ tournamentId: tournament.id, matchId: null, userId, token, mode: 'standard' })
            .returning()

          const newBalance = balance - totalCost
          await tx.update(wallets).set({ balance: newBalance, updatedAt: new Date() }).where(eq(wallets.userId, userId))

          if (wallet) {
            await tx.insert(walletTransactions).values({
              walletId: wallet.id,
              type: 'deduction',
              amount: -totalCost,
              balanceBefore: balance,
              balanceAfter: newBalance,
              description: `${planType} plan for tournament "${tournament.name}"`,
              referenceId: link.id,
              createdBy: userId,
            })
          }

          return NextResponse.json({ ...tournament, overlayToken: token }, { status: 201 })
        })
      } catch (err) {
        console.error('Tournament create error:', err)
        return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
      }
    }

    // ── Tournament plan: free creation, deduction deferred to overlay generation ──
    try {
      return await db.transaction(async (tx) => {
        const [tournament] = await tx
          .insert(tournaments)
          .values({
            name: name.trim(),
            shortName: shortName.trim(),
            format,
            totalOvers,
            ballsPerOver,
            logoCloudinaryId: logoCloudinaryId || null,
            status: 'upcoming',
            createdBy: userId,
            matchDaysFrom,
            matchDaysTo,
            planType,
            matchLimit,
            planDay,
          })
          .returning()

        await tx
          .insert(tournamentAccess)
          .values({ userId, tournamentId: tournament.id, grantedBy: null })
          .onConflictDoNothing()

        return NextResponse.json({ ...tournament }, { status: 201 })
      })
    } catch (err) {
      console.error('Tournament create error:', err)
      return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
    }
  }

  // ── Admin path — no wallet deduction, optional overlay token ──────────────
  try {
    const [tournament] = await db
      .insert(tournaments)
      .values({
        name: name.trim(),
        shortName: shortName.trim(),
        format,
        totalOvers,
        ballsPerOver,
        logoCloudinaryId: logoCloudinaryId || null,
        status: 'upcoming',
        createdBy: userId,
        matchDaysFrom,
        matchDaysTo,
        planType,
        matchLimit,
        planDay,
      })
      .returning()

    await db
      .insert(tournamentAccess)
      .values({ userId, tournamentId: tournament.id, grantedBy: null })
      .onConflictDoNothing()

    // Also generate a tournament overlay token for admins (free)
    const token = randomBytes(32).toString('hex')
    await db.insert(overlayLinks).values({ tournamentId: tournament.id, matchId: null, userId, token, mode: 'standard' })

    return NextResponse.json({ ...tournament, overlayToken: token }, { status: 201 })
  } catch (err) {
    console.error('Tournament create error:', err)
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
  }
}
