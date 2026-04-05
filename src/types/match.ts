// ─── Enums ────────────────────────────────────────────────────────────────────

export type MatchFormat = 'T20' | 'ODI' | 'T10' | 'custom'
export type MatchStatus = 'setup' | 'active' | 'paused' | 'break' | 'complete'
export type TossDecision = 'bat' | 'field'
export type InningsStatus = 'active' | 'complete' | 'declared'
export type ExtraType = 'wide' | 'noball' | 'bye' | 'legbye'
export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'runout'
  | 'stumped'
  | 'hitwicket'
  | 'obstructingfield'
  | 'handledball'
  | 'timedout'

// ─── Core Entities ────────────────────────────────────────────────────────────

export type TeamSummary = {
  id: number
  name: string
  shortCode: string
  primaryColor: string
  secondaryColor: string
  logoCloudinaryId: string | null
}

export type PlayerSummary = {
  id: number
  name: string
  displayName: string
  role: 'batsman' | 'bowler' | 'allrounder' | 'keeper'
  battingStyle: string | null
  bowlingStyle: string | null
  headshotCloudinaryId: string | null
}

// ─── Delivery (in-memory, before DB flush) ────────────────────────────────────

export type DeliveryInput = {
  runs: number              // runs off the bat only
  extraRuns: number
  isLegal: boolean          // false for WD and NB only
  extraType: ExtraType | null
  isWicket: boolean
  dismissalType: DismissalType | null
  fielder1Id: number | null
  fielder2Id: number | null
}

export type DeliveryRecord = DeliveryInput & {
  overNumber: number
  ballNumber: number
  batsmanId: number
  bowlerId: number
  timestamp: string
}

// ─── Innings State ────────────────────────────────────────────────────────────

export type InningsState = {
  id: number
  inningsNumber: 1 | 2
  battingTeamId: number
  bowlingTeamId: number
  totalRuns: number
  wickets: number
  overs: number   // completed overs
  balls: number   // balls in current over (0-5 legal)
  target: number | null
  status: InningsStatus
}

// ─── Batter Stats (computed) ──────────────────────────────────────────────────

export type BatterStats = {
  playerId: number
  playerName: string
  displayName: string
  runs: number
  balls: number
  fours: number
  sixes: number
  strikeRate: number
  isStriker: boolean
  isOut: boolean
  dismissalType: DismissalType | null
}

// ─── Bowler Stats (computed) ──────────────────────────────────────────────────

export type BowlerStats = {
  playerId: number
  playerName: string
  displayName: string
  overs: number
  balls: number  // balls in current over
  maidens: number
  runs: number
  wickets: number
  economy: number
  isCurrent: boolean
}

// ─── Partnership ──────────────────────────────────────────────────────────────

export type PartnershipStats = {
  runs: number
  balls: number
  batter1Id: number
  batter2Id: number
}

// ─── Full Match State (snapshot from DB / Pusher) ─────────────────────────────

export type MatchSnapshot = {
  matchId: number
  format: MatchFormat
  status: MatchStatus
  venue: string | null
  tournamentName: string | null
  totalOvers: number
  ballsPerOver: number
  homeTeam: TeamSummary
  awayTeam: TeamSummary
  tossWinnerId: number | null
  tossDecision: TossDecision | null

  currentInnings: 1 | 2
  currentOver: number   // 0-indexed
  currentBalls: number  // legal balls in current over

  innings: InningsState[]
  currentInningsState: InningsState | null

  // Current players
  strikerId: number | null
  nonStrikerId: number | null
  currentBowlerId: number | null

  // Live stats for current innings
  batters: BatterStats[]
  bowlers: BowlerStats[]
  partnership: PartnershipStats | null

  // Computed run rates
  currentRunRate: number
  requiredRunRate: number | null

  // Squads (full rosters)
  battingTeamPlayers: PlayerSummary[]
  bowlingTeamPlayers: PlayerSummary[]

  // In-progress over balls (from currentOverBuffer, not yet flushed to deliveries table)
  currentOverBalls: { runs: number; extraRuns: number; isLegal: boolean; extraType: string | null; isWicket: boolean }[]
}
