'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { TournamentNav } from '@/components/shared/TournamentNav'
import type { Player } from '@/types/player'
import type { TournamentTeamSummary } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const ROLE_COLORS: Record<string, string> = {
  batsman: 'text-secondary',
  bowler: 'text-primary',
  allrounder: 'text-accent',
  keeper: 'text-overlay-cyan',
}

type TeamWithPlayers = TournamentTeamSummary & { players: Player[] }

export default function PlayersOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tournamentId = parseInt(id, 10)

  const [tournamentName, setTournamentName] = useState('')
  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const tRes = await fetch(`/api/tournaments/${tournamentId}`)
      if (!tRes.ok) { setLoading(false); return }
      const tournament = await tRes.json()
      setTournamentName(tournament.name)

      const teamsWithPlayers: TeamWithPlayers[] = await Promise.all(
        (tournament.teams ?? []).map(async (team: TournamentTeamSummary) => {
          const pRes = await fetch(`/api/teams/${team.id}/players`)
          const players: Player[] = pRes.ok ? await pRes.json() : []
          return { ...team, players }
        }),
      )
      setTeams(teamsWithPlayers)
      setLoading(false)
    }
    load()
  }, [tournamentId])

  const totalPlayers = teams.reduce((sum, t) => sum + t.players.length, 0)

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 font-stats text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/admin/tournaments" className="hover:text-gray-300 transition-colors">Tournaments</Link>
          <span>/</span>
          <Link href={`/admin/tournaments/${tournamentId}`} className="hover:text-gray-300 transition-colors">{tournamentName || '…'}</Link>
          <span>/</span>
          <span className="text-gray-300">Players</span>
        </div>

        <TournamentNav tournamentId={tournamentId} />

        <div className="mb-6 mt-6">
          <h1 className="font-display text-4xl text-primary tracking-wider">PLAYERS</h1>
          <p className="font-stats text-gray-400 text-sm mt-1">
            {tournamentName} · {teams.length} {teams.length === 1 ? 'team' : 'teams'} · {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 font-stats text-gray-500">Loading players...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="font-display text-3xl mb-2">NO TEAMS YET</p>
            <p className="font-stats text-sm mb-4">Add teams first, then manage their players.</p>
            <Link
              href={`/admin/tournaments/${tournamentId}/teams`}
              className="px-4 py-2 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Add Teams
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <div key={team.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                {/* Team header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800" style={{ borderLeftWidth: 3, borderLeftColor: team.primaryColor }}>
                  <div className="flex items-center gap-3">
                    {team.logoCloudinaryId ? (
                      <img
                        src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_32,h_32,f_webp/${team.logoCloudinaryId}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: team.primaryColor + '33' }}>
                        <span className="w-full h-full flex items-center justify-center font-display text-xs" style={{ color: team.primaryColor }}>
                          {team.shortCode.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-display text-sm tracking-wider" style={{ color: team.primaryColor }}>{team.shortCode}</span>
                      <span className="font-stats text-sm text-gray-300 ml-2">{team.name}</span>
                      <span className="font-stats text-xs text-gray-500 ml-2">· {team.players.length} {team.players.length === 1 ? 'player' : 'players'}</span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}&tournamentId=${tournamentId}&tournamentName=${encodeURIComponent(tournamentName)}`}
                    className="px-3 py-1.5 bg-primary text-white font-stats text-xs rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Manage →
                  </Link>
                </div>

                {/* Player list */}
                {team.players.length === 0 ? (
                  <div className="px-4 py-4 text-center">
                    <p className="font-stats text-xs text-gray-600">No players yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {team.players.map((player) => (
                      <div key={player.id} className="flex items-center gap-3 px-4 py-2.5">
                        {player.headshotCloudinaryId ? (
                          <img
                            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_32,h_32,f_webp/${player.headshotCloudinaryId}`}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-stats text-xs text-gray-400 flex-shrink-0">
                            {player.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-stats text-sm font-semibold text-white truncate">{player.displayName}</p>
                          {player.displayName !== player.name && (
                            <p className="font-stats text-xs text-gray-500 truncate">{player.name}</p>
                          )}
                        </div>
                        <span className={`font-stats text-xs font-semibold capitalize flex-shrink-0 ${ROLE_COLORS[player.role] ?? 'text-gray-400'}`}>
                          {player.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
