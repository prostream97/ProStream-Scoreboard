'use client'

import { useMatchStore } from '@/store/matchStore'

export function BattingPanel() {
  const snapshot = useMatchStore((s) => s.snapshot)
  if (!snapshot) return null

  const { batters, strikerId, nonStrikerId, partnership, battingTeamPlayers } = snapshot

  // Fall back to squad list when player hasn't faced a ball yet (empty deliveries)
  function resolveOrSynth(playerId: number | null, isStriker: boolean) {
    if (!playerId) return undefined
    const fromStats = batters.find((b) => b.playerId === playerId)
    if (fromStats) return fromStats
    const p = battingTeamPlayers.find((tp) => tp.id === playerId)
    if (!p) return undefined
    return {
      playerId,
      playerName: p.name,
      displayName: p.displayName,
      runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0,
      isStriker, isOut: false, dismissalType: null as null,
    }
  }

  const striker = resolveOrSynth(strikerId, true)
  const nonStriker = resolveOrSynth(nonStrikerId, false)

  return (
    <div className="bg-gray-900 rounded-xl p-4 h-full flex flex-col gap-4">
      <h3 className="font-stats text-xs text-gray-400 uppercase tracking-wider">Batting</h3>

      {/* Striker */}
      <BatterRow batter={striker} isStriker label="*" />

      {/* Non-striker */}
      <BatterRow batter={nonStriker} isStriker={false} label="" />

      {/* Partnership */}
      {partnership && (
        <div className="mt-auto pt-3 border-t border-gray-800">
          <p className="font-stats text-xs text-gray-400 uppercase tracking-wider mb-1">Partnership</p>
          <p className="font-stats text-lg font-semibold text-white">
            {partnership.runs}
            <span className="text-gray-400 text-sm font-normal ml-1">
              ({partnership.balls} balls)
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

function BatterRow({
  batter,
  isStriker,
  label,
}: {
  batter: ReturnType<typeof useMatchStore.getState>['snapshot'] extends null ? undefined : NonNullable<ReturnType<typeof useMatchStore.getState>['snapshot']>['batters'][number] | undefined
  isStriker: boolean
  label: string
}) {
  if (!batter) {
    return (
      <div className="flex items-center gap-2 opacity-30">
        <div className="w-2 text-primary font-bold">{label}</div>
        <p className="font-stats text-gray-500">—</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg p-3 ${isStriker ? 'bg-gray-800 border border-primary/30' : 'bg-gray-850'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-stats font-semibold text-white">
          {isStriker && <span className="text-primary mr-1">*</span>}
          {batter.displayName}
        </span>
        <span className="font-display text-2xl text-white">{batter.runs}</span>
      </div>
      <div className="flex gap-4 font-stats text-xs text-gray-400">
        <span>{batter.balls}b</span>
        <span>{batter.fours}×4</span>
        <span>{batter.sixes}×6</span>
        <span className="ml-auto">SR {batter.strikeRate.toFixed(1)}</span>
      </div>
    </div>
  )
}
