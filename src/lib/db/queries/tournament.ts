import { db } from '@/lib/db'
import { tournaments, matches, teams, tournamentAccess, users, tournamentGroups } from '@/lib/db/schema'
import { eq, and, inArray, or, desc, asc } from 'drizzle-orm'
import type { TournamentWithDetails, StandingRow, TournamentUserSummary, TournamentGroup, TournamentStandingsResponse, GroupStandingRow } from '@/types/tournament'
import { buildTournamentStageStructure } from '@/lib/tournament/stageRules'

type TournamentAccessData = {
  owner: TournamentUserSummary | null
  operators: TournamentUserSummary[]
}

export async function getTournamentAccessData(
  tournamentId: number,
): Promise<TournamentAccessData | null> {
  const tournamentRow = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    columns: { createdBy: true },
  })

  if (!tournamentRow) return null

  const [ownerRow, accessRows] = await Promise.all([
    tournamentRow.createdBy
      ? db.query.users.findFirst({
          where: eq(users.id, tournamentRow.createdBy),
          columns: {
            id: true,
            username: true,
            displayName: true,
            photoCloudinaryId: true,
          },
        })
      : null,
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        photoCloudinaryId: users.photoCloudinaryId,
      })
      .from(tournamentAccess)
      .innerJoin(users, eq(users.id, tournamentAccess.userId))
      .where(eq(tournamentAccess.tournamentId, tournamentId)),
  ])

  const owner = ownerRow ?? null
  const operators = accessRows
    .filter((row) => row.id !== owner?.id)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return {
    owner,
    operators,
  }
}

export async function getTournamentList() {
  return db.query.tournaments.findMany({
    orderBy: [desc(tournaments.createdAt)],
  })
}

// Returns tournaments the user owns OR has been granted access to
export async function getAccessibleTournaments(userId: number) {
  const [ownedRows, grantedRows] = await Promise.all([
    db.select({ tournamentId: tournaments.id }).from(tournaments).where(eq(tournaments.createdBy, userId)),
    db.select({ tournamentId: tournamentAccess.tournamentId }).from(tournamentAccess).where(eq(tournamentAccess.userId, userId)),
  ])
  const ids = [...new Set([...ownedRows.map((r) => r.tournamentId), ...grantedRows.map((r) => r.tournamentId)])]
  if (ids.length === 0) return []
  return db.query.tournaments.findMany({
    where: inArray(tournaments.id, ids),
    orderBy: [desc(tournaments.createdAt)],
  })
}

export async function getTournamentListWithCounts(userId?: number) {
  // userId provided -> filter to operator's accessible tournaments only
  let rows
  if (userId !== undefined) {
    const [ownedRows, grantedRows] = await Promise.all([
      db.select({ tournamentId: tournaments.id }).from(tournaments).where(eq(tournaments.createdBy, userId)),
      db.select({ tournamentId: tournamentAccess.tournamentId }).from(tournamentAccess).where(eq(tournamentAccess.userId, userId)),
    ])
    const ids = [...new Set([...ownedRows.map((r) => r.tournamentId), ...grantedRows.map((r) => r.tournamentId)])]
    if (ids.length === 0) return []
    rows = await db.query.tournaments.findMany({
      where: inArray(tournaments.id, ids),
      orderBy: [desc(tournaments.createdAt)],
      with: {
        teams: { columns: { id: true } },
        matches: { columns: { id: true } },
      },
    })
  } else {
    rows = await db.query.tournaments.findMany({
      orderBy: [desc(tournaments.createdAt)],
      with: {
        teams: { columns: { id: true } },
        matches: { columns: { id: true } },
      },
    })
  }
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    status: t.status,
    format: t.format,
    totalOvers: t.totalOvers,
    createdAt: t.createdAt,
    teamCount: t.teams.length,
    matchCount: t.matches.length,
  }))
}

export async function getTournamentsWithTeams() {
  const rows = await db.query.tournaments.findMany({
    orderBy: [desc(tournaments.createdAt)],
    with: {
      teams: true,
    },
  })
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    format: t.format,
    totalOvers: t.totalOvers,
    teams: t.teams.map((team) => ({
      id: team.id,
      name: team.name,
      shortCode: team.shortCode,
      primaryColor: team.primaryColor,
      logoCloudinaryId: team.logoCloudinaryId,
    })),
  }))
}

