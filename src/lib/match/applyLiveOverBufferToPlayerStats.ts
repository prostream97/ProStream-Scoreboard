import type { DeliveryBuffer } from '@/lib/db/schema'
import type { BatterStats, BowlerStats, DeliveryInput, PlayerSummary } from '@/types/match'

/** Same rules as matchStore.updateBowlersOptimistically */
function chargeableExtraRuns(input: DeliveryInput): number {
  if (input.extraType === 'bye' || input.extraType === 'legbye' || input.extraType === 'penalty') return 0
  return input.extraRuns
}

const NON_BOWLER_WICKET_TYPES = new Set(['runout', 'obstructingfield', 'handledball'])

function createEmptyBatter(playerId: number, battingTeamPlayers: PlayerSummary[]): BatterStats | null {
  const player = battingTeamPlayers.find((p) => p.id === playerId)
  if (!player) return null
  return {
    playerId,
    playerName: player.name,
    displayName: player.displayName,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isStriker: false,
    isOut: false,
    dismissalType: null,
    dismissalText: null,
  }
}

function bufferRowToInput(d: DeliveryBuffer): DeliveryInput {
  return {
    runs: d.runs,
    extraRuns: d.extraRuns,
    isLegal: d.isLegal,
    extraType: d.extraType,
    isWicket: d.isWicket,
    isBoundary: d.isBoundary,
    dismissalType: (d.dismissalType as DeliveryInput['dismissalType']) ?? null,
    dismissedBatterId: d.dismissedBatterId ?? null,
    fielder1Id: d.fielder1Id,
    fielder2Id: d.fielder2Id,
  }
}

/**
 * Applies in-memory current-over deliveries (not yet flushed to `deliveries`) to batter and bowler
 * figures so they match the scoreboard / over dots. Mirrors matchStore optimistic updates.
 */
