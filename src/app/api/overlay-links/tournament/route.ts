import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { eq, and, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { getTournamentPermissionContext } from '@/lib/auth/access'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { overlayLinks, tournaments, pricingConfig, wallets, walletTransactions } from '@/lib/db/schema'

export const runtime = 'nodejs'

// POST /api/overlay-links/tournament
// Creates a tournament-level overlay link (matchId null) for a tournament the user can edit.
// For tournament plan operators: deducts overlay_per_tournament on the FIRST overlay only.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { tournamentId, mode = 'standard' } = body

  if (!tournamentId || isNaN(parseInt(tournamentId, 10))) {
    return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 })
  }

  const tournamentIdNum = parseInt(tournamentId, 10)
  const isAdmin = isAdminSession(session)
  const userId = parseInt(session.user.id, 10)

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentIdNum),
    columns: { id: true, name: true, planType: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const permissionContext = await getTournamentPermissionContext(session, tournamentIdNum)
  if (!permissionContext?.canEditTournament) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Tournament plan: deduct on first overlay only ──────────────────────────
  if (!isAdmin && tournament.planType === 'tournament') {
    const existingAny = await db.query.overlayLinks.findFirst({
      where: and(eq(overlayLinks.tournamentId, tournamentIdNum), isNull(overlayLinks.matchId)),
    })

    if (!existingAny) {
      const priceRow = await db.query.pricingConfig.findFirst({ where: eq(pricingConfig.key, 'overlay_per_tournament') })
      const price = priceRow?.value ?? 500

      let wallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) })
      if (!wallet) {
        const [created] = await db.insert(wallets).values({ userId, balance: 0 }).returning()
        wallet = created
      }
      if (wallet.balance < price) {
        return NextResponse.json(
          { error: `Insufficient credits. Required: ${price} LKR, available: ${wallet.balance} LKR` },
          { status: 402 },
        )
      }

      const newBalance = wallet.balance - price
      const token = randomBytes(32).toString('hex')

      return await db.transaction(async (tx) => {
        const [link] = await tx
          .insert(overlayLinks)
          .values({ matchId: null, tournamentId: tournamentIdNum, userId, token, mode, label: `${tournament.name} — ${mode}` })
          .returning()

        await tx.update(wallets).set({ balance: newBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id))
        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          type: 'deduction',
          amount: -price,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          description: `Tournament overlay for "${tournament.name}"`,
          referenceId: link.id,
          createdBy: userId,
        })

        return NextResponse.json({ link }, { status: 201 })
      })
    }
    // Subsequent overlays for tournament plan — already paid, fall through to free creation
  }

  // Check if an active link already exists for this tournament + mode
  const existing = await db.query.overlayLinks.findFirst({
    where: and(
      eq(overlayLinks.tournamentId, tournamentIdNum),
      isNull(overlayLinks.matchId),
      eq(overlayLinks.isActive, true),
      eq(overlayLinks.mode, mode),
    ),
  })
  if (existing) {
    return NextResponse.json({ error: 'An active overlay link already exists for this theme' }, { status: 409 })
  }

  const token = randomBytes(32).toString('hex')

  const [link] = await db
    .insert(overlayLinks)
    .values({
      matchId: null,
      tournamentId: tournamentIdNum,
      userId,
      token,
      mode,
      label: `${tournament.name} — ${mode}`,
    })
    .returning()

  return NextResponse.json({ link }, { status: 201 })
}
