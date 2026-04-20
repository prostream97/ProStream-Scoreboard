import { db } from '@/lib/db'
import { matches, innings, players, teams, deliveries } from '@/lib/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'

const NON_BOWLER_WICKET_TYPES = new Set(['runout', 'obstructingfield', 'handledball'])

export type TournamentBatterStats = {
  playerId: number
  displayName: string
  teamName: string
  matches: number
  innings: number
  runs: number
  highestScore: number
  highestNotOut: boolean
  average: number | null
  strikeRate: number
  fifties: number
  hundreds: number
}

export type TournamentBowlerStats = {
  playerId: number
  displayName: string
  teamName: string
  matches: number
  innings: number
  overs: number
  balls: number
  runs: number
  wickets: number
  economy: number
  average: number | null
  bestWickets: number
  bestRuns: number
}

type InningsBattingRow = {
  inningsId: number
  matchId: number
  runs: number
  balls: number
  isOut: boolean
}

type InningsBowlingRow = {
  inningsId: number
  matchId: number
  runs: number
  balls: number
  wickets: number
}

export async function getTournamentBatterStats(
  matchId: number,
  playerId: number,
): Promise<TournamentBatterStats | null> {
  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: { tournament: true, state: true, innings: true },
  })
  if (!matchRow?.tournamentId || !matchRow.tournament) return null

  const playerRow = await db.query.players.findFirst({
    where: eq(players.id, playerId),
    with: { team: true },
  })
  if (!playerRow) return null

  // Per-innings batting stats from persisted deliveries
  const persistedRows = await db
    .select({
      inningsId: deliveries.inningsId,
      matchId: innings.matchId,
      runs: sql<number>`SUM(${deliveries.runs})`.as('runs'),
      balls: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isLegal} = true)`.as('balls'),
      isOut: sql<boolean>`bool_or(${deliveries.isWicket} = true AND ${deliveries.dismissedBatterId} = ${playerId})`.as('is_out'),
    })
    .from(deliveries)
    .innerJoin(innings, eq(deliveries.inningsId, innings.id))
    .innerJoin(matches, eq(innings.matchId, matches.id))
    .where(
      and(
        eq(matches.tournamentId, matchRow.tournamentId),
        eq(deliveries.batsmanId, playerId),
      ),
    )
    .groupBy(deliveries.inningsId, innings.matchId)

  const inningsMap = new Map<number, InningsBattingRow>(
    persistedRows.map((r) => [
      r.inningsId,
      {
        inningsId: r.inningsId,
        matchId: Number(r.matchId),
        runs: Number(r.runs) || 0,
        balls: Number(r.balls) || 0,
        isOut: Boolean(r.isOut),
      },
    ]),
  )

  // Apply live over buffer for the current innings
  const currentInningsRow = matchRow.innings.find(
    (inn) => inn.inningsNumber === (matchRow.state?.currentInnings ?? 1),
  )
  const liveBuffer = matchRow.state?.currentOverBuffer ?? []

  if (currentInningsRow && liveBuffer.length > 0) {
    const liveDeliveries = liveBuffer.filter((d) => d.batsmanId === playerId)
    if (liveDeliveries.length > 0) {
      const existing = inningsMap.get(currentInningsRow.id)
      const baseRuns = existing?.runs ?? 0
      const baseBalls = existing?.balls ?? 0
      const baseIsOut = existing?.isOut ?? false
      let liveRuns = 0
      let liveBalls = 0
      let liveIsOut = false
      for (const d of liveDeliveries) {
        liveRuns += d.runs
        if (d.isLegal) liveBalls += 1
        if (d.isWicket && d.dismissedBatterId === playerId) liveIsOut = true
      }
      inningsMap.set(currentInningsRow.id, {
        inningsId: currentInningsRow.id,
        matchId: currentInningsRow.matchId,
        runs: baseRuns + liveRuns,
        balls: baseBalls + liveBalls,
        isOut: baseIsOut || liveIsOut,
      })
    }
  }

  const rows = [...inningsMap.values()]
  if (rows.length === 0) {
    return {
      playerId,
      displayName: playerRow.displayName,
      teamName: playerRow.team.name,
      matches: 0,
      innings: 0,
      runs: 0,
      highestScore: 0,
      highestNotOut: false,
      average: null,
      strikeRate: 0,
      fifties: 0,
      hundreds: 0,
    }
  }

  const totalRuns = rows.reduce((s, r) => s + r.runs, 0)
  const totalBalls = rows.reduce((s, r) => s + r.balls, 0)
  const dismissals = rows.filter((r) => r.isOut).length

  const highestRow = rows.reduce((best, r) =>
    r.runs > best.runs || (r.runs === best.runs && !r.isOut) ? r : best,
  )

  return {
    playerId,
    displayName: playerRow.displayName,
    teamName: playerRow.team.name,
    matches: new Set(rows.map((r) => r.matchId)).size,
    innings: rows.length,
    runs: totalRuns,
    highestScore: highestRow.runs,
    highestNotOut: !highestRow.isOut,
    average: dismissals > 0 ? Math.round((totalRuns / dismissals) * 100) / 100 : null,
    strikeRate: totalBalls > 0 ? Math.round((totalRuns / totalBalls) * 10000) / 100 : 0,
    fifties: rows.filter((r) => r.runs >= 50 && r.runs < 100).length,
    hundreds: rows.filter((r) => r.runs >= 100).length,
  }
}

export async function getTournamentBowlerStats(
  matchId: number,
  playerId: number,
): Promise<TournamentBowlerStats | null> {
  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: { tournament: true, state: true, innings: true },
  })
  if (!matchRow?.tournamentId || !matchRow.tournament) return null

  const playerRow = await db.query.players.findFirst({
    where: eq(players.id, playerId),
    with: { team: true },
  })
  if (!playerRow) return null

  // Per-innings bowling stats from persisted deliveries
  const persistedRows = await db
    .select({
      inningsId: deliveries.inningsId,
      matchId: innings.matchId,
      runs: sql<number>`SUM(${deliveries.runs} + ${deliveries.extraRuns})`.as('runs'),
      balls: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isLegal} = true)`.as('balls'),
      wickets: sql<number>`COUNT(*) FILTER (WHERE ${deliveries.isWicket} = true AND ${deliveries.dismissalType} NOT IN ('runout', 'obstructingfield', 'handledball'))`.as('wickets'),
    })
    .from(deliveries)
    .innerJoin(innings, eq(deliveries.inningsId, innings.id))
    .innerJoin(matches, eq(innings.matchId, matches.id))
    .where(
      and(
        eq(matches.tournamentId, matchRow.tournamentId),
        eq(deliveries.bowlerId, playerId),
      ),
    )
    .groupBy(deliveries.inningsId, innings.matchId)

  const inningsMap = new Map<number, InningsBowlingRow>(
    persistedRows.map((r) => [
      r.inningsId,
      {
        inningsId: r.inningsId,
        matchId: Number(r.matchId),
        runs: Number(r.runs) || 0,
        balls: Number(r.balls) || 0,
        wickets: Number(r.wickets) || 0,
      },
    ]),
  )

  // Apply live over buffer for the current innings
  const currentInningsRow = matchRow.innings.find(
    (inn) => inn.inningsNumber === (matchRow.state?.currentInnings ?? 1),
  )
  const liveBuffer = matchRow.state?.currentOverBuffer ?? []

  if (currentInningsRow && liveBuffer.length > 0) {
    const liveDeliveries = liveBuffer.filter((d) => d.bowlerId === playerId)
    if (liveDeliveries.length > 0) {
      const existing = inningsMap.get(currentInningsRow.id)
      let liveRuns = 0
      let liveBalls = 0
      let liveWickets = 0
      for (const d of liveDeliveries) {
        liveRuns += d.runs + d.extraRuns
        if (d.isLegal) liveBalls += 1
        if (d.isWicket && !NON_BOWLER_WICKET_TYPES.has(d.dismissalType ?? '')) {
          liveWickets += 1
        }
      }
      inningsMap.set(currentInningsRow.id, {
        inningsId: currentInningsRow.id,
        matchId: currentInningsRow.matchId,
        runs: (existing?.runs ?? 0) + liveRuns,
        balls: (existing?.balls ?? 0) + liveBalls,
        wickets: (existing?.wickets ?? 0) + liveWickets,
      })
    }
  }

  const rows = [...inningsMap.values()]
  if (rows.length === 0) {
    return {
      playerId,
      displayName: playerRow.displayName,
      teamName: playerRow.team.name,
      matches: 0,
      innings: 0,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      average: null,
      bestWickets: 0,
      bestRuns: 0,
    }
  }

  const totalRuns = rows.reduce((s, r) => s + r.runs, 0)
  const totalBalls = rows.reduce((s, r) => s + r.balls, 0)
  const totalWickets = rows.reduce((s, r) => s + r.wickets, 0)

  // Best figures: most wickets, then fewest runs
  const bestRow = rows.reduce((best, r) =>
    r.wickets > best.wickets || (r.wickets === best.wickets && r.runs < best.runs) ? r : best,
  )

  return {
    playerId,
    displayName: playerRow.displayName,
    teamName: playerRow.team.name,
    matches: new Set(rows.map((r) => r.matchId)).size,
    innings: rows.length,
    overs: Math.floor(totalBalls / 6),
    balls: totalBalls % 6,
    runs: totalRuns,
    wickets: totalWickets,
    economy: totalBalls > 0 ? Math.round((totalRuns / totalBalls) * 600) / 100 : 0,
    average: totalWickets > 0 ? Math.round((totalRuns / totalWickets) * 100) / 100 : null,
    bestWickets: bestRow.wickets,
    bestRuns: bestRow.runs,
  }
}