export async function getTournamentWithDetails(
  tournamentId: number,
): Promise<TournamentWithDetails | null> {
  const row = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    with: {
      groups: {
        orderBy: [asc(tournamentGroups.sortOrder), asc(tournamentGroups.createdAt)],
      },
      teams: {
        orderBy: [asc(teams.createdAt)],
      },
      matches: {
        with: { homeTeam: true, awayTeam: true },
        orderBy: [asc(matches.date)],
      },
    },
  })

  if (!row) return null

  const accessData = await getTournamentAccessData(tournamentId)
  const groupMap = new Map(row.groups.map((g) => [g.id, g.name]))

  const tournamentMatches = row.matches.map((m) => ({
    id: m.id,
    format: m.format,
    status: m.status,
    venue: m.venue ?? null,
    date: m.date.toISOString(),
    totalOvers: m.totalOvers,
    matchStage: m.matchStage ?? null,
    matchLabel: m.matchLabel ?? null,
    groupId: m.groupId ?? null,
    tossWinnerId: m.tossWinnerId ?? null,
    tossDecision: m.tossDecision ?? null,
    resultWinnerId: m.resultWinnerId ?? null,
    resultMargin: m.resultMargin ?? null,
    resultType: m.resultType ?? null,
    homeTeam: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      shortCode: m.homeTeam.shortCode,
      primaryColor: m.homeTeam.primaryColor,
      logoCloudinaryId: m.homeTeam.logoCloudinaryId ?? null,
    },
    awayTeam: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      shortCode: m.awayTeam.shortCode,
      primaryColor: m.awayTeam.primaryColor,
      logoCloudinaryId: m.awayTeam.logoCloudinaryId ?? null,
    },
  }))

  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    status: row.status,
    format: row.format,
    totalOvers: row.totalOvers,
    ballsPerOver: row.ballsPerOver,
    logoCloudinaryId: row.logoCloudinaryId ?? null,
    createdBy: row.createdBy ?? null,
    matchDaysFrom: row.matchDaysFrom ?? null,
    matchDaysTo: row.matchDaysTo ?? null,
    createdAt: row.createdAt.toISOString(),
    owner: accessData?.owner ?? null,
    operators: accessData?.operators ?? [],
    stageStructure: buildTournamentStageStructure(
      tournamentMatches.map((match) => ({
        matchStage: match.matchStage,
        status: match.status,
      })),
    ),
    groups: row.groups.map((g) => ({
      id: g.id,
      tournamentId: g.tournamentId,
      name: g.name,
      shortName: g.shortName,
      qualifyCount: g.qualifyCount,
      sortOrder: g.sortOrder,
    })),
    teams: row.teams.map((t) => ({
      id: t.id,
      tournamentId: t.tournamentId,
      name: t.name,
      shortCode: t.shortCode,
      primaryColor: t.primaryColor,
      logoCloudinaryId: t.logoCloudinaryId ?? null,
      groupId: t.groupId ?? null,
      groupName: t.groupId ? (groupMap.get(t.groupId) ?? null) : null,
    })),
    matches: tournamentMatches,
  }
}

type Accum = {
  played: number; won: number; lost: number; tied: number; points: number
  runsFor: number; oversFaced: number; runsAgainst: number; oversConced: number
}

function buildAccum(): Accum {
  return { played: 0, won: 0, lost: 0, tied: 0, points: 0, runsFor: 0, oversFaced: 0, runsAgainst: 0, oversConced: 0 }
}

