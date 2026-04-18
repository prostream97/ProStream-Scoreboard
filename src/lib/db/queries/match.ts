import { db } from '@/lib/db'
import { matches, innings, players, teams, matchState, deliveries, users, type DeliveryBuffer } from '@/lib/db/schema'
import { eq, and, sql, gt, desc, inArray } from 'drizzle-orm'
import type { MatchSnapshot, BatterStats, BowlerStats, PartnershipStats, InningsState, InningsStatus, TeamSummary, PlayerSummary } from '@/types/match'
import { createPartnershipStats, getBatterContributionForDelivery } from '@/lib/match/partnership'
import { applyLiveOverBufferToPlayerStats } from '@/lib/match/applyLiveOverBufferToPlayerStats'

const NON_BOWLER_WICKET_TYPES = new Set(['runout', 'obstructingfield', 'handledball'])

/**
 * `match_state.current_over_buffer` keeps the full current over for UI dots; balls already flushed
 * to `deliveries` must not be applied again on top of SQL aggregates.
 */
async function getUnpersistedCurrentOverBuffer(
  inningsId: number,
  overNumber: number,
  buffer: DeliveryBuffer[],
): Promise<DeliveryBuffer[]> {
  if (buffer.length === 0) return []
  const existingRows = await db
    .select({ ballNumber: deliveries.ballNumber })
    .from(deliveries)
    .where(and(eq(deliveries.inningsId, inningsId), eq(deliveries.overNumber, overNumber)))
  const persistedBallNumbers = new Set(existingRows.map((r) => r.ballNumber))
  return buffer.filter(
    (d) => d.overNumber === overNumber && !persistedBallNumbers.has(d.ballNumber),
  )
}

