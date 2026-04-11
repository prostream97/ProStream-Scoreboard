'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Trophy, CalendarClock, Pencil, X } from 'lucide-react'
import { TournamentNav } from '@/components/shared/TournamentNav'
import {
  AppBadge,
  AppButton,
  AppPage,
  EmptyState,
  PageHeader,
  SurfaceCard,
  appInputClass,
  appLabelClass,
} from '@/components/shared/AppPrimitives'
import type {
  MatchStage,
  StandingRow,
  TournamentMatch,
  TournamentStageStructure,
  TournamentWithDetails,
} from '@/types/tournament'
import { getBattingFirstTeamId } from '@/lib/auth/utils'
import { MATCH_STAGE_LABELS, MATCH_STAGE_ORDER } from '@/lib/tournament/stageRules'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const tournamentTone: Record<string, 'neutral' | 'blue' | 'amber'> = {
  upcoming: 'neutral',
  group_stage: 'blue',
  knockout: 'amber',
  complete: 'neutral',
}

const emptyMatchForm = {
  homeTeamId: '',
  awayTeamId: '',
  venue: '',
  date: '',
  matchStage: 'group' as MatchStage,
  matchLabel: '',
  tossWinnerId: '',
  tossDecision: '' as 'bat' | 'field' | '',
}

function createEmptyMatchForm(stageStructure?: TournamentStageStructure | null) {
  return {
    ...emptyMatchForm,
    matchStage: stageStructure?.allowedStages[0] ?? emptyMatchForm.matchStage,
  }
}

