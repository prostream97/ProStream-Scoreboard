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

  const { matchId, inningsId, deliveries: deliveryBuffer, overNumber, strikerId, nonStrikerId, currentBowlerId } = await req.json() as {
    matchId: number
    inningsId: number
    deliveries: DeliveryRecord[]
    overNumber: number
    strikerId?: number | null
    nonStrikerId?: number | null
    currentBowlerId?: number | null
  }

  if (!matchId || !inningsId || !deliveryBuffer?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Compute innings totals from buffer
    const totalRuns = deliveryBuffer.reduce((s, d) => s + d.runs + d.extraRuns, 0)
    const totalWickets = deliveryBuffer.filter((d) => d.isWicket).length
    const legalBalls = deliveryBuffer.filter((d) => d.isLegal).length

    const inserted = await db.transaction(async (tx) => {
      // Fetch match to get ballsPerOver
      const matchRow = await tx.query.matches.findFirst({ where: eq(matches.id, matchId) })
      const bpo = matchRow?.ballsPerOver ?? 6

      // Batch insert all deliveries
      const rows = await tx
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
            isLegal: d.isLegal,
            extraType: d.extraType,
            isWicket: d.isWicket,
            dismissalType: d.dismissalType,
            fielder1Id: d.fielder1Id,
            fielder2Id: d.fielder2Id,
            timestamp: new Date(d.timestamp),
          }))
        )
        .returning({ id: deliveries.id })

      // Update match_state — clear the over buffer, advance over count, persist player IDs
      // Update innings running totals
      const currentInnings = await tx.query.innings.findFirst({
        where: eq(innings.id, inningsId),
      })

      if (currentInnings) {
        const newOvers = currentInnings.overs + Math.floor((currentInnings.balls + legalBalls) / bpo)
        const newBalls = (currentInnings.balls + legalBalls) % bpo

        await tx
          .update(matchState)
          .set({
            currentOver: newOvers,
            currentBalls: newBalls,
            currentOverBuffer: [],
            lastUpdated: new Date(),
            ...(strikerId !== undefined && { strikerId }),
            ...(nonStrikerId !== undefined && { nonStrikerId }),
            ...(currentBowlerId !== undefined && { currentBowlerId }),
          })
          .where(eq(matchState.matchId, matchId))

        await tx
          .update(innings)
          .set({
            totalRuns: currentInnings.totalRuns + totalRuns,
            wickets: currentInnings.wickets + totalWickets,
            overs: newOvers,
            balls: newBalls,
          })
          .where(eq(innings.id, inningsId))
      } else {
        await tx
          .update(matchState)
          .set({
            currentOver: overNumber,
            currentBalls: legalBalls,
            currentOverBuffer: [],
            lastUpdated: new Date(),
            ...(strikerId !== undefined && { strikerId }),
            ...(nonStrikerId !== undefined && { nonStrikerId }),
            ...(currentBowlerId !== undefined && { currentBowlerId }),
          })
          .where(eq(matchState.matchId, matchId))
      }

      return rows
    })

    return NextResponse.json({ ok: true, deliveryIds: inserted.map((r) => r.id) })
  } catch (err) {
    console.error('Persist error:', err)
    return NextResponse.json({ error: 'Failed to persist deliveries' }, { status: 500 })
  }
}
