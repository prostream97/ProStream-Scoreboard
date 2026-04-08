import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { getBattingFirstTeamId, isAdminSession } from '@/lib/auth/utils'
import { canEditTournament } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { matches, matchState, innings, tournaments, teams } from '@/lib/db/schema'
import { count, eq } from 'drizzle-orm'
import type { MatchStage } from '@/types/tournament'
import { buildTournamentStageStructure, MATCH_STAGE_ORDER } from '@/lib/tournament/stageRules'

export const runtime = 'nodejs'

function isMatchStage(value: unknown): value is MatchStage {
  return typeof value === 'string' && MATCH_STAGE_ORDER.includes(value as MatchStage)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)

  if (!await canEditTournament(session, tournamentId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  if (!isMatchStage(matchStage)) {
    return NextResponse.json({ error: 'Invalid match stage' }, { status: 400 })
  }

  if (!homeTeamId || !awayTeamId) {
    return NextResponse.json({ error: 'homeTeamId and awayTeamId are required' }, { status: 400 })
  }

  if (homeTeamId === awayTeamId) {
    return NextResponse.json({ error: 'Home and away teams must be different' }, { status: 400 })
  }

  // Validate both teams belong to this tournament
  const tournamentTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId))

  const teamIds = new Set(tournamentTeams.map((t) => t.id))
  if (!teamIds.has(homeTeamId) || !teamIds.has(awayTeamId)) {
    return NextResponse.json(
      { error: 'Both teams must belong to this tournament' },
      { status: 400 },
    )
  }

  const existingMatches = await db.query.matches.findMany({
    where: eq(matches.tournamentId, tournamentId),
    columns: {
      matchStage: true,
      status: true,
    },
  })

  const stageStructure = buildTournamentStageStructure(existingMatches)
  if (!stageStructure.allowedStages.includes(matchStage)) {
    return NextResponse.json(
      { error: stageStructure.reasonsByStage[matchStage] ?? 'This match stage is not available right now.' },
      { status: 400 },
    )
  }

  // ── Plan limit enforcement (operators only) ────────────────────────────────
  if (!isAdminSession(session)) {
    if (tournament.planType === 'match' && tournament.matchLimit !== null) {
      const [{ value: matchCount }] = await db
        .select({ value: count() })
        .from(matches)
        .where(eq(matches.tournamentId, tournamentId))
      if (matchCount >= tournament.matchLimit) {
        return NextResponse.json(
          { error: `Match limit of ${tournament.matchLimit} reached for this tournament plan` },
          { status: 403 },
        )
      }
    }

    if (tournament.planType === 'daily' && tournament.planDay) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const todayStr = `${yyyy}-${mm}-${dd}`
      if (tournament.planDay !== todayStr) {
        return NextResponse.json(
          { error: `Matches can only be created on ${tournament.planDay} for this daily plan` },
          { status: 403 },
        )
      }
    }
  }

  try {
    const [match] = await db
      .insert(matches)
      .values({
        format: tournament.format,
        totalOvers: tournament.totalOvers,
        ballsPerOver: tournament.ballsPerOver,
        venue: venue ?? null,
        date: date ? new Date(date) : new Date(),
        homeTeamId,
        awayTeamId,
        tossWinnerId: tossWinnerId ?? null,
        tossDecision: tossDecision ?? null,
        status: 'setup',
        tournamentId,
        matchStage,
        matchLabel: matchLabel ?? null,
      })
      .returning()

    const battingTeam = battingFirstTeamId ?? getBattingFirstTeamId({
      homeTeamId,
      awayTeamId,
      tossWinnerId: tossWinnerId ?? null,
      tossDecision: tossDecision ?? null,
    }) ?? homeTeamId
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
