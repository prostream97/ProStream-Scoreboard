// Duckworth-Lewis-Stern resource percentage table
// Source: ICC Edition (simplified standard edition)
// Rows: wickets lost (0-9), Columns: overs remaining (1-50)

// resourceTable[wicketsLost][oversRemaining] = resource%
// Only storing key columns; we interpolate for others.

const WICKETS_LOST = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
type WicketsLost = (typeof WICKETS_LOST)[number]

// Resource percentages for overs remaining (50 down to 1)
// Source: Standard Edition table values (publicly known from ICC documentation)
const RESOURCE_TABLE: Record<WicketsLost, number[]> = {
  //         50    49    48    47    46    45    44    43    42    41
  0: [100.0, 99.1, 98.1, 97.1, 96.1, 95.0, 93.9, 92.8, 91.6, 90.4,
  //  40    39    38    37    36    35    34    33    32    31
      89.2, 87.9, 86.6, 85.2, 83.8, 82.3, 80.8, 79.3, 77.7, 76.1,
  //  30    29    28    27    26    25    24    23    22    21
      74.4, 72.7, 70.9, 69.1, 67.2, 65.3, 63.3, 61.3, 59.2, 57.1,
  //  20    19    18    17    16    15    14    13    12    11
      54.9, 52.7, 50.4, 48.1, 45.7, 43.3, 40.8, 38.3, 35.7, 33.1,
  //  10     9     8     7     6     5     4     3     2     1
      30.4, 27.7, 24.9, 22.1, 19.2, 16.3, 13.3, 10.2,  6.7,  3.6],

  1: [93.4, 92.6, 91.7, 90.8, 89.9, 88.9, 87.9, 86.8, 85.7, 84.6,
      83.4, 82.2, 80.9, 79.6, 78.3, 76.9, 75.5, 74.0, 72.5, 70.9,
      69.3, 67.6, 65.9, 64.1, 62.3, 60.4, 58.5, 56.5, 54.5, 52.4,
      50.3, 48.1, 45.9, 43.6, 41.3, 38.9, 36.5, 34.0, 31.5, 29.0,
      26.5, 24.0, 21.5, 19.0, 16.5, 14.0, 11.5,  8.8,  5.8,  3.1],

  2: [85.1, 84.4, 83.6, 82.8, 81.9, 81.0, 80.0, 79.0, 77.9, 76.8,
      75.7, 74.5, 73.2, 72.0, 70.6, 69.2, 67.8, 66.3, 64.8, 63.2,
      61.6, 59.9, 58.2, 56.5, 54.7, 52.9, 51.0, 49.1, 47.2, 45.2,
      43.2, 41.2, 39.1, 37.0, 34.8, 32.7, 30.5, 28.2, 26.0, 23.8,
      21.5, 19.3, 17.1, 14.9, 12.7, 10.6,  8.5,  6.4,  4.2,  2.2],

  3: [74.9, 74.3, 73.6, 72.9, 72.1, 71.3, 70.5, 69.6, 68.7, 67.7,
      66.7, 65.6, 64.5, 63.3, 62.1, 60.9, 59.6, 58.3, 56.9, 55.5,
      54.1, 52.6, 51.1, 49.5, 47.9, 46.3, 44.7, 43.0, 41.2, 39.5,
      37.7, 35.9, 34.0, 32.2, 30.3, 28.4, 26.5, 24.6, 22.6, 20.7,
      18.8, 16.8, 14.9, 13.0, 11.1,  9.2,  7.3,  5.5,  3.6,  1.9],

  4: [62.7, 62.2, 61.6, 61.0, 60.4, 59.7, 59.0, 58.3, 57.5, 56.7,
      55.8, 54.9, 54.0, 53.0, 52.0, 51.0, 49.9, 48.8, 47.6, 46.4,
      45.2, 43.9, 42.7, 41.4, 40.1, 38.7, 37.3, 35.9, 34.5, 33.1,
      31.6, 30.1, 28.7, 27.2, 25.7, 24.1, 22.6, 21.1, 19.5, 17.9,
      16.3, 14.8, 13.2, 11.6, 10.0,  8.4,  6.8,  5.1,  3.4,  1.8],

  5: [49.0, 48.6, 48.2, 47.7, 47.2, 46.7, 46.2, 45.7, 45.1, 44.5,
      43.9, 43.3, 42.6, 41.9, 41.2, 40.5, 39.7, 38.9, 38.1, 37.3,
      36.4, 35.5, 34.6, 33.7, 32.8, 31.8, 30.8, 29.8, 28.8, 27.7,
      26.7, 25.6, 24.5, 23.4, 22.3, 21.1, 20.0, 18.8, 17.6, 16.4,
      15.1, 13.9, 12.6, 11.3, 10.0,  8.7,  7.3,  5.8,  3.9,  2.1],

  6: [34.9, 34.6, 34.3, 34.0, 33.7, 33.4, 33.0, 32.7, 32.3, 31.9,
      31.5, 31.1, 30.7, 30.2, 29.8, 29.3, 28.8, 28.3, 27.7, 27.2,
      26.6, 26.1, 25.5, 24.9, 24.3, 23.6, 23.0, 22.4, 21.7, 21.0,
      20.3, 19.6, 18.9, 18.2, 17.5, 16.7, 15.9, 15.2, 14.4, 13.5,
      12.7, 11.9, 10.9, 10.0,  9.0,  7.9,  6.8,  5.5,  3.7,  2.0],

  7: [22.0, 21.8, 21.6, 21.4, 21.2, 21.0, 20.8, 20.6, 20.3, 20.1,
      19.8, 19.6, 19.3, 19.0, 18.7, 18.4, 18.1, 17.8, 17.5, 17.2,
      16.8, 16.4, 16.1, 15.7, 15.3, 14.9, 14.5, 14.1, 13.7, 13.2,
      12.8, 12.3, 11.9, 11.4, 10.9, 10.4,  9.9,  9.4,  8.9,  8.3,
       7.8,  7.2,  6.7,  6.1,  5.5,  4.9,  4.2,  3.5,  2.5,  1.3],

  8: [11.9, 11.8, 11.7, 11.6, 11.5, 11.4, 11.3, 11.2, 11.0, 10.9,
      10.8, 10.6, 10.5, 10.3, 10.2, 10.0,  9.9,  9.7,  9.5,  9.3,
       9.2,  9.0,  8.8,  8.6,  8.3,  8.1,  7.9,  7.7,  7.5,  7.2,
       7.0,  6.7,  6.5,  6.2,  6.0,  5.7,  5.4,  5.1,  4.8,  4.5,
       4.2,  3.9,  3.6,  3.3,  3.0,  2.6,  2.3,  1.9,  1.4,  0.8],

  9: [ 4.7,  4.7,  4.6,  4.6,  4.5,  4.5,  4.4,  4.4,  4.3,  4.3,
       4.2,  4.2,  4.1,  4.0,  4.0,  3.9,  3.8,  3.8,  3.7,  3.6,
       3.6,  3.5,  3.4,  3.3,  3.2,  3.2,  3.1,  3.0,  2.9,  2.8,
       2.7,  2.6,  2.5,  2.4,  2.3,  2.2,  2.1,  2.0,  1.9,  1.7,
       1.6,  1.5,  1.3,  1.2,  1.1,  0.9,  0.8,  0.6,  0.4,  0.2],
}

