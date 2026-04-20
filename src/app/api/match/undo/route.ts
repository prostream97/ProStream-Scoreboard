import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { deliveries, innings, matchState, matches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { DeliveryBuffer } from '@/lib/db/schema'

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

  const deliveryIdNum = parseInt(deliveryId, 10)
  const matchIdNum = parseInt(matchId, 10)
  if (isNaN(deliveryIdNum) || isNaN(matchIdNum)) {
    return NextResponse.json({ error: 'deliveryId and matchId must be integers' }, { status: 400 })
  }

  try {
    const delivery = await db.query.deliveries.findFirst({
      where: eq(deliveries.id, deliveryIdNum),
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    const inningsRow = await db.query.innings.findFirst({
      where: eq(innings.id, delivery.inningsId),
    })

    if (!inningsRow || inningsRow.matchId !== matchIdNum) {
      return NextResponse.json({ error: 'Delivery does not belong to this match' }, { status: 403 })
    }

    const matchRow = await db.query.matches.findFirst({
      where: eq(matches.id, matchIdNum),
    })
    const ballsPerOver = matchRow?.ballsPerOver ?? 6

    await db.delete(deliveries).where(eq(deliveries.id, deliveryIdNum))

    // Recompute counters from deliveries table — source of truth, can't drift.
    const remaining = await db.query.deliveries.findMany({
      where: eq(deliveries.inningsId, delivery.inningsId),
    })

    const legalTotal = remaining.filter((d) => d.isLegal).length
    const computedOvers = Math.floor(legalTotal / ballsPerOver)
    const computedBalls = legalTotal % ballsPerOver
    const computedRuns = remaining.reduce((s, d) => s + d.runs + d.extraRuns, 0)
    const computedWickets = remaining.filter((d) => d.isWicket).length

    await db
      .update(innings)
      .set({
        totalRuns: computedRuns,
        wickets: computedWickets,
        overs: computedOvers,
        balls: computedBalls,
      })
      .where(eq(innings.id, delivery.inningsId))

    // Rebuild current-over buffer from surviving deliveries in the current over.
    const currentOverRows = remaining
      .filter((d) => d.overNumber === computedOvers)
      .sort((a, b) => a.id - b.id)

    const rebuiltBuffer: DeliveryBuffer[] = currentOverRows.map((d) => ({
      overNumber: d.overNumber,
      ballNumber: d.ballNumber,
      batsmanId: d.batsmanId,
      bowlerId: d.bowlerId,
      runs: d.runs,
      extraRuns: d.extraRuns,
      isLegal: d.isLegal,
      isBoundary: d.isBoundary,
      extraType: d.extraType as DeliveryBuffer['extraType'],
      isWicket: d.isWicket,
      dismissalType: d.dismissalType,
      dismissedBatterId: d.dismissedBatterId,
      fielder1Id: d.fielder1Id,
      fielder2Id: d.fielder2Id,
      timestamp: d.timestamp.toISOString(),
    }))

    // Only touch match_state if this innings is the currently active one for the match.
    const stateRow = await db.query.matchState.findFirst({
      where: eq(matchState.matchId, matchIdNum),
    })
    if (stateRow && stateRow.currentInnings === inningsRow.inningsNumber) {
      // If we just undid a wicket, the incoming batter is still parked in
      // match_state. delivery.batsmanId was on strike when the wicket fell;
      // dismissedBatterId is who got out. Put the dismissed batter back in the
      // slot the incoming currently occupies.
      let restoredStrikerId = stateRow.strikerId
      let restoredNonStrikerId = stateRow.nonStrikerId

      // Reverse any strike rotations the client applied when the ball was recorded:
      //   1. Ball-level rotation for odd running runs (non-wicket deliveries).
      //   2. End-of-over rotation when the ball was the last legal ball of the over.
      // XOR of the two determines whether the pair is currently swapped vs. pre-ball.
      const deletedEndedOver = delivery.isLegal && legalTotal % ballsPerOver === ballsPerOver - 1
      const runsCrossed = (() => {
        if (delivery.isWicket) return 0 // wicket pair handled separately below
        if (delivery.extraType === 'wide') return Math.max(0, delivery.extraRuns - 1)
        if (delivery.extraType === 'bye' || delivery.extraType === 'legbye') return delivery.extraRuns
        return delivery.runs // normal + noball: only bat runs cross
      })()
      const ballRotated = runsCrossed % 2 === 1
      if (ballRotated !== deletedEndedOver) {
        const tmp = restoredStrikerId
        restoredStrikerId = restoredNonStrikerId
        restoredNonStrikerId = tmp
      }

      if (delivery.isWicket) {
        const dismissedId = delivery.dismissedBatterId ?? delivery.batsmanId
        const batsmanId = delivery.batsmanId
        if (batsmanId !== dismissedId) {
          // Runout of non-striker: striker is still batsmanId, non-striker slot is the incoming.
          if (restoredStrikerId === batsmanId) {
            restoredNonStrikerId = dismissedId
          } else if (restoredNonStrikerId === batsmanId) {
            restoredStrikerId = dismissedId
          }
        } else {
          // Striker was dismissed. The incoming sits in the slot that has faced no
          // deliveries this innings; the survivor holds the other slot.
          const faced = new Set(remaining.map((d) => d.batsmanId))
          const strikerFaced = restoredStrikerId != null && faced.has(restoredStrikerId)
          const nonStrikerFaced = restoredNonStrikerId != null && faced.has(restoredNonStrikerId)
          if (strikerFaced && !nonStrikerFaced) {
            restoredNonStrikerId = dismissedId
          } else if (!strikerFaced && nonStrikerFaced) {
            restoredStrikerId = dismissedId
          } else {
            // First-ball wicket (neither has faced) — default to restoring striker.
            restoredStrikerId = dismissedId
          }
        }
      }

      await db
        .update(matchState)
        .set({
          currentOver: computedOvers,
          currentBalls: computedBalls,
          currentOverBuffer: rebuiltBuffer,
          strikerId: restoredStrikerId,
          nonStrikerId: restoredNonStrikerId,
          lastUpdated: new Date(),
        })
        .where(eq(matchState.matchId, matchIdNum))
    }

    return NextResponse.json({
      ok: true,
      rebuiltBuffer,
      currentOver: computedOvers,
      currentBalls: computedBalls,
    })
  } catch (err) {
    console.error('Undo error:', err)
    return NextResponse.json({ error: 'Undo failed' }, { status: 500 })
  }
}
