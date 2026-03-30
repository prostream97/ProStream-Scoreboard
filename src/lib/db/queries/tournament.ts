import { db } from '@/lib/db'
import { tournaments, tournamentTeams, matches, innings, teams } from '@/lib/db/schema'
import { eq, and, inArray, desc, asc } from 'drizzle-orm'
import type { TournamentWithDetails, StandingRow } from '@/types/tournament'

export async function getTournamentList() {
  return db.query.tournaments.findMany({
    orderBy: [desc(tournaments.createdAt)],
  })
}

export async function getTournamentWithDetails(
  tournamentId: number,
): Promise<TournamentWithDetails | null> {
  const row = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    with: {
      tournamentTeams: {
        with: { team: true },
        orderBy: [asc(tournamentTeams.createdAt)],
      },
      matches: {
        with: { homeTeam: true, awayTeam: true },
        orderBy: [asc(matches.date)],
      },
    },
  })

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    status: row.status,
    format: row.format,
    totalOvers: row.totalOvers,
    createdAt: row.createdAt.toISOString(),
    enrolledTeams: row.tournamentTeams.map((tt) => ({
      id: tt.id,
      tournamentId: tt.tournamentId,
      teamId: tt.teamId,
      groupName: tt.groupName ?? null,
      createdAt: tt.createdAt.toISOString(),
      team: {
        id: tt.team.id,
        name: tt.team.name,
        shortCode: tt.team.shortCode,
        primaryColor: tt.team.primaryColor,
        secondaryColor: tt.team.secondaryColor,
        logoCloudinaryId: tt.team.logoCloudinaryId ?? null,
      },
    })),
    matches: row.matches.map((m) => ({
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
    })),
  }
}

export async function getTournamentStandings(
  tournamentId: number,
): Promise<StandingRow[]> {
  // 1. Get enrolled team IDs
  const enrolledRows = await db
    .select({ teamId: tournamentTeams.teamId })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId))

  if (enrolledRows.length === 0) return []
  const enrolledTeamIds = enrolledRows.map((r) => r.teamId)

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
  for (const tid of enrolledTeamIds) {
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

    // NRR components
    const a1 = acc.get(team1)!
    const a2 = acc.get(team2)!

    a1.runsFor += inn1.totalRuns;   a1.oversFaced += overs1
    a1.runsAgainst += inn2.totalRuns; a1.oversConced += overs2

    a2.runsFor += inn2.totalRuns;   a2.oversFaced += overs2
    a2.runsAgainst += inn1.totalRuns; a2.oversConced += overs1

    a1.played += 1
    a2.played += 1

    if (inn2.totalRuns > inn1.totalRuns) {
      // team2 (chasing) won
      a2.won += 1; a2.points += 2; a1.lost += 1
    } else if (inn1.totalRuns > inn2.totalRuns) {
      // team1 (defending) won
      a1.won += 1; a1.points += 2; a2.lost += 1
    } else {
      // tie
      a1.tied += 1; a1.points += 1; a2.tied += 1; a2.points += 1
    }
  }

  // 4. Fetch team details
  const teamRows = await db
    .select({ id: teams.id, name: teams.name, shortCode: teams.shortCode, primaryColor: teams.primaryColor })
    .from(teams)
    .where(inArray(teams.id, enrolledTeamIds))
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