function getStagePathLabel(stageStructure: TournamentStageStructure) {
  if (stageStructure.path === 'with_quarters') return 'Quarter-finals path'
  if (stageStructure.path === 'semis_only') return 'Semi-finals path'
  return 'Open bracket'
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tournamentId = parseInt(id, 10)
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const isAdmin = isAuthenticated && session?.user?.role === 'admin'

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [matchForm, setMatchForm] = useState(() => createEmptyMatchForm())
  const [addingMatch, setAddingMatch] = useState(false)
  const [matchError, setMatchError] = useState('')

  async function load() {
    setLoadError(null)
    const [tRes, sRes] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}`),
      fetch(`/api/tournaments/${tournamentId}/standings`),
    ])

    if (tRes.ok) {
      const tournamentData = await tRes.json() as TournamentWithDetails
      setTournament(tournamentData)
    } else if (tRes.status === 401) {
      setLoadError('You must be logged in to view this tournament.')
    } else if (tRes.status === 403) {
      setLoadError('You do not have access to this tournament.')
    } else if (tRes.status === 404) {
      setLoadError(null) // handled by !tournament check below
    } else {
      const body = await tRes.json().catch(() => ({})) as { error?: string }
      setLoadError(body.error ?? `Failed to load tournament (${tRes.status})`)
    }

    if (sRes.ok) {
      setStandings(await sRes.json())
    }

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [tournamentId])

  useEffect(() => {
    if (!tournament) return

    if (tournament.stageStructure.allowedStages.length === 0) {
      setShowMatchForm(false)
      return
    }

    if (!tournament.stageStructure.allowedStages.includes(matchForm.matchStage)) {
      setMatchForm((form) => ({
        ...form,
        matchStage: tournament.stageStructure.allowedStages[0],
      }))
    }
  }, [tournament, matchForm.matchStage])

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (res.ok) {
      setTournament((current) => (
        current ? { ...current, status: newStatus as TournamentWithDetails['status'] } : current
      ))
    }
  }

  function handleMatchFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setMatchForm((form) => ({ ...form, [name]: value }))
  }

  function handleToggleMatchForm() {
    setMatchError('')
    setShowMatchForm((visible) => {
      const nextVisible = !visible
      if (nextVisible && tournament) {
        setMatchForm(createEmptyMatchForm(tournament.stageStructure))
      }
      return nextVisible
    })
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault()
    setMatchError('')
    setAddingMatch(true)

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeamId: parseInt(matchForm.homeTeamId, 10),
          awayTeamId: parseInt(matchForm.awayTeamId, 10),
          venue: matchForm.venue || null,
          date: matchForm.date || null,
          matchStage: matchForm.matchStage,
          matchLabel: matchForm.matchLabel || null,
          tossWinnerId: matchForm.tossWinnerId ? parseInt(matchForm.tossWinnerId, 10) : null,
          tossDecision: matchForm.tossDecision || null,
          battingFirstTeamId: getBattingFirstTeamId({
            homeTeamId: parseInt(matchForm.homeTeamId, 10),
            awayTeamId: parseInt(matchForm.awayTeamId, 10),
            tossWinnerId: matchForm.tossWinnerId ? parseInt(matchForm.tossWinnerId, 10) : null,
            tossDecision: matchForm.tossDecision || null,
          }),
        }),
      })

      if (res.ok) {
        setMatchForm(createEmptyMatchForm(tournament?.stageStructure))
        setShowMatchForm(false)
        await load()
      } else {
        const data = await res.json()
        setMatchError(data.error ?? 'Failed to create match')
      }
    } finally {
      setAddingMatch(false)
    }
  }

  if (loading) {
    return (
      <AppPage className="max-w-6xl">
        <SurfaceCard><p className="py-12 text-center text-sm text-slate-500">Loading...</p></SurfaceCard>
      </AppPage>
    )
  }

  if (loadError || !tournament) {
    return (
      <AppPage className="max-w-5xl">
        <EmptyState
          title={loadError ? 'Could not load tournament' : 'Tournament not found'}
          description={loadError ?? 'This tournament does not exist or may have been removed.'}
          action={<AppButton href="/admin/tournaments">Back to tournaments</AppButton>}
        />
      </AppPage>
    )
  }

  const tossTeams = [
    ...(matchForm.homeTeamId ? tournament.teams.filter((team) => team.id === parseInt(matchForm.homeTeamId, 10)) : []),
    ...(matchForm.awayTeamId ? tournament.teams.filter((team) => team.id === parseInt(matchForm.awayTeamId, 10)) : []),
  ]

  const sessionUserId = isAuthenticated ? parseInt(session.user.id, 10) : null
  const canManageTournament = isAuthenticated && (
    isAdmin ||
    tournament.owner?.id === sessionUserId ||
    tournament.operators.some((operator) => operator.id === sessionUserId)
  )

  const stageStructure = tournament.stageStructure
  const canAddMoreMatches = stageStructure.allowedStages.length > 0
  const groupedMatches = MATCH_STAGE_ORDER
    .map((stage) => ({
      stage,
      label: MATCH_STAGE_LABELS[stage],
      matches: tournament.matches.filter((match) => (match.matchStage ?? 'group') === stage),
    }))
    .filter((group) => group.matches.length > 0)

  return (
    <AppPage className="max-w-7xl">
      <TournamentNav tournamentId={tournamentId} />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <SurfaceCard className="space-y-5">
          {/* Header row: logo + info + status dropdown */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-[#dfe6df] bg-[#f4f7f2] sm:h-20 sm:w-20">
                {tournament.logoCloudinaryId && CLOUD_NAME ? (
                  <img
                    src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_120,h_120,f_webp/${tournament.logoCloudinaryId}`}
                    alt={tournament.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Trophy className="h-9 w-9 text-[#10994c] sm:h-8 sm:w-8" />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="app-kicker">Tournament overview</p>
                <h1 className="text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{tournament.name}</h1>
                <p className="text-sm text-slate-500">
                  {tournament.format} · {tournament.totalOvers} overs{tournament.ballsPerOver !== 6 ? ` · ${tournament.ballsPerOver} balls/over` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <AppBadge tone="neutral">{tournament.shortName}</AppBadge>
                  <AppBadge tone="blue">{`TRN-${tournament.id.toString().padStart(3, '0')}`}</AppBadge>
                  <AppBadge tone={tournamentTone[tournament.status] ?? 'neutral'}>{tournament.status.replace('_', ' ')}</AppBadge>
                </div>
              </div>
            </div>
            {canManageTournament ? (
              <select
                value={tournament.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`${appInputClass} w-full sm:w-auto sm:min-w-[160px] shrink-0`}
              >
                <option value="upcoming">Upcoming</option>
                <option value="group_stage">Group Stage</option>
                <option value="knockout">Knockout</option>
                <option value="complete">Complete</option>
              </select>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Teams" value={tournament.teams.length} />
            <StatCard label="Matches" value={tournament.matches.length} />
            <StatCard label="Path" value={getStagePathLabel(stageStructure)} />
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div>
            <p className="app-kicker">Bracket path</p>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{getStagePathLabel(stageStructure)}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {MATCH_STAGE_ORDER.map((stage) => (
              <AppBadge key={stage} tone="neutral">
                {MATCH_STAGE_LABELS[stage]}: {stageStructure.counts[stage]}
              </AppBadge>
            ))}
          </div>
          {MATCH_STAGE_ORDER.some((stage) => Boolean(stageStructure.reasonsByStage[stage])) ? (
            <div className="space-y-2 text-sm text-slate-500">
              {MATCH_STAGE_ORDER
                .filter((stage) => stageStructure.reasonsByStage[stage])
                .map((stage) => (
                  <p key={stage}>
                    <span className="font-semibold text-slate-700">{MATCH_STAGE_LABELS[stage]}:</span> {stageStructure.reasonsByStage[stage]}
                  </p>
                ))}
            </div>
          ) : null}
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <SurfaceCard className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="app-kicker">Tournament teams</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Teams ({tournament.teams.length})</h2>
            </div>
            {canManageTournament ? <AppButton href={`/admin/tournaments/${tournamentId}/teams`} variant="secondary">Manage Teams</AppButton> : null}
          </div>
          {tournament.teams.length === 0 ? (
            <EmptyState
              title="No teams yet"
              description={canManageTournament ? 'Add teams to unlock fixtures and player management.' : 'Teams can be added by the owner or assigned operators.'}
            />
          ) : (
            <div className="space-y-3">
              {tournament.teams.map((team) => (
                <div key={team.id} className="flex items-center gap-3 rounded-[1.35rem] border border-[#e1e7df] bg-[#f8faf7] px-4 py-3">
                  {team.logoCloudinaryId ? (
                    <img
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_36,h_36,f_webp/${team.logoCloudinaryId}`}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full" style={{ backgroundColor: team.primaryColor }} />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{team.name}</p>
                    <p className="text-sm" style={{ color: team.primaryColor }}>{team.shortCode}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="app-kicker">Standings</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Points and NRR</h2>
            </div>
          </div>
          {tournament.status === 'upcoming' || standings.length === 0 ? (
            <EmptyState
              title="No standings yet"
              description="Standings will appear once group matches start producing results."
            />
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>L</th>
                    <th>T</th>
                    <th>Pts</th>
                    <th>NRR</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr key={row.teamId}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="font-semibold" style={{ color: row.primaryColor }}>{row.teamShortCode}</span>
                        <span className="ml-2 text-sm text-slate-500">{row.teamName}</span>
                      </td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.lost}</td>
                      <td>{row.tied}</td>
                      <td>{row.points}</td>
                      <td className={row.nrr >= 0 ? 'text-[#10994c]' : 'text-[#c54e4c]'}>
                        {row.nrr >= 0 ? '+' : ''}{row.nrr.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="app-kicker">Fixtures</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Matches ({tournament.matches.length})</h2>
          </div>
          {canManageTournament && tournament.teams.length >= 2 ? (
            <AppButton onClick={handleToggleMatchForm} disabled={!canAddMoreMatches}>
              {showMatchForm ? 'Cancel' : 'Add Match'}
            </AppButton>
          ) : null}
        </div>

        {showMatchForm && canManageTournament ? (
          <form onSubmit={handleAddMatch}>
          <SurfaceCard className="space-y-4 bg-[#f8faf7]">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#10994c]" />
              <p className="app-kicker">New fixture</p>
            </div>
            {matchError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{matchError}</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Home Team">
                <select name="homeTeamId" value={matchForm.homeTeamId} onChange={handleMatchFormChange} className={appInputClass} required>
                  <option value="">Select team</option>
                  {tournament.teams.filter((team) => team.id !== parseInt(matchForm.awayTeamId, 10)).map((team) => (
                    <option key={team.id} value={team.id}>{team.name} ({team.shortCode})</option>
                  ))}
                </select>
              </Field>
              <Field label="Away Team">
                <select name="awayTeamId" value={matchForm.awayTeamId} onChange={handleMatchFormChange} className={appInputClass} required>
                  <option value="">Select team</option>
                  {tournament.teams.filter((team) => team.id !== parseInt(matchForm.homeTeamId, 10)).map((team) => (
                    <option key={team.id} value={team.id}>{team.name} ({team.shortCode})</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Match Stage">
                <select name="matchStage" value={matchForm.matchStage} onChange={handleMatchFormChange} className={appInputClass}>
                  {MATCH_STAGE_ORDER.map((stage) => (
                    <option key={stage} value={stage} disabled={!stageStructure.allowedStages.includes(stage)}>
                      {MATCH_STAGE_LABELS[stage]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Match Label">
                <input name="matchLabel" value={matchForm.matchLabel} onChange={handleMatchFormChange} className={appInputClass} placeholder="e.g. M1, Final" />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Venue">
                <input name="venue" value={matchForm.venue} onChange={handleMatchFormChange} className={appInputClass} placeholder="Stadium name" />
              </Field>
              <Field label="Date & Time">
                <input type="datetime-local" name="date" value={matchForm.date} onChange={handleMatchFormChange} className={appInputClass} />
              </Field>
            </div>

            {(matchForm.homeTeamId || matchForm.awayTeamId) ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Toss Winner">
                  <select name="tossWinnerId" value={matchForm.tossWinnerId} onChange={handleMatchFormChange} className={appInputClass}>
                    <option value="">- TBD</option>
                    {tossTeams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Elected To">
                  <select name="tossDecision" value={matchForm.tossDecision} onChange={handleMatchFormChange} className={appInputClass}>
                    <option value="">- TBD</option>
                    <option value="bat">Bat</option>
                    <option value="field">Field</option>
                  </select>
                </Field>
              </div>
            ) : null}

            <AppButton type="submit" disabled={addingMatch || !canAddMoreMatches}>
              {addingMatch ? 'Creating...' : 'Create Match'}
            </AppButton>
          </SurfaceCard>
          </form>
        ) : null}

        {groupedMatches.length === 0 ? (
          <EmptyState title="No matches scheduled yet" description="Add a match to begin scoring and overlay workflows." />
        ) : (
          <div className="space-y-5">
            {groupedMatches.map((group) => (
              <div key={group.stage} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{group.label}</h3>
                  <AppBadge tone="neutral">{group.matches.length} matches</AppBadge>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {group.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      canManage={canManageTournament}
                      teams={tournament.teams}
                      stageStructure={stageStructure}
                      onEdited={load}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </AppPage>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#dde3dc] bg-[#f8faf7] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={appLabelClass}>{label}</label>
      {children}
    </div>
  )
}

function MatchCard({
  match,
  canManage,
  teams,
  stageStructure,
  onEdited,
}: {
  match: TournamentMatch
  canManage: boolean
  teams: TournamentWithDetails['teams']
  stageStructure: TournamentStageStructure
  onEdited: () => void
}) {
  const stage = match.matchStage ?? 'group'
  const stageLabel = MATCH_STAGE_LABELS[stage]
  const [showEdit, setShowEdit] = useState(false)

  return (
    <>
      <div className="rounded-[1.5rem] border border-[#e1e7df] bg-[#f8faf7] p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone="neutral">{stageLabel}</AppBadge>
            {match.matchLabel ? <AppBadge tone="blue">{match.matchLabel}</AppBadge> : null}
            <AppBadge tone={match.status === 'active' ? 'green' : match.status === 'break' || match.status === 'paused' ? 'amber' : 'neutral'}>
              {match.status}
            </AppBadge>
          </div>
          {canManage ? (
            <button
              onClick={() => setShowEdit(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe6df] bg-white text-slate-400 transition hover:border-[#b8d7c0] hover:text-slate-700"
              title="Edit match"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-slate-950">
          <span style={{ color: match.homeTeam.primaryColor }}>{match.homeTeam.shortCode}</span>
          <span className="mx-2 text-slate-300">vs</span>
          <span style={{ color: match.awayTeam.primaryColor }}>{match.awayTeam.shortCode}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {match.venue ?? 'Venue TBD'} · {new Date(match.date).toLocaleDateString()}
        </p>
        {match.tossWinnerId ? (
          <p className="mt-1 text-xs text-slate-400">
            Toss: {teams.find((t) => t.id === match.tossWinnerId)?.shortCode ?? '?'} elected to {match.tossDecision}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <AppButton href={`/viewer/${match.id}`} variant="secondary" className="h-9 px-3 text-xs">View</AppButton>
          <AppButton href={`/match/${match.id}/operator`} className="h-9 px-3 text-xs">Score</AppButton>
        </div>
      </div>

      {showEdit ? (
        <MatchEditModal
          match={match}
          teams={teams}
          stageStructure={stageStructure}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onEdited() }}
        />
      ) : null}
    </>
  )
}

function MatchEditModal({
  match,
  teams,
  stageStructure,
  onClose,
  onSaved,
}: {
  match: TournamentMatch
  teams: TournamentWithDetails['teams']
  stageStructure: TournamentStageStructure
  onClose: () => void
  onSaved: () => void
}) {
  // Convert ISO date string to datetime-local format (YYYY-MM-DDTHH:mm)
  const toDatetimeLocal = (iso: string) => {
    try { return new Date(iso).toISOString().slice(0, 16) } catch { return '' }
  }

  const [form, setForm] = useState({
    venue: match.venue ?? '',
    date: toDatetimeLocal(match.date),
    tossWinnerId: match.tossWinnerId ? String(match.tossWinnerId) : '',
    tossDecision: match.tossDecision ?? '' as 'bat' | 'field' | '',
    matchStage: match.matchStage ?? 'group',
    matchLabel: match.matchLabel ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/match/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue: form.venue || null,
          date: form.date || null,
          tossWinnerId: form.tossWinnerId ? parseInt(form.tossWinnerId, 10) : null,
          tossDecision: form.tossDecision || null,
          matchStage: form.matchStage || null,
          matchLabel: form.matchLabel || null,
        }),
      })
      if (res.ok) {
        onSaved()
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Failed to save changes')
      }
    } finally {
      setSaving(false)
    }
  }

  const tossTeams = [
    ...(form.tossWinnerId
      ? teams.filter((t) => t.id === parseInt(form.tossWinnerId, 10))
      : []),
    ...teams.filter((t) => t.id === match.homeTeam.id || t.id === match.awayTeam.id),
  ].filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-t-[2rem] bg-[#f8faf7] sm:rounded-[2rem] shadow-[0_24px_70px_rgba(10,14,18,0.22)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dfe6df] px-6 py-5">
          <div>
            <p className="app-kicker">Edit fixture</p>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
              <span style={{ color: match.homeTeam.primaryColor }}>{match.homeTeam.shortCode}</span>
              <span className="mx-2 text-slate-300">vs</span>
              <span style={{ color: match.awayTeam.primaryColor }}>{match.awayTeam.shortCode}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 transition hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Match Stage">
              <select name="matchStage" value={form.matchStage} onChange={handleChange} className={appInputClass}>
                {MATCH_STAGE_ORDER.map((s) => (
                  <option
                    key={s}
                    value={s}
                    disabled={s !== match.matchStage && !stageStructure.allowedStages.includes(s)}
                  >
                    {MATCH_STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Match Label">
              <input
                name="matchLabel"
                value={form.matchLabel}
                onChange={handleChange}
                className={appInputClass}
                placeholder="e.g. M1, QF1"
                maxLength={20}
              />
            </Field>
          </div>

          <Field label="Venue">
            <input
              name="venue"
              value={form.venue}
              onChange={handleChange}
              className={appInputClass}
              placeholder="Stadium name"
            />
          </Field>

          <Field label="Date & Time">
            <input
              type="datetime-local"
              name="date"
              value={form.date}
              onChange={handleChange}
              className={appInputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Toss Winner">
              <select name="tossWinnerId" value={form.tossWinnerId} onChange={handleChange} className={appInputClass}>
                <option value="">— TBD</option>
                {tossTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.shortCode})</option>
                ))}
              </select>
            </Field>
            <Field label="Elected To">
              <select name="tossDecision" value={form.tossDecision} onChange={handleChange} className={appInputClass}>
                <option value="">— TBD</option>
                <option value="bat">Bat</option>
                <option value="field">Field</option>
              </select>
            </Field>
          </div>

          <div className="flex gap-3 pt-1">
            <AppButton type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  )
}
