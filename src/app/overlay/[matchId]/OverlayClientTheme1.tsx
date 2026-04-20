'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PusherProvider } from '@/components/shared/PusherProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useOverlayState } from './useOverlayState'
import type { MatchSnapshot } from '@/types/match'
import type { TournamentMostWicketsData } from '@/lib/db/queries/match'
import type { TournamentBatterStats, TournamentBowlerStats } from '@/lib/db/queries/tournamentPlayerStats'
import { RetroPulseScorebug } from '@/components/overlay/theme1/RetroPulseScorebug'
import { Theme1TeamVsTeamOverlay } from '@/components/overlay/theme1/Theme1TeamVsTeamOverlay'
import { Theme1BatterCard } from '@/components/overlay/theme1/Theme1BatterCard'
import { Theme1BowlerCard } from '@/components/overlay/theme1/Theme1BowlerCard'
import { Theme1BattingSummary } from '@/components/overlay/theme1/Theme1BattingSummary'
import { Theme1BowlingSummary } from '@/components/overlay/theme1/Theme1BowlingSummary'
import { Theme1MatchSummaryOverlay } from '@/components/overlay/theme1/Theme1MatchSummaryOverlay'
import { Theme1TeamSquadOverlay } from '@/components/overlay/theme1/Theme1TeamSquadOverlay'
import { Theme1SquadWithImageOverlay } from '@/components/overlay/theme1/Theme1SquadWithImageOverlay'
import { Theme1LastOutCard } from '@/components/overlay/theme1/Theme1LastOutCard'
import { Theme1TossResultOverlay } from '@/components/overlay/theme1/Theme1TossResultOverlay'
import { Theme1PartnershipOverlay } from '@/components/overlay/theme1/Theme1PartnershipOverlay'
import { Theme1MostWicketsOverlay } from '@/components/overlay/theme1/Theme1MostWicketsOverlay'
import { Theme1MostBoundariesOverlay } from '@/components/overlay/theme1/Theme1MostBoundariesOverlay'

type Props = {
  matchId: number
  initialSnapshot: MatchSnapshot
  initialMostWickets: TournamentMostWicketsData | null
}

