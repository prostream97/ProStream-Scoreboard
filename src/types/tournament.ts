export type TournamentStatus = 'upcoming' | 'group_stage' | 'knockout' | 'complete'
export type MatchStage = 'group' | 'quarter_final' | 'semi_final' | 'final' | 'third_place'
export type TournamentStagePath = 'semis_only' | 'with_quarters' | null

export type TournamentStageCounts = Record<MatchStage, number>

export type TournamentStageStructure = {
  path: TournamentStagePath
  counts: TournamentStageCounts
  allowedStages: MatchStage[]
  reasonsByStage: Partial<Record<MatchStage, string>>
}

export type TournamentUserSummary = {
  id: number
  username: string
  displayName: string
  photoCloudinaryId: string | null
}

export type Tournament = {
  id: number
  name: string
  shortName: string
  status: TournamentStatus
  format: string
  totalOvers: number
  ballsPerOver: number
  logoCloudinaryId: string | null
  createdBy: number | null
  matchDaysFrom: string | null   // 'YYYY-MM-DD'
  matchDaysTo: string | null     // 'YYYY-MM-DD'
  createdAt: string
}

export type TournamentTeamSummary = {
  id: number
  tournamentId: number
  name: string
  shortCode: string
  primaryColor: string
  secondaryColor: string
  logoCloudinaryId: string | null
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
  owner: TournamentUserSummary | null
  operators: TournamentUserSummary[]
  stageStructure: TournamentStageStructure
  teams: TournamentTeamSummary[]
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