/**
 * Get resource percentage for a given number of overs remaining and wickets lost.
 * Interpolates between whole-over values.
 */
export function getResource(oversRemaining: number, wicketsLost: number): number {
  const w = Math.min(9, Math.max(0, Math.floor(wicketsLost))) as WicketsLost
  const table = RESOURCE_TABLE[w]

  if (oversRemaining <= 0) return 0
  if (oversRemaining >= 50) return table[0]

  // Table is indexed from 50 overs down: index 0 = 50 overs, index 49 = 1 over
  const fullOvers = Math.floor(oversRemaining)
  const ballFraction = oversRemaining - fullOvers

  const highIdx = 50 - fullOvers - 1  // index for fullOvers+1 remaining
  const lowIdx = 50 - fullOvers       // index for fullOvers remaining

  const highVal = table[Math.min(49, Math.max(0, highIdx))] ?? 0
  const lowVal = table[Math.min(49, Math.max(0, lowIdx))] ?? 0

  return highVal + (lowVal - highVal) * (1 - ballFraction)
}

/**
 * Calculate DLS revised target for team 2.
 *
 * @param team1Score - Team 1's final score (runs)
 * @param team1Overs - Full overs team 1 faced (e.g. 50 for ODI)
 * @param team2OversAvailable - Overs available for team 2 (may be reduced by rain)
 * @param team2WicketsLost - Wickets already lost when interruption occurred (default 0)
 * @param team2RunsScored - Runs already scored when interruption occurred (default 0)
 * @param team2OversUsed - Overs used before interruption (default 0)
 */
export function calculateRevisedTarget(
  team1Score: number,
  team1Overs: number,
  team2OversAvailable: number,
  team2WicketsLost = 0,
  team2RunsScored = 0,
  team2OversUsed = 0,
): {
  revisedTarget: number
  parScore: number
  resourcePercent: number
} {
  // Team 1's full resource (start of innings, 0 wickets, all overs remaining)
  const r1 = getResource(team1Overs, 0)

  // Team 2's resource before interruption
  const r2Before = getResource(team2OversAvailable, team2WicketsLost)

  // Team 2's remaining resource after suspension
  const oversRemainingAfter = team2OversAvailable - team2OversUsed
  const r2After = getResource(oversRemainingAfter, team2WicketsLost)

  // Resource lost in suspension
  const resourceLost = r2Before - r2After

  // Team 2 revised par score (before any runs scored)
  const resourcePercent = Math.max(0, r1 - resourceLost) / r1
  const parScore = Math.round(team1Score * resourcePercent) + (team2RunsScored > 0 ? 1 : 0)

  // Revised target = par score + 1 (team 2 needs to exceed)
  const revisedTarget = parScore + 1 - team2RunsScored

  return {
    revisedTarget: Math.max(1, revisedTarget),
    parScore: parScore - team2RunsScored,
    resourcePercent: Math.round(resourcePercent * 10000) / 100,
  }
}

/**
 * Simple par score display: what team 2 needs at any point during their innings
 * given the current match state and overs available.
 */
export function parScoreAtOvers(
  team1Score: number,
  team1Overs: number,
  team2OversTotal: number,
  team2OversUsed: number,
  team2WicketsLost: number,
): number {
  const r1 = getResource(team1Overs, 0)
  const r2Total = getResource(team2OversTotal, 0)
  const r2Remaining = getResource(team2OversTotal - team2OversUsed, team2WicketsLost)
  const r2Used = r2Total - r2Remaining
  const parFraction = r2Used / r1
  return Math.round(team1Score * parFraction)
}