function accumulateMatch(
  acc: Map<number, Accum>,
  match: { innings: { inningsNumber: number; battingTeamId: number; totalRuns: number; overs: number; balls: number }[] },
) {
  const inn1 = match.innings.find((i) => i.inningsNumber === 1)
  const inn2 = match.innings.find((i) => i.inningsNumber === 2)
  if (!inn1 || !inn2) return

  const team1 = inn1.battingTeamId
  const team2 = inn2.battingTeamId
  if (!acc.has(team1) || !acc.has(team2)) return

  const overs1 = inn1.overs + inn1.balls / 6
  const overs2 = inn2.overs + inn2.balls / 6

  const a1 = acc.get(team1)!
  const a2 = acc.get(team2)!

  a1.runsFor += inn1.totalRuns;   a1.oversFaced += overs1
  a1.runsAgainst += inn2.totalRuns; a1.oversConced += overs2
  a2.runsFor += inn2.totalRuns;   a2.oversFaced += overs2
  a2.runsAgainst += inn1.totalRuns; a2.oversConced += overs1

  a1.played += 1
  a2.played += 1

  if (inn2.totalRuns > inn1.totalRuns) {
    a2.won += 1; a2.points += 2; a1.lost += 1
  } else if (inn1.totalRuns > inn2.totalRuns) {
    a1.won += 1; a1.points += 2; a2.lost += 1
  } else {
    a1.tied += 1; a1.points += 1; a2.tied += 1; a2.points += 1
  }
}

function accToStandingRow(
  tid: number,
  a: Accum,
  teamMap: Map<number, { name: string; shortCode: string; primaryColor: string }>,
): StandingRow | null {
  const team = teamMap.get(tid)
  if (!team) return null
  const nrr = a.oversFaced > 0 && a.oversConced > 0
    ? (a.runsFor / a.oversFaced) - (a.runsAgainst / a.oversConced)
    : 0
  return {
    teamId: tid,
    teamName: team.name,
    teamShortCode: team.shortCode,
    primaryColor: team.primaryColor,
    played: a.played,
    won: a.won,
    lost: a.lost,
    tied: a.tied,
    points: a.points,
    nrr: Math.round(nrr * 1000) / 1000,
  }
}

export async function getTournamentStandings(
  tournamentId: number,
): Promise<TournamentStandingsResponse> {
  const groups = await db
    .select()
    .from(tournamentGroups)
    .where(eq(tournamentGroups.tournamentId, tournamentId))
    .orderBy(asc(tournamentGroups.sortOrder), asc(tournamentGroups.createdAt))

  if (groups.length === 0) {
    // Legacy path: single flat standings table
    const tournamentTeams = await db
      .select({ teamId: teams.id })
      .from(teams)
      .where(eq(teams.tournamentId, tournamentId))

    if (tournamentTeams.length === 0) return { hasGroups: false, rows: [] }
    const teamIds = tournamentTeams.map((r) => r.teamId)

    const groupMatches = await db.query.matches.findMany({
      where: and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.status, 'complete'),
        or(eq(matches.matchStage, 'group'), eq(matches.matchStage, 'super_round')),
      ),
      with: { innings: true },
    })

    const acc = new Map<number, Accum>()
    for (const tid of teamIds) acc.set(tid, buildAccum())
    for (const match of groupMatches) accumulateMatch(acc, match)

    const teamRows = await db
      .select({ id: teams.id, name: teams.name, shortCode: teams.shortCode, primaryColor: teams.primaryColor })
      .from(teams)
      .where(inArray(teams.id, teamIds))
    const teamMap = new Map(teamRows.map((t) => [t.id, t]))

    const rows: StandingRow[] = []
    for (const [tid, a] of acc) {
      const row = accToStandingRow(tid, a, teamMap)
      if (row) rows.push(row)
    }
    return { hasGroups: false, rows: rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr) }
  }

  // Multi-group path: per-group standings
  const allTeamIds = (
    await db.select({ id: teams.id }).from(teams).where(eq(teams.tournamentId, tournamentId))
  ).map((r) => r.id)

  const teamRows = allTeamIds.length > 0
    ? await db
        .select({ id: teams.id, name: teams.name, shortCode: teams.shortCode, primaryColor: teams.primaryColor })
        .from(teams)
        .where(inArray(teams.id, allTeamIds))
    : []
  const teamMap = new Map(teamRows.map((t) => [t.id, t]))

  const result: TournamentStandingsResponse = { hasGroups: true, groups: [] }

  for (const group of groups) {
    const groupTeams = await db
      .select({ teamId: teams.id })
      .from(teams)
      .where(eq(teams.groupId, group.id))

    const groupTeamIds = groupTeams.map((r) => r.teamId)

    const groupMatches = await db.query.matches.findMany({
      where: and(
        eq(matches.groupId, group.id),
        eq(matches.status, 'complete'),
        or(eq(matches.matchStage, 'group'), eq(matches.matchStage, 'super_round')),
      ),
      with: { innings: true },
    })

    const acc = new Map<number, Accum>()
    for (const tid of groupTeamIds) acc.set(tid, buildAccum())
    for (const match of groupMatches) accumulateMatch(acc, match)

    const rows: GroupStandingRow[] = []
    for (const [tid, a] of acc) {
      const row = accToStandingRow(tid, a, teamMap)
      if (row) rows.push({ ...row, rank: 0, qualifies: false })
    }
    rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr)
    rows.forEach((r, i) => {
      r.rank = i + 1
      r.qualifies = r.rank <= group.qualifyCount
    })

    result.groups.push({
      group: {
        id: group.id,
        tournamentId: group.tournamentId,
        name: group.name,
        shortName: group.shortName,
        qualifyCount: group.qualifyCount,
        sortOrder: group.sortOrder,
      },
      rows,
    })
  }

  return result
}

