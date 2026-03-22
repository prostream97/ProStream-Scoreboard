import { db } from '@/lib/db'
import { matches, innings, players, teams, matchState, deliveries } from '@/lib/db/schema'
import { eq, and, sql, gt, desc } from 'drizzle-orm'
import type { MatchSnapshot, BatterStats, BowlerStats, PartnershipStats, InningsState, TeamSummary, PlayerSummary } from '@/types/match'

export async function getMatchSnapshot(matchId: number): Promise<MatchSnapshot | null> {
  // Fetch match + teams in one query
  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      homeTeam: true,
      awayTeam: true,
      state: true,
      innings: true,
    },
  })

  if (!matchRow) return null

  const state = matchRow.state
  const currentInningsNum = state?.currentInnings ?? 1

  const currentInningsRow = matchRow.innings.find(
    (i) => i.inningsNumber === currentInningsNum
  ) ?? null

  // Fetch squads for both teams in parallel
  const [battingTeamPlayers, bowlingTeamPlayers, battersStats, bowlersStats, partnershipStats] =
    await Promise.all([
      getTeamPlayers(currentInningsRow?.battingTeamId ?? matchRow.homeTeamId),
      getTeamPlayers(currentInningsRow?.bowlingTeamId ?? matchRow.awayTeamId),
      currentInningsRow ? getBatterStats(currentInningsRow.id, state?.strikerId ?? null) : [],
      currentInningsRow ? getBowlerStats(currentInningsRow.id, state?.currentBowlerId ?? null) : [],
      currentInningsRow
        ? getPartnershipStats(currentInningsRow.id, state?.strikerId ?? null, state?.nonStrikerId ?? null)
        : null,
    ])

  const inningsStates: InningsState[] = matchRow.innings.map((i) => ({
    id: i.id,
    inningsNumber: i.inningsNumber as 1 | 2,
    battingTeamId: i.battingTeamId,
    bowlingTeamId: i.bowlingTeamId,
    totalRuns: i.totalRuns,
    wickets: i.wickets,
    overs: i.overs,
    balls: i.balls,
    target: i.target,
    status: i.status,
  }))

  const currentInningsState = inningsStates.find((i) => i.inningsNumber === currentInningsNum) ?? null

  // Compute run rates
  const totalBalls = (currentInningsState?.overs ?? 0) * 6 + (currentInningsState?.balls ?? 0)
  const totalOversDecimal = totalBalls / 6
  const currentRunRate = totalOversDecimal > 0
    ? (currentInningsState?.totalRuns ?? 0) / totalOversDecimal
    : 0

  let requiredRunRate: number | null = null
  if (currentInningsNum === 2 && currentInningsState?.target) {
    const totalMatchOvers = matchRow.totalOvers
    const remainingBalls = totalMatchOvers * 6 - totalBalls
    const remainingOvers = remainingBalls / 6
    const runsNeeded = currentInningsState.target - (currentInningsState.totalRuns)
    requiredRunRate = remainingOvers > 0 ? runsNeeded / remainingOvers : 0
  }

  const homeTeam: TeamSummary = {
    id: matchRow.homeTeam.id,
    name: matchRow.homeTeam.name,
    shortCode: matchRow.homeTeam.shortCode,
    primaryColor: matchRow.homeTeam.primaryColor,
    secondaryColor: matchRow.homeTeam.secondaryColor,
    logoCloudinaryId: matchRow.homeTeam.logoCloudinaryId,
  }

  const awayTeam: TeamSummary = {
    id: matchRow.awayTeam.id,
    name: matchRow.awayTeam.name,
    shortCode: matchRow.awayTeam.shortCode,
    primaryColor: matchRow.awayTeam.primaryColor,
    secondaryColor: matchRow.awayTeam.secondaryColor,
    logoCloudinaryId: matchRow.awayTeam.logoCloudinaryId,
  }

  return {
    matchId,
    format: matchRow.format,
    status: matchRow.status,
    venue: matchRow.venue,
    totalOvers: matchRow.totalOvers,
    homeTeam,
    awayTeam,
    tossWinnerId: matchRow.tossWinnerId,
    tossDecision: matchRow.tossDecision,
    currentInnings: currentInningsNum as 1 | 2,
    currentOver: state?.currentOver ?? 0,
    currentBalls: state?.currentBalls ?? 0,
    innings: inningsStates,
    currentInningsState,
    strikerId: state?.strikerId ?? null,
    nonStrikerId: state?.nonStrikerId ?? null,
    currentBowlerId: state?.currentBowlerId ?? null,
    batters: battersStats,
    bowlers: bowlersStats,
    partnership: partnershipStats,
    currentRunRate: Math.round(currentRunRate * 100) / 100,
    requiredRunRate: requiredRunRate !== null ? Math.round(requiredRunRate * 100) / 100 : null,
    battingTeamPlayers,
    bowlingTeamPlayers,
  }
}

