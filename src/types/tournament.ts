export type TournamentStatus = 'upcoming' | 'group_stage' | 'knockout' | 'complete'
export type MatchStage = 'group' | 'quarter_final' | 'semi_final' | 'final' | 'third_place'

export type Tournament = {
  id: number
  name: string
  shortName: string
  status: TournamentStatus
  format: string
  totalOvers: number
  createdAt: string
}

export type TournamentTeam = {
  id: number
  tournamentId: number
  teamId: number
  groupName: string | null
  createdAt: string
  team: {
    id: number
    name: string
    shortCode: string
    primaryColor: string
    secondaryColor: string
    logoCloudinaryId: string | null
  }
}

export type TournamentMatch = {
  id: number
  format: string
  status: string
  venue: string | null
  date: string
  totalOvers: number
  matchStage: MatchStage | null
  matchLabel: string | null
  homeTeam: { id: number; name: string; shortCode: string; primaryColor: string }
  awayTeam: { id: number; name: string; shortCode: string; primaryColor: string }
}

export type TournamentWithDetails = Tournament & {
  enrolledTeams: TournamentTeam[]
  matches: TournamentMatch[]
}

export type StandingRow = {
  teamId: number
  teamName: string
  teamShortCode: string
  primaryColor: string
  played: number
  won: number
  lost: number
  tied: number
  points: number
  nrr: number
}
