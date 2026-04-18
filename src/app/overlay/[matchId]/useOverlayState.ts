'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEvent } from '@/components/shared/PusherProvider'
import type { MatchSnapshot, InningsState } from '@/types/match'
import type { InningsSummaryData, TournamentMostWicketsData, TournamentMostBoundariesData } from '@/lib/db/queries/match'
import { applyDeliveryToPartnershipStats, createPartnershipStats } from '@/lib/match/partnership'
import type {
  DeliveryAddedPayload,
  WicketPayload,
  InningsChangePayload,
  DisplayTogglePayload,
  OverCompletePayload,
} from '@/types/pusher'

type Props = {
  matchId: number
  initialSnapshot: MatchSnapshot
  initialMostWickets: TournamentMostWicketsData | null
  overlayTheme: 'standard' | 'icc2023' | 'standard1' | 'theme1'
}

export function useOverlayState({ matchId, initialSnapshot, initialMostWickets, overlayTheme }: Props) {
  const [snapshot, setSnapshot] = useState<MatchSnapshot>(initialSnapshot)
  const [lastWicket, setLastWicket] = useState<WicketPayload | null>(null)
  const [lastBoundary, setLastBoundary] = useState<{ id: number; runs: 4 | 6 } | null>(null)
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null)

  const [scorebugVisible, setScorebugVisible] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)
  const [partnershipVisible, setPartnershipVisible] = useState(false)
  const [summaryVisible, setSummaryVisible] = useState(false)
  const [teamSummaryVisible, setTeamSummaryVisible] = useState(false)
  const [tossResultVisible, setTossResultVisible] = useState(false)
  const [activeSummaryTeamId, setActiveSummaryTeamId] = useState<number | null>(null)
  const [activeSummaryView, setActiveSummaryView] = useState<'batting' | 'bowling' | null>(null)
  const [mostWicketsVisible, setMostWicketsVisible] = useState(false)
  const [mostBoundariesVisible, setMostBoundariesVisible] = useState(false)
  const [lastOutCardVisible, setLastOutCardVisible] = useState(false)
  const [teamSquadVisible, setTeamSquadVisible] = useState(false)
  const [squadWithImageVisible, setSquadWithImageVisible] = useState(false)
  const [teamVsTeamVisible, setTeamVsTeamVisible] = useState(false)
  const [activeTeamSquadTeamId, setActiveTeamSquadTeamId] = useState<number | null>(null)
  const [activeSquadWithImageTeamId, setActiveSquadWithImageTeamId] = useState<number | null>(null)
  const [inningsSummaries, setInningsSummaries] = useState<InningsSummaryData[]>([])
  const [mostWicketsData, setMostWicketsData] = useState<TournamentMostWicketsData | null>(initialMostWickets)
  const [mostBoundariesData, setMostBoundariesData] = useState<TournamentMostBoundariesData | null>(null)

  const fetchSummaries = useCallback(() => {
    fetch(`/api/match/${matchId}/innings-summary`)
      .then((r) => r.json())
      .then((data: InningsSummaryData[]) => setInningsSummaries(data))
      .catch((err) => { console.warn('[useOverlayState] fetchSummaries failed:', err) })
  }, [matchId])

  const fetchMostWickets = useCallback(() => {
    if (!snapshot.tournamentId) {
      setMostWicketsData(null)
      return
    }
    fetch(`/api/match/${matchId}/tournament-most-wickets`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to fetch most wickets')
        return r.json()
      })
      .then((data: TournamentMostWicketsData) => setMostWicketsData(data))
      .catch((err) => { console.warn('[useOverlayState] fetchMostWickets failed:', err) })
  }, [matchId, snapshot.tournamentId])

  const fetchMostBoundaries = useCallback(() => {
    if (!snapshot.tournamentId) {
      setMostBoundariesData(null)
      return
    }
    fetch(`/api/match/${matchId}/tournament-most-boundaries`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to fetch most boundaries')
        return r.json()
      })
      .then((data: TournamentMostBoundariesData) => setMostBoundariesData(data))
      .catch((err) => { console.warn('[useOverlayState] fetchMostBoundaries failed:', err) })
  }, [matchId, snapshot.tournamentId])

  // Reconnect recovery
  useEffect(() => {
    setLastBoundary(null)
    setLastWicket(null)
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
      .catch((err) => { console.warn('[useOverlayState] State reconnect refetch failed:', err) })
    fetchSummaries()
    fetchMostWickets()
  }, [matchId, fetchSummaries, fetchMostWickets])

  useEffect(() => {
    if (mostWicketsVisible) fetchMostWickets()
  }, [mostWicketsVisible, fetchMostWickets])

  useEffect(() => {
    if (mostBoundariesVisible) fetchMostBoundaries()
  }, [mostBoundariesVisible, fetchMostBoundaries])

  useEvent(`match-${matchId}`, 'delivery.added', (data: DeliveryAddedPayload) => {
    if (data.isBoundary && (data.runs === 4 || data.runs === 6)) {
      // Use a stable per-delivery id so duplicate websocket events
      // do not retrigger boundary animations repeatedly.
      const boundaryId = (
        (data.overNumber * 1_000_000)
        + (data.ballNumber * 10_000)
        + (data.inningsRuns * 10)
        + data.runs
      )
      setLastBoundary({ id: boundaryId, runs: data.runs as 4 | 6 })
    }
    if (mostWicketsVisible) fetchMostWickets()
    if (mostBoundariesVisible) fetchMostBoundaries()

    setSnapshot((s) => {
      const dismissedBatterId = data.isWicket ? (data.dismissedBatterId ?? data.batsmanId) : null
      const updatedInnings: InningsState[] = s.innings.map((inn) =>
        inn.inningsNumber === s.currentInnings
          ? { ...inn, totalRuns: data.inningsRuns, wickets: data.inningsWickets, overs: data.inningsOvers, balls: data.inningsBalls }
          : inn,
      )
      const currentInningsState = updatedInnings.find((i) => i.inningsNumber === s.currentInnings) ?? null
      const bpo = s.ballsPerOver ?? 6
      const totalBalls = (currentInningsState?.overs ?? 0) * bpo + (currentInningsState?.balls ?? 0)
      const currentRunRate = totalBalls > 0
        ? Math.round(((currentInningsState?.totalRuns ?? 0) / (totalBalls / bpo)) * 100) / 100
        : 0

      const overChanged = data.inningsOvers > (s.currentInningsState?.overs ?? 0)
      const newBall = { runs: data.runs, extraRuns: data.extraRuns, isLegal: data.isLegal, isBoundary: data.isBoundary ?? false, extraType: data.extraType, isWicket: data.isWicket }
      const currentOverBalls = overChanged ? [] : [...(s.currentOverBalls ?? []), newBall]

      const updatedBatters = s.batters.map((b) => {
        if (b.playerId === data.batsmanId) {
          const newRuns = b.runs + data.runs
          const newBalls = b.balls + (data.isLegal ? 1 : 0)
          return {
            ...b,
            runs: newRuns,
            balls: newBalls,
            fours: b.fours + (data.runs === 4 ? 1 : 0),
            sixes: b.sixes + (data.runs === 6 ? 1 : 0),
            strikeRate: newBalls > 0 ? Math.round((newRuns / newBalls) * 10000) / 100 : 0,
            isOut: b.isOut || dismissedBatterId === data.batsmanId,
            isStriker: b.playerId === data.strikerId,
          }
        }
        if (dismissedBatterId != null && b.playerId === dismissedBatterId) {
          return { ...b, isOut: true, isStriker: false }
        }
        if (b.playerId === data.strikerId || b.playerId === data.nonStrikerId) {
          return { ...b, isStriker: b.playerId === data.strikerId }
        }
        return b
      })
      const batterExists = s.batters.some((b) => b.playerId === data.batsmanId)
      let finalBatters = batterExists ? updatedBatters : [
        ...updatedBatters,
        {
          playerId: data.batsmanId,
          playerName: '',
          displayName: s.battingTeamPlayers.find((p) => p.id === data.batsmanId)?.displayName ?? '',
          runs: data.runs,
          balls: data.isLegal ? 1 : 0,
          fours: data.runs === 4 ? 1 : 0,
          sixes: data.runs === 6 ? 1 : 0,
          strikeRate: 0,
          isStriker: data.batsmanId === data.strikerId,
          isOut: dismissedBatterId === data.batsmanId,
          dismissalType: null,
        },
      ]
      if (dismissedBatterId != null && dismissedBatterId !== data.batsmanId && !finalBatters.some((b) => b.playerId === dismissedBatterId)) {
        finalBatters = [
          ...finalBatters,
          {
            playerId: dismissedBatterId,
            playerName: '',
            displayName: s.battingTeamPlayers.find((p) => p.id === dismissedBatterId)?.displayName ?? '',
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isStriker: false,
            isOut: true,
            dismissalType: null,
          },
        ]
      }

      const updatedBowlers = s.bowlers.map((b) => {
        if (b.playerId !== data.bowlerId) return { ...b, isCurrent: false }
        const newLegalBalls = b.overs * bpo + b.balls + (data.isLegal ? 1 : 0)
        const completedOvers = Math.floor(newLegalBalls / bpo)
        const ballsInOver = newLegalBalls % bpo
        const newRuns = b.runs + data.runs + data.extraRuns
        const oversDecimal = newLegalBalls / bpo
        return {
          ...b,
          overs: completedOvers,
          balls: ballsInOver,
          runs: newRuns,
          wickets: b.wickets + (data.isWicket ? 1 : 0),
          economy: oversDecimal > 0 ? Math.round((newRuns / oversDecimal) * 100) / 100 : 0,
          isCurrent: true,
        }
      })
      const bowlerExists = s.bowlers.some((b) => b.playerId === data.bowlerId)
      const finalBowlers = bowlerExists ? updatedBowlers : [
        ...updatedBowlers.map((b) => ({ ...b, isCurrent: false })),
        {
          playerId: data.bowlerId,
          playerName: '',
          displayName: s.bowlingTeamPlayers.find((p) => p.id === data.bowlerId)?.displayName ?? '',
          overs: 0,
          balls: data.isLegal ? 1 : 0,
          maidens: 0,
          runs: data.runs + data.extraRuns,
          wickets: data.isWicket ? 1 : 0,
          economy: 0,
          isCurrent: true,
        },
      ]
      const hasCurrentPair = data.strikerId != null && data.nonStrikerId != null

      return {
        ...s,
        innings: updatedInnings,
        currentInningsState,
        strikerId: data.strikerId,
        nonStrikerId: data.nonStrikerId,
        currentBalls: data.inningsBalls,
        currentOver: data.inningsOvers,
        currentRunRate,
        currentOverBalls,
        batters: finalBatters,
        bowlers: finalBowlers,
        partnership: data.isWicket
          ? (hasCurrentPair
              ? createPartnershipStats(data.strikerId!, data.nonStrikerId!)
              : null)
          : (hasCurrentPair
              ? applyDeliveryToPartnershipStats(
                  s.partnership,
                  data.batsmanId,
                  data.strikerId!,
                  data.nonStrikerId!,
                  data,
                )
              : s.partnership),
      }
    })
  })

  useEvent(`match-${matchId}`, 'wicket.fell', (data: WicketPayload) => {
    setLastWicket(data)
    setActivePlayerId(null)
    if (mostWicketsVisible) fetchMostWickets()
    if (mostBoundariesVisible) fetchMostBoundaries()
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
      .catch((err) => { console.warn('[useOverlayState] Wicket state refetch failed:', err) })
  })

  useEvent(`match-${matchId}`, 'innings.change', (_data: InningsChangePayload) => {
    setLastBoundary(null)
    setLastWicket(null)
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot({ ...fresh, currentOverBalls: [] }))
      .catch((err) => { console.warn('[useOverlayState] Innings change state refetch failed:', err) })
    fetchSummaries()
    if (mostWicketsVisible) fetchMostWickets()
    if (mostBoundariesVisible) fetchMostBoundaries()
  })

  useEvent(`match-${matchId}`, 'state.refresh', () => {
    setLastBoundary(null)
    setLastWicket(null)
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
      .catch((err) => { console.warn('[useOverlayState] state.refresh refetch failed:', err) })
  })

  useEvent(`match-${matchId}`, 'display.toggle', (data: DisplayTogglePayload) => {
    const themeScope = data.themeScope ?? 'all'
    if (themeScope !== 'all' && themeScope !== overlayTheme) return

    if (data.element === 'scorebug') setScorebugVisible(data.visible)
    if (data.element === 'header') setHeaderVisible(data.visible)
    if (data.element === 'playerCard') {
      setCardVisible(data.visible)
      if (data.playerId) setActivePlayerId(data.playerId)
    }
    if (data.element === 'partnership') setPartnershipVisible(data.visible)
    if (data.element === 'summary') setSummaryVisible(data.visible)
    if (data.element === 'tossResult') setTossResultVisible(data.visible)
    if (data.element === 'teamSummary') {
      setTeamSummaryVisible(data.visible)
      if (data.visible) {
        setActiveSummaryTeamId(data.summaryTeamId ?? null)
        setActiveSummaryView(data.summaryView ?? null)
      } else {
        setActiveSummaryTeamId(null)
        setActiveSummaryView(null)
      }
    }
    if (data.element === 'mostWickets') setMostWicketsVisible(data.visible)
    if (data.element === 'mostBoundaries') setMostBoundariesVisible(data.visible)
    if (data.element === 'lastOutCard') setLastOutCardVisible(data.visible)
    if (data.element === 'teamSquad') {
      setTeamSquadVisible(data.visible)
      setActiveTeamSquadTeamId(null)
    }
    if (data.element === 'squadWithImage') {
      setSquadWithImageVisible(data.visible)
      if (data.visible) setActiveSquadWithImageTeamId(data.squadWithImageTeamId ?? null)
      else setActiveSquadWithImageTeamId(null)
    }
    if (data.element === 'teamVsTeam') setTeamVsTeamVisible(data.visible)
  })

  useEvent(`match-${matchId}`, 'over.complete', (_data: OverCompletePayload) => {
    setSnapshot((s) => ({ ...s, currentOverBalls: [] }))
  })

  const inn = snapshot.currentInningsState
  const battingTeam = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowlingTeam = inn?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam

  return {
    snapshot,
    lastWicket,
    lastBoundary,
    activePlayerId,
    setActivePlayerId,
    scorebugVisible,
    headerVisible,
    cardVisible,
    partnershipVisible,
    summaryVisible,
    teamSummaryVisible,
    tossResultVisible,
    activeSummaryTeamId,
    activeSummaryView,
    mostWicketsVisible,
    mostBoundariesVisible,
    inningsSummaries,
    mostWicketsData,
    mostBoundariesData,
    lastOutCardVisible,
    teamSquadVisible,
    squadWithImageVisible,
    teamVsTeamVisible,
    activeTeamSquadTeamId,
    activeSquadWithImageTeamId,
    inn,
    battingTeam,
    bowlingTeam,
  }
}
