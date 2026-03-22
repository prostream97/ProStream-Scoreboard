'use client'

import type { MatchSnapshot } from '@/types/match'

type Props = { snapshot: MatchSnapshot }

export function PartnershipOverlay({ snapshot }: Props) {
  const { partnership, battingTeamPlayers, strikerId, nonStrikerId, homeTeam, awayTeam, currentInningsState } = snapshot

  if (!partnership || !strikerId || !nonStrikerId) return null

  const battingTeam = currentInningsState?.battingTeamId === homeTeam.id ? homeTeam : awayTeam
  const b1 = battingTeamPlayers.find((p) => p.id === strikerId)
  const b2 = battingTeamPlayers.find((p) => p.id === nonStrikerId)

  return (
    // 480×100 lower-third panel — OBS browser source
    <div
      className="flex items-center w-[480px] h-[100px] font-stats overflow-hidden rounded-r-2xl px-5 gap-6"
      style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.70) 100%)' }}
    >
      {/* Accent */}
      <div className="absolute left-0 top-0 w-1.5 h-full" style={{ backgroundColor: battingTeam.primaryColor }} />

      <div className="ml-3">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Partnership</p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-5xl text-white leading-none">{partnership.runs}</span>
          <span className="text-gray-400 text-xl">({partnership.balls}b)</span>
        </div>
      </div>

      <div className="flex-1 border-l border-gray-700 pl-5">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Batters</p>
        <p className="font-display text-lg text-white tracking-wide leading-tight">
          <span style={{ color: battingTeam.primaryColor }}>*</span> {b1?.displayName ?? '—'}
        </p>
        <p className="font-display text-lg text-gray-300 tracking-wide leading-tight">
          {b2?.displayName ?? '—'}
        </p>
      </div>
    </div>
  )
}
