import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matches, matchState, innings, tournamentTeams, tournaments } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)

  // Fetch tournament to inherit format/overs
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const body = await req.json()
  const {
    homeTeamId,
    awayTeamId,
    venue,
    date,
    tossWinnerId,
    tossDecision,
    battingFirstTeamId,
    matchStage = 'group',
    matchLabel,
  } = body

  if (!homeTeamId || !awayTeamId) {
    return NextResponse.json({ error: 'homeTeamId and awayTeamId are required' }, { status: 400 })
  }

  // Validate both teams are enrolled
  const enrollments = await db
    .select({ teamId: tournamentTeams.teamId })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId))

  const enrolledIds = new Set(enrollments.map((e) => e.teamId))
  if (!enrolledIds.has(homeTeamId) || !enrolledIds.has(awayTeamId)) {
    return NextResponse.json(
      { error: 'Both teams must be enrolled in this tournament' },
      { status: 400 },
    )
  }

  try {
    const [match] = await db
      .insert(matches)
      .values({
        format: tournament.format,
        totalOvers: tournament.totalOvers,
        venue: venue ?? null,
        date: date ? new Date(date) : new Date(),
        homeTeamId,
        awayTeamId,
        tossWinnerId: tossWinnerId ?? null,
        tossDecision: tossDecision ?? null,
        status: 'setup',
        tournamentId,
        matchStage: matchStage ?? null,
        matchLabel: matchLabel ?? null,
      })
      .returning()

    const battingTeam = battingFirstTeamId ?? homeTeamId
    const bowlingTeam = battingTeam === homeTeamId ? awayTeamId : homeTeamId

    const [inningsRow] = await db
      .insert(innings)
      .values({ matchId: match.id, battingTeamId: battingTeam, bowlingTeamId: bowlingTeam, inningsNumber: 1 })
      .returning()

    await db.insert(matchState).values({
      matchId: match.id,
      currentInnings: 1,
      currentOver: 0,
      currentBalls: 0,
      currentOverBuffer: [],
    })

    return NextResponse.json({ match, innings: inningsRow }, { status: 201 })
  } catch (err) {
    console.error('Tournament match create error:', err)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}
