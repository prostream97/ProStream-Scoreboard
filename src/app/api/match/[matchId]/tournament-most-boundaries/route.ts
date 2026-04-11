import { NextRequest, NextResponse } from 'next/server'
import { getTournamentMostBoundaries } from '@/lib/db/queries/match'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })
  }

  try {
    const data = await getTournamentMostBoundaries(id)
    if (!data) {
      return NextResponse.json({ error: 'Tournament leaderboard not available' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('Tournament most boundaries fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch tournament most boundaries' }, { status: 500 })
  }
}
