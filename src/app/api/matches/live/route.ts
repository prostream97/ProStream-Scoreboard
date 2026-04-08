import { NextResponse } from 'next/server'
import { getLiveMatches } from '@/lib/db/queries/match'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await getLiveMatches()
    return NextResponse.json(
      rows.map((m) => ({
        id: m.id,
        status: m.status,
        format: m.format,
        totalOvers: m.totalOvers,
        ballsPerOver: m.ballsPerOver ?? 6,
        matchLabel: m.matchLabel,
        tournament: m.tournament
          ? { name: m.tournament.name, shortName: m.tournament.shortName }
          : null,
        homeTeam: {
          id: m.homeTeam.id,
          name: m.homeTeam.name,
          shortCode: m.homeTeam.shortCode,
          primaryColor: m.homeTeam.primaryColor,
          logoCloudinaryId: m.homeTeam.logoCloudinaryId,
        },
        awayTeam: {
          id: m.awayTeam.id,
          name: m.awayTeam.name,
          shortCode: m.awayTeam.shortCode,
          primaryColor: m.awayTeam.primaryColor,
          logoCloudinaryId: m.awayTeam.logoCloudinaryId,
        },
        innings: m.innings.map((i) => ({
          inningsNumber: i.inningsNumber,
          battingTeamId: i.battingTeamId,
          totalRuns: i.totalRuns,
          wickets: i.wickets,
          overs: i.overs,
          balls: i.balls,
        })),
      })),
    )
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
