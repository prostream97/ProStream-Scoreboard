import { create } from 'zustand'
import type { DeliveryInput, DeliveryRecord, MatchSnapshot, InningsState, BatterStats, BowlerStats, PlayerSummary } from '@/types/match'
import { computeMatchResult, toResultPayload } from '@/lib/match/result'
import { applyDeliveryToPartnershipStats, createPartnershipStats, reorderPartnershipStats } from '@/lib/match/partnership'

type WicketInput = {
  runs: number
  dismissalType: NonNullable<DeliveryInput['dismissalType']>
  dismissedBatterId: number
  incomingBatterId: number | null
  fielder1Id: number | null
  fielder2Id: number | null
  // Wide run-out: optional extra delivery context
  extraType?: DeliveryInput['extraType']
  extraRuns?: number
  isLegal?: boolean
}

// ─── Optimistic stat helpers ──────────────────────────────────────────────────

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
  }
}

function updateBattersOptimistically(
  batters: BatterStats[],
  facingBatterId: number,
  battingTeamPlayers: PlayerSummary[],
  input: DeliveryInput,
  nextStrikerId: number | null,
  nextNonStrikerId: number | null,
): BatterStats[] {
  const rows = new Map<number, BatterStats>(
    batters.map((b) => [b.playerId, { ...b, isStriker: false }]),
  )

  const ensureBatter = (playerId: number | null): BatterStats | null => {
    if (!playerId) return null
    const existing = rows.get(playerId)
    if (existing) return existing
    const created = createEmptyBatter(playerId, battingTeamPlayers)
    if (!created) return null
    rows.set(playerId, created)
    return created
  }

  const facing = ensureBatter(facingBatterId)
  if (facing) {
    const newRuns = facing.runs + input.runs
    const newBalls = facing.balls + (input.isLegal ? 1 : 0)
    rows.set(facingBatterId, {
      ...facing,
      runs: newRuns,
      balls: newBalls,
      fours: facing.fours + (input.isBoundary && input.runs === 4 ? 1 : 0),
      sixes: facing.sixes + (input.isBoundary && input.runs === 6 ? 1 : 0),
      strikeRate: newBalls > 0 ? Math.round((newRuns / newBalls) * 10000) / 100 : 0,
    })
  }

  const dismissedBatterId = input.isWicket ? (input.dismissedBatterId ?? facingBatterId) : null
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

  ensureBatter(nextStrikerId)
  ensureBatter(nextNonStrikerId)

  return Array.from(rows.values()).map((b) => ({
    ...b,
    isStriker: nextStrikerId != null && b.playerId === nextStrikerId,
  }))
}

function updateBowlersOptimistically(
  bowlers: BowlerStats[],
  bowlerId: number,
  bowlingTeamPlayers: PlayerSummary[],
  input: DeliveryInput,
  bpo: number,
): BowlerStats[] {
  const existing = bowlers.find((b) => b.playerId === bowlerId)
  const player = bowlingTeamPlayers.find((p) => p.id === bowlerId)
  if (!existing && !player) return bowlers

  // Byes, leg-byes and penalty runs are NOT charged to the bowler per Laws of Cricket
  const chargeableExtraRuns = (
    input.extraType === 'bye' || input.extraType === 'legbye' || input.extraType === 'penalty'
  ) ? 0 : input.extraRuns

  // Run-outs, obstructing the field and handled ball are NOT credited to the bowler
  const nonBowlerDismissals = ['runout', 'obstructingfield', 'handledball']
  const isChargeableWicket = input.isWicket && !nonBowlerDismissals.includes(input.dismissalType ?? '')

  if (!existing) {
    const newBowler: BowlerStats = {
      playerId: bowlerId,
      playerName: player!.name,
      displayName: player!.displayName,
      overs: 0,
      balls: input.isLegal ? 1 : 0,
      maidens: 0,
      runs: input.runs + chargeableExtraRuns,
      wickets: isChargeableWicket ? 1 : 0,
      economy: 0,
      isCurrent: true,
    }
    return [...bowlers.map((b) => ({ ...b, isCurrent: false })), newBowler]
  }

  return bowlers.map((b) => {
    if (b.playerId !== bowlerId) return b
    const newLegalBalls = b.balls + (input.isLegal ? 1 : 0)
    const completedOvers = b.overs + Math.floor(newLegalBalls / bpo)
    const ballsInOver = newLegalBalls % bpo
    const newRuns = b.runs + input.runs + chargeableExtraRuns
    const totalLegal = completedOvers * bpo + ballsInOver
    const oversDecimal = totalLegal / bpo
    return {
      ...b,
      overs: completedOvers,
      balls: ballsInOver,
      runs: newRuns,
      wickets: b.wickets + (isChargeableWicket ? 1 : 0),
      economy: oversDecimal > 0 ? Math.round((newRuns / oversDecimal) * 100) / 100 : 0,
    }
  })
}

