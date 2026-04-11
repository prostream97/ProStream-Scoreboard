import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

// PATCH — edit match details (venue, date, toss, matchLabel, matchStage)
// Does NOT allow changing homeTeamId / awayTeamId (breaks innings/deliveries)
// Does NOT allow changing status (use /status route)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })

  const body = await req.json() as Record<string, unknown>

  const patch: Record<string, unknown> = {}

  if ('venue' in body)        patch.venue        = body.venue        ?? null
  if ('date' in body)         patch.date         = body.date ? new Date(body.date as string) : undefined
  if ('tossWinnerId' in body) patch.tossWinnerId = body.tossWinnerId  ?? null
  if ('tossDecision' in body) patch.tossDecision = body.tossDecision  ?? null
  if ('matchLabel' in body)   patch.matchLabel   = body.matchLabel    ?? null
  if ('matchStage' in body)   patch.matchStage   = body.matchStage    ?? null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const [updated] = await db
      .update(matches)
      .set(patch)
      .where(eq(matches.id, id))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    return NextResponse.json({ ok: true, match: updated })
  } catch (err) {
    console.error('Match update error:', err)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}
