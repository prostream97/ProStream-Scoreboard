import type { DismissalType, InningsState, MatchSnapshot } from './match'

// Typed payload map for every Pusher event

export type DeliveryAddedPayload = {
  matchId: number
  overNumber: number
  ballNumber: number
  runs: number
  extraRuns: number
  isLegal: boolean
  extraType: string | null
  isWicket: boolean
  batsmanId: number
  bowlerId: number
  inningsRuns: number
  inningsWickets: number
  inningsOvers: number
  inningsBalls: number
  strikerId: number
  nonStrikerId: number
}

export type WicketPayload = {
  matchId: number
  batsmanId: number
  dismissalType: DismissalType
  fielder1Id: number | null
  fielder2Id: number | null
  nextBatsmanId: number
  inningsWickets: number
}

export type OverCompletePayload = {
  matchId: number
  overNumber: number
  overRuns: number
  bowlerId: number
  maidens: number
}

export type InningsChangePayload = {
  matchId: number
  inningsNumber: number
  totalRuns: number
  wickets: number
  overs: number
  target: number
  newInnings: InningsState
}

export type DisplayTogglePayload = {
  element: 'scorebug' | 'playerCard' | 'wicketAlert' | 'partnership' | 'ticker' | 'summary' | 'header'
  visible: boolean
  playerId?: number
}

export type DlsUpdatePayload = {
  matchId: number
  revisedTarget: number
  revisedOvers: number
  parScore: number
}

export type BreakStartPayload = {
  reason: string
  message: string
}

export type MatchStatePayload = MatchSnapshot

export type PusherEvents = {
  'delivery.added': DeliveryAddedPayload
  'wicket.fell': WicketPayload
  'over.complete': OverCompletePayload
  'innings.change': InningsChangePayload
  'display.toggle': DisplayTogglePayload
  'dls.update': DlsUpdatePayload
  'break.start': BreakStartPayload
  'break.end': Record<string, never>
  'match.state': MatchStatePayload
}
