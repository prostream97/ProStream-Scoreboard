'use client'

import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { EditIcon } from '@/components/shared/EditIcon'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!

export function BattingPanel() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const openPlayerEdit = useUIStore((s) => s.openPlayerEdit)
  if (!snapshot) return null

  const { batters, strikerId, nonStrikerId, partnership, battingTeamPlayers, currentInningsState } = snapshot
  const battingTeamId = currentInningsState?.battingTeamId

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
      <BatterRow
        batter={striker}
        isStriker
        label="*"
        headshotId={strikerId ? battingTeamPlayers.find(p => p.id === strikerId)?.headshotCloudinaryId ?? null : null}
        onEdit={strikerId && battingTeamId ? () => openPlayerEdit(strikerId, battingTeamId) : undefined}
      />

      {/* Non-striker */}
      <BatterRow
        batter={nonStriker}
        isStriker={false}
        label=""
        headshotId={nonStrikerId ? battingTeamPlayers.find(p => p.id === nonStrikerId)?.headshotCloudinaryId ?? null : null}
        onEdit={nonStrikerId && battingTeamId ? () => openPlayerEdit(nonStrikerId, battingTeamId) : undefined}
      />

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
  headshotId,
  onEdit,
}: {
  batter: ReturnType<typeof useMatchStore.getState>['snapshot'] extends null ? undefined : NonNullable<ReturnType<typeof useMatchStore.getState>['snapshot']>['batters'][number] | undefined
  isStriker: boolean
  label: string
  headshotId: string | null
  onEdit?: () => void
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
      className={`relative group rounded-lg p-3 ${isStriker ? 'bg-gray-800 border border-primary/30' : 'bg-gray-850'}`}
    >
      <div className="flex items-center gap-3 mb-1">
        {/* Headshot */}
        {headshotId
          ? <img
              src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_36,h_36,f_webp/${headshotId}`}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              alt=""
            />
          : <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center font-stats text-sm text-gray-300 flex-shrink-0">
              {batter.displayName[0]?.toUpperCase()}
            </div>
        }
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-stats font-semibold text-white">
              {isStriker && <span className="text-primary mr-1">*</span>}
              {batter.displayName}
            </span>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-red-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                title="Edit player"
              >
                <EditIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="font-display text-2xl text-white">{batter.runs}</span>
        </div>
      </div>
      <div className="flex gap-4 font-stats text-xs text-gray-400 pl-12">
        <span>{batter.balls}b</span>
        <span>{batter.fours}×4</span>
        <span>{batter.sixes}×6</span>
        <span className="ml-auto">SR {batter.strikeRate.toFixed(1)}</span>
      </div>
    </div>
  )
}