export async function getMatchSnapshot(matchId: number): Promise<MatchSnapshot | null> {
  // Fetch match + teams in one query
  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      homeTeam: true,
      awayTeam: true,
      state: true,
      innings: true,
      tournament: true,
    },
  })

  if (!matchRow) return null

  const state = matchRow.state
  const currentInningsNum = state?.currentInnings ?? 1

  const currentInningsRow = matchRow.innings.find(
    (i) => i.inningsNumber === currentInningsNum
  ) ?? null

  const bpo = matchRow.ballsPerOver ?? 6
  const rawOverBuffer = state?.currentOverBuffer ?? []
  const unpersistedOverBuffer =
    currentInningsRow && rawOverBuffer.length > 0
      ? await getUnpersistedCurrentOverBuffer(
          currentInningsRow.id,
          state?.currentOver ?? 0,
          rawOverBuffer,
        )
      : []

  const [battingTeamPlayers, bowlingTeamPlayers, battersStats, bowlersStats] = await Promise.all([
    getTeamPlayers(currentInningsRow?.battingTeamId ?? matchRow.homeTeamId),
    getTeamPlayers(currentInningsRow?.bowlingTeamId ?? matchRow.awayTeamId),
    currentInningsRow ? getBatterStats(currentInningsRow.id, state?.strikerId ?? null) : [],
    currentInningsRow ? getBowlerStats(currentInningsRow.id, state?.currentBowlerId ?? null, bpo) : [],
  ])

  const partnershipStats =
    currentInningsRow
      ? await getPartnershipStats(
          currentInningsRow.id,
          state?.strikerId ?? null,
          state?.nonStrikerId ?? null,
          unpersistedOverBuffer,
        )
      : null

  const { batters: battersWithBuffer, bowlers: bowlersWithBuffer } = applyLiveOverBufferToPlayerStats(
    battersStats,
    bowlersStats,
    unpersistedOverBuffer,
    battingTeamPlayers,
    bowlingTeamPlayers,
    bpo,
    state?.strikerId ?? null,
    state?.currentBowlerId ?? null,
    state?.nonStrikerId ?? null,
  )

  const inningsStates: InningsState[] = matchRow.innings.map((i) => ({
    id: i.id,
    inningsNumber: i.inningsNumber as 1 | 2,
    battingTeamId: i.battingTeamId,
    bowlingTeamId: i.bowlingTeamId,
    totalRuns: i.totalRuns,
    wickets: i.wickets,
    overs: i.inningsNumber === currentInningsNum ? (state?.currentOver ?? i.overs) : i.overs,
    balls: i.inningsNumber === currentInningsNum ? (state?.currentBalls ?? i.balls) : i.balls,
    target: i.target,
    status: i.status,
  }))

  const currentInningsState = inningsStates.find((i) => i.inningsNumber === currentInningsNum) ?? null

  // Compute run rates
  const totalBalls = (currentInningsState?.overs ?? 0) * bpo + (currentInningsState?.balls ?? 0)
  const totalOversDecimal = totalBalls / bpo
  const currentRunRate = totalOversDecimal > 0
    ? (currentInningsState?.totalRuns ?? 0) / totalOversDecimal
    : 0

  let requiredRunRate: number | null = null
  if (currentInningsNum === 2 && currentInningsState?.target) {
    const totalMatchOvers = matchRow.totalOvers
    const remainingBalls = totalMatchOvers * bpo - totalBalls
    const remainingOvers = remainingBalls / bpo
    const runsNeeded = currentInningsState.target - (currentInningsState.totalRuns)
    requiredRunRate = remainingOvers > 0 ? runsNeeded / remainingOvers : 0
  }

  const homeTeam: TeamSummary = {
    id: matchRow.homeTeam.id,
    name: matchRow.homeTeam.name,
    shortCode: matchRow.homeTeam.shortCode,
    primaryColor: matchRow.homeTeam.primaryColor,
    logoCloudinaryId: matchRow.homeTeam.logoCloudinaryId,
  }

  const awayTeam: TeamSummary = {
    id: matchRow.awayTeam.id,
    name: matchRow.awayTeam.name,
    shortCode: matchRow.awayTeam.shortCode,
    primaryColor: matchRow.awayTeam.primaryColor,
    logoCloudinaryId: matchRow.awayTeam.logoCloudinaryId,
  }

  return {
    matchId,
    format: matchRow.format,
    status: matchRow.status,
    venue: matchRow.venue,
    matchLabel: matchRow.matchLabel ?? null,
    tournamentId: matchRow.tournament?.id ?? null,
    tournamentName: matchRow.tournament?.name ?? null,
    tournamentLogoCloudinaryId: matchRow.tournament?.logoCloudinaryId ?? null,
    totalOvers: matchRow.totalOvers,
    ballsPerOver: matchRow.ballsPerOver ?? 6,
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
    batters: battersWithBuffer,
    bowlers: bowlersWithBuffer,
    partnership: partnershipStats,
    currentRunRate: Math.round(currentRunRate * 100) / 100,
    requiredRunRate: requiredRunRate !== null ? Math.round(requiredRunRate * 100) / 100 : null,
    battingTeamPlayers,
    bowlingTeamPlayers,
    currentOverBalls: (state?.currentOverBuffer ?? []).map((d) => ({
      runs: d.runs,
      extraRuns: d.extraRuns,
      isLegal: d.isLegal,
      isBoundary: d.isBoundary ?? false,
      extraType: d.extraType,
      isWicket: d.isWicket,
      overNumber: d.overNumber,
      ballNumber: d.ballNumber,
    })),
    resultWinnerId: matchRow.resultWinnerId ?? null,
    resultMargin: matchRow.resultMargin ?? null,
    resultType: (matchRow.resultType ?? null) as 'wickets' | 'runs' | 'tie' | null,
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
      fours: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isBoundary} = true AND ${deliveries.runs} = 4)`.as('fours'),
      sixes: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isBoundary} = true AND ${deliveries.runs} = 6)`.as('sixes'),
      playerName: players.name,
      displayName: players.displayName,
    })
    .from(deliveries)
    .innerJoin(players, eq(deliveries.batsmanId, players.id))
    .where(eq(deliveries.inningsId, inningsId))
    .groupBy(deliveries.batsmanId, players.name, players.displayName)

  const wicketRows = await db
    .select({
      id: deliveries.id,
      batsmanId: deliveries.batsmanId,
      dismissedBatterId: deliveries.dismissedBatterId,
      bowlerId: deliveries.bowlerId,
      dismissalType: deliveries.dismissalType,
      fielder1Id: deliveries.fielder1Id,
      fielder2Id: deliveries.fielder2Id,
    })
    .from(deliveries)
    .where(and(eq(deliveries.inningsId, inningsId), eq(deliveries.isWicket, true)))
    .orderBy(desc(deliveries.id))

  const latestWicketByBatter = new Map<number, (typeof wicketRows)[number]>()
  for (const wicket of wicketRows) {
    const dismissedBatterId = wicket.dismissedBatterId ?? wicket.batsmanId
    if (!latestWicketByBatter.has(dismissedBatterId)) {
      latestWicketByBatter.set(dismissedBatterId, wicket)
    }
  }

  const battingRowByPlayerId = new Map(
    rows.map((row) => [row.playerId, row]),
  )

  const dismissedOnlyPlayerIds = [...latestWicketByBatter.keys()].filter(
    (playerId) => !battingRowByPlayerId.has(playerId),
  )

  const dismissedOnlyPlayers = dismissedOnlyPlayerIds.length
    ? await db
        .select({
          id: players.id,
          name: players.name,
          displayName: players.displayName,
        })
        .from(players)
        .where(inArray(players.id, dismissedOnlyPlayerIds))
    : []

  const dismissedOnlyPlayerMap = new Map(
    dismissedOnlyPlayers.map((player) => [player.id, player]),
  )

  const dismissalPlayerIds = [...new Set(
    wicketRows.flatMap((wicket) => [
      wicket.bowlerId,
      wicket.fielder1Id,
      wicket.fielder2Id,
    ]).filter((id): id is number => id !== null),
  )]

  const dismissalPlayers = dismissalPlayerIds.length
    ? await db
        .select({
          id: players.id,
          displayName: players.displayName,
        })
        .from(players)
        .where(inArray(players.id, dismissalPlayerIds))
    : []

  const dismissalPlayerMap = new Map(
    dismissalPlayers.map((player) => [player.id, player.displayName]),
  )

  function formatDismissalText(batterId: number, dismissalType: BatterStats['dismissalType']) {
    if (!dismissalType) return null

    const wicket = latestWicketByBatter.get(batterId)
    if (!wicket) return null

    const bowlerName = dismissalPlayerMap.get(wicket.bowlerId) ?? 'Unknown'
    const fielder1Name = wicket.fielder1Id ? dismissalPlayerMap.get(wicket.fielder1Id) ?? 'Unknown' : null
    const fielder2Name = wicket.fielder2Id ? dismissalPlayerMap.get(wicket.fielder2Id) ?? 'Unknown' : null

    switch (dismissalType) {
      case 'bowled':
        return `b ${bowlerName}`
      case 'lbw':
        return `lbw b ${bowlerName}`
      case 'caught':
        return fielder1Name ? `c ${fielder1Name} b ${bowlerName}` : `c b ${bowlerName}`
      case 'stumped':
        return fielder1Name ? `st ${fielder1Name} b ${bowlerName}` : `st b ${bowlerName}`
      case 'runout':
        if (fielder1Name && fielder2Name) return `run out (${fielder1Name}/${fielder2Name})`
        if (fielder1Name) return `run out (${fielder1Name})`
        return 'run out'
      case 'hitwicket':
        return 'hit wicket'
      case 'obstructingfield':
        return 'obstructing the field'
      case 'handledball':
        return 'handled the ball'
      case 'timedout':
        return 'timed out'
      default:
        return dismissalType
    }
  }

  const orderedPlayerIds = [
    ...rows.map((row) => row.playerId),
    ...dismissedOnlyPlayerIds,
  ]

  return orderedPlayerIds.flatMap((playerId) => {
    const battingRow = battingRowByPlayerId.get(playerId)
    const dismissedOnlyPlayer = dismissedOnlyPlayerMap.get(playerId)
    const wicket = latestWicketByBatter.get(playerId)
    const dismissalType = wicket?.dismissalType as BatterStats['dismissalType'] | undefined

    const playerName = battingRow?.playerName ?? dismissedOnlyPlayer?.name
    const displayName = battingRow?.displayName ?? dismissedOnlyPlayer?.displayName
    if (!playerName || !displayName) return []

    const runs = Number(battingRow?.runs) || 0
    const balls = Number(battingRow?.balls) || 0

    return [{
      playerId,
      playerName,
      displayName,
      runs,
      balls,
      fours: Number(battingRow?.fours) || 0,
      sixes: Number(battingRow?.sixes) || 0,
      strikeRate: balls > 0 ? Math.round((runs / balls) * 10000) / 100 : 0,
      isStriker: playerId === strikerId,
      isOut: latestWicketByBatter.has(playerId),
      dismissalType: dismissalType ?? null,
      dismissalText: dismissalType ? formatDismissalText(playerId, dismissalType) : null,
    }]
  })
}

