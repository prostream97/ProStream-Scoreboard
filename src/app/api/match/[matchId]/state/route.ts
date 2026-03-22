import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matchState } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getMatchSnapshot } from '@/lib/db/queries/match'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const id = parseInt(matchId, 10)

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })
  }

  try {
    const snapshot = await getMatchSnapshot(id)
    if (!snapshot) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }
    return NextResponse.json(snapshot)
  } catch (err) {
    console.error('State fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch match state' }, { status: 500 })
  }
}

// Persist striker / non-striker / bowler IDs to the DB so they survive page refreshes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })

  const body = await req.json() as {
    strikerId?: number | null
    nonStrikerId?: number | null
    currentBowlerId?: number | null
  }

  const patch: Partial<typeof matchState.$inferInsert> = {}
  if ('strikerId' in body) patch.strikerId = body.strikerId ?? null
  if ('nonStrikerId' in body) patch.nonStrikerId = body.nonStrikerId ?? null
  if ('currentBowlerId' in body) patch.currentBowlerId = body.currentBowlerId ?? null

  await db.update(matchState).set({ ...patch, lastUpdated: new Date() }).where(eq(matchState.matchId, id))
  return NextResponse.json({ ok: true })
}
