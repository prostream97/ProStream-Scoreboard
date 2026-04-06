'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { TournamentNav } from '@/components/shared/TournamentNav'
import {
  AppBadge,
  AppButton,
  AppPage,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/shared/AppPrimitives'
import type { Player } from '@/types/player'
import type { TournamentTeamSummary } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

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

  const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0)

  return (
    <AppPage className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-800">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/admin/tournaments" className="transition hover:text-slate-800">
            Tournaments
          </Link>
          <span>/</span>
          <Link
            href={`/admin/tournaments/${tournamentId}`}
            className="transition hover:text-slate-800"
          >
            {tournamentName || 'Tournament'}
          </Link>
          <span>/</span>
          <span className="text-slate-900">Players</span>
        </div>

        <TournamentNav tournamentId={tournamentId} activeSegment="players" />
      </div>

      <PageHeader
        eyebrow="Tournament Rosters"
        title="Players"
        description="Review each squad and jump into per-team roster editing without changing the underlying player endpoints."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Teams</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {teams.length}
          </p>
          <p className="text-sm text-slate-500">Tournament teams with roster access.</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Players</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {totalPlayers}
          </p>
          <p className="text-sm text-slate-500">Combined roster count across this tournament.</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Workflow</p>
          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
            Team-first editing
          </p>
          <p className="text-sm text-slate-500">Roster updates still happen inside the existing team player screen.</p>
        </SurfaceCard>
      </section>

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
        <section className="space-y-5">
          {teams.map((team) => (
            <SurfaceCard key={team.id} className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {team.logoCloudinaryId ? (
                    <img
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_72,h_72,f_webp/${team.logoCloudinaryId}`}
                      alt={team.name}
                      className="h-16 w-16 rounded-[1.3rem] object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-[1.3rem] text-lg font-semibold tracking-[0.18em]"
                      style={{
                        backgroundColor: `${team.primaryColor}22`,
                        color: team.primaryColor,
                      }}
                    >
                      {team.shortCode}
                    </div>
                  )}

                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                      {team.name}
                    </h2>
                    <p
                      className="text-sm font-semibold tracking-[0.18em]"
                      style={{ color: team.primaryColor }}
                    >
                      {team.shortCode}
                    </p>
                    <div className="mt-2">
                      <AppBadge tone="blue">{team.players.length} Players</AppBadge>
                    </div>
                  </div>
                </div>

                <AppButton
                  href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}&tournamentId=${tournamentId}&tournamentName=${encodeURIComponent(tournamentName)}`}
                >
                  Manage Team Players
                </AppButton>
              </div>

              {team.players.length === 0 ? (
                <div className="rounded-[1.5rem] bg-[#f4f7f2] px-5 py-8 text-center text-sm text-slate-500">
                  No players added yet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className="rounded-[1.4rem] border border-[#dbe2db] bg-[#f8faf7] p-4"
                    >
                      <div className="flex items-start gap-3">
                        {player.headshotCloudinaryId ? (
                          <img
                            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_56,h_56,f_webp/${player.headshotCloudinaryId}`}
                            alt={player.displayName}
                            className="h-14 w-14 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-base font-semibold text-slate-600">
                            {player.displayName.charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {player.displayName}
                          </p>
                          {player.displayName !== player.name ? (
                            <p className="truncate text-xs text-slate-500">{player.name}</p>
                          ) : null}
                          <div className="mt-2">
                            <AppBadge tone={ROLE_TONES[player.role] ?? 'neutral'}>
                              {player.role}
                            </AppBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SurfaceCard>
          ))}
        </section>
      )}
    </AppPage>
  )
}