async function getBowlerStats(inningsId: number, currentBowlerId: number | null, bpo = 6): Promise<BowlerStats[]> {
  const rows = await db
    .select({
      playerId: deliveries.bowlerId,
      legalBalls: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isLegal} = true)`.as('legal_balls'),
      runs: sql<number>`SUM(${deliveries.runs} + ${deliveries.extraRuns}) FILTER (WHERE (${deliveries.extraType} != 'bye' AND ${deliveries.extraType} != 'legbye' AND ${deliveries.extraType} != 'penalty') OR ${deliveries.extraType} IS NULL)`.as('runs'),
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
    const completedOvers = Math.floor(legalBalls / bpo)
    const ballsInOver = legalBalls % bpo
    const runsGiven = Number(r.runs) || 0
    const oversDecimal = legalBalls / bpo

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
  liveBuffer: Array<{
    batsmanId: number
    runs: number
    extraRuns: number
    isLegal: boolean
    extraType: string | null
  }> = [],
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

  const persistedDeliveries = await db
    .select({
      batsmanId: deliveries.batsmanId,
      runs: deliveries.runs,
      extraRuns: deliveries.extraRuns,
      isLegal: deliveries.isLegal,
      extraType: deliveries.extraType,
    })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.inningsId, inningsId),
        gt(deliveries.id, lastWicketId),
      ),
    )

  const partnership = createPartnershipStats(strikerId, nonStrikerId)
  const contributionByBatter = new Map<number, { runs: number; balls: number }>()

  for (const delivery of [...persistedDeliveries, ...liveBuffer]) {
    const current = contributionByBatter.get(delivery.batsmanId) ?? { runs: 0, balls: 0 }
    const delta = getBatterContributionForDelivery(delivery)

    partnership.runs += Number(delivery.runs) + Number(delivery.extraRuns)
    partnership.balls += delivery.isLegal ? 1 : 0
    contributionByBatter.set(delivery.batsmanId, {
      runs: current.runs + delta.runs,
      balls: current.balls + delta.balls,
    })
  }

  const batter1Contribution = contributionByBatter.get(strikerId) ?? { runs: 0, balls: 0 }
  const batter2Contribution = contributionByBatter.get(nonStrikerId) ?? { runs: 0, balls: 0 }

  return {
    ...partnership,
    batter1ContributionRuns: batter1Contribution.runs,
    batter1ContributionBalls: batter1Contribution.balls,
    batter2ContributionRuns: batter2Contribution.runs,
    batter2ContributionBalls: batter2Contribution.balls,
  }
}

export type InningsSummaryData = {
  inningsNumber: 1 | 2
  battingTeamId: number
  bowlingTeamId: number
  totalRuns: number
  wickets: number
  overs: number
  balls: number
  target: number | null
  status: InningsStatus
  topBatters: BatterStats[]
  topBowlers: BowlerStats[]
}

export type TournamentMostWicketsRow = {
  rank: number
  bowlerId: number
  bowlerName: string
  teamName: string
  innings: number
  balls: number
  wickets: number
}

export type TournamentMostWicketsData = {
  tournament: {
    id: number
    name: string
    shortName: string
    logoCloudinaryId: string | null
  }
  owner: {
    id: number
    displayName: string
    photoCloudinaryId: string | null
  } | null
  rows: TournamentMostWicketsRow[]
}

export type TournamentMostBoundariesRow = {
  rank: number
  batterId: number
  batterName: string
  teamName: string
  innings: number
  fours: number
  sixes: number
  boundaries: number
}

export type TournamentMostBoundariesData = {
  tournament: {
    id: number
    name: string
    shortName: string
    logoCloudinaryId: string | null
  }
  owner: {
    id: number
    displayName: string
    photoCloudinaryId: string | null
  } | null
  rows: TournamentMostBoundariesRow[]
}

type MutableMostBoundariesRow = Omit<TournamentMostBoundariesRow, 'rank'>

type MutableMostWicketsRow = Omit<TournamentMostWicketsRow, 'rank'>

function isBowlerCreditedDismissal(dismissalType: string | null | undefined): boolean {
  return !!dismissalType && !NON_BOWLER_WICKET_TYPES.has(dismissalType)
}

function sortMostWicketsRows(a: MutableMostWicketsRow, b: MutableMostWicketsRow): number {
  return (
    b.wickets - a.wickets ||
    a.balls - b.balls ||
    a.innings - b.innings ||
    a.bowlerName.localeCompare(b.bowlerName)
  )
}

export async function getTournamentMostWickets(matchId: number): Promise<TournamentMostWicketsData | null> {
  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      tournament: true,
      state: true,
      innings: true,
    },
  })

  if (!matchRow?.tournamentId || !matchRow.tournament) return null

  const owner = matchRow.tournament.createdBy
    ? await db.query.users.findFirst({
        where: eq(users.id, matchRow.tournament.createdBy),
        columns: {
          id: true,
          displayName: true,
          photoCloudinaryId: true,
        },
      })
    : null

  const persistedRows = await db
    .select({
      bowlerId: deliveries.bowlerId,
      bowlerName: players.displayName,
      teamName: teams.name,
      innings: sql<number>`COUNT(DISTINCT ${deliveries.inningsId})`.as('innings'),
      balls: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isLegal} = true)`.as('balls'),
      wickets: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isWicket} = true AND ${deliveries.dismissalType} NOT IN ('runout', 'obstructingfield', 'handledball'))`.as('wickets'),
    })
    .from(deliveries)
    .innerJoin(innings, eq(deliveries.inningsId, innings.id))
    .innerJoin(matches, eq(innings.matchId, matches.id))
    .innerJoin(players, eq(deliveries.bowlerId, players.id))
    .innerJoin(teams, eq(players.teamId, teams.id))
    .where(eq(matches.tournamentId, matchRow.tournamentId))
    .groupBy(deliveries.bowlerId, players.displayName, teams.name)

  const rowsByBowler = new Map<number, MutableMostWicketsRow>(
    persistedRows.map((row) => [
      row.bowlerId,
      {
        bowlerId: row.bowlerId,
        bowlerName: row.bowlerName,
        teamName: row.teamName,
        innings: Number(row.innings) || 0,
        balls: Number(row.balls) || 0,
        wickets: Number(row.wickets) || 0,
      },
    ]),
  )

  const currentInningsRow = matchRow.innings.find(
    (inn) => inn.inningsNumber === (matchRow.state?.currentInnings ?? 1),
  )
  const liveBuffer = matchRow.state?.currentOverBuffer ?? []

  if (currentInningsRow && liveBuffer.length > 0) {
    const [bufferMetaRows, currentInningsBowlerRows] = await Promise.all([
      db
        .select({
          id: players.id,
          bowlerName: players.displayName,
          teamName: teams.name,
        })
        .from(players)
        .innerJoin(teams, eq(players.teamId, teams.id))
        .where(inArray(players.id, [...new Set(liveBuffer.map((delivery) => delivery.bowlerId))])),
      db
        .select({ bowlerId: deliveries.bowlerId })
        .from(deliveries)
        .where(eq(deliveries.inningsId, currentInningsRow.id))
        .groupBy(deliveries.bowlerId),
    ])

    const bufferMetaByBowler = new Map(
      bufferMetaRows.map((row) => [row.id, row]),
    )
    const currentInningsBowlers = new Set(
      currentInningsBowlerRows.map((row) => row.bowlerId),
    )
    const liveAdditions = new Map<number, { balls: number; wickets: number }>()

    for (const delivery of liveBuffer) {
      const agg = liveAdditions.get(delivery.bowlerId) ?? { balls: 0, wickets: 0 }
      if (delivery.isLegal) agg.balls += 1
      if (delivery.isWicket && isBowlerCreditedDismissal(delivery.dismissalType)) {
        agg.wickets += 1
      }
      liveAdditions.set(delivery.bowlerId, agg)
    }

    for (const [bowlerId, addition] of liveAdditions) {
      const existing = rowsByBowler.get(bowlerId)
      const meta = existing ? null : bufferMetaByBowler.get(bowlerId)
      if (!existing && !meta) continue

      rowsByBowler.set(bowlerId, {
        bowlerId,
        bowlerName: existing?.bowlerName ?? meta?.bowlerName ?? '',
        teamName: existing?.teamName ?? meta?.teamName ?? '',
        innings: (existing?.innings ?? 0) + (currentInningsBowlers.has(bowlerId) ? 0 : 1),
        balls: (existing?.balls ?? 0) + addition.balls,
        wickets: (existing?.wickets ?? 0) + addition.wickets,
      })
    }
  }

  const rows = [...rowsByBowler.values()]
    .filter((row) => row.wickets > 0)
    .sort(sortMostWicketsRows)
    .slice(0, 10)
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }))

  return {
    tournament: {
      id: matchRow.tournament.id,
      name: matchRow.tournament.name,
      shortName: matchRow.tournament.shortName,
      logoCloudinaryId: matchRow.tournament.logoCloudinaryId ?? null,
    },
    owner: owner ?? null,
    rows,
  }
}

function sortMostBoundariesRows(a: MutableMostBoundariesRow, b: MutableMostBoundariesRow): number {
  return (
    b.boundaries - a.boundaries ||
    b.sixes - a.sixes ||
    a.innings - b.innings ||
    a.batterName.localeCompare(b.batterName)
  )
}

export async function getTournamentMostBoundaries(matchId: number): Promise<TournamentMostBoundariesData | null> {
  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      tournament: true,
      state: true,
      innings: true,
    },
  })

  if (!matchRow?.tournamentId || !matchRow.tournament) return null

  const owner = matchRow.tournament.createdBy
    ? await db.query.users.findFirst({
        where: eq(users.id, matchRow.tournament.createdBy),
        columns: { id: true, displayName: true, photoCloudinaryId: true },
      })
    : null

  const persistedRows = await db
    .select({
      batterId: deliveries.batsmanId,
      batterName: players.displayName,
      teamName: teams.name,
      innings: sql<number>`COUNT(DISTINCT ${deliveries.inningsId})`.as('innings'),
      fours: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.runs} = 4 AND ${deliveries.extraType} IS NULL)`.as('fours'),
      sixes: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.runs} = 6 AND ${deliveries.extraType} IS NULL)`.as('sixes'),
    })
    .from(deliveries)
    .innerJoin(innings, eq(deliveries.inningsId, innings.id))
    .innerJoin(matches, eq(innings.matchId, matches.id))
    .innerJoin(players, eq(deliveries.batsmanId, players.id))
    .innerJoin(teams, eq(players.teamId, teams.id))
    .where(eq(matches.tournamentId, matchRow.tournamentId))
    .groupBy(deliveries.batsmanId, players.displayName, teams.name)

  const rowsByBatter = new Map<number, MutableMostBoundariesRow>(
    persistedRows.map((row) => [
      row.batterId,
      {
        batterId: row.batterId,
        batterName: row.batterName,
        teamName: row.teamName,
        innings: Number(row.innings) || 0,
        fours: Number(row.fours) || 0,
        sixes: Number(row.sixes) || 0,
        boundaries: (Number(row.fours) || 0) + (Number(row.sixes) || 0),
      },
    ]),
  )

  const currentInningsRow = matchRow.innings.find(
    (inn) => inn.inningsNumber === (matchRow.state?.currentInnings ?? 1),
  )
  const liveBuffer = matchRow.state?.currentOverBuffer ?? []

  if (currentInningsRow && liveBuffer.length > 0) {
    const [bufferMetaRows, currentInningsBatterRows] = await Promise.all([
      db
        .select({ id: players.id, batterName: players.displayName, teamName: teams.name })
        .from(players)
        .innerJoin(teams, eq(players.teamId, teams.id))
        .where(inArray(players.id, [...new Set(liveBuffer.map((d) => d.batsmanId))])),
      db
        .select({ batterId: deliveries.batsmanId })
        .from(deliveries)
        .where(eq(deliveries.inningsId, currentInningsRow.id))
        .groupBy(deliveries.batsmanId),
    ])

    const bufferMetaByBatter = new Map(bufferMetaRows.map((r) => [r.id, r]))
    const currentInningsBatters = new Set(currentInningsBatterRows.map((r) => r.batterId))
    const liveAdditions = new Map<number, { fours: number; sixes: number }>()

    for (const delivery of liveBuffer) {
      const agg = liveAdditions.get(delivery.batsmanId) ?? { fours: 0, sixes: 0 }
      if (delivery.isBoundary && delivery.runs === 4) agg.fours += 1
      if (delivery.isBoundary && delivery.runs === 6) agg.sixes += 1
      liveAdditions.set(delivery.batsmanId, agg)
    }

    for (const [batterId, addition] of liveAdditions) {
      const existing = rowsByBatter.get(batterId)
      const meta = existing ? null : bufferMetaByBatter.get(batterId)
      if (!existing && !meta) continue

      const newFours = (existing?.fours ?? 0) + addition.fours
      const newSixes = (existing?.sixes ?? 0) + addition.sixes
      rowsByBatter.set(batterId, {
        batterId,
        batterName: existing?.batterName ?? meta?.batterName ?? '',
        teamName: existing?.teamName ?? meta?.teamName ?? '',
        innings: (existing?.innings ?? 0) + (currentInningsBatters.has(batterId) ? 0 : 1),
        fours: newFours,
        sixes: newSixes,
        boundaries: newFours + newSixes,
      })
    }
  }

  const rows = [...rowsByBatter.values()]
    .filter((row) => row.boundaries > 0)
    .sort(sortMostBoundariesRows)
    .slice(0, 10)
    .map((row, index) => ({ rank: index + 1, ...row }))

  return {
    tournament: {
      id: matchRow.tournament.id,
      name: matchRow.tournament.name,
      shortName: matchRow.tournament.shortName,
      logoCloudinaryId: matchRow.tournament.logoCloudinaryId ?? null,
    },
    owner: owner ?? null,
    rows,
  }
}

export async function getInningsSummaries(matchId: number): Promise<InningsSummaryData[]> {
  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: { innings: true, state: true },
  })
  if (!matchRow) return []

  const bpo = matchRow.ballsPerOver ?? 6
  const state = matchRow.state

  return Promise.all(
    matchRow.innings.map(async (inn) => {
      const [topBatters, topBowlers] = await Promise.all([
        getBatterStats(inn.id, state?.strikerId ?? null),
        getBowlerStats(inn.id, state?.currentBowlerId ?? null, bpo),
      ])
      return {
        inningsNumber: inn.inningsNumber as 1 | 2,
        battingTeamId: inn.battingTeamId,
        bowlingTeamId: inn.bowlingTeamId,
        totalRuns: inn.totalRuns,
        wickets: inn.wickets,
        overs: inn.overs,
        balls: inn.balls,
        target: inn.target,
        status: inn.status as InningsStatus,
        topBatters: [...topBatters].sort((a, b) => b.runs - a.runs).slice(0, 5),
        topBowlers: [...topBowlers]
          .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
          .slice(0, 4),
      }
    }),
  )
}

export async function getMatchList() {
  const rows = await db.query.matches.findMany({
    with: { homeTeam: true, awayTeam: true },
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  })
  return rows
}

export async function getLiveMatches() {
  return db.query.matches.findMany({
    where: inArray(matches.status, ['active', 'paused', 'break', 'complete']),
    with: {
      homeTeam: true,
      awayTeam: true,
      innings: true,
      tournament: { columns: { name: true, shortName: true } },
    },
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  })
}

export async function recomputeInningsAggregates(
  inningsId: number,
  bpo: number,
): Promise<{ totalRuns: number; wickets: number; overs: number; balls: number }> {
  const [totals] = await db
    .select({
      totalRuns: sql<number>`COALESCE(SUM(${deliveries.runs} + ${deliveries.extraRuns}), 0)`,
      wickets: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isWicket} = true)`,
      legalBalls: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isLegal} = true)`,
    })
    .from(deliveries)
    .where(eq(deliveries.inningsId, inningsId))

  const legalBalls = Number(totals.legalBalls)
  const overs = Math.floor(legalBalls / bpo)
  const balls = legalBalls % bpo

  await db
    .update(innings)
    .set({ totalRuns: Number(totals.totalRuns), wickets: Number(totals.wickets), overs, balls })
    .where(eq(innings.id, inningsId))

  const inningsRow = await db.query.innings.findFirst({ where: eq(innings.id, inningsId) })
  if (inningsRow) {
    const ms = await db.query.matchState.findFirst({
      where: eq(matchState.matchId, inningsRow.matchId),
    })
    // Only sync live over/ball position when recomputing the *current* innings — otherwise
    // fixing completed innings would overwrite match_state for an active second innings.
    if (ms && ms.currentInnings === inningsRow.inningsNumber) {
      await db
        .update(matchState)
        .set({ currentOver: overs, currentBalls: balls, lastUpdated: new Date() })
        .where(eq(matchState.matchId, inningsRow.matchId))
    }
  }

  return { totalRuns: Number(totals.totalRuns), wickets: Number(totals.wickets), overs, balls }
}

/** Recompute innings totals and (when applicable) live over position from the deliveries table. */
export async function recomputeAllInningsAggregatesForMatch(matchId: number, bpo: number): Promise<void> {
  const innRows = await db.query.innings.findMany({
    where: eq(innings.matchId, matchId),
    orderBy: (i, { asc }) => [asc(i.inningsNumber)],
  })
  for (const inn of innRows) {
    await recomputeInningsAggregates(inn.id, bpo)
  }
}