function OverlayInner({ matchId, initialSnapshot, initialMostWickets }: Props) {
  const {
    snapshot,
    scorebugVisible,
    lastBoundary,
    lastWicket,
    teamVsTeamVisible,
    cardVisible,
    activePlayerId,
    battingTeam,
    bowlingTeam,
    teamSummaryVisible,
    activeSummaryView,
    tossResultVisible,
    partnershipVisible,
    mostWicketsVisible,
    mostBoundariesVisible,
    mostWicketsData,
    mostBoundariesData,
    summaryVisible,
    inningsSummaries,
    teamSquadVisible,
    squadWithImageVisible,
    activeSquadWithImageTeamId,
    lastOutCardVisible,
  } = useOverlayState({
    matchId,
    initialSnapshot,
    initialMostWickets,
    overlayTheme: 'theme1',
  })

  const [activeBatterStats, setActiveBatterStats] = useState<TournamentBatterStats | null>(null)
  const [activeBowlerStats, setActiveBowlerStats] = useState<TournamentBowlerStats | null>(null)

  useEffect(() => {
    if (!cardVisible || !activePlayerId) return
    setActiveBatterStats(null)
    setActiveBowlerStats(null)
    fetch(`/api/match/${matchId}/tournament-batter-stats?playerId=${activePlayerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TournamentBatterStats | null) => setActiveBatterStats(data))
      .catch(() => setActiveBatterStats(null))
    fetch(`/api/match/${matchId}/tournament-bowler-stats?playerId=${activePlayerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TournamentBowlerStats | null) => setActiveBowlerStats(data))
      .catch(() => setActiveBowlerStats(null))
  }, [cardVisible, activePlayerId, matchId])

  const resolveCard = () => {
    const pid = activePlayerId ?? snapshot.strikerId
    const batter = snapshot.batters.find((b) => b.playerId === pid && !b.isOut)
    if (batter) {
      const player = snapshot.battingTeamPlayers.find((p) => p.id === pid)
      return (
        <Theme1BatterCard
          batter={batter}
          player={player}
          team={battingTeam}
          tournamentStats={activeBatterStats}
        />
      )
    }
    const bowler = snapshot.bowlers.find((b) => b.isCurrent)
    if (bowler) {
      const player = snapshot.bowlingTeamPlayers.find((p) => p.id === bowler.playerId)
      return (
        <Theme1BowlerCard
          bowler={bowler}
          player={player}
          team={bowlingTeam}
          tournamentStats={activeBowlerStats}
        />
      )
    }
    return null
  }

  const battingTeamId = snapshot.currentInningsState?.battingTeamId
  const bowlingTeamId = snapshot.currentInningsState?.bowlingTeamId
  const resolveSquadTeam = (teamId: number | null) =>
    teamId === snapshot.homeTeam.id ? snapshot.homeTeam
    : teamId === snapshot.awayTeam.id ? snapshot.awayTeam
    : null
  const resolveSquadPlayers = (teamId: number | null) =>
    teamId === battingTeamId ? snapshot.battingTeamPlayers : snapshot.bowlingTeamPlayers

  const squadWithImageTeam = resolveSquadTeam(activeSquadWithImageTeamId)
  const squadWithImagePlayers = resolveSquadPlayers(activeSquadWithImageTeamId)

  const effectiveWicket = (lastWicket?.dismissedBatterId != null ? lastWicket : null) ?? (() => {
    const lastOut = snapshot.batters.find((b) => b.isOut)
    if (!lastOut) return null
    return {
      matchId: snapshot.matchId,
      dismissedBatterId: lastOut.playerId,
      dismissalType: lastOut.dismissalType ?? 'bowled' as const,
      fielder1Id: null,
      fielder2Id: null,
      incomingBatterId: null,
      inningsWickets: snapshot.currentInningsState?.wickets ?? 0,
    }
  })()

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <AnimatePresence>
        {scorebugVisible && (
          <RetroPulseScorebug snapshot={snapshot} boundary={lastBoundary} wicket={lastWicket} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teamVsTeamVisible && (
          <Theme1TeamVsTeamOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tossResultVisible && (
          <Theme1TossResultOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cardVisible && resolveCard()}
      </AnimatePresence>

      <AnimatePresence>
        {partnershipVisible && (
          <Theme1PartnershipOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teamSummaryVisible && activeSummaryView === 'batting' && (
          <Theme1BattingSummary snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teamSummaryVisible && activeSummaryView === 'bowling' && (
          <Theme1BowlingSummary snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {summaryVisible && (
          <Theme1MatchSummaryOverlay snapshot={snapshot} inningsSummaries={inningsSummaries} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostWicketsVisible && mostWicketsData && (
          <Theme1MostWicketsOverlay data={mostWicketsData} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostBoundariesVisible && mostBoundariesData && (
          <Theme1MostBoundariesOverlay data={mostBoundariesData} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teamSquadVisible && (
          <Theme1TeamSquadOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastOutCardVisible && effectiveWicket && (
          <Theme1LastOutCard wicket={effectiveWicket} snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {squadWithImageVisible && squadWithImageTeam && (
          <Theme1SquadWithImageOverlay team={squadWithImageTeam} players={squadWithImagePlayers} />
        )}
      </AnimatePresence>
    </div>
  )
}

export function OverlayClientTheme1(props: Props) {
  return (
    <ErrorBoundary fallback={
      <div style={{ color: 'white', padding: 16, fontFamily: 'monospace', fontSize: 14 }}>
        Overlay unavailable — please reload.
      </div>
    }>
      <PusherProvider>
        <OverlayInner {...props} />
      </PusherProvider>
    </ErrorBoundary>
  )
}
