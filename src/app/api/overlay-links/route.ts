import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { overlayLinks, matches, tournaments, wallets, walletTransactions, pricingConfig } from '@/lib/db/schema'

export const runtime = 'nodejs'

// GET /api/overlay-links?matchId=N
// Admin: all links (optionally filtered). Operator: own links only.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const matchIdParam = req.nextUrl.searchParams.get('matchId')
  const matchId = matchIdParam ? parseInt(matchIdParam, 10) : null

  const isAdmin = isAdminSession(session)

  const rows = await db.query.overlayLinks.findMany({
    where: (t, { and: $and, eq: $eq }) => {
      const conditions = []
      if (!isAdmin) conditions.push($eq(t.userId, userId))
      if (matchId && !isNaN(matchId)) conditions.push($eq(t.matchId, matchId))
      return conditions.length ? $and(...conditions as [ReturnType<typeof $eq>]) : undefined
    },
    with: {
      match: {
        with: {
          homeTeam: true,
          awayTeam: true,
        },
      },
      user: { columns: { id: true, username: true, displayName: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  return NextResponse.json(rows)
}

// POST /api/overlay-links
// body: { matchId, mode, label? }
// Admin: free. Operator: deducts wallet balance.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const isAdmin = isAdminSession(session)

  const body = await req.json()
  const { matchId, mode = 'standard', label } = body

  if (!matchId || isNaN(parseInt(matchId, 10))) {
    return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
  }

  const VALID_MODES = ['bug', 'card', 'partnership', 'boundary', 'standard', 'icc2023'] as const
  if (mode && !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: 'Invalid overlay mode' }, { status: 400 })
  }

  const matchIdNum = parseInt(matchId, 10)

  // Verify match exists
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchIdNum),
    with: { homeTeam: true, awayTeam: true },
  })
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Non-admins: enforce match days window if set on the tournament
  if (!isAdmin && match.tournamentId) {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, match.tournamentId),
      columns: { matchDaysFrom: true, matchDaysTo: true },
    })
    if (tournament?.matchDaysFrom && tournament?.matchDaysTo) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const from = new Date(tournament.matchDaysFrom + 'T00:00:00')
      const to = new Date(tournament.matchDaysTo + 'T00:00:00')
      to.setHours(23, 59, 59, 999)
      if (today < from || today > to) {
        return NextResponse.json(
          { error: 'Overlay creation is only allowed during the tournament match days window' },
          { status: 403 },
        )
      }
    }
  }

  const token = randomBytes(32).toString('hex')

  if (isAdmin) {
    try {
      const [link] = await db
        .insert(overlayLinks)
        .values({ matchId: matchIdNum, userId, token, mode, label: label || null })
        .returning()
      return NextResponse.json({ link, newBalance: null }, { status: 201 })
    } catch (error) {
      console.error('Overlay link create error (admin):', error)
      return NextResponse.json({ error: 'Failed to generate overlay URL' }, { status: 500 })
    }
  }

  // Operator: check and deduct wallet
  const priceRow = await db.query.pricingConfig.findFirst({
    where: eq(pricingConfig.key, 'overlay_per_match'),
  })
  const price = priceRow?.value ?? 100

  // Get or create wallet
  let wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, userId),
  })
  if (!wallet) {
    const [created] = await db
      .insert(wallets)
      .values({ userId, balance: 0 })
      .returning()
    wallet = created
  }

  if (wallet.balance < price) {
    return NextResponse.json(
      { error: 'Insufficient credits', balance: wallet.balance, required: price },
      { status: 402 },
    )
  }

  try {
    let link: typeof overlayLinks.$inferSelect
    const newBalance = wallet.balance - price

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(overlayLinks)
        .values({ matchId: matchIdNum, userId, token, mode, label: label || null })
        .returning()
      link = created

      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'deduction',
        amount: -price,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        description: `Overlay: ${match.homeTeam.shortCode} vs ${match.awayTeam.shortCode} (${mode})`,
        referenceId: created.id,
        createdBy: userId,
      })
      await tx.update(wallets).set({ balance: newBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id))
    })

    return NextResponse.json({ link: link!, newBalance }, { status: 201 })
  } catch (error) {
    console.error('Overlay link create error:', error)
    return NextResponse.json({ error: 'Failed to generate overlay URL' }, { status: 500 })
  }
}