export function applyLiveOverBufferToPlayerStats(
  batters: BatterStats[],
  bowlers: BowlerStats[],
  buffer: DeliveryBuffer[] | undefined,
  battingTeamPlayers: PlayerSummary[],
  bowlingTeamPlayers: PlayerSummary[],
  bpo: number,
  strikerId: number | null,
  currentBowlerId: number | null,
  nonStrikerId?: number | null,
): { batters: BatterStats[]; bowlers: BowlerStats[] } {
  if (!buffer?.length) {
    // Even with no buffer deliveries, ensure the selected striker/non-striker/bowler
    // appear in the arrays with zeroed stats (e.g. start of a new innings)
    const existingBatterIds = new Set(batters.map(b => b.playerId))
    const battersToAdd: BatterStats[] = []

    for (const id of [strikerId, nonStrikerId ?? null]) {
      if (id && !existingBatterIds.has(id)) {
        const empty = createEmptyBatter(id, battingTeamPlayers)
        if (empty) {
          empty.isStriker = id === strikerId
          battersToAdd.push(empty)
          existingBatterIds.add(id)
        }
      }
    }

    const patchedBatters = battersToAdd.length
      ? [...batters.map(b => ({ ...b, isStriker: strikerId != null && b.playerId === strikerId })), ...battersToAdd]
      : batters.map(b => ({ ...b, isStriker: strikerId != null && b.playerId === strikerId }))

    let patchedBowlers = bowlers
    if (currentBowlerId && !bowlers.some(b => b.playerId === currentBowlerId)) {
      const player = bowlingTeamPlayers.find(p => p.id === currentBowlerId)
      if (player) {
        patchedBowlers = [
          ...bowlers.map(b => ({ ...b, isCurrent: false })),
          {
            playerId: currentBowlerId,
            playerName: player.name,
            displayName: player.displayName,
            overs: 0,
            balls: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            economy: 0,
            isCurrent: true,
          },
        ]
      }
    }

    return { batters: patchedBatters, bowlers: patchedBowlers }
  }

  const rows = new Map<number, BatterStats>(batters.map((b) => [b.playerId, { ...b }]))

  const ensureBatter = (playerId: number | null): BatterStats | null => {
    if (!playerId) return null
    const existing = rows.get(playerId)
    if (existing) return existing
    const created = createEmptyBatter(playerId, battingTeamPlayers)
    if (!created) return null
    rows.set(playerId, created)
    return created
  }

  let bowlerRows = bowlers.map((b) => ({ ...b }))

  for (const d of buffer) {
    const input = bufferRowToInput(d)
    const facingId = d.batsmanId

    const facing = ensureBatter(facingId)
    if (facing) {
      const newRuns = facing.runs + input.runs
      const newBalls = facing.balls + (input.isLegal ? 1 : 0)
      rows.set(facingId, {
        ...facing,
        runs: newRuns,
        balls: newBalls,
        fours: facing.fours + (input.isBoundary && input.runs === 4 ? 1 : 0),
        sixes: facing.sixes + (input.isBoundary && input.runs === 6 ? 1 : 0),
        strikeRate: newBalls > 0 ? Math.round((newRuns / newBalls) * 10000) / 100 : 0,
      })
    }

    const dismissedBatterId = input.isWicket ? (input.dismissedBatterId ?? facingId) : null
    if (dismissedBatterId) {
      const dismissed = ensureBatter(dismissedBatterId)
      if (dismissed) {
        rows.set(dismissedBatterId, {
          ...dismissed,
          isOut: true,
          dismissalType: input.dismissalType ?? dismissed.dismissalType ?? null,
        })
      }
    }

    const bowlerId = d.bowlerId
    const charge = chargeableExtraRuns(input)
    const isChargeableWicket = input.isWicket && !NON_BOWLER_WICKET_TYPES.has(input.dismissalType ?? '')

    const existingBowler = bowlerRows.find((b) => b.playerId === bowlerId)
    const player = bowlingTeamPlayers.find((p) => p.id === bowlerId)

    if (!existingBowler && player) {
      const newLegalBalls = input.isLegal ? 1 : 0
      const completedOvers = Math.floor(newLegalBalls / bpo)
      const ballsInOver = newLegalBalls % bpo
      const newRuns = input.runs + charge
      const totalLegal = completedOvers * bpo + ballsInOver
      const oversDecimal = totalLegal / bpo
      bowlerRows = [
        ...bowlerRows.map((b) => ({ ...b, isCurrent: currentBowlerId === b.playerId })),
        {
          playerId: bowlerId,
          playerName: player.name,
          displayName: player.displayName,
          overs: completedOvers,
          balls: ballsInOver,
          maidens: 0,
          runs: newRuns,
          wickets: isChargeableWicket ? 1 : 0,
          economy: oversDecimal > 0 ? Math.round((newRuns / oversDecimal) * 100) / 100 : 0,
          isCurrent: currentBowlerId === bowlerId,
        },
      ]
    } else if (existingBowler) {
      bowlerRows = bowlerRows.map((b) => {
        if (b.playerId !== bowlerId) return { ...b, isCurrent: currentBowlerId === b.playerId }
        const newLegalBalls = b.balls + (input.isLegal ? 1 : 0)
        const completedOvers = b.overs + Math.floor(newLegalBalls / bpo)
        const ballsInOver = newLegalBalls % bpo
        const newRuns = b.runs + input.runs + charge
        const totalLegal = completedOvers * bpo + ballsInOver
        const oversDecimal = totalLegal / bpo
        return {
          ...b,
          overs: completedOvers,
          balls: ballsInOver,
          runs: newRuns,
          wickets: b.wickets + (isChargeableWicket ? 1 : 0),
          economy: oversDecimal > 0 ? Math.round((newRuns / oversDecimal) * 100) / 100 : 0,
          isCurrent: currentBowlerId === bowlerId,
        }
      })
    }
  }

  const orderedIds: number[] = [...batters.map((b) => b.playerId)]
  for (const id of rows.keys()) {
    if (!orderedIds.includes(id)) orderedIds.push(id)
  }
  const mergedBatters = orderedIds.map((id) => {
    const row = rows.get(id)!
    return {
      ...row,
      isStriker: strikerId != null && row.playerId === strikerId,
    }
  })

  return {
    batters: mergedBatters,
    bowlers: bowlerRows.map((b) => ({
      ...b,
      isCurrent: currentBowlerId != null && b.playerId === currentBowlerId,
    })),
  }
}
