import { create } from 'zustand'
import type { DeliveryInput, DeliveryRecord, MatchSnapshot, InningsState, BatterStats, BowlerStats, PlayerSummary } from '@/types/match'

// ─── Optimistic stat helpers ──────────────────────────────────────────────────

function updateBattersOptimistically(
  batters: BatterStats[],
  strikerId: number,
  battingTeamPlayers: PlayerSummary[],
  input: DeliveryInput,
): BatterStats[] {
  const existing = batters.find((b) => b.playerId === strikerId)
  const player = battingTeamPlayers.find((p) => p.id === strikerId)
  if (!existing && !player) return batters

  if (!existing) {
    const newBatter: BatterStats = {
      playerId: strikerId,
      playerName: player!.name,
      displayName: player!.displayName,
      runs: input.runs,
      balls: input.isLegal ? 1 : 0,
      fours: input.runs === 4 ? 1 : 0,
      sixes: input.runs === 6 ? 1 : 0,
      strikeRate: input.isLegal && input.runs > 0 ? input.runs * 100 : 0,
      isStriker: true,
      isOut: input.isWicket,
      dismissalType: input.isWicket ? (input.dismissalType ?? null) : null,
    }
    return [...batters, newBatter]
  }

  return batters.map((b) => {
    if (b.playerId !== strikerId) return b
    const newRuns = b.runs + input.runs
    const newBalls = b.balls + (input.isLegal ? 1 : 0)
    return {
      ...b,
      runs: newRuns,
      balls: newBalls,
      fours: b.fours + (input.runs === 4 ? 1 : 0),
      sixes: b.sixes + (input.runs === 6 ? 1 : 0),
      strikeRate: newBalls > 0 ? Math.round((newRuns / newBalls) * 10000) / 100 : 0,
      isOut: b.isOut || input.isWicket,
      dismissalType: input.isWicket ? (input.dismissalType ?? null) : b.dismissalType,
    }
  })
}

