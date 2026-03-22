'use client'

import { useEffect, useState } from 'react'
import type { WicketPayload } from '@/types/pusher'
import type { MatchSnapshot } from '@/types/match'

type Props = {
  wicket: WicketPayload | null
  snapshot: MatchSnapshot
}

const DISMISSAL_LABEL: Record<string, string> = {
  bowled: 'BOWLED',
  caught: 'CAUGHT',
  lbw: 'LBW',
  runout: 'RUN OUT',
  stumped: 'STUMPED',
  hitwicket: 'HIT WICKET',
  obstructingfield: 'OBSTRUCTING THE FIELD',
  handledball: 'HANDLED THE BALL',
  timedout: 'TIMED OUT',
}

export function WicketAlert({ wicket, snapshot }: Props) {
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState<WicketPayload | null>(null)

  useEffect(() => {
    if (!wicket || wicket === shown) return
    setShown(wicket)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(t)
  }, [wicket, shown])

  if (!visible || !shown) return null

  const outBatter =
    snapshot.battingTeamPlayers.find((p) => p.id === shown.batsmanId)
    ?? snapshot.bowlingTeamPlayers.find((p) => p.id === shown.batsmanId)

  const battingTeam =
    snapshot.currentInningsState?.battingTeamId === snapshot.homeTeam.id
      ? snapshot.homeTeam
      : snapshot.awayTeam

  return (
    // Full-screen overlay — use entire 1920×1080 browser source in OBS
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      {/* Dark backdrop pulse */}
      <div className="absolute inset-0 bg-black/60 animate-pulse" style={{ animationDuration: '0.5s' }} />

      {/* Card */}
      <div
        className="relative z-10 text-center px-16 py-10 rounded-3xl"
        style={{
          background: `linear-gradient(135deg, ${battingTeam.primaryColor}dd, ${battingTeam.primaryColor}88)`,
          boxShadow: `0 0 80px ${battingTeam.primaryColor}66`,
          border: `2px solid ${battingTeam.primaryColor}`,
        }}
      >
        {/* WICKET header */}
        <p
          className="font-display text-9xl tracking-[0.3em] text-white leading-none mb-2"
          style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}
        >
          WICKET!
        </p>

        {/* Batter name */}
        {outBatter && (
          <p className="font-display text-4xl text-white/90 tracking-wider mb-3">
            {outBatter.displayName.toUpperCase()}
          </p>
        )}

        {/* Dismissal type */}
        <p
          className="font-stats text-2xl uppercase tracking-widest"
          style={{ color: battingTeam.primaryColor === '#ef4444' ? '#fff' : '#fde68a' }}
        >
          {DISMISSAL_LABEL[shown.dismissalType] ?? shown.dismissalType}
        </p>

        {/* Innings wickets */}
        <div className="mt-4 font-stats text-white/70 text-lg">
          {shown.inningsWickets} wicket{shown.inningsWickets !== 1 ? 's' : ''} down
        </div>
      </div>
    </div>
  )
}
