'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Trophy, CalendarClock, Pencil, X, Plus, Layers, ChevronDown, ChevronUp } from 'lucide-react'
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
  TournamentGroup,
  TournamentMatch,
  TournamentStageStructure,
  TournamentStandingsResponse,
  TournamentWithDetails,
} from '@/types/tournament'
import { getBattingFirstTeamId } from '@/lib/auth/utils'
import { MATCH_STAGE_LABELS, MATCH_STAGE_ORDER } from '@/lib/tournament/stageRules'
import { cn } from '@/lib/cn'

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
  groupId: '',
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
  const [standingsData, setStandingsData] = useState<TournamentStandingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [showTournamentEdit, setShowTournamentEdit] = useState(false)
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
      setStandingsData(await sRes.json() as TournamentStandingsResponse)
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
          groupId: matchForm.groupId ? parseInt(matchForm.groupId, 10) : null,
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
      matches: tournament.matches
        .filter((match) => (match.matchStage ?? 'group') === stage)
        .sort((a, b) => {
          const statusRank: Record<TournamentMatch['status'], number> = {
            active: 0,
            break: 1,
            paused: 2,
            scheduled: 3,
            complete: 4,
            abandoned: 5,
          }
          const rankDelta = statusRank[a.status] - statusRank[b.status]
          if (rankDelta !== 0) return rankDelta
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        }),
    }))
    .filter((group) => group.matches.length > 0)

  return (
    <>
    <AppPage className="max-w-7xl">
      <TournamentNav tournamentId={tournamentId} />

      <div className="grid gap-4">
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{tournament.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <AppBadge tone="neutral">{tournament.shortName}</AppBadge>
                    <AppBadge tone="blue">{`TRN-${tournament.id.toString().padStart(3, '0')}`}</AppBadge>
                    <AppBadge tone={tournamentTone[tournament.status] ?? 'neutral'}>{tournament.status.replace('_', ' ')}</AppBadge>
                  </div>
                </div>
                <p className="text-lg text-slate-500">
                  {tournament.format} · {tournament.totalOvers} overs{tournament.ballsPerOver !== 6 ? ` · ${tournament.ballsPerOver} balls/over` : ''}
                </p>
              </div>
            </div>
            {canManageTournament ? (
              <div className="flex items-center gap-2 shrink-0">
                {tournament.status !== 'complete' ? (
                  <button
                    onClick={() => setShowTournamentEdit(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe6df] bg-white text-slate-400 transition hover:border-[#b8d7c0] hover:text-slate-700"
                    title="Edit tournament"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <select
                  value={tournament.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`${appInputClass} w-full sm:w-auto sm:min-w-[160px]`}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="group_stage">Group Stage</option>
                  <option value="knockout">Knockout</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            ) : null}
          </div>

        </SurfaceCard>

      </div>

      {canManageTournament ? (
        <GroupsSection
          tournamentId={tournamentId}
          groups={tournament.groups}
          teams={tournament.teams}
          onChanged={load}
        />
      ) : null}

      <SurfaceCard className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
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

            {matchForm.matchStage === 'group' && tournament.groups.length > 0 ? (
              <Field label="Group">
                <select name="groupId" value={matchForm.groupId} onChange={handleMatchFormChange} className={appInputClass}>
                  <option value="">— No specific group</option>
                  {tournament.groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </Field>
            ) : null}

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
                <div className="grid gap-2 xl:grid-cols-3">
                  {group.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      canManage={canManageTournament}
                      teams={tournament.teams}
                      groups={tournament.groups}
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

      <SurfaceCard className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          {standingsData?.hasGroups ? 'Group Standings' : 'Team Standing'}
        </h2>
        <StandingsSection tournament={tournament} standingsData={standingsData} />
      </SurfaceCard>
    </AppPage>

    {showTournamentEdit ? (
      <TournamentEditModal
        tournament={tournament}
        isAdmin={isAdmin}
        onClose={() => setShowTournamentEdit(false)}
        onSaved={() => { setShowTournamentEdit(false); void load() }}
      />
    ) : null}
    </>
  )
}

// ─── Groups Section ───────────────────────────────────────────────────────────

function GroupsSection({
  tournamentId,
  groups,
  teams,
  onChanged,
}: {
  tournamentId: number
  groups: TournamentGroup[]
  teams: TournamentWithDetails['teams']
  onChanged: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', shortName: '', qualifyCount: '2' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingGroup, setEditingGroup] = useState<TournamentGroup | null>(null)
  const [editForm, setEditForm] = useState({ name: '', shortName: '', qualifyCount: '2' })
  const [assigningTeam, setAssigningTeam] = useState<number | null>(null)

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          shortName: form.shortName,
          qualifyCount: parseInt(form.qualifyCount, 10),
          sortOrder: groups.length,
        }),
      })
      if (res.ok) {
        setForm({ name: '', shortName: '', qualifyCount: '2' })
        setShowForm(false)
        onChanged()
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Failed to create group')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteGroup(groupId: number) {
    const res = await fetch(`/api/tournaments/${tournamentId}/groups/${groupId}`, { method: 'DELETE' })
    if (res.ok) onChanged()
  }

  function startEditGroup(group: TournamentGroup) {
    setEditingGroup(group)
    setEditForm({ name: group.name, shortName: group.shortName, qualifyCount: String(group.qualifyCount) })
  }

  async function handleUpdateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGroup) return
    const res = await fetch(`/api/tournaments/${tournamentId}/groups/${editingGroup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        shortName: editForm.shortName,
        qualifyCount: parseInt(editForm.qualifyCount, 10),
      }),
    })
    if (res.ok) { setEditingGroup(null); onChanged() }
  }

  async function handleAssignTeam(teamId: number, groupId: number | null) {
    setAssigningTeam(teamId)
    try {
      await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}/group`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })
      onChanged()
    } finally {
      setAssigningTeam(null)
    }
  }

  const unassignedTeams = teams.filter((t) => t.groupId === null)

  return (
    <SurfaceCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#10994c]" />
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Groups ({groups.length})</h2>
        </div>
        <AppButton onClick={() => { setShowForm((v) => !v); setError('') }} variant="secondary">
          {showForm ? <><X className="h-3.5 w-3.5 mr-1" />Cancel</> : <><Plus className="h-3.5 w-3.5 mr-1" />Add Group</>}
        </AppButton>
      </div>

      {showForm ? (
        <form onSubmit={handleCreateGroup}>
          <SurfaceCard className="space-y-3 bg-[#f8faf7]">
            {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Group Name">
                <input name="name" value={form.name} onChange={handleFormChange} className={appInputClass} placeholder="Group A" required />
              </Field>
              <Field label="Short Name">
                <input name="shortName" value={form.shortName} onChange={handleFormChange} className={appInputClass} placeholder="A" maxLength={10} required />
              </Field>
              <Field label="Top N qualify">
                <input type="number" name="qualifyCount" value={form.qualifyCount} onChange={handleFormChange} className={appInputClass} min={1} required />
              </Field>
            </div>
            <AppButton type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Group'}</AppButton>
          </SurfaceCard>
        </form>
      ) : null}

      {groups.length === 0 && !showForm ? (
        <p className="text-sm text-slate-500">No groups yet. Add groups to divide teams and show per-group standings.</p>
      ) : null}

      {groups.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const groupTeams = teams.filter((t) => t.groupId === group.id)
            const isEditing = editingGroup?.id === group.id
            return (
              <div key={group.id} className="rounded-[1.4rem] border border-[#dfe6df] bg-white p-4 space-y-3">
                {isEditing ? (
                  <form onSubmit={handleUpdateGroup} className="space-y-2">
                    <div className="grid gap-2 grid-cols-2">
                      <Field label="Name">
                        <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={appInputClass} required />
                      </Field>
                      <Field label="Short">
                        <input value={editForm.shortName} onChange={(e) => setEditForm((f) => ({ ...f, shortName: e.target.value }))} className={appInputClass} maxLength={10} required />
                      </Field>
                    </div>
                    <Field label="Top N qualify">
                      <input type="number" value={editForm.qualifyCount} onChange={(e) => setEditForm((f) => ({ ...f, qualifyCount: e.target.value }))} className={appInputClass} min={1} required />
                    </Field>
                    <div className="flex gap-2">
                      <AppButton type="submit" className="flex-1">Save</AppButton>
                      <AppButton type="button" variant="secondary" onClick={() => setEditingGroup(null)} className="flex-1">Cancel</AppButton>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-950">{group.name}</p>
                        <p className="text-xs text-slate-500">Top {group.qualifyCount} qualify</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => startEditGroup(group)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dfe6df] text-slate-400 hover:text-slate-700"
                          title="Edit group"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dfe6df] text-slate-400 hover:text-red-500"
                          title="Delete group"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Assigned teams */}
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {groupTeams.length === 0 ? (
                        <span className="text-xs text-slate-400">No teams assigned</span>
                      ) : (
                        groupTeams.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleAssignTeam(t.id, null)}
                            disabled={assigningTeam === t.id}
                            className="flex items-center gap-1 rounded-full border border-[#dfe6df] bg-[#f4f7f2] px-2 py-0.5 text-xs font-medium transition hover:border-red-300 hover:bg-red-50"
                            title="Click to remove from group"
                          >
                            <span style={{ color: t.primaryColor }}>{t.shortCode}</span>
                            <X className="h-2.5 w-2.5 text-slate-400" />
                          </button>
                        ))
                      )}
                    </div>

                    {/* Add unassigned teams */}
                    {unassignedTeams.length > 0 ? (
                      <select
                        className={appInputClass}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleAssignTeam(parseInt(e.target.value, 10), group.id)
                        }}
                      >
                        <option value="">+ Add team to {group.shortName}</option>
                        {unassignedTeams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} ({t.shortCode})</option>
                        ))}
                      </select>
                    ) : null}
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </SurfaceCard>
  )
}

