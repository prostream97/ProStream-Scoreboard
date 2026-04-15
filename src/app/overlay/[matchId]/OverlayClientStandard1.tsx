'use client'

import { AnimatePresence } from 'framer-motion'
import { PusherProvider } from '@/components/shared/PusherProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useOverlayState } from './useOverlayState'
import type { MatchSnapshot } from '@/types/match'
import type { WicketPayload } from '@/types/pusher'
import type { TournamentMostWicketsData } from '@/lib/db/queries/match'

// Standard 1 components — imported as they are built
import { Standard1Scorebug } from '@/components/overlay/standard1/Standard1Scorebug'
import { Standard1StrikerCard } from '@/components/overlay/standard1/Standard1StrikerCard'
import { Standard1BowlerCard } from '@/components/overlay/standard1/Standard1BowlerCard'
import { Standard1LastOutCard } from '@/components/overlay/standard1/Standard1LastOutCard'
import { Standard1PartnershipOverlay } from '@/components/overlay/standard1/Standard1PartnershipOverlay'
import { Standard1TeamSquadOverlay } from '@/components/overlay/standard1/Standard1TeamSquadOverlay'
import { Standard1SquadWithImageOverlay } from '@/components/overlay/standard1/Standard1SquadWithImageOverlay'
import { Standard1TeamVsTeamOverlay } from '@/components/overlay/standard1/Standard1TeamVsTeamOverlay'
import { Standard1TossDetailsOverlay } from '@/components/overlay/standard1/Standard1TossDetailsOverlay'
import { Standard1TournamentNameOverlay } from '@/components/overlay/standard1/Standard1TournamentNameOverlay'
import { Standard1MatchSummaryOverlay } from '@/components/overlay/standard1/Standard1MatchSummaryOverlay'

type Props = {
  matchId: number
  initialSnapshot: MatchSnapshot
  initialMostWickets: TournamentMostWicketsData | null
}

function OverlayInner({ matchId, initialSnapshot, initialMostWickets }: Props) {
  const {
    snapshot,
    lastWicket,
    activePlayerId,
    scorebugVisible,
    headerVisible,
    cardVisible,
    partnershipVisible,
    summaryVisible,
    tossResultVisible,
    lastOutCardVisible,
    teamSquadVisible,
    squadWithImageVisible,
    teamVsTeamVisible,
    activeSquadWithImageTeamId,
    inningsSummaries,
    battingTeam,
    bowlingTeam,
  } = useOverlayState({ matchId, initialSnapshot, initialMostWickets, overlayTheme: 'standard1' })

  // Resolve which player card to show: batter or bowler
  const resolveCard = () => {
    const pid = activePlayerId ?? snapshot.strikerId
    const batter = snapshot.batters.find((b) => b.playerId === pid && !b.isOut)
    if (batter) {
      const player = snapshot.battingTeamPlayers.find((p) => p.id === pid)
      return (
        <Standard1StrikerCard
          batter={batter}
          player={player}
          team={battingTeam}
        />
      )
    }
    const bowler = snapshot.bowlers.find((b) => b.isCurrent)
    if (bowler) {
      const player = snapshot.bowlingTeamPlayers.find((p) => p.id === bowler.playerId)
      return <Standard1BowlerCard bowler={bowler} player={player} team={bowlingTeam} />
    }
    return null
  }

  // Resolve team for squad overlays — players are keyed by batting/bowling role
  const battingTeamId = snapshot.currentInningsState?.battingTeamId
  const bowlingTeamId = snapshot.currentInningsState?.bowlingTeamId
  const resolvePlayersByTeamId = (teamId: number) =>
    teamId === battingTeamId ? snapshot.battingTeamPlayers
    : teamId === bowlingTeamId ? snapshot.bowlingTeamPlayers
    : []
  const homePlayers = resolvePlayersByTeamId(snapshot.homeTeam.id)
  const awayPlayers = resolvePlayersByTeamId(snapshot.awayTeam.id)
  const resolveSquadTeam = (teamId: number | null) =>
    teamId === snapshot.homeTeam.id ? snapshot.homeTeam
    : teamId === snapshot.awayTeam.id ? snapshot.awayTeam
    : null

  const resolveSquadPlayers = (teamId: number | null) =>
    teamId === battingTeamId ? snapshot.battingTeamPlayers : snapshot.bowlingTeamPlayers

  const squadWithImageTeam = resolveSquadTeam(activeSquadWithImageTeamId)
  const squadWithImagePlayers = resolveSquadPlayers(activeSquadWithImageTeamId)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      <AnimatePresence>
        {headerVisible && (
          <Standard1TournamentNameOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teamVsTeamVisible && (
          <Standard1TeamVsTeamOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tossResultVisible && (
          <Standard1TossDetailsOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {summaryVisible && (
          <Standard1MatchSummaryOverlay
            snapshot={snapshot}
            inningsSummaries={inningsSummaries}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scorebugVisible && (
          <Standard1Scorebug snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cardVisible && resolveCard()}
      </AnimatePresence>

      <AnimatePresence>
        {lastOutCardVisible && (() => {
          // Use real wicket payload from Pusher; fall back to last-out batter from snapshot
          // so the card works after a page reload (when lastWicket resets to null).
          const effectiveWicket: WicketPayload | null = lastWicket ?? (() => {
            const lastOut = snapshot.batters.find(b => b.isOut)
            if (!lastOut) return null
            return {
              matchId: snapshot.matchId,
              dismissedBatterId: lastOut.playerId,
              dismissalType: lastOut.dismissalType ?? 'bowled',
              fielder1Id: null,
              fielder2Id: null,
              incomingBatterId: null,
              inningsWickets: snapshot.currentInningsState?.wickets ?? 0,
            }
          })()
          return effectiveWicket
            ? <Standard1LastOutCard wicket={effectiveWicket} snapshot={snapshot} />
            : null
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {partnershipVisible && (
          <Standard1PartnershipOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teamSquadVisible && (
          <Standard1TeamSquadOverlay
            homeTeam={snapshot.homeTeam}
            awayTeam={snapshot.awayTeam}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {squadWithImageVisible && squadWithImageTeam && (
          <Standard1SquadWithImageOverlay
            team={squadWithImageTeam}
            players={squadWithImagePlayers}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

export function OverlayClientStandard1(props: Props) {
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
