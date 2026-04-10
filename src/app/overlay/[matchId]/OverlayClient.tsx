'use client'

import { AnimatePresence } from 'framer-motion'
import { PusherProvider } from '@/components/shared/PusherProvider'
import { StandardScorebug } from '@/components/overlay/StandardScorebug'
import { BatterCard, BowlerCard } from '@/components/overlay/PlayerCard'
import { WicketAlert } from '@/components/overlay/WicketAlert'
import { PartnershipOverlay } from '@/components/overlay/PartnershipOverlay'
import { BoundaryAlert } from '@/components/overlay/BoundaryAlert'
import { InningsSummaryOverlay } from '@/components/overlay/InningsSummaryOverlay'
import { HeaderOverlay } from '@/components/overlay/HeaderOverlay'
import { MostWicketsOverlay } from '@/components/overlay/MostWicketsOverlay'
import { StandardTeamSummaryOverlay } from '@/components/overlay/StandardTeamSummaryOverlay'
import { useOverlayState } from './useOverlayState'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { MatchSnapshot } from '@/types/match'
import type { TournamentMostWicketsData } from '@/lib/db/queries/match'

type Props = {
  matchId: number
  initialSnapshot: MatchSnapshot
  initialMostWickets: TournamentMostWicketsData | null
}

function OverlayInner({ matchId, initialSnapshot, initialMostWickets }: Props) {
  const {
    snapshot,
    lastWicket,
    lastBoundary,
    activePlayerId,
    scorebugVisible,
    headerVisible,
    cardVisible,
    partnershipVisible,
    summaryVisible,
    teamSummaryVisible,
    activeSummaryTeamId,
    activeSummaryView,
    mostWicketsVisible,
    inningsSummaries,
    mostWicketsData,
    battingTeam,
    bowlingTeam,
  } = useOverlayState({ matchId, initialSnapshot, initialMostWickets, overlayTheme: 'standard' })

  const resolveCard = () => {
    const pid = activePlayerId ?? snapshot.strikerId
    const batter = snapshot.batters.find((b) => b.playerId === pid)
      ?? (pid && snapshot.battingTeamPlayers.find((p) => p.id === pid)
        ? { playerId: pid, playerName: '', displayName: snapshot.battingTeamPlayers.find((p) => p.id === pid)!.displayName, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isStriker: pid === snapshot.strikerId, isOut: false, dismissalType: null }
        : null)
    if (batter) {
      const player = snapshot.battingTeamPlayers.find((p) => p.id === pid)
      return (
        <BatterCard
          batter={batter}
          player={player}
          isStriker={pid === snapshot.strikerId}
          team={battingTeam}
        />
      )
    }
    const bowler = snapshot.bowlers.find((b) => b.isCurrent)
    if (bowler) {
      const player = snapshot.bowlingTeamPlayers.find((p) => p.id === bowler.playerId)
      return <BowlerCard bowler={bowler} player={player} team={bowlingTeam} />
    }
    return null
  }

  const resolvedSummaryView =
    activeSummaryTeamId === snapshot.currentInningsState?.battingTeamId
      ? 'batting'
      : activeSummaryTeamId === snapshot.currentInningsState?.bowlingTeamId
        ? 'bowling'
        : activeSummaryView

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <AnimatePresence>
        {summaryVisible && (
          <InningsSummaryOverlay snapshot={snapshot} inningsSummaries={inningsSummaries} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teamSummaryVisible && activeSummaryTeamId && resolvedSummaryView && (
          <StandardTeamSummaryOverlay
            snapshot={snapshot}
            teamId={activeSummaryTeamId}
            view={resolvedSummaryView}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostWicketsVisible && mostWicketsData && (
          <MostWicketsOverlay data={mostWicketsData} />
        )}
      </AnimatePresence>

      <BoundaryAlert boundary={lastBoundary} snapshot={snapshot} />
      <WicketAlert wicket={lastWicket} snapshot={snapshot} />

      <AnimatePresence>
        {headerVisible && <HeaderOverlay snapshot={snapshot} tournamentName={snapshot.tournamentName ?? ''} />}
      </AnimatePresence>

      <AnimatePresence>
        {scorebugVisible && !headerVisible && <StandardScorebug snapshot={snapshot} />}
      </AnimatePresence>

      <AnimatePresence>
        {cardVisible && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            {resolveCard()}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {partnershipVisible && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <PartnershipOverlay snapshot={snapshot} />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function OverlayClient(props: Props) {
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