// ─── Group CRUD Helpers ───────────────────────────────────────────────────────

export async function createGroup(
  tournamentId: number,
  data: { name: string; shortName: string; qualifyCount: number; sortOrder: number },
): Promise<TournamentGroup> {
  const [row] = await db
    .insert(tournamentGroups)
    .values({ tournamentId, ...data })
    .returning()
  return { id: row.id, tournamentId: row.tournamentId, name: row.name, shortName: row.shortName, qualifyCount: row.qualifyCount, sortOrder: row.sortOrder }
}

export async function updateGroup(
  groupId: number,
  data: Partial<{ name: string; shortName: string; qualifyCount: number; sortOrder: number }>,
): Promise<TournamentGroup> {
  const [row] = await db
    .update(tournamentGroups)
    .set(data)
    .where(eq(tournamentGroups.id, groupId))
    .returning()
  return { id: row.id, tournamentId: row.tournamentId, name: row.name, shortName: row.shortName, qualifyCount: row.qualifyCount, sortOrder: row.sortOrder }
}

export async function deleteGroup(groupId: number): Promise<void> {
  await db.delete(tournamentGroups).where(eq(tournamentGroups.id, groupId))
}

export async function assignTeamToGroup(teamId: number, groupId: number | null): Promise<void> {
  await db.update(teams).set({ groupId }).where(eq(teams.id, teamId))
}

// ─── Tournament Status Auto-Transition ────────────────────────────────────────

import type { TournamentStatus } from '@/types/tournament'

const GROUP_LIKE_STAGES = new Set(['group', 'super_round'])
const KNOCKOUT_STAGES = new Set(['quarter_final', 'semi_final', 'final', 'third_place'])

function deriveDesiredTournamentStatus(
  allMatches: { matchStage: string | null; status: string }[],
): TournamentStatus {
  const groupMatches = allMatches.filter((m) => GROUP_LIKE_STAGES.has(m.matchStage ?? 'group'))
  const knockoutMatches = allMatches.filter((m) => m.matchStage !== null && KNOCKOUT_STAGES.has(m.matchStage))
  const finalMatch = allMatches.find((m) => m.matchStage === 'final')

  // Final match complete → tournament done
  if (finalMatch?.status === 'complete') return 'complete'

  // Any knockout match created → knockout phase
  if (knockoutMatches.length > 0) return 'knockout'

  // Any group match created → group stage
  if (groupMatches.length > 0) return 'group_stage'

  return 'upcoming'
}

/**
 * Called after a match is created or completed.
 * Advances the tournament status if the current state of all matches warrants it.
 */
export async function maybeAdvanceTournamentStatus(matchId: number): Promise<void> {
  // Load the match to get its tournamentId
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { tournamentId: true },
  })
  if (!match?.tournamentId) return

  const tournamentId = match.tournamentId

  // Load current tournament status
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    columns: { status: true },
  })
  if (!tournament) return

  // Load all matches in this tournament
  const allMatches = await db
    .select({ matchStage: matches.matchStage, status: matches.status })
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))

  const desired = deriveDesiredTournamentStatus(allMatches)
  if (desired !== tournament.status) {
    await db.update(tournaments).set({ status: desired }).where(eq(tournaments.id, tournamentId))
  }
}
