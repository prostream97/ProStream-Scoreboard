import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { innings, matches, matchState } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { pusher } from '@/lib/pusher/server'
import { maybeAdvanceTournamentStatus } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

// POST — end current innings / start innings 2
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId } = await params
  const id = parseInt(matchId, 10)
  const body = await req.json()
  const { action, strikerId, nonStrikerId, bowlerId, resultWinnerId, resultMargin, resultType } = body

  try {
    if (action === 'end') {
      // Mark innings 1 as complete
      const innings1 = await db.query.innings.findFirst({
        where: and(eq(innings.matchId, id), eq(innings.inningsNumber, 1)),
      })
      if (!innings1) {
        return NextResponse.json({ error: 'Innings 1 not found' }, { status: 404 })
      }

      // Guard against duplicate innings 2 creation
      const existingInnings2 = await db.query.innings.findFirst({
        where: and(eq(innings.matchId, id), eq(innings.inningsNumber, 2)),
      })
      if (existingInnings2) {
        return NextResponse.json({ error: 'Innings 2 already exists' }, { status: 409 })
      }

      const target = innings1.totalRuns + 1

      await db
        .update(innings)
        .set({ status: 'complete' })
        .where(and(eq(innings.matchId, id), eq(innings.inningsNumber, 1)))

      const [innings2] = await db
        .insert(innings)
        .values({
          matchId: id,
          battingTeamId: innings1.bowlingTeamId,
          bowlingTeamId: innings1.battingTeamId,
          inningsNumber: 2,
          target,
        })
        .returning()

      await db
        .update(matchState)
        .set({
          currentInnings: 2,
          currentOver: 0,
          currentBalls: 0,
          currentOverBuffer: [],
          strikerId: strikerId ?? null,
          nonStrikerId: nonStrikerId ?? null,
          currentBowlerId: bowlerId ?? null,
          lastUpdated: new Date(),
        })
        .where(eq(matchState.matchId, id))

      const result = { innings2, target }

      // Notify all viewers
      await pusher.trigger(`match-${id}`, 'innings.change', {
        matchId: id,
        inningsNumber: 2,
        totalRuns: innings1.totalRuns,
        wickets: innings1.wickets,
        overs: innings1.overs,
        target: result.target,
        newInnings: result.innings2,
      })

      return NextResponse.json({ ok: true, target: result.target, innings: result.innings2 })
    }

    if (action === 'complete') {

      // Mark match as complete with result
      await db
        .update(matches)
        .set({
          status: 'complete',
          resultWinnerId: resultWinnerId ?? null,
          resultMargin: resultMargin ?? null,
          resultType: resultType ?? null,
        })
        .where(eq(matches.id, id))

      await db
        .update(innings)
        .set({ status: 'complete' })
        .where(and(eq(innings.matchId, id), eq(innings.inningsNumber, 2)))

      // Auto-advance tournament status if this match belongs to a tournament
      await maybeAdvanceTournamentStatus(id)

      // Notify all viewers of match completion
      await pusher.trigger(`match-${id}`, 'match.complete', {
        matchId: id,
        resultWinnerId: resultWinnerId ?? null,
        resultMargin: resultMargin ?? null,
        resultType: resultType ?? null,
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Innings route error:', err)
    return NextResponse.json({ error: 'Innings operation failed' }, { status: 500 })
  }
}