// ─── Standings Section ────────────────────────────────────────────────────────

function StandingsTable({ rows }: { rows: Array<{ teamId: number; teamShortCode: string; teamName: string; primaryColor: string; played: number; won: number; lost: number; tied: number; points: number; nrr: number; rank?: number; qualifies?: boolean }> }) {
  return (
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
          {rows.map((row, index) => (
            <tr
              key={row.teamId}
              className={row.qualifies ? 'border-l-2 border-l-[#10994c] bg-[#f0faf3]' : undefined}
            >
              <td>{row.rank ?? index + 1}</td>
              <td>
                <span className="font-semibold" style={{ color: row.primaryColor }}>{row.teamShortCode}</span>
                <span className="ml-2 text-sm text-slate-500">{row.teamName}</span>
                {row.qualifies ? <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[#10994c]">Q</span> : null}
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.lost}</td>
              <td>{row.tied}</td>
              <td className="font-semibold">{row.points}</td>
              <td className={row.nrr >= 0 ? 'text-[#10994c]' : 'text-[#c54e4c]'}>
                {row.nrr >= 0 ? '+' : ''}{row.nrr.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StandingsSection({
  tournament,
  standingsData,
}: {
  tournament: TournamentWithDetails
  standingsData: TournamentStandingsResponse | null
}) {
  if (!standingsData) {
    return (
      <EmptyState
        title="No standings yet"
        description="Standings will appear once group matches start producing results."
      />
    )
  }

  if (!standingsData.hasGroups) {
    if (tournament.status === 'upcoming' || standingsData.rows.length === 0) {
      return (
        <EmptyState
          title="No standings yet"
          description="Standings will appear once group matches start producing results."
        />
      )
    }
    return <StandingsTable rows={standingsData.rows} />
  }

  // Multi-group standings
  if (standingsData.groups.length === 0) {
    return (
      <EmptyState
        title="No standings yet"
        description="Standings will appear once group matches start producing results."
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {standingsData.groups.map(({ group, rows }) => (
        <div key={group.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-950">{group.name}</h3>
            <AppBadge tone="neutral">Top {group.qualifyCount} qualify</AppBadge>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">No completed matches yet</p>
          ) : (
            <StandingsTable rows={rows} />
          )}
        </div>
      ))}
    </div>
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
  groups,
  stageStructure,
  onEdited,
}: {
  match: TournamentMatch
  canManage: boolean
  teams: TournamentWithDetails['teams']
  groups: TournamentGroup[]
  stageStructure: TournamentStageStructure
  onEdited: () => void
}) {
  const matchGroup = match.groupId ? groups.find((g) => g.id === match.groupId) : null
  const router = useRouter()
  const stage = match.matchStage ?? 'group'
  const stageLabel = MATCH_STAGE_LABELS[stage]
  const [showEdit, setShowEdit] = useState(false)
  const matchDateLabel = new Date(match.date).toLocaleDateString()
  const isOperatorMatch = match.status !== 'complete' && match.status !== 'abandoned'
  const matchTargetPath = canManage && isOperatorMatch ? `/match/${match.id}/operator` : `/viewer/${match.id}`

  function resultText() {
    if (match.status !== 'complete') return null
    if (match.resultType === 'tie') return 'Match tied'
    if (!match.resultWinnerId || !match.resultType || !match.resultMargin) return 'Result recorded'

    const winner = match.resultWinnerId === match.homeTeam.id ? match.homeTeam.shortCode : match.awayTeam.shortCode
    const unit = match.resultType === 'wickets' ? 'wicket' : 'run'
    const suffix = match.resultMargin === 1 ? unit : `${unit}s`
    return `${winner} won by ${match.resultMargin} ${suffix}`
  }

  return (
    <>
      <div
        className="cursor-pointer h-[170px] w-[380px] rounded-[1.1rem] border border-[#e1e7df] bg-[#f8faf7] p-2.5 transition hover:border-[#bcd8c3] hover:bg-[#eaf4ec]"
        role="button"
        tabIndex={0}
        onClick={() => router.push(matchTargetPath)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            router.push(matchTargetPath)
          }
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-[30px] w-full flex-wrap items-center gap-2">
            <AppBadge className="h-[30px] w-[150px] justify-center px-2 py-0.5 text-center text-[12px] tracking-[2.5px]" tone="neutral">{stageLabel}</AppBadge>
            {matchGroup ? <AppBadge className="h-[30px] px-2 py-0.5 text-[11px] tracking-[1.6px]" tone="neutral">{matchGroup.shortName}</AppBadge> : null}
            {match.matchLabel ? <AppBadge className="h-[30px] px-2 py-0.5 text-[11px] tracking-[1.6px]" tone="blue">{match.matchLabel}</AppBadge> : null}
            <AppBadge
              className={cn(
                'h-[30px] px-2 py-0.5 text-[11px] tracking-[1.6px]',
                match.status === 'complete' ? 'bg-[#34b743] text-white font-bold' : null,
              )}
              tone={match.status === 'active' ? 'green' : match.status === 'break' || match.status === 'paused' ? 'amber' : 'neutral'}
            >
              {match.status}
            </AppBadge>
          </div>
          {canManage && match.status !== 'complete' ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowEdit(true)
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe6df] bg-white text-slate-400 transition hover:border-[#b8d7c0] hover:text-slate-700"
              title="Edit match"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-2.5 flex h-[70px] items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-2">
            {match.homeTeam.logoCloudinaryId ? (
              <img
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_44,h_44,f_webp/${match.homeTeam.logoCloudinaryId}`}
                alt={`${match.homeTeam.shortCode} logo`}
                className="h-10 w-10 rounded-full border border-[#e1e7df] object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full border border-[#e1e7df]" style={{ backgroundColor: match.homeTeam.primaryColor }} />
            )}
            <span className="text-lg font-semibold text-slate-900" style={{ color: match.homeTeam.primaryColor }}>{match.homeTeam.shortCode}</span>
          </div>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-400">vs</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-lg font-semibold text-slate-900" style={{ color: match.awayTeam.primaryColor }}>{match.awayTeam.shortCode}</span>
            {match.awayTeam.logoCloudinaryId ? (
              <img
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_44,h_44,f_webp/${match.awayTeam.logoCloudinaryId}`}
                alt={`${match.awayTeam.shortCode} logo`}
                className="h-10 w-10 rounded-full border border-[#e1e7df] object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full border border-[#e1e7df]" style={{ backgroundColor: match.awayTeam.primaryColor }} />
            )}
          </div>
        </div>

        {resultText() ? (
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[0.82rem]">
            <p className="min-w-0 truncate text-slate-500">{match.venue ?? 'Venue TBD'} · {matchDateLabel}</p>
            <p className="shrink-0 font-semibold text-slate-700">{resultText()}</p>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[0.82rem]">
            <p className="min-w-0 truncate text-slate-500">{match.venue ?? 'Venue TBD'} · {matchDateLabel}</p>
            {match.tossWinnerId ? (
              <p className="shrink-0 text-slate-400">
                Toss: {teams.find((t) => t.id === match.tossWinnerId)?.shortCode ?? '?'} elected to {match.tossDecision}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {showEdit ? (
        <MatchEditModal
          match={match}
          teams={teams}
          groups={groups}
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
  groups,
  stageStructure,
  onClose,
  onSaved,
}: {
  match: TournamentMatch
  teams: TournamentWithDetails['teams']
  groups: TournamentGroup[]
  stageStructure: TournamentStageStructure
  onClose: () => void
  onSaved: () => void
}) {
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
    groupId: match.groupId ? String(match.groupId) : '',
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
          groupId: form.groupId ? parseInt(form.groupId, 10) : null,
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

          {form.matchStage === 'group' && groups.length > 0 ? (
            <Field label="Group">
              <select name="groupId" value={form.groupId} onChange={handleChange} className={appInputClass}>
                <option value="">— No specific group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </Field>
          ) : null}

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

function TournamentEditModal({
  tournament,
  isAdmin,
  onClose,
  onSaved,
}: {
  tournament: TournamentWithDetails
  isAdmin: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: tournament.name,
    shortName: tournament.shortName,
    format: tournament.format,
    totalOvers: String(tournament.totalOvers),
    ballsPerOver: String(tournament.ballsPerOver),
    matchDaysFrom: tournament.matchDaysFrom ?? '',
    matchDaysTo: tournament.matchDaysTo ?? '',
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
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          shortName: form.shortName.trim(),
          format: form.format,
          totalOvers: parseInt(form.totalOvers, 10),
          ballsPerOver: parseInt(form.ballsPerOver, 10),
          ...(isAdmin && {
            matchDaysFrom: form.matchDaysFrom || null,
            matchDaysTo: form.matchDaysTo || null,
          }),
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-[2rem] bg-[#f8faf7] sm:rounded-[2rem] shadow-[0_24px_70px_rgba(10,14,18,0.22)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dfe6df] px-6 py-5">
          <div>
            <p className="app-kicker">Edit tournament</p>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{tournament.name}</h2>
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

          <Field label="Tournament Name">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={appInputClass}
              placeholder="e.g. ProStream Invitational 2026"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Short Name">
              <input
                name="shortName"
                value={form.shortName}
                onChange={handleChange}
                className={appInputClass}
                placeholder="e.g. PSI26"
                maxLength={20}
                required
              />
            </Field>
            <Field label="Format">
              <select name="format" value={form.format} onChange={handleChange} className={appInputClass}>
                <option value="T20">T20</option>
                <option value="ODI">ODI</option>
                <option value="T10">T10</option>
                <option value="custom">Custom</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Total Overs">
              <input
                type="number"
                name="totalOvers"
                value={form.totalOvers}
                onChange={handleChange}
                className={appInputClass}
                min={1}
                required
              />
            </Field>
            <Field label="Balls per Over">
              <input
                type="number"
                name="ballsPerOver"
                value={form.ballsPerOver}
                onChange={handleChange}
                className={appInputClass}
                min={4}
                max={8}
                required
              />
            </Field>
          </div>

          {/* Match dates — admin only */}
          {isAdmin ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Match Days From">
                <input
                  type="date"
                  name="matchDaysFrom"
                  value={form.matchDaysFrom}
                  onChange={handleChange}
                  className={appInputClass}
                />
              </Field>
              <Field label="Match Days To">
                <input
                  type="date"
                  name="matchDaysTo"
                  value={form.matchDaysTo}
                  onChange={handleChange}
                  className={appInputClass}
                />
              </Field>
            </div>
          ) : (
            <p className="rounded-2xl border border-[#dfe6df] bg-[#f4f7f2] px-4 py-3 text-sm text-slate-500">
              Match dates can only be changed by an admin.
            </p>
          )}

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
