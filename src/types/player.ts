export type PlayerRole = 'batsman' | 'bowler' | 'allrounder' | 'keeper'
export type BattingStyle = 'right-hand' | 'left-hand'
export type BowlingStyle =
  | 'right-arm-fast'
  | 'right-arm-medium'
  | 'right-arm-offbreak'
  | 'right-arm-legbreak'
  | 'left-arm-fast'
  | 'left-arm-medium'
  | 'left-arm-orthodox'
  | 'left-arm-chinaman'

export type Player = {
  id: number
  teamId: number
  name: string
  displayName: string
  role: PlayerRole
  battingStyle: BattingStyle | null
  bowlingStyle: BowlingStyle | null
  headshotCloudinaryId: string | null
}

export type Team = {
  id: number
  tournamentId: number
  name: string
  shortCode: string
  primaryColor: string
  secondaryColor: string
  logoCloudinaryId: string | null
  players?: Player[]
}
