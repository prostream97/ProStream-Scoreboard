import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { recomputeAllInningsAggregatesForMatch } from '@/lib/db/queries/match'
import { pusher } from '@/lib/pusher/server'

export const runtime = 'nodejs'

/**
 * Recomputes innings totals (runs, wickets, overs) from persisted deliveries, then refreshes
 * batter/bowler figures on the next snapshot fetch. Call after fixing delivery rows in the DB
 * or when aggregates drift. Flush pending balls to the server first so the buffer is persisted.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })

  try {
    const matchRow = await db.query.matches.findFirst({
      where: eq(matches.id, id),
      columns: { id: true, ballsPerOver: true },
    })
    if (!matchRow) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const bpo = matchRow.ballsPerOver ?? 6
    await recomputeAllInningsAggregatesForMatch(id, bpo)

    await pusher.trigger(`match-${id}`, 'state.refresh', { source: 'recompute-stats' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('recompute-stats error:', err)
    return NextResponse.json({ error: 'Failed to recompute stats' }, { status: 500 })
  }
}
