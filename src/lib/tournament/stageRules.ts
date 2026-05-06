import type {
  MatchStage,
  TournamentStageCounts,
  TournamentStagePath,
  TournamentStageStructure,
} from '@/types/tournament'

type StageRuleMatch = {
  matchStage: MatchStage | null
  status: string
}

export const MATCH_STAGE_ORDER: MatchStage[] = [
  'group',
  'super_round',
  'quarter_final',
  'semi_final',
  'final',
  'third_place',
]

export const MATCH_STAGE_LABELS: Record<MatchStage, string> = {
  group: 'Group Stage',
  super_round: 'Super Round',
  quarter_final: 'Quarter Final',
  semi_final: 'Semi Final',
  final: 'Final',
  third_place: 'Third Place',
}

const EMPTY_COUNTS: TournamentStageCounts = {
  group: 0,
  super_round: 0,
  quarter_final: 0,
  semi_final: 0,
  final: 0,
  third_place: 0,
}

// group and super_round are unlimited; only knockout stages have caps
const MAX_COUNTS: Record<Exclude<MatchStage, 'group' | 'super_round'>, number> = {
  quarter_final: 4,
  semi_final: 2,
  final: 1,
  third_place: 1,
}

function normalizeStage(stage: MatchStage | null): MatchStage {
  return stage ?? 'group'
}

function isMatchComplete(status: string): boolean {
  return status === 'complete'
}

export function buildTournamentStageStructure(matches: StageRuleMatch[]): TournamentStageStructure {
  const counts: TournamentStageCounts = { ...EMPTY_COUNTS }
  const completedCounts: TournamentStageCounts = { ...EMPTY_COUNTS }

  for (const match of matches) {
    const stage = normalizeStage(match.matchStage)
    counts[stage] += 1
    if (isMatchComplete(match.status)) {
      completedCounts[stage] += 1
    }
  }

  const hasQuarterFinals = counts.quarter_final > 0
  const hasSemisPathMatches = counts.semi_final > 0 || counts.final > 0 || counts.third_place > 0
  const path: TournamentStagePath = hasQuarterFinals
    ? 'with_quarters'
    : hasSemisPathMatches
      ? 'semis_only'
      : null

  const knockoutStarted = counts.quarter_final + counts.semi_final + counts.final + counts.third_place > 0
  const reasonsByStage: Partial<Record<MatchStage, string>> = {}

  if (knockoutStarted) {
    reasonsByStage.group = 'Group-stage matches are locked once knockout matches exist.'
    reasonsByStage.super_round = 'Super round matches are locked once knockout matches exist.'
  }

  if (path === 'semis_only') {
    reasonsByStage.quarter_final = 'Quarter finals cannot be added after the semifinals path begins.'
  } else if (counts.quarter_final >= MAX_COUNTS.quarter_final) {
    reasonsByStage.quarter_final = 'Quarter finals are limited to 4 matches.'
  }

  if (path === 'with_quarters') {
    if (counts.quarter_final < MAX_COUNTS.quarter_final) {
      reasonsByStage.semi_final = 'Create all 4 quarter finals before adding semifinals.'
    } else if (completedCounts.quarter_final < MAX_COUNTS.quarter_final) {
      reasonsByStage.semi_final = 'All quarter finals must be complete before adding semifinals.'
    } else if (counts.semi_final >= MAX_COUNTS.semi_final) {
      reasonsByStage.semi_final = 'Semi finals are limited to 2 matches.'
    }
  } else if (counts.semi_final >= MAX_COUNTS.semi_final) {
    reasonsByStage.semi_final = 'Semi finals are limited to 2 matches.'
  }

  if (counts.final >= MAX_COUNTS.final) {
    reasonsByStage.final = 'Only one final match is allowed.'
  } else if (counts.semi_final < MAX_COUNTS.semi_final) {
    reasonsByStage.final = 'Create both semi finals before adding the final.'
  } else if (completedCounts.semi_final < MAX_COUNTS.semi_final) {
    reasonsByStage.final = 'Both semi finals must be complete before adding the final.'
  }

  if (counts.third_place >= MAX_COUNTS.third_place) {
    reasonsByStage.third_place = 'Only one third-place match is allowed.'
  } else if (counts.semi_final < MAX_COUNTS.semi_final) {
    reasonsByStage.third_place = 'Create both semi finals before adding the third-place match.'
  }

  const allowedStages = MATCH_STAGE_ORDER.filter((stage) => !reasonsByStage[stage])

  return {
    path,
    counts,
    allowedStages,
    reasonsByStage,
  }
}
