'use client'

import { use, useEffect, useState } from 'react'
import { TournamentNav } from '@/components/shared/TournamentNav'
import {
  AppBadge,
  AppButton,
  AppPage,
  EmptyState,
  SurfaceCard,
} from '@/components/shared/AppPrimitives'
import type { Player } from '@/types/player'
import type { TournamentTeamSummary } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Role = 'batsman' | 'bowler' | 'allrounder' | 'keeper'

const ROLE_TONES: Record<string, 'neutral' | 'green' | 'blue' | 'amber'> = {
  batsman: 'blue',
  bowler: 'green',
  allrounder: 'amber',
  keeper: 'neutral',
}

type TeamWithPlayers = TournamentTeamSummary & { players: Player[] }

export default function PlayersOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const tournamentId = parseInt(id, 10)

  const [tournamentName, setTournamentName] = useState('')
  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const tournamentRes = await fetch(`/api/tournaments/${tournamentId}`)
      if (!tournamentRes.ok) {
        setLoading(false)
        return
      }

      const tournament = await tournamentRes.json()
      setTournamentName(tournament.name)

      const teamsWithPlayers: TeamWithPlayers[] = await Promise.all(
        (tournament.teams ?? []).map(async (team: TournamentTeamSummary) => {
          const playersRes = await fetch(`/api/teams/${team.id}/players`)
          const players: Player[] = playersRes.ok ? await playersRes.json() : []
          return { ...team, players }
        }),
      )

      setTeams(teamsWithPlayers)
      setLoading(false)
    }

    load()
  }, [tournamentId])

  return (
    <AppPage className="space-y-6">
      <TournamentNav tournamentId={tournamentId} activeSegment="players" />

      {loading ? (
        <SurfaceCard className="py-16 text-center text-sm text-slate-500">
          Loading players...
        </SurfaceCard>
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Create teams for this tournament first, then add players to each roster."
          action={<AppButton href={`/admin/tournaments/${tournamentId}/teams`}>Add Teams</AppButton>}
        />
      ) : (
        <section className="space-y-8">
          {teams.map((team) => (
            <div key={team.id} className="space-y-4">
              {/* Team header card */}
              <SurfaceCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {team.logoCloudinaryId ? (
                    <img
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_88,h_88,f_webp/${team.logoCloudinaryId}`}
                      alt={team.name}
                      className="h-[4.5rem] w-[4.5rem] rounded-[1.35rem] object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] text-lg font-semibold tracking-[0.16em]"
                      style={{
                        backgroundColor: `${team.primaryColor}22`,
                        color: team.primaryColor,
                      }}
                    >
                      {team.shortCode}
                    </div>
                  )}

                  <div>
                    <p className="app-kicker">Team</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                      {team.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{tournamentName}</p>
                    <div className="mt-3">
                      <AppBadge tone="blue">{team.players.length} Players</AppBadge>
                    </div>
                  </div>
                </div>

                <AppButton
                  href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}&tournamentId=${tournamentId}&tournamentName=${encodeURIComponent(tournamentName)}`}
                >
                  Manage Players
                </AppButton>
              </SurfaceCard>

              {/* Player cards */}
              {team.players.length === 0 ? (
                <div className="rounded-[1.5rem] bg-[#f4f7f2] px-5 py-8 text-center text-sm text-slate-500">
                  No players added yet.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {team.players.map((player) => (
                    <SurfaceCard key={player.id} className="flex h-full flex-col gap-4">
                      <div className="flex items-start gap-3">
                        {player.headshotCloudinaryId ? (
                          <img
                            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_72,h_72,f_webp/${player.headshotCloudinaryId}`}
                            alt={player.displayName}
                            className="h-16 w-16 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eff4ee] text-lg font-semibold text-slate-600">
                            {player.displayName.charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-slate-950">
                              {player.displayName}
                            </h3>
                            {player.displayName !== player.name ? (
                              <p className="truncate text-sm text-slate-500">{player.name}</p>
                            ) : null}
                          </div>
                          <AppBadge tone={ROLE_TONES[player.role as Role] ?? 'neutral'}>
                            {player.role}
                          </AppBadge>
                        </div>
                      </div>

                      <div className="grid gap-3 rounded-[1.4rem] bg-[#f4f7f2] p-4 text-sm text-slate-600 sm:grid-cols-2">
                        <div>
                          <p className="app-kicker">Batting</p>
                          <p className="mt-1 font-medium text-slate-900">
                            {player.battingStyle ?? 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="app-kicker">Bowling</p>
                          <p className="mt-1 font-medium text-slate-900">
                            {player.bowlingStyle ?? 'Not set'}
                          </p>
                        </div>
                      </div>
                    </SurfaceCard>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </AppPage>
  )
}