function updateBowlersOptimistically(
  bowlers: BowlerStats[],
  bowlerId: number,
  bowlingTeamPlayers: PlayerSummary[],
  input: DeliveryInput,
): BowlerStats[] {
  const existing = bowlers.find((b) => b.playerId === bowlerId)
  const player = bowlingTeamPlayers.find((p) => p.id === bowlerId)
  if (!existing && !player) return bowlers

  if (!existing) {
    const newBowler: BowlerStats = {
      playerId: bowlerId,
      playerName: player!.name,
      displayName: player!.displayName,
      overs: 0,
      balls: input.isLegal ? 1 : 0,
      maidens: 0,
      runs: input.runs + input.extraRuns,
      wickets: input.isWicket ? 1 : 0,
      economy: 0,
      isCurrent: true,
    }
    return [...bowlers.map((b) => ({ ...b, isCurrent: false })), newBowler]
  }

  return bowlers.map((b) => {
    if (b.playerId !== bowlerId) return b
    const newLegalBalls = b.balls + (input.isLegal ? 1 : 0)
    const completedOvers = b.overs + Math.floor(newLegalBalls / 6)
    const ballsInOver = newLegalBalls % 6
    const newRuns = b.runs + input.runs + input.extraRuns
    const totalLegal = completedOvers * 6 + ballsInOver
    const oversDecimal = totalLegal / 6
    return {
      ...b,
      overs: completedOvers,
      balls: ballsInOver,
      runs: newRuns,
      wickets: b.wickets + (input.isWicket ? 1 : 0),
      economy: oversDecimal > 0 ? Math.round((newRuns / oversDecimal) * 100) / 100 : 0,
    }
  })
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

  // Actions
  hydrate: (snapshot: MatchSnapshot) => void
  addDelivery: (input: DeliveryInput) => Promise<void>
  undoDelivery: () => Promise<void>
  flushOverToNeon: () => Promise<void>
  setStatus: (status: MatchSnapshot['status']) => void
  updateFromPusher: (partial: Partial<MatchSnapshot>) => void
  setStriker: (batsmanId: number) => void
  setNonStriker: (batsmanId: number) => void
  setBowler: (bowlerId: number) => void
  startNextOver: () => void
  clearWinDetected: () => void
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

function computeInningsRuns(state: InningsState, runs: number, extraRuns: number): number {
  return state.totalRuns + runs + extraRuns
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

  hydrate(snapshot) {
    set({ snapshot })
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
    const { snapshot, currentOverBalls, legalDeliveryCount, isFlushing } = get()
    if (!snapshot || snapshot.status !== 'active') return
    if (!snapshot.strikerId || !snapshot.currentBowlerId) return

    const overNumber = snapshot.currentOver
    const ballNumber = currentOverBalls.length
    const delivery = buildDeliveryRecord(input, snapshot, overNumber, ballNumber)

    const newLegalCount = legalDeliveryCount + (input.isLegal ? 1 : 0)
    const innings = snapshot.currentInningsState!

    // Compute updated innings totals
    const newRuns = computeInningsRuns(innings, input.runs, input.extraRuns)
    const newWickets = innings.wickets + (input.isWicket ? 1 : 0)
    const newBalls = input.isLegal ? innings.balls + 1 : innings.balls
    const newOvers = newBalls >= 6 ? innings.overs + 1 : innings.overs
    const remainingBalls = newBalls >= 6 ? 0 : newBalls

    // Rotate strike
    let newStrikerId: number | null = snapshot.strikerId
    let newNonStrikerId: number | null = snapshot.nonStrikerId
    if (shouldRotateStrike(input.runs, input.isWicket)) {
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
    const newTotalBalls = newOvers * 6 + remainingBalls
    const newCurrentRunRate = newTotalBalls > 0
      ? Math.round((newRuns / (newTotalBalls / 6)) * 100) / 100
      : 0

    let newRequiredRunRate = snapshot.requiredRunRate
    if (snapshot.currentInnings === 2 && innings.target) {
      const remainingMatchBalls = snapshot.totalOvers * 6 - newTotalBalls
      const runsNeeded = innings.target - newRuns
      newRequiredRunRate = remainingMatchBalls > 0
        ? Math.round((runsNeeded / (remainingMatchBalls / 6)) * 100) / 100
        : 0
    }

    // Optimistic UI update (including live batter/bowler stats)
    const updatedBatters = updateBattersOptimistically(
      snapshot.batters,
      snapshot.strikerId,
      snapshot.battingTeamPlayers,
      input,
    )
    const updatedBowlers = updateBowlersOptimistically(
      snapshot.bowlers,
      snapshot.currentBowlerId,
      snapshot.bowlingTeamPlayers,
      input,
    )

    // Update partnership optimistically; reset to zero on wicket (new pair starts fresh)
    const updatedPartnership = input.isWicket
      ? { runs: 0, balls: 0, batter1Id: newStrikerId ?? 0, batter2Id: newNonStrikerId ?? 0 }
      : {
          runs: (snapshot.partnership?.runs ?? 0) + input.runs + input.extraRuns,
          balls: (snapshot.partnership?.balls ?? 0) + (input.isLegal ? 1 : 0),
          batter1Id: newStrikerId ?? snapshot.strikerId ?? 0,
          batter2Id: newNonStrikerId ?? snapshot.nonStrikerId ?? 0,
        }

    set({
      currentOverBalls: [...currentOverBalls, delivery],
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

    // ── Win detection: batting team reaches target in 2nd innings ──────────────
    const isMatchWon =
      snapshot.currentInnings === 2 &&
      innings.target != null &&
      newRuns >= innings.target

    if (isMatchWon) {
      // Flush any unflushed deliveries, then mark the match complete
      if (!isFlushing) await get().flushOverToNeon()
      await fetch(`/api/match/${snapshot.matchId}/innings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      await fetch(`/api/match/${snapshot.matchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'complete' }),
      })
      set((s) => ({
        winDetected: true,
        snapshot: s.snapshot ? { ...s.snapshot, status: 'complete' } : null,
      }))
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
      isWicket: input.isWicket,
      batsmanId: snapshot.strikerId,
      bowlerId: snapshot.currentBowlerId,
      inningsRuns: newRuns,
      inningsWickets: newWickets,
      inningsOvers: newOvers,
      inningsBalls: remainingBalls,
      strikerId: newStrikerId,
      nonStrikerId: newNonStrikerId,
    })

    if (input.isWicket) {
      await triggerPusherEvent(snapshot.matchId, 'wicket.fell', {
        matchId: snapshot.matchId,
        batsmanId: snapshot.strikerId,
        dismissalType: input.dismissalType!,
        fielder1Id: input.fielder1Id,
        fielder2Id: input.fielder2Id,
        nextBatsmanId: 0, // set by WicketModal after selecting next batsman
        inningsWickets: newWickets,
      })
    }

    // Flush conditions — guard against double-flush
    if (!isFlushing) {
      const shouldFlushOver = newLegalCount === 6
      const shouldFlushSafety = newLegalCount > 0 && newLegalCount % 3 === 0 && !shouldFlushOver
      const shouldFlushWicket = input.isWicket

      if (shouldFlushOver || shouldFlushSafety || shouldFlushWicket) {
        await get().flushOverToNeon()

        if (shouldFlushOver) {
          // End of over: swap striker/non-striker ONLY if even runs on last ball
          // (odd runs already rotated the strike in the optimistic update above)
          const lastBallOddRuns = shouldRotateStrike(input.runs, input.isWicket)
          set((s) => ({
            legalDeliveryCount: 0,
            snapshot: s.snapshot
              ? {
                  ...s.snapshot,
                  ...(lastBallOddRuns
                    ? {}
                    : {
                        strikerId: s.snapshot.nonStrikerId,
                        nonStrikerId: s.snapshot.strikerId,
                      }),
                  currentBalls: 0,
                }
              : null,
          }))

          await triggerPusherEvent(snapshot.matchId, 'over.complete', {
            matchId: snapshot.matchId,
            overNumber,
            overRuns: currentOverBalls
              .concat(delivery)
              .reduce((sum, d) => sum + d.runs + d.extraRuns, 0),
            bowlerId: snapshot.currentBowlerId,
            maidens: 0, // calculated server-side on persist
          })
        }
      }
    }
  },

  async undoDelivery() {
    const { snapshot, currentOverBalls, legalDeliveryCount, lastFlushedDeliveryIds } = get()
    if (!snapshot) return

    if (currentOverBalls.length > 0) {
      // Undo in-buffer delivery (not yet persisted)
      const removed = currentOverBalls[currentOverBalls.length - 1]
      const newBalls = currentOverBalls.slice(0, -1)
      const newLegalCount = legalDeliveryCount - (removed.isLegal ? 1 : 0)

      // Reverse innings totals
      const innings = snapshot.currentInningsState!
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

      set({
        currentOverBalls: newBalls,
        legalDeliveryCount: Math.max(0, newLegalCount),
        snapshot: {
          ...snapshot,
          currentInningsState: updatedInnings,
          innings: snapshot.innings.map((i) =>
            i.inningsNumber === snapshot.currentInnings ? updatedInnings : i
          ),
        },
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
            runs: 0,
            balls: 0,
            batter1Id: s.snapshot.strikerId ?? batsmanId,
            batter2Id: batsmanId,
          },
        },
      }
    })
  },

  setBowler(bowlerId) {
    set((s) => ({
      snapshot: s.snapshot ? { ...s.snapshot, currentBowlerId: bowlerId } : null,
    }))
  },

  startNextOver() {
    set((s) => {
      if (!s.snapshot) return {}
      const nextOver = s.snapshot.currentOver + 1
      return {
        currentOverBalls: [],
        legalDeliveryCount: 0,
        flushedBallCount: 0,
        snapshot: {
          ...s.snapshot,
          currentOver: nextOver,
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

    const isOverEnd = get().legalDeliveryCount === 6

    set({ isFlushing: true })

    try {
      const res = await fetch('/api/match/persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: snapshot.matchId,
          inningsId: snapshot.currentInningsState?.id,
          deliveries: unflushed,
          overNumber: snapshot.currentOver,
          strikerId: snapshot.strikerId,
          nonStrikerId: snapshot.nonStrikerId,
          currentBowlerId: snapshot.currentBowlerId,
        }),
      })

      if (res.ok) {
        const { deliveryIds } = await res.json()
        set((s) => ({
          // Only clear the display buffer at end-of-over; mid-over keep dots visible
          currentOverBalls: isOverEnd ? [] : s.currentOverBalls,
          flushedBallCount: isOverEnd ? 0 : s.currentOverBalls.length,
          lastFlushedDeliveryIds: [...s.lastFlushedDeliveryIds, ...deliveryIds].slice(-10),
        }))
      }
    } catch (err) {
      console.error('Flush failed:', err)
    } finally {
      set({ isFlushing: false })
    }
  },

  clearWinDetected() {
    set({ winDetected: false })
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
