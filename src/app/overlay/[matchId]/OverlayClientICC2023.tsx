'use client'

import { AnimatePresence } from 'framer-motion'
import { PusherProvider } from '@/components/shared/PusherProvider'
import { ICC2023Scorebug } from '@/components/overlay/icc2023/ICC2023Scorebug'
import { ICC2023BatterCard, ICC2023BowlerCard } from '@/components/overlay/icc2023/ICC2023PlayerCard'
import { ICC2023WicketAlert } from '@/components/overlay/icc2023/ICC2023WicketAlert'
import { ICC2023PartnershipOverlay } from '@/components/overlay/icc2023/ICC2023PartnershipOverlay'
import { ICC2023BoundaryAlert } from '@/components/overlay/icc2023/ICC2023BoundaryAlert'
import { ICC2023InningsSummary } from '@/components/overlay/icc2023/ICC2023InningsSummary'
import { ICC2023Header } from '@/components/overlay/icc2023/ICC2023Header'
import { ICC2023MostWickets } from '@/components/overlay/icc2023/ICC2023MostWickets'
import { useOverlayState } from './useOverlayState'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { MatchSnapshot } from '@/types/match'
import type { TournamentMostWicketsData } from '@/lib/db/queries/match'

type Props = {
  matchId: number
  initialSnapshot: MatchSnapshot
  initialMostWickets: TournamentMostWicketsData | null
}

function OverlayInnerICC2023({ matchId, initialSnapshot, initialMostWickets }: Props) {
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
    mostWicketsVisible,
    inningsSummaries,
    mostWicketsData,
    battingTeam,
    bowlingTeam,
  } = useOverlayState({ matchId, initialSnapshot, initialMostWickets })

  const resolveCard = () => {
    const pid = activePlayerId ?? snapshot.strikerId
    const batter = snapshot.batters.find((b) => b.playerId === pid)
      ?? (pid && snapshot.battingTeamPlayers.find((p) => p.id === pid)
        ? { playerId: pid, playerName: '', displayName: snapshot.battingTeamPlayers.find((p) => p.id === pid)!.displayName, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isStriker: pid === snapshot.strikerId, isOut: false, dismissalType: null }
        : null)
    if (batter) {
      const player = snapshot.battingTeamPlayers.find((p) => p.id === pid)
      return (
        <ICC2023BatterCard
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
      return <ICC2023BowlerCard bowler={bowler} player={player} team={bowlingTeam} />
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <AnimatePresence>
        {summaryVisible && (
          <ICC2023InningsSummary snapshot={snapshot} inningsSummaries={inningsSummaries} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostWicketsVisible && mostWicketsData && (
          <ICC2023MostWickets data={mostWicketsData} />
        )}
      </AnimatePresence>

      <ICC2023BoundaryAlert boundary={lastBoundary} snapshot={snapshot} />
      <ICC2023WicketAlert wicket={lastWicket} snapshot={snapshot} />

      <AnimatePresence>
        {headerVisible && <ICC2023Header snapshot={snapshot} tournamentName={snapshot.tournamentName ?? ''} />}
      </AnimatePresence>

      <AnimatePresence>
        {scorebugVisible && !headerVisible && <ICC2023Scorebug snapshot={snapshot} />}
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
            <ICC2023PartnershipOverlay snapshot={snapshot} />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function OverlayClientICC2023(props: Props) {
  return (
    <ErrorBoundary fallback={
      <div style={{ color: 'white', padding: 16, fontFamily: 'monospace', fontSize: 14 }}>
        Overlay unavailable — please reload.
      </div>
    }>
      <PusherProvider>
        <OverlayInnerICC2023 {...props} />
      </PusherProvider>
    </ErrorBoundary>
  )
}
