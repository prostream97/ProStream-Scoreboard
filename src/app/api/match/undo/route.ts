import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { deliveries, innings, matchState } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { deliveryId, matchId } = await req.json()

  if (!deliveryId || !matchId) {
    return NextResponse.json({ error: 'Missing deliveryId or matchId' }, { status: 400 })
  }

  try {
    // Fetch the delivery to reverse its effect
    const delivery = await db.query.deliveries.findFirst({
      where: eq(deliveries.id, deliveryId),
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Verify this delivery belongs to the given match (prevent cross-match undo)
    const inningsRow = await db.query.innings.findFirst({
      where: eq(innings.id, delivery.inningsId),
    })

    if (!inningsRow || inningsRow.matchId !== matchId) {
      return NextResponse.json({ error: 'Delivery does not belong to this match' }, { status: 403 })
    }

    await db.transaction(async (tx) => {
      // Reverse innings totals
      const reversedRuns = inningsRow.totalRuns - delivery.runs - delivery.extraRuns
      const reversedWickets = inningsRow.wickets - (delivery.isWicket ? 1 : 0)
      // If undoing a legal ball and it was the first ball of the over (balls=0), borrow from overs
      const reversedBalls = delivery.isLegal ? inningsRow.balls - 1 : inningsRow.balls
      const adjustedBalls = reversedBalls < 0 ? 5 : reversedBalls
      const adjustedOvers = reversedBalls < 0 ? inningsRow.overs - 1 : inningsRow.overs

      await tx
        .update(innings)
        .set({
          totalRuns: Math.max(0, reversedRuns),
          wickets: Math.max(0, reversedWickets),
          overs: Math.max(0, adjustedOvers),
          balls: adjustedBalls,
        })
        .where(eq(innings.id, delivery.inningsId))

      // Reset match_state timestamp
      await tx
        .update(matchState)
        .set({ lastUpdated: new Date() })
        .where(eq(matchState.matchId, matchId))

      // Delete the delivery
      await tx.delete(deliveries).where(eq(deliveries.id, deliveryId))
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Undo error:', err)
    return NextResponse.json({ error: 'Undo failed' }, { status: 500 })
  }
}
