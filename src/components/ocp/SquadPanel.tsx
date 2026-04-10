'use client'

import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useMatchStore } from '@/store/matchStore'
import { EditIcon } from '@/components/shared/EditIcon'
import type { PlayerSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!

const ROLE_LABELS: Record<string, string> = {
  batsman: 'BAT',
  bowler: 'BOWL',
  allrounder: 'AR',
  keeper: 'WK',
}

const ROLE_COLORS: Record<string, string> = {
  batsman: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  bowler: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  allrounder: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  keeper: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
}

export function SquadPanel() {
  const isOpen = useUIStore((s) => s.isSquadPanelOpen)
  const closeSquadPanel = useUIStore((s) => s.closeSquadPanel)
  const openPlayerEdit = useUIStore((s) => s.openPlayerEdit)
  const openPlayerAdd = useUIStore((s) => s.openPlayerAdd)
  const snapshot = useMatchStore((s) => s.snapshot)

  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting')

  if (!isOpen || !snapshot) return null

  const battingTeamId = snapshot.currentInningsState?.battingTeamId
  const bowlingTeamId = snapshot.currentInningsState?.bowlingTeamId

  const teams = [snapshot.homeTeam, snapshot.awayTeam]
  const battingTeam = teams.find((t) => t.id === battingTeamId)
  const bowlingTeam = teams.find((t) => t.id === bowlingTeamId)
  const battingTeamName = battingTeam?.name ?? 'Batting Team'
  const bowlingTeamName = bowlingTeam?.name ?? 'Bowling Team'

  const players =
    activeTab === 'batting'
      ? snapshot.battingTeamPlayers
      : snapshot.bowlingTeamPlayers

  const activeTeamId = activeTab === 'batting' ? battingTeamId : bowlingTeamId

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={closeSquadPanel}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-[5.5rem] h-[calc(100vh-5.5rem)] w-full sm:w-[440px] z-40 bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-stats font-semibold text-white text-base">Squad Management</h2>
          <button
            onClick={closeSquadPanel}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {([
            { key: 'batting', team: battingTeam, label: battingTeamName, badge: '(Batting)', badgeColor: 'text-emerald-400' },
            { key: 'bowling', team: bowlingTeam, label: bowlingTeamName, badge: '(Bowling)', badgeColor: 'text-blue-400' },
          ] as const).map(({ key, team, label, badge, badgeColor }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-gray-800/40'
              }`}
            >
              {/* Team logo or color dot */}
              {team?.logoCloudinaryId
                ? <img
                    src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_24,h_24,f_webp/${team.logoCloudinaryId}`}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    alt=""
                  />
                : <div
                    className="w-6 h-6 rounded-full flex-shrink-0 border border-white/10"
                    style={{ backgroundColor: team?.primaryColor ?? '#4F46E5' }}
                  />
              }
              <div className="flex-1 min-w-0 text-left">
                <p className={`font-stats text-sm font-medium truncate ${activeTab === key ? 'text-primary' : 'text-gray-300'}`}>
                  {label}
                </p>
                <p className={`font-stats text-[10px] ${badgeColor}`}>{badge}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto py-2">
          {players.length === 0 ? (
            <p className="font-stats text-sm text-gray-500 text-center py-10">No players in squad</p>
          ) : (
            players.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                teamId={activeTeamId!}
                onEdit={() => openPlayerEdit(player.id, activeTeamId!)}
              />
            ))
          )}
        </div>

        {/* Add player footer */}
        <div className="px-5 py-4 border-t border-gray-800">
          <button
            onClick={() => activeTeamId && openPlayerAdd(activeTeamId)}
            className="w-full px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary font-stats font-semibold text-sm rounded-lg hover:bg-primary/20 transition-colors"
          >
            + Add Player to {activeTab === 'batting' ? battingTeamName : bowlingTeamName}
          </button>
        </div>
      </div>
    </>
  )
}

function PlayerRow({
  player,
  onEdit,
}: {
  player: PlayerSummary
  teamId: number
  onEdit: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/60 transition-colors">
      {/* Headshot avatar */}
      {player.headshotCloudinaryId
        ? <img
            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_32,h_32,f_webp/${player.headshotCloudinaryId}`}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            alt=""
          />
        : <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-stats text-sm text-gray-300 flex-shrink-0">
            {player.displayName[0]?.toUpperCase()}
          </div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-stats font-semibold text-white text-sm truncate">
            {player.displayName}
          </p>
          <button
            onClick={onEdit}
            className="text-red-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10 flex-shrink-0"
            title="Edit player"
          >
            <EditIcon className="w-4 h-4" />
          </button>
        </div>
        {player.name !== player.displayName && (
          <p className="font-stats text-xs text-gray-500 truncate">{player.name}</p>
        )}
      </div>
      <span
        className={`font-stats text-xs font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${
          ROLE_COLORS[player.role] ?? 'text-gray-400 bg-gray-700 border-gray-600'
        }`}
      >
        {ROLE_LABELS[player.role] ?? player.role}
      </span>
    </div>
  )
}