function ensureCurrentBowler(
  bowlers: BowlerStats[],
  bowlerId: number,
  bowlingTeamPlayers: PlayerSummary[],
): BowlerStats[] {
  const existing = bowlers.find((b) => b.playerId === bowlerId)

  if (existing) {
    return bowlers.map((b) => ({
      ...b,
      isCurrent: b.playerId === bowlerId,
    }))
  }

  const player = bowlingTeamPlayers.find((p) => p.id === bowlerId)
  if (!player) {
    return bowlers.map((b) => ({ ...b, isCurrent: false }))
  }

  return [
    ...bowlers.map((b) => ({ ...b, isCurrent: false })),
    {
      playerId: bowlerId,
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

// ─── State Shape ──────────────────────────────────────────────────────────────

type MatchStore = {
  // Hydrated from server on OCP load
  snapshot: MatchSnapshot | null

  // Live over buffer (display — never cleared mid-over)
  currentOverBalls: DeliveryRecord[]
  legalDeliveryCount: number
  isFlushing: boolean

  // How many balls from currentOverBalls have already been persisted to DB
  flushedBallCount: number

  // Track last flushed IDs for cross-flush undo
  lastFlushedDeliveryIds: number[]

  // Set when batting team reaches the target mid-delivery (auto-win)
  winDetected: boolean

  // Set when innings 1 ends automatically (all-out / overs exhausted); prompts "Start Innings 2" modal
  inningsEndDetected: boolean

  // Set when a sync/flush operation fails — cleared by the UI after displaying to the user
  syncError: string | null

  // Actions
  hydrate: (snapshot: MatchSnapshot) => void
  addDelivery: (input: DeliveryInput) => Promise<void>
  addPenaltyRuns: (runs: number) => Promise<void>
  recordWicket: (input: WicketInput) => Promise<void>
  undoDelivery: () => Promise<void>
  flushOverToNeon: () => Promise<void>
  setStatus: (status: MatchSnapshot['status']) => void
  updateFromPusher: (partial: Partial<MatchSnapshot>) => void
  setStriker: (batsmanId: number) => void
  setNonStriker: (batsmanId: number) => void
  swapStrike: () => Promise<void>
  setBowler: (bowlerId: number) => void
  startNextOver: () => void
  clearWinDetected: () => void
  clearInningsEndDetected: () => void
  clearSyncError: () => void
  updateTeamLogo: (teamId: number, logoCloudinaryId: string) => void
  updatePlayerInSquad: (teamId: number, playerId: number, data: Partial<PlayerSummary>) => void
  addPlayerToSquad: (teamId: number, player: PlayerSummary) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDeliveryRecord(
  input: DeliveryInput,
  snapshot: MatchSnapshot,
  overNumber: number,
  ballNumber: number
): DeliveryRecord {
  return {
    ...input,
    isBoundary: input.isBoundary ?? false,
    overNumber,
    ballNumber,
    batsmanId: snapshot.strikerId!,
    bowlerId: snapshot.currentBowlerId!,
    timestamp: new Date().toISOString(),
  }
}

function shouldRotateStrike(runs: number, isWicket: boolean): boolean {
  // Rotate on odd runs (1, 3, 5); not on wickets (next batsman takes non-striker end)
  return !isWicket && runs % 2 === 1
}

// Returns the number of runs that physically crossed the batsmen (determines strike rotation).
// Wide penalty (1) and no-ball penalty (1) are signalled by the umpire — batsmen don't run for them.
function runsForStrikeRotation(input: DeliveryInput): number {
  if (input.extraType === 'wide') return input.extraRuns - 1   // subtract the 1-run penalty
  if (input.extraType === 'bye' || input.extraType === 'legbye') return input.extraRuns
  return input.runs   // noball: only bat runs; normal: bat runs
}

function rotatePairForCompletedRuns(
  strikerId: number | null,
  nonStrikerId: number | null,
  runs: number,
) {
  if (runs % 2 === 1) {
    return {
      strikerId: nonStrikerId,
      nonStrikerId: strikerId,
    }
  }

  return { strikerId, nonStrikerId }
}

function computePostWicketPair(
  snapshot: MatchSnapshot,
  runs: number,
  dismissedBatterId: number,
  incomingBatterId: number | null,
) {
  if (!snapshot.strikerId) {
    return { strikerId: null, nonStrikerId: null }
  }

  const rotated = rotatePairForCompletedRuns(snapshot.strikerId, snapshot.nonStrikerId, runs)
  if (incomingBatterId == null) {
    return rotated
  }

  if (rotated.strikerId === dismissedBatterId) {
    return {
      strikerId: incomingBatterId,
      nonStrikerId: rotated.nonStrikerId,
    }
  }

  if (rotated.nonStrikerId === dismissedBatterId) {
    return {
      strikerId: rotated.strikerId,
      nonStrikerId: incomingBatterId,
    }
  }

  return {
    strikerId: snapshot.strikerId === dismissedBatterId ? incomingBatterId : rotated.strikerId,
    nonStrikerId: snapshot.nonStrikerId === dismissedBatterId ? incomingBatterId : rotated.nonStrikerId,
  }
}

function computeInningsRuns(state: InningsState, runs: number, extraRuns: number): number {
  return state.totalRuns + runs + extraRuns
}

function hydrateCurrentOverBalls(snapshot: MatchSnapshot): DeliveryRecord[] {
  return snapshot.currentOverBalls.map((ball, index) => ({
    runs: ball.runs,
    extraRuns: ball.extraRuns,
    isLegal: ball.isLegal,
    isBoundary: ball.isBoundary ?? false,
    extraType: ball.extraType as DeliveryInput['extraType'],
    isWicket: ball.isWicket,
    dismissalType: null,
    dismissedBatterId: null,
    fielder1Id: null,
    fielder2Id: null,
    overNumber: snapshot.currentOver,
    ballNumber: index,
    batsmanId: snapshot.strikerId ?? 0,
    bowlerId: snapshot.currentBowlerId ?? 0,
    timestamp: '',
  }))
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMatchStore = create<MatchStore>((set, get) => ({
  snapshot: null,
  currentOverBalls: [],
  legalDeliveryCount: 0,
  isFlushing: false,
  flushedBallCount: 0,
  lastFlushedDeliveryIds: [],
  winDetected: false,
  inningsEndDetected: false,
  syncError: null,

  hydrate(snapshot) {
    const currentOverBalls = hydrateCurrentOverBalls(snapshot)
    set({
      snapshot,
      currentOverBalls,
      legalDeliveryCount: currentOverBalls.filter((ball) => ball.isLegal).length,
      flushedBallCount: currentOverBalls.length,
      lastFlushedDeliveryIds: [],
    })
  },

  setStatus(status) {
    set((s) => ({
      snapshot: s.snapshot ? { ...s.snapshot, status } : null,
    }))
  },

  updateFromPusher(partial) {
    set((s) => ({
      snapshot: s.snapshot ? { ...s.snapshot, ...partial } : null,
    }))
  },

  async addDelivery(input) {
    if (input.isWicket) {
      if (!input.dismissalType) return
      const snapshot = get().snapshot
      if (!snapshot?.strikerId) return

      await get().recordWicket({
        runs: input.runs,
        dismissalType: input.dismissalType,
        dismissedBatterId: input.dismissedBatterId ?? snapshot.strikerId,
        incomingBatterId: null,
        fielder1Id: input.fielder1Id,
        fielder2Id: input.fielder2Id,
      })
      return
    }

    const { snapshot, currentOverBalls, legalDeliveryCount, isFlushing } = get()
    if (!snapshot || snapshot.status !== 'active') return
    if (!snapshot.strikerId || !snapshot.currentBowlerId) return

    const overNumber = snapshot.currentOver
    const ballNumber = currentOverBalls.length
    const delivery = buildDeliveryRecord(input, snapshot, overNumber, ballNumber)

    const newLegalCount = legalDeliveryCount + (input.isLegal ? 1 : 0)
    const innings = snapshot.currentInningsState
    if (!innings) {
      console.error('[matchStore] addDelivery called with no active innings state')
      return
    }

    const bpo = snapshot.ballsPerOver ?? 6

    // Compute updated innings totals
    const newRuns = computeInningsRuns(innings, input.runs, input.extraRuns)
    const newWickets = innings.wickets
    const newBalls = input.isLegal ? innings.balls + 1 : innings.balls
    const newOvers = newBalls >= bpo ? innings.overs + 1 : innings.overs
    const remainingBalls = newBalls >= bpo ? 0 : newBalls

    // Rotate strike
    let newStrikerId: number | null = snapshot.strikerId
    let newNonStrikerId: number | null = snapshot.nonStrikerId
    if (shouldRotateStrike(runsForStrikeRotation(input), input.isWicket)) {
      newStrikerId = snapshot.nonStrikerId
      newNonStrikerId = snapshot.strikerId
    }

    const updatedInnings: InningsState = {
      ...innings,
      totalRuns: newRuns,
      wickets: newWickets,
      overs: newOvers,
      balls: remainingBalls,
    }

    const updatedInningsList = snapshot.innings.map((i) =>
      i.inningsNumber === snapshot.currentInnings ? updatedInnings : i
    )

    // Recalculate run rates (mirrors getMatchSnapshot formula)
    const newTotalBalls = newOvers * bpo + remainingBalls
    const newCurrentRunRate = newTotalBalls > 0
      ? Math.round((newRuns / (newTotalBalls / bpo)) * 100) / 100
      : 0

    let newRequiredRunRate = snapshot.requiredRunRate
    if (snapshot.currentInnings === 2 && innings.target) {
      const remainingMatchBalls = snapshot.totalOvers * bpo - newTotalBalls
      const runsNeeded = innings.target - newRuns
      newRequiredRunRate = remainingMatchBalls > 0
        ? Math.round((runsNeeded / (remainingMatchBalls / bpo)) * 100) / 100
        : 0
    }

    // Optimistic UI update (including live batter/bowler stats)
    const updatedBatters = updateBattersOptimistically(
      snapshot.batters,
      snapshot.strikerId,
      snapshot.battingTeamPlayers,
      input,
      newStrikerId,
      newNonStrikerId,
    )
    const updatedBowlers = updateBowlersOptimistically(
      snapshot.bowlers,
      snapshot.currentBowlerId,
      snapshot.bowlingTeamPlayers,
      input,
      bpo,
    )

    // Update partnership optimistically; reset to zero on wicket (new pair starts fresh)
    const updatedPartnership = applyDeliveryToPartnershipStats(
      snapshot.partnership,
      snapshot.strikerId,
      newStrikerId ?? snapshot.strikerId ?? 0,
      newNonStrikerId ?? snapshot.nonStrikerId ?? 0,
      input,
    )

    const updatedOverBalls = [...currentOverBalls, delivery]

    set({
      currentOverBalls: updatedOverBalls,
      legalDeliveryCount: newLegalCount,
      snapshot: {
        ...snapshot,
        strikerId: newStrikerId,
        nonStrikerId: newNonStrikerId,
        currentBalls: remainingBalls,
        currentOver: newOvers,
        innings: updatedInningsList,
        currentInningsState: updatedInnings,
        batters: updatedBatters,
        bowlers: updatedBowlers,
        partnership: updatedPartnership,
        currentRunRate: newCurrentRunRate,
        requiredRunRate: newRequiredRunRate,
      },
    })

    await syncLiveMatchState(snapshot.matchId, {
      strikerId: newStrikerId,
      nonStrikerId: newNonStrikerId,
      currentBowlerId: snapshot.currentBowlerId,
      currentOver: newOvers,
      currentBalls: remainingBalls,
      currentOverBuffer: updatedOverBalls,
    })

    // ── Auto end-of-innings / win detection ────────────────────────────────────
    const currentInningsState = snapshot.innings.find((i) => i.inningsNumber === snapshot.currentInnings)
    const matchResult = computeMatchResult({
      inningsNumber: snapshot.currentInnings as 1 | 2,
      totalRuns: newRuns,
      wickets: newWickets,
      target: currentInningsState?.target ?? null,
      totalOvers: snapshot.totalOvers,
      newOvers,
      remainingBalls,
      battingTeamId: currentInningsState?.battingTeamId ?? 0,
      bowlingTeamId: currentInningsState?.bowlingTeamId ?? 0,
    })

    if (matchResult.outcome === 'innings_end') {
      // Innings 1 ended (all-out or overs exhausted) — flush and signal UI to open innings 2 modal
      if (!isFlushing) await get().flushOverToNeon()
      set((s) => ({
        inningsEndDetected: true,
        snapshot: s.snapshot ? { ...s.snapshot, status: 'break' } : null,
      }))
      await triggerPusherEvent(snapshot.matchId, 'innings.ended', { matchId: snapshot.matchId })
      return
    }

    if (
      matchResult.outcome === 'match_won_by_wickets' ||
      matchResult.outcome === 'match_won_by_runs' ||
      matchResult.outcome === 'tie'
    ) {
      if (!isFlushing) await get().flushOverToNeon()
      const payload = toResultPayload(matchResult)
      try {
        const r1 = await fetch(`/api/match/${snapshot.matchId}/innings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete', ...payload }),
        })
        if (!r1.ok) throw new Error('Failed to close innings')
        set((s) => ({
          winDetected: true,
          snapshot: s.snapshot
            ? (() => {
                const nextSnapshot = s.snapshot
                return {
                  ...nextSnapshot,
                  status: 'complete',
                  resultWinnerId: payload?.resultWinnerId ?? null,
                  resultMargin: payload?.resultMargin ?? null,
                  resultType: payload?.resultType ?? null,
                  innings: nextSnapshot.innings.map((inn) =>
                    inn.inningsNumber === nextSnapshot.currentInnings
                      ? { ...inn, status: 'complete' }
                      : inn,
                  ),
                  currentInningsState: nextSnapshot.currentInningsState
                    ? { ...nextSnapshot.currentInningsState, status: 'complete' }
                    : null,
                }
              })()
            : null,
        }))
      } catch (err) {
        console.error('[matchStore] Win detection save failed:', err)
        set({ syncError: 'Failed to save match result. Please end the match manually.' })
      }
      return
    }

    // Push real-time event to all viewers
    await triggerPusherEvent(snapshot.matchId, 'delivery.added', {
      matchId: snapshot.matchId,
      overNumber,
      ballNumber,
      runs: input.runs,
      extraRuns: input.extraRuns,
      isLegal: input.isLegal,
      extraType: input.extraType,
      isWicket: false,
      isBoundary: input.isBoundary ?? false,
      batsmanId: snapshot.strikerId,
      dismissedBatterId: null,
      bowlerId: snapshot.currentBowlerId,
      inningsRuns: newRuns,
      inningsWickets: newWickets,
      inningsOvers: newOvers,
      inningsBalls: remainingBalls,
      strikerId: newStrikerId,
      nonStrikerId: newNonStrikerId,
    })

    // Flush conditions — guard against double-flush
    if (!isFlushing) {
      const shouldFlushOver = newLegalCount === bpo
      const shouldFlushSafety = newLegalCount > 0 && newLegalCount % 3 === 0 && !shouldFlushOver
      if (shouldFlushOver || shouldFlushSafety) {
        await get().flushOverToNeon()

        if (shouldFlushOver) {
          set((s) => ({
            legalDeliveryCount: 0,
            snapshot: s.snapshot
              ? (() => {
                  const nextStrikerId = s.snapshot.nonStrikerId
                  return {
                    ...s.snapshot,
                    strikerId: nextStrikerId,
                    nonStrikerId: s.snapshot.strikerId,
                    batters: s.snapshot.batters.map((b) => ({
                      ...b,
                      isStriker: b.playerId === nextStrikerId,
                    })),
                    currentBalls: 0,
                  }
                })()
              : null,
          }))

          await triggerPusherEvent(snapshot.matchId, 'over.complete', {
            matchId: snapshot.matchId,
            overNumber,
            overRuns: updatedOverBalls
              .reduce((sum, d) => sum + d.runs + d.extraRuns, 0),
            bowlerId: snapshot.currentBowlerId,
            maidens: 0, // calculated server-side on persist
          })
        }
      }
    }
  },

  async addPenaltyRuns(runs) {
    const { snapshot, currentOverBalls, isFlushing } = get()
    if (!snapshot || snapshot.status !== 'active') return
    if (!snapshot.strikerId || !snapshot.currentBowlerId) return

    const innings = snapshot.currentInningsState
    if (!innings) return

    const overNumber = snapshot.currentOver
    const ballNumber = currentOverBalls.length
    const delivery: DeliveryRecord = {
      runs: 0,
      extraRuns: runs,
      isLegal: false,
      extraType: 'penalty',
      isWicket: false,
      isBoundary: false,
      dismissalType: null,
      dismissedBatterId: null,
      fielder1Id: null,
      fielder2Id: null,
      overNumber,
      ballNumber,
      batsmanId: snapshot.strikerId,
      bowlerId: snapshot.currentBowlerId,
      timestamp: new Date().toISOString(),
    }

    const newRuns = Math.max(0, innings.totalRuns + runs)
    const updatedInnings: InningsState = { ...innings, totalRuns: newRuns }
    const updatedInningsList = snapshot.innings.map((i) =>
      i.inningsNumber === snapshot.currentInnings ? updatedInnings : i,
    )

    const bpo = snapshot.ballsPerOver ?? 6
    const totalBalls = innings.overs * bpo + innings.balls
    const newCurrentRunRate = totalBalls > 0
      ? Math.round((newRuns / (totalBalls / bpo)) * 100) / 100
      : 0

    let newRequiredRunRate = snapshot.requiredRunRate
    if (snapshot.currentInnings === 2 && innings.target) {
      const remainingMatchBalls = snapshot.totalOvers * bpo - totalBalls
      const runsNeeded = innings.target - newRuns
      newRequiredRunRate = remainingMatchBalls > 0
        ? Math.round((runsNeeded / (remainingMatchBalls / bpo)) * 100) / 100
        : 0
    }

    const updatedOverBalls = [...currentOverBalls, delivery]

    set({
      currentOverBalls: updatedOverBalls,
      snapshot: {
        ...snapshot,
        innings: updatedInningsList,
        currentInningsState: updatedInnings,
        currentRunRate: newCurrentRunRate,
        requiredRunRate: newRequiredRunRate,
      },
    })

    await syncLiveMatchState(snapshot.matchId, {
      strikerId: snapshot.strikerId,
      nonStrikerId: snapshot.nonStrikerId,
      currentBowlerId: snapshot.currentBowlerId,
      currentOver: snapshot.currentOver,
      currentBalls: snapshot.currentBalls,
      currentOverBuffer: updatedOverBalls,
    })

    await triggerPusherEvent(snapshot.matchId, 'delivery.added', {
      matchId: snapshot.matchId,
      overNumber,
      ballNumber,
      runs: 0,
      extraRuns: runs,
      isLegal: false,
      extraType: 'penalty',
      isWicket: false,
      isBoundary: false,
      batsmanId: snapshot.strikerId,
      dismissedBatterId: null,
      bowlerId: snapshot.currentBowlerId,
      inningsRuns: newRuns,
      inningsWickets: innings.wickets,
      inningsOvers: innings.overs,
      inningsBalls: innings.balls,
      strikerId: snapshot.strikerId,
      nonStrikerId: snapshot.nonStrikerId,
    })

    if (!isFlushing) await get().flushOverToNeon()
  },

  async recordWicket(input) {
    const { snapshot, currentOverBalls, legalDeliveryCount, isFlushing } = get()
    if (!snapshot || snapshot.status !== 'active') return
    if (!snapshot.strikerId || !snapshot.currentBowlerId) return

    const innings = snapshot.currentInningsState
    if (!innings) {
      console.error('[matchStore] recordWicket called with no active innings state')
      return
    }

    const overNumber = snapshot.currentOver
    const ballNumber = currentOverBalls.length
    const isLegal = input.isLegal ?? true
    const extraRuns = input.extraRuns ?? 0
    const extraType = input.extraType ?? null
    const deliveryInput: DeliveryInput = {
      runs: input.runs,
      extraRuns,
      isLegal,
      extraType,
      isWicket: true,
      dismissalType: input.dismissalType,
      dismissedBatterId: input.dismissedBatterId,
      fielder1Id: input.fielder1Id,
      fielder2Id: input.fielder2Id,
    }
    const delivery = buildDeliveryRecord(deliveryInput, snapshot, overNumber, ballNumber)

    const newLegalCount = legalDeliveryCount + (isLegal ? 1 : 0)
    const bpo = snapshot.ballsPerOver ?? 6
    const newRuns = computeInningsRuns(innings, input.runs, extraRuns)
    const newWickets = innings.wickets + 1
    const newBalls = isLegal ? innings.balls + 1 : innings.balls
    const newOvers = newBalls >= bpo ? innings.overs + 1 : innings.overs
    const remainingBalls = newBalls >= bpo ? 0 : newBalls
    const postWicketPair = computePostWicketPair(
      snapshot,
      input.runs,
      input.dismissedBatterId,
      input.incomingBatterId,
    )

    const updatedInnings: InningsState = {
      ...innings,
      totalRuns: newRuns,
      wickets: newWickets,
      overs: newOvers,
      balls: remainingBalls,
    }

    const updatedInningsList = snapshot.innings.map((i) =>
      i.inningsNumber === snapshot.currentInnings ? updatedInnings : i,
    )

    const newTotalBalls = newOvers * bpo + remainingBalls
    const newCurrentRunRate = newTotalBalls > 0
      ? Math.round((newRuns / (newTotalBalls / bpo)) * 100) / 100
      : 0

    let newRequiredRunRate = snapshot.requiredRunRate
    if (snapshot.currentInnings === 2 && innings.target) {
      const remainingMatchBalls = snapshot.totalOvers * bpo - newTotalBalls
      const runsNeeded = innings.target - newRuns
      newRequiredRunRate = remainingMatchBalls > 0
        ? Math.round((runsNeeded / (remainingMatchBalls / bpo)) * 100) / 100
        : 0
    }

    const updatedBatters = updateBattersOptimistically(
      snapshot.batters,
      snapshot.strikerId,
      snapshot.battingTeamPlayers,
      deliveryInput,
      postWicketPair.strikerId,
      postWicketPair.nonStrikerId,
    )
    const updatedBowlers = updateBowlersOptimistically(
      snapshot.bowlers,
      snapshot.currentBowlerId,
      snapshot.bowlingTeamPlayers,
      deliveryInput,
      bpo,
    )

    const updatedOverBalls = [...currentOverBalls, delivery]

    set({
      currentOverBalls: updatedOverBalls,
      legalDeliveryCount: newLegalCount,
      snapshot: {
        ...snapshot,
        strikerId: postWicketPair.strikerId,
        nonStrikerId: postWicketPair.nonStrikerId,
        currentBalls: remainingBalls,
        currentOver: newOvers,
        innings: updatedInningsList,
        currentInningsState: updatedInnings,
        batters: updatedBatters,
        bowlers: updatedBowlers,
        partnership: input.incomingBatterId != null && postWicketPair.strikerId && postWicketPair.nonStrikerId
          ? createPartnershipStats(postWicketPair.strikerId, postWicketPair.nonStrikerId)
          : null,
        currentRunRate: newCurrentRunRate,
        requiredRunRate: newRequiredRunRate,
      },
    })

    await syncLiveMatchState(snapshot.matchId, {
      strikerId: postWicketPair.strikerId,
      nonStrikerId: postWicketPair.nonStrikerId,
      currentBowlerId: snapshot.currentBowlerId,
      currentOver: newOvers,
      currentBalls: remainingBalls,
      currentOverBuffer: updatedOverBalls,
    })

    // ── Auto end-of-innings / win detection ────────────────────────────────────
    const wicketInningsState = snapshot.innings.find((i) => i.inningsNumber === snapshot.currentInnings)
    const wicketMatchResult = computeMatchResult({
      inningsNumber: snapshot.currentInnings as 1 | 2,
      totalRuns: newRuns,
      wickets: newWickets,
      target: wicketInningsState?.target ?? null,
      totalOvers: snapshot.totalOvers,
      newOvers,
      remainingBalls,
      battingTeamId: wicketInningsState?.battingTeamId ?? 0,
      bowlingTeamId: wicketInningsState?.bowlingTeamId ?? 0,
    })

    if (wicketMatchResult.outcome === 'innings_end') {
      if (!isFlushing) await get().flushOverToNeon()
      set((s) => ({
        inningsEndDetected: true,
        snapshot: s.snapshot ? { ...s.snapshot, status: 'break' } : null,
      }))
      await triggerPusherEvent(snapshot.matchId, 'innings.ended', { matchId: snapshot.matchId })
      return
    }

    if (
      wicketMatchResult.outcome === 'match_won_by_wickets' ||
      wicketMatchResult.outcome === 'match_won_by_runs' ||
      wicketMatchResult.outcome === 'tie'
    ) {
      if (!isFlushing) await get().flushOverToNeon()
      const wicketPayload = toResultPayload(wicketMatchResult)
      try {
        const r1 = await fetch(`/api/match/${snapshot.matchId}/innings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete', ...wicketPayload }),
        })
        if (!r1.ok) throw new Error('Failed to close innings')
        set((s) => ({
          winDetected: true,
          snapshot: s.snapshot
            ? (() => {
                const nextSnapshot = s.snapshot
                return {
                  ...nextSnapshot,
                  status: 'complete',
                  resultWinnerId: wicketPayload?.resultWinnerId ?? null,
                  resultMargin: wicketPayload?.resultMargin ?? null,
                  resultType: wicketPayload?.resultType ?? null,
                  innings: nextSnapshot.innings.map((inn) =>
                    inn.inningsNumber === nextSnapshot.currentInnings
                      ? { ...inn, status: 'complete' }
                      : inn,
                  ),
                  currentInningsState: nextSnapshot.currentInningsState
                    ? { ...nextSnapshot.currentInningsState, status: 'complete' }
                    : null,
                }
              })()
            : null,
        }))
      } catch (err) {
        console.error('[matchStore] Win detection save failed:', err)
        set({ syncError: 'Failed to save match result. Please end the match manually.' })
      }
      return
    }

    await triggerPusherEvent(snapshot.matchId, 'delivery.added', {
      matchId: snapshot.matchId,
      overNumber,
      ballNumber,
      runs: input.runs,
      extraRuns,
      isLegal,
      extraType,
      isWicket: true,
      isBoundary: false,
      batsmanId: snapshot.strikerId,
      dismissedBatterId: input.dismissedBatterId,
      bowlerId: snapshot.currentBowlerId,
      inningsRuns: newRuns,
      inningsWickets: newWickets,
      inningsOvers: newOvers,
      inningsBalls: remainingBalls,
      strikerId: postWicketPair.strikerId,
      nonStrikerId: postWicketPair.nonStrikerId,
    })

    if (!isFlushing) {
      const shouldFlushOver = newLegalCount === bpo

      await get().flushOverToNeon()

      if (shouldFlushOver) {
        set((s) => ({
          legalDeliveryCount: 0,
          snapshot: s.snapshot
            ? (() => {
                const nextStrikerId = s.snapshot.nonStrikerId
                return {
                  ...s.snapshot,
                  strikerId: nextStrikerId,
                  nonStrikerId: s.snapshot.strikerId,
                  batters: s.snapshot.batters.map((b) => ({
                    ...b,
                    isStriker: b.playerId === nextStrikerId,
                  })),
                  currentBalls: 0,
                }
              })()
            : null,
        }))

        await triggerPusherEvent(snapshot.matchId, 'over.complete', {
          matchId: snapshot.matchId,
          overNumber,
          overRuns: updatedOverBalls
            .reduce((sum, d) => sum + d.runs + d.extraRuns, 0),
          bowlerId: snapshot.currentBowlerId,
          maidens: 0,
        })
      }
    }

    await triggerPusherEvent(snapshot.matchId, 'wicket.fell', {
      matchId: snapshot.matchId,
      dismissedBatterId: input.dismissedBatterId,
      dismissalType: input.dismissalType,
      fielder1Id: input.fielder1Id,
      fielder2Id: input.fielder2Id,
      incomingBatterId: input.incomingBatterId,
      inningsWickets: newWickets,
    })
  },

  async undoDelivery() {
    const { snapshot, currentOverBalls, legalDeliveryCount, flushedBallCount, lastFlushedDeliveryIds } = get()
    if (!snapshot) return

    if (currentOverBalls.length > flushedBallCount) {
      // Undo in-buffer delivery (not yet persisted)
      const removed = currentOverBalls[currentOverBalls.length - 1]
      const newBalls = currentOverBalls.slice(0, -1)
      const newLegalCount = legalDeliveryCount - (removed.isLegal ? 1 : 0)

      // Reverse innings totals
      const innings = snapshot.currentInningsState
      if (!innings) return
      const newRuns = innings.totalRuns - removed.runs - removed.extraRuns
      const newWickets = innings.wickets - (removed.isWicket ? 1 : 0)

      // Recalculate balls/overs
      const legalBallsInOver = newBalls.filter((d) => d.isLegal).length
      const completedOvers = removed.isLegal && legalBallsInOver >= 6
        ? innings.overs - 1
        : innings.overs

      const updatedInnings: InningsState = {
        ...innings,
        totalRuns: Math.max(0, newRuns),
        wickets: Math.max(0, newWickets),
        overs: completedOvers,
        balls: legalBallsInOver < 6 ? legalBallsInOver : 0,
      }

      // Reverse bowler stats
      const bpo = snapshot.ballsPerOver ?? 6
      const removedChargeableExtraRuns = (
        removed.extraType === 'bye' || removed.extraType === 'legbye' || removed.extraType === 'penalty'
      ) ? 0 : removed.extraRuns
      const removedNonBowlerDismissals = ['runout', 'obstructingfield', 'handledball']
      const removedIsChargeableWicket = removed.isWicket && !removedNonBowlerDismissals.includes(removed.dismissalType ?? '')
      const updatedBowlers = snapshot.bowlers.map((b) => {
        if (b.playerId !== removed.bowlerId) return b
        const rawBalls = b.balls - (removed.isLegal ? 1 : 0)
        const adjBalls = rawBalls < 0 ? bpo - 1 : rawBalls
        const adjOvers = rawBalls < 0 ? Math.max(0, b.overs - 1) : b.overs
        const updRuns = Math.max(0, b.runs - removed.runs - removedChargeableExtraRuns)
        const updWickets = Math.max(0, b.wickets - (removedIsChargeableWicket ? 1 : 0))
        const totalLegal = adjOvers * bpo + adjBalls
        const oversDecimal = totalLegal / bpo
        return {
          ...b,
          overs: adjOvers,
          balls: adjBalls,
          runs: updRuns,
          wickets: updWickets,
          economy: oversDecimal > 0 ? Math.round((updRuns / oversDecimal) * 100) / 100 : 0,
        }
      })

      // Reverse batter stats
      const updatedBatters = snapshot.batters.map((b) => {
        if (b.playerId !== removed.batsmanId) return b
        const updRuns = Math.max(0, b.runs - removed.runs)
        const updBalls = Math.max(0, b.balls - (removed.isLegal ? 1 : 0))
        return {
          ...b,
          runs: updRuns,
          balls: updBalls,
          fours: Math.max(0, b.fours - (removed.isBoundary && removed.runs === 4 ? 1 : 0)),
          sixes: Math.max(0, b.sixes - (removed.isBoundary && removed.runs === 6 ? 1 : 0)),
          strikeRate: updBalls > 0 ? Math.round((updRuns / updBalls) * 10000) / 100 : 0,
        }
      })

      set({
        currentOverBalls: newBalls,
        legalDeliveryCount: Math.max(0, newLegalCount),
        snapshot: {
          ...snapshot,
          currentInningsState: updatedInnings,
          innings: snapshot.innings.map((i) =>
            i.inningsNumber === snapshot.currentInnings ? updatedInnings : i
          ),
          bowlers: updatedBowlers,
          batters: updatedBatters,
        },
      })

      await syncLiveMatchState(snapshot.matchId, {
        currentOver: updatedInnings.overs,
        currentBalls: updatedInnings.balls,
        currentOverBuffer: newBalls,
      })
    } else if (lastFlushedDeliveryIds.length > 0) {
      // Undo a flushed delivery — requires DB delete
      const lastId = lastFlushedDeliveryIds[lastFlushedDeliveryIds.length - 1]
      try {
        await fetch(`/api/match/undo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliveryId: lastId, matchId: snapshot.matchId }),
        })
        set((s) => ({
          lastFlushedDeliveryIds: s.lastFlushedDeliveryIds.slice(0, -1),
        }))
        // Refresh state from Neon after DB undo
        const res = await fetch(`/api/match/${snapshot.matchId}/state`)
        if (res.ok) {
          const freshSnapshot: MatchSnapshot = await res.json()
          set({ snapshot: freshSnapshot })
        }
      } catch (err) {
        console.error('Undo failed:', err)
      }
    }
  },

  setStriker(batsmanId) {
    set((s) => ({
      snapshot: s.snapshot ? { ...s.snapshot, strikerId: batsmanId } : null,
    }))
  },

  setNonStriker(batsmanId) {
    set((s) => {
      if (!s.snapshot) return {}
      return {
        snapshot: {
          ...s.snapshot,
          nonStrikerId: batsmanId,
          // Seed a fresh partnership now that both openers are known
          partnership: {
            ...createPartnershipStats(s.snapshot.strikerId ?? batsmanId, batsmanId),
          },
        },
      }
    })
  },

  async swapStrike() {
    const snapshot = get().snapshot
    if (!snapshot?.strikerId || !snapshot.nonStrikerId) return

    const nextStrikerId = snapshot.nonStrikerId
    const nextNonStrikerId = snapshot.strikerId

    set((s) => {
      if (!s.snapshot) return {}

      return {
        snapshot: {
          ...s.snapshot,
          strikerId: nextStrikerId,
          nonStrikerId: nextNonStrikerId,
          batters: s.snapshot.batters.map((b) => ({
            ...b,
            isStriker: b.playerId === nextStrikerId,
          })),
          partnership: s.snapshot.partnership
            ? reorderPartnershipStats(s.snapshot.partnership, nextStrikerId, nextNonStrikerId)
            : null,
        },
      }
    })

    await syncLiveMatchState(snapshot.matchId, {
      strikerId: nextStrikerId,
      nonStrikerId: nextNonStrikerId,
    })
  },

  setBowler(bowlerId) {
    set((s) => {
      if (!s.snapshot) return {}

      return {
        snapshot: {
          ...s.snapshot,
          currentBowlerId: bowlerId,
          bowlers: ensureCurrentBowler(
            s.snapshot.bowlers,
            bowlerId,
            s.snapshot.bowlingTeamPlayers,
          ),
        },
      }
    })
  },

  startNextOver() {
    set((s) => {
      if (!s.snapshot) return {}
      return {
        currentOverBalls: [],
        legalDeliveryCount: 0,
        flushedBallCount: 0,
        snapshot: {
          ...s.snapshot,
          currentBalls: 0,
          // Strike rotation already handled by addDelivery — don't swap again
          currentBowlerId: null, // cleared — BowlerSelect will set a new one
        },
      }
    })
  },

  async flushOverToNeon() {
    const { snapshot, currentOverBalls, flushedBallCount, isFlushing } = get()
    const unflushed = currentOverBalls.slice(flushedBallCount)
    if (!snapshot || unflushed.length === 0 || isFlushing) return

    const inningsId = snapshot.currentInningsState?.id
    if (!inningsId) {
      console.error('[matchStore] flushOverToNeon: no active inningsId — aborting flush')
      set({ syncError: 'Cannot sync: no active innings. Please refresh.' })
      return
    }

    const isOverEnd = get().legalDeliveryCount === (get().snapshot?.ballsPerOver ?? 6)

    set({ isFlushing: true })

    try {
      const res = await fetch('/api/match/persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: snapshot.matchId,
          inningsId,
          deliveries: unflushed,
          overNumber: snapshot.currentOver,
          strikerId: snapshot.strikerId,
          nonStrikerId: snapshot.nonStrikerId,
          currentBowlerId: snapshot.currentBowlerId,
          currentOver: snapshot.currentOver,
          currentBalls: snapshot.currentBalls,
          currentOverBuffer: isOverEnd ? [] : currentOverBalls,
          isOverComplete: isOverEnd,
        }),
      })

      if (res.ok) {
        const { deliveryIds } = await res.json()
        set((s) => ({
          // Only clear the display buffer at end-of-over; mid-over keep dots visible
          currentOverBalls: isOverEnd ? [] : s.currentOverBalls,
          flushedBallCount: isOverEnd ? 0 : s.currentOverBalls.length,
          lastFlushedDeliveryIds: [...s.lastFlushedDeliveryIds, ...deliveryIds].slice(-10),
          syncError: null,
        }))
      } else {
        const body = await res.json().catch(() => ({}))
        console.error('[matchStore] Flush rejected by server:', body)
        set({ syncError: 'Score sync failed. Tap retry or refresh to recover.' })
      }
    } catch (err) {
      console.error('[matchStore] Flush network error:', err)
      set({ syncError: 'Score sync failed (network error). Check connection.' })
    } finally {
      set({ isFlushing: false })
    }
  },

  clearWinDetected() {
    set({ winDetected: false })
  },

  clearInningsEndDetected() {
    set({ inningsEndDetected: false })
  },

  clearSyncError() {
    set({ syncError: null })
  },

  updateTeamLogo(teamId, logoCloudinaryId) {
    set((s) => {
      if (!s.snapshot) return {}
      return {
        snapshot: {
          ...s.snapshot,
          homeTeam: s.snapshot.homeTeam.id === teamId
            ? { ...s.snapshot.homeTeam, logoCloudinaryId }
            : s.snapshot.homeTeam,
          awayTeam: s.snapshot.awayTeam.id === teamId
            ? { ...s.snapshot.awayTeam, logoCloudinaryId }
            : s.snapshot.awayTeam,
        },
      }
    })
  },

  updatePlayerInSquad(teamId, playerId, data) {
    set((s) => {
      if (!s.snapshot) return {}
      const isBatting = s.snapshot.currentInningsState?.battingTeamId === teamId
      const isBowling = s.snapshot.currentInningsState?.bowlingTeamId === teamId

      const patchSquad = (arr: PlayerSummary[]) =>
        arr.map((p) => (p.id === playerId ? { ...p, ...data } : p))

      const patchBatters = (arr: typeof s.snapshot.batters) =>
        data.displayName
          ? arr.map((b) => (b.playerId === playerId ? { ...b, displayName: data.displayName! } : b))
          : arr

      const patchBowlers = (arr: typeof s.snapshot.bowlers) =>
        data.displayName
          ? arr.map((b) => (b.playerId === playerId ? { ...b, displayName: data.displayName! } : b))
          : arr

      return {
        snapshot: {
          ...s.snapshot,
          battingTeamPlayers: isBatting ? patchSquad(s.snapshot.battingTeamPlayers) : s.snapshot.battingTeamPlayers,
          bowlingTeamPlayers: isBowling ? patchSquad(s.snapshot.bowlingTeamPlayers) : s.snapshot.bowlingTeamPlayers,
          batters: isBatting ? patchBatters(s.snapshot.batters) : s.snapshot.batters,
          bowlers: isBowling ? patchBowlers(s.snapshot.bowlers) : s.snapshot.bowlers,
        },
      }
    })
  },

  addPlayerToSquad(teamId, player) {
    set((s) => {
      if (!s.snapshot) return {}
      const isBatting = s.snapshot.currentInningsState?.battingTeamId === teamId
      return {
        snapshot: {
          ...s.snapshot,
          battingTeamPlayers: isBatting
            ? [...s.snapshot.battingTeamPlayers, player]
            : s.snapshot.battingTeamPlayers,
          bowlingTeamPlayers: !isBatting
            ? [...s.snapshot.bowlingTeamPlayers, player]
            : s.snapshot.bowlingTeamPlayers,
        },
      }
    })
  },
}))

// ─── Pusher Trigger Helper ────────────────────────────────────────────────────

async function triggerPusherEvent(
  matchId: number,
  event: string,
  payload: Record<string, unknown>
) {
  try {
    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, event, payload }),
    })
  } catch (err) {
    console.error(`Pusher trigger failed for ${event}:`, err)
  }
}

async function syncLiveMatchState(
  matchId: number,
  payload: {
    strikerId?: number | null
    nonStrikerId?: number | null
    currentBowlerId?: number | null
    currentOver?: number
    currentBalls?: number
    currentOverBuffer?: DeliveryRecord[]
  },
) {
  try {
    await fetch(`/api/match/${matchId}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Live match state sync failed:', err)
  }
}
