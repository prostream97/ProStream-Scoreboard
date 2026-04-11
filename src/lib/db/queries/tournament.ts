import { db } from '@/lib/db'
import { tournaments, matches, teams, tournamentAccess, users } from '@/lib/db/schema'
import { eq, and, inArray, desc, asc } from 'drizzle-orm'
import type { TournamentWithDetails, StandingRow, TournamentUserSummary } from '@/types/tournament'
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
  const tournamentMatches = row.matches.map((m) => ({
    id: m.id,
    format: m.format,
    status: m.status,
    venue: m.venue ?? null,
    date: m.date.toISOString(),
    totalOvers: m.totalOvers,
    matchStage: m.matchStage ?? null,
    matchLabel: m.matchLabel ?? null,
    homeTeam: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      shortCode: m.homeTeam.shortCode,
      primaryColor: m.homeTeam.primaryColor,
    },
    awayTeam: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      shortCode: m.awayTeam.shortCode,
      primaryColor: m.awayTeam.primaryColor,
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
    teams: row.teams.map((t) => ({
      id: t.id,
      tournamentId: t.tournamentId,
      name: t.name,
      shortCode: t.shortCode,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      logoCloudinaryId: t.logoCloudinaryId ?? null,
    })),
    matches: tournamentMatches,
  }
}

export async function getTournamentStandings(
  tournamentId: number,
): Promise<StandingRow[]> {
  // 1. Get team IDs belonging to this tournament
  const tournamentTeams = await db
    .select({ teamId: teams.id })
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId))

  if (tournamentTeams.length === 0) return []
  const teamIds = tournamentTeams.map((r) => r.teamId)

  // 2. Fetch completed group matches with their innings
  const groupMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.tournamentId, tournamentId),
      eq(matches.status, 'complete'),
      eq(matches.matchStage, 'group'),
    ),
    with: { innings: true },
  })

  // 3. Accumulate per-team stats
  type Accum = {
    played: number; won: number; lost: number; tied: number; points: number
    runsFor: number; oversFaced: number; runsAgainst: number; oversConced: number
  }

  const acc = new Map<number, Accum>()
  for (const tid of teamIds) {
    acc.set(tid, { played: 0, won: 0, lost: 0, tied: 0, points: 0, runsFor: 0, oversFaced: 0, runsAgainst: 0, oversConced: 0 })
  }

  for (const match of groupMatches) {
    const inn1 = match.innings.find((i) => i.inningsNumber === 1)
    const inn2 = match.innings.find((i) => i.inningsNumber === 2)
    if (!inn1 || !inn2) continue

    const team1 = inn1.battingTeamId  // batted first
    const team2 = inn2.battingTeamId  // batted second

    if (!acc.has(team1) || !acc.has(team2)) continue

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

  // 4. Fetch team details
  const teamRows = await db
    .select({ id: teams.id, name: teams.name, shortCode: teams.shortCode, primaryColor: teams.primaryColor })
    .from(teams)
    .where(inArray(teams.id, teamIds))
  const teamMap = new Map(teamRows.map((t) => [t.id, t]))

  // 5. Build sorted StandingRow[]
  const rows: StandingRow[] = []
  for (const [tid, a] of acc) {
    const team = teamMap.get(tid)
    if (!team) continue
    const nrr = a.oversFaced > 0 && a.oversConced > 0
      ? (a.runsFor / a.oversFaced) - (a.runsAgainst / a.oversConced)
      : 0
    rows.push({
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
    })
  }

  return rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr)
}

// ─── Tournament Status Auto-Transition ────────────────────────────────────────

import type { TournamentStatus } from '@/types/tournament'

function deriveDesiredTournamentStatus(
  allMatches: { matchStage: string | null; status: string }[],
): TournamentStatus {
  const groupMatches = allMatches.filter((m) => (m.matchStage ?? 'group') === 'group')
  const knockoutMatches = allMatches.filter((m) => m.matchStage !== null && m.matchStage !== 'group')
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