async function getTeamPlayers(teamId: number): Promise<PlayerSummary[]> {
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      displayName: players.displayName,
      role: players.role,
      battingStyle: players.battingStyle,
      bowlingStyle: players.bowlingStyle,
      headshotCloudinaryId: players.headshotCloudinaryId,
    })
    .from(players)
    .where(eq(players.teamId, teamId))

  return rows
}

async function getBatterStats(inningsId: number, strikerId: number | null): Promise<BatterStats[]> {
  const rows = await db
    .select({
      playerId: deliveries.batsmanId,
      runs: sql<number>`SUM(${deliveries.runs})`.as('runs'),
      balls: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isLegal} = true)`.as('balls'),
      fours: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.runs} = 4)`.as('fours'),
      sixes: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.runs} = 6)`.as('sixes'),
      isWicket: sql<boolean>`BOOL_OR(${deliveries.isWicket})`.as('is_out'),
      dismissalType: sql<string | null>`MAX(${deliveries.dismissalType})`.as('dismissal_type'),
      playerName: players.name,
      displayName: players.displayName,
    })
    .from(deliveries)
    .innerJoin(players, eq(deliveries.batsmanId, players.id))
    .where(eq(deliveries.inningsId, inningsId))
    .groupBy(deliveries.batsmanId, players.name, players.displayName)

  return rows.map((r) => ({
    playerId: r.playerId,
    playerName: r.playerName,
    displayName: r.displayName,
    runs: Number(r.runs) || 0,
    balls: Number(r.balls) || 0,
    fours: Number(r.fours) || 0,
    sixes: Number(r.sixes) || 0,
    strikeRate:
      Number(r.balls) > 0
        ? Math.round((Number(r.runs) / Number(r.balls)) * 10000) / 100
        : 0,
    isStriker: r.playerId === strikerId,
    isOut: Boolean(r.isWicket),
    dismissalType: r.dismissalType as BatterStats['dismissalType'],
  }))
}

async function getBowlerStats(inningsId: number, currentBowlerId: number | null): Promise<BowlerStats[]> {
  const rows = await db
    .select({
      playerId: deliveries.bowlerId,
      legalBalls: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isLegal} = true)`.as('legal_balls'),
      runs: sql<number>`SUM(${deliveries.runs} + ${deliveries.extraRuns}) FILTER (WHERE ${deliveries.extraType} != 'bye' AND ${deliveries.extraType} != 'legbye' OR ${deliveries.extraType} IS NULL)`.as('runs'),
      wickets: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isWicket} = true AND ${deliveries.dismissalType} NOT IN ('runout', 'obstructingfield', 'handledball'))`.as('wickets'),
      playerName: players.name,
      displayName: players.displayName,
    })
    .from(deliveries)
    .innerJoin(players, eq(deliveries.bowlerId, players.id))
    .where(eq(deliveries.inningsId, inningsId))
    .groupBy(deliveries.bowlerId, players.name, players.displayName)

  return rows.map((r) => {
    const legalBalls = Number(r.legalBalls) || 0
    const completedOvers = Math.floor(legalBalls / 6)
    const ballsInOver = legalBalls % 6
    const runsGiven = Number(r.runs) || 0
    const oversDecimal = legalBalls / 6

    return {
      playerId: r.playerId,
      playerName: r.playerName,
      displayName: r.displayName,
      overs: completedOvers,
      balls: ballsInOver,
      maidens: 0, // computed separately if needed
      runs: runsGiven,
      wickets: Number(r.wickets) || 0,
      economy: oversDecimal > 0 ? Math.round((runsGiven / oversDecimal) * 100) / 100 : 0,
      isCurrent: r.playerId === currentBowlerId,
    }
  })
}

async function getPartnershipStats(
  inningsId: number,
  strikerId: number | null,
  nonStrikerId: number | null,
): Promise<PartnershipStats | null> {
  if (!strikerId || !nonStrikerId) return null

  // Find the delivery ID of the most recent wicket in this innings
  const lastWicket = await db
    .select({ id: deliveries.id })
    .from(deliveries)
    .where(and(eq(deliveries.inningsId, inningsId), eq(deliveries.isWicket, true)))
    .orderBy(desc(deliveries.id))
    .limit(1)

  const lastWicketId = lastWicket[0]?.id ?? 0

  // Sum runs and count legal balls since that wicket
  const rows = await db
    .select({
      runs: sql<number>`COALESCE(SUM(${deliveries.runs} + ${deliveries.extraRuns}), 0)`,
      balls: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isLegal} = true)`,
    })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.inningsId, inningsId),
        gt(deliveries.id, lastWicketId),
      ),
    )

  const p = rows[0]
  return {
    runs: Number(p?.runs) || 0,
    balls: Number(p?.balls) || 0,
    batter1Id: strikerId,
    batter2Id: nonStrikerId,
  }
}

export async function getMatchList() {
  const rows = await db.query.matches.findMany({
    with: { homeTeam: true, awayTeam: true },
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  })
  return rows
}
