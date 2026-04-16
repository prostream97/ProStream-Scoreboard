import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { deliveries, matchState, innings, matches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { DeliveryRecord } from '@/types/match'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    matchId,
    inningsId,
    deliveries: deliveryBuffer,
    overNumber,
    strikerId,
    nonStrikerId,
    currentBowlerId,
    currentOver,
    currentBalls,
    currentOverBuffer,
    isOverComplete,
  } = await req.json() as {
    matchId: number
    inningsId: number
    deliveries: DeliveryRecord[]
    overNumber: number
    strikerId?: number | null
    nonStrikerId?: number | null
    currentBowlerId?: number | null
    currentOver?: number
    currentBalls?: number
    currentOverBuffer?: DeliveryRecord[]
    isOverComplete?: boolean
  }

  if (!matchId || !inningsId || !deliveryBuffer?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Compute innings totals from buffer
    const totalRuns = deliveryBuffer.reduce((s, d) => s + d.runs + d.extraRuns, 0)
    const totalWickets = deliveryBuffer.filter((d) => d.isWicket).length
    const legalBalls = deliveryBuffer.filter((d) => d.isLegal).length

    const matchRow = await db.query.matches.findFirst({ where: eq(matches.id, matchId) })
    const bpo = matchRow?.ballsPerOver ?? 6

    const inserted = await db
      .insert(deliveries)
      .values(
        deliveryBuffer.map((d) => ({
          inningsId,
          overNumber: d.overNumber,
          ballNumber: d.ballNumber,
          batsmanId: d.batsmanId,
          bowlerId: d.bowlerId,
          runs: d.runs,
          extraRuns: d.extraRuns,
          isBoundary: d.isBoundary ?? false,
          isLegal: d.isLegal,
          extraType: d.extraType,
          isWicket: d.isWicket,
          dismissalType: d.dismissalType,
          dismissedBatterId: d.dismissedBatterId ?? null,
          fielder1Id: d.fielder1Id,
          fielder2Id: d.fielder2Id,
          timestamp: new Date(d.timestamp),
        }))
      )
      .returning({ id: deliveries.id })

    const currentInnings = await db.query.innings.findFirst({ where: eq(innings.id, inningsId) })

    if (currentInnings) {
      const computedOvers = currentInnings.overs + Math.floor((currentInnings.balls + legalBalls) / bpo)
      const computedBalls = (currentInnings.balls + legalBalls) % bpo
      const authoritativeOvers = typeof currentOver === 'number' ? currentOver : computedOvers
      const authoritativeBalls = typeof currentBalls === 'number' ? currentBalls : computedBalls
      const authoritativeBuffer = isOverComplete
        ? []
        : (currentOverBuffer ?? deliveryBuffer)

      await db
        .update(matchState)
        .set({
          currentOver: authoritativeOvers,
          currentBalls: authoritativeBalls,
          currentOverBuffer: authoritativeBuffer,
          lastUpdated: new Date(),
          ...(strikerId !== undefined && { strikerId }),
          ...(nonStrikerId !== undefined && { nonStrikerId }),
          ...(currentBowlerId !== undefined && { currentBowlerId }),
        })
        .where(eq(matchState.matchId, matchId))

      await db
        .update(innings)
        .set({
          totalRuns: currentInnings.totalRuns + totalRuns,
          wickets: currentInnings.wickets + totalWickets,
          overs: authoritativeOvers,
          balls: authoritativeBalls,
        })
        .where(eq(innings.id, inningsId))
    } else {
      await db
        .update(matchState)
        .set({
          currentOver: typeof currentOver === 'number' ? currentOver : overNumber,
          currentBalls: typeof currentBalls === 'number' ? currentBalls : legalBalls,
          currentOverBuffer: isOverComplete ? [] : (currentOverBuffer ?? deliveryBuffer),
          lastUpdated: new Date(),
          ...(strikerId !== undefined && { strikerId }),
          ...(nonStrikerId !== undefined && { nonStrikerId }),
          ...(currentBowlerId !== undefined && { currentBowlerId }),
        })
        .where(eq(matchState.matchId, matchId))
    }

    return NextResponse.json({ ok: true, deliveryIds: inserted.map((r) => r.id) })
  } catch (err) {
    console.error('Persist error:', err)
    return NextResponse.json({ error: 'Failed to persist deliveries' }, { status: 500 })
  }
}
