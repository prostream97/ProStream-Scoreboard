'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PusherProvider, useEvent } from '@/components/shared/PusherProvider'
import { Scorebug } from '@/components/overlay/Scorebug'
import { StandardScorebug } from '@/components/overlay/StandardScorebug'
import { BatterCard, BowlerCard } from '@/components/overlay/PlayerCard'
import { WicketAlert } from '@/components/overlay/WicketAlert'
import { PartnershipOverlay } from '@/components/overlay/PartnershipOverlay'
import { BoundaryAlert } from '@/components/overlay/BoundaryAlert'
import type { MatchSnapshot, InningsState } from '@/types/match'
import type {
  DeliveryAddedPayload,
  WicketPayload,
  InningsChangePayload,
  DisplayTogglePayload,
} from '@/types/pusher'

type Props = {
  matchId: number
  initialSnapshot: MatchSnapshot
  mode: string
}

function OverlayInner({ matchId, initialSnapshot, mode }: Props) {
  const [snapshot, setSnapshot] = useState<MatchSnapshot>(initialSnapshot)
  const [lastWicket, setLastWicket] = useState<WicketPayload | null>(null)
  const [lastBoundary, setLastBoundary] = useState<{ id: number; runs: 4 | 6 } | null>(null)
  const [visible, setVisible] = useState(true)
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null)

  // Reconnect recovery
  useEffect(() => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
      .catch(() => {})
  }, [matchId])

  useEvent(`match-${matchId}`, 'delivery.added', (data: DeliveryAddedPayload) => {
    if (data.runs === 4 || data.runs === 6) {
      setLastBoundary({ id: Date.now(), runs: data.runs as 4 | 6 })
    }

    setSnapshot((s) => {
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
      return {
        ...s,
        innings: updatedInnings,
        currentInningsState,
        strikerId: data.strikerId,
        nonStrikerId: data.nonStrikerId,
        currentRunRate,
        partnership: s.strikerId && s.nonStrikerId
          ? {
              runs: (s.partnership?.runs ?? 0) + data.runs + data.extraRuns,
              balls: (s.partnership?.balls ?? 0) + (data.isLegal ? 1 : 0),
              batter1Id: data.strikerId,
              batter2Id: data.nonStrikerId,
            }
          : s.partnership,
      }
    })
  })

  useEvent(`match-${matchId}`, 'wicket.fell', (data: WicketPayload) => {
    setLastWicket(data)
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
      .catch(() => {})
  })

  useEvent(`match-${matchId}`, 'innings.change', (_data: InningsChangePayload) => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
      .catch(() => {})
  })

  useEvent(`match-${matchId}`, 'display.toggle', (data: DisplayTogglePayload) => {
    // For 'card' mode respond to display.toggle for playerCard
    if (mode === 'card' && data.element === 'playerCard') {
      setVisible(data.visible)
      if (data.playerId) setActivePlayerId(data.playerId)
    }
    if (mode === 'bug' && data.element === 'scorebug') setVisible(data.visible)
    if (mode === 'partnership' && data.element === 'partnership') setVisible(data.visible)
  })

  const inn = snapshot.currentInningsState
  const battingTeam = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowlingTeam = inn?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam

  // Resolve active player card
  const resolveCard = () => {
    const pid = activePlayerId ?? snapshot.strikerId
    // Check batters first
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
          primaryColor={battingTeam.primaryColor}
        />
      )
    }
    // Fallback to current bowler
    const bowler = snapshot.bowlers.find((b) => b.isCurrent)
    if (bowler) {
      const player = snapshot.bowlingTeamPlayers.find((p) => p.id === bowler.playerId)
      return <BowlerCard bowler={bowler} player={player} primaryColor={bowlingTeam.primaryColor} />
    }
    return null
  }

  if (mode === 'bug') {
    if (!visible) return null
    return <Scorebug snapshot={snapshot} />
  }

  if (mode === 'standard') {
    if (!visible) return null
    return <StandardScorebug snapshot={snapshot} />
  }

  if (mode === 'card') {
    return <AnimatePresence>{visible && resolveCard()}</AnimatePresence>
  }

  if (mode === 'wicket') {
    return <WicketAlert wicket={lastWicket} snapshot={snapshot} />
  }

  if (mode === 'partnership') {
    return <AnimatePresence>{visible && <PartnershipOverlay snapshot={snapshot} />}</AnimatePresence>
  }

  if (mode === 'boundary') {
    return <BoundaryAlert boundary={lastBoundary} snapshot={snapshot} />
  }

  // Default: scorebug
  return <Scorebug snapshot={snapshot} />
}

export function OverlayClient(props: Props) {
  return (
    <PusherProvider>
      <OverlayInner {...props} />
    </PusherProvider>
  )
}
