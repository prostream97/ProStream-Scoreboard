import { NextRequest, NextResponse } from 'next/server'
import { getTournamentBatterStats } from '@/lib/db/queries/tournamentPlayerStats'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })
  }

  const playerId = parseInt(req.nextUrl.searchParams.get('playerId') ?? '', 10)
  if (isNaN(playerId)) {
    return NextResponse.json({ error: 'Missing or invalid playerId' }, { status: 400 })
  }

  try {
    const data = await getTournamentBatterStats(id, playerId)
    if (!data) {
      return NextResponse.json({ error: 'Stats not available' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('Tournament batter stats fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch tournament batter stats' }, { status: 500 })
  }
}
