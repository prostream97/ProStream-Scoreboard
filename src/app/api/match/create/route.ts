import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matches, matchState, innings } from '@/lib/db/schema'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    format = 'T20',
    totalOvers = 20,
    venue,
    homeTeamId,
    awayTeamId,
    tossWinnerId,
    tossDecision,
    battingFirstTeamId,
  } = body

  if (!homeTeamId || !awayTeamId) {
    return NextResponse.json({ error: 'homeTeamId and awayTeamId are required' }, { status: 400 })
  }

  try {
    // Create the match
    const [match] = await db
      .insert(matches)
      .values({
        format,
        totalOvers,
        venue,
        homeTeamId,
        awayTeamId,
        tossWinnerId,
        tossDecision,
        status: 'setup',
      })
      .returning()

    // Create innings 1
    const battingTeam = battingFirstTeamId ?? homeTeamId
    const bowlingTeam = battingTeam === homeTeamId ? awayTeamId : homeTeamId

    const [inningsRow] = await db
      .insert(innings)
      .values({
        matchId: match.id,
        battingTeamId: battingTeam,
        bowlingTeamId: bowlingTeam,
        inningsNumber: 1,
      })
      .returning()

    // Create match_state row
    await db.insert(matchState).values({
      matchId: match.id,
      currentInnings: 1,
      currentOver: 0,
      currentBalls: 0,
      currentOverBuffer: [],
    })

    return NextResponse.json({ match, innings: inningsRow }, { status: 201 })
  } catch (err) {
    console.error('Create match error:', err)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}
