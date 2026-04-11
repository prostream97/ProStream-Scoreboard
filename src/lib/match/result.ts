// ─── Match Result Computation ──────────────────────────────────────────────────
// Pure function — no DB calls, no side effects.
// Used by both the client store (matchStore.ts) and server routes (innings/route.ts).

export type InningsEndResult =
  | { outcome: 'none' }
  | { outcome: 'innings_end'; reason: 'all_out' | 'overs_exhausted' }
  | { outcome: 'match_won_by_wickets'; winnerId: number; margin: number }
  | { outcome: 'match_won_by_runs'; winnerId: number; margin: number }
  | { outcome: 'tie' }

export type MatchResultPayload = {
  resultWinnerId: number | null
  resultMargin: number
  resultType: 'wickets' | 'runs' | 'tie'
}

export type ComputeResultInput = {
  inningsNumber: 1 | 2
  totalRuns: number
  wickets: number
  target: number | null       // only meaningful for innings 2
  totalOvers: number
  newOvers: number            // completed overs after this delivery
  remainingBalls: number      // legal balls in current partial over after this delivery
  battingTeamId: number       // team currently batting
  bowlingTeamId: number       // team currently bowling (= innings 1 batting team)
}

/**
 * Determines whether a delivery has ended an innings or the match.
 *
 * Decision order:
 * 1. Win by wickets  — innings 2, batting team reaches target
 * 2. All-out         — 10 wickets fallen
 * 3. Overs exhausted — all allotted overs have been bowled (newOvers >= totalOvers AND remainingBalls === 0)
 * 4. None            — match/innings continues
 */
export function computeMatchResult(input: ComputeResultInput): InningsEndResult {
  const { inningsNumber, totalRuns, wickets, target, totalOvers, newOvers, remainingBalls, battingTeamId, bowlingTeamId } = input

  // ── 1. Win by wickets (innings 2 only) ──────────────────────────────────────
  if (inningsNumber === 2 && target !== null && totalRuns >= target) {
    const margin = Math.max(0, 10 - wickets)
    return { outcome: 'match_won_by_wickets', winnerId: battingTeamId, margin }
  }

  // ── 2. All-out (10 wickets) ──────────────────────────────────────────────────
  if (wickets >= 10) {
    return resolveInningsExhausted({ inningsNumber, totalRuns, target, bowlingTeamId, battingTeamId })
  }

  // ── 3. Overs exhausted ──────────────────────────────────────────────────────
  if (newOvers >= totalOvers && remainingBalls === 0) {
    return resolveInningsExhausted({ inningsNumber, totalRuns, target, bowlingTeamId, battingTeamId })
  }

  return { outcome: 'none' }
}

function resolveInningsExhausted(args: {
  inningsNumber: 1 | 2
  totalRuns: number
  target: number | null
  bowlingTeamId: number   // team that bowled in innings 2 = team that batted in innings 1
  battingTeamId: number   // team currently batting
}): InningsEndResult {
  const { inningsNumber, totalRuns, target, bowlingTeamId } = args

  if (inningsNumber === 1) {
    // Innings 1 exhausted — signal to caller to end innings and start innings 2
    return { outcome: 'innings_end', reason: 'all_out' }
  }

  // Innings 2 exhausted — match is over
  if (target === null) {
    // Should not happen in a valid match, but treat as no-result
    return { outcome: 'none' }
  }

  if (totalRuns > target - 1) {
    // Batting team reached target — won by wickets (already caught above, but defensive)
    return { outcome: 'none' }
  }

  if (totalRuns === target - 1) {
    // Scores are equal (innings 2 total equals innings 1 total) → tie
    return { outcome: 'tie' }
  }

  // Batting team fell short — bowling team (innings 1 batting team) wins by runs
  const margin = (target - 1) - totalRuns  // runs short = innings1.totalRuns - innings2.totalRuns
  return { outcome: 'match_won_by_runs', winnerId: bowlingTeamId, margin }
}

/**
 * Converts an InningsEndResult to the DB/API payload shape.
 * Only valid to call when outcome is a match-ending result.
 */
export function toResultPayload(result: InningsEndResult): MatchResultPayload | null {
  if (result.outcome === 'match_won_by_wickets') {
    return { resultWinnerId: result.winnerId, resultMargin: result.margin, resultType: 'wickets' }
  }
  if (result.outcome === 'match_won_by_runs') {
    return { resultWinnerId: result.winnerId, resultMargin: result.margin, resultType: 'runs' }
  }
  if (result.outcome === 'tie') {
    return { resultWinnerId: null, resultMargin: 0, resultType: 'tie' }
  }
  return null
}
