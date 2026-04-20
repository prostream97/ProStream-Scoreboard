'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { TournamentNav } from '@/components/shared/TournamentNav'
import {
  AppBadge,
  AppButton,
  AppPage,
  EmptyState,
  SurfaceCard,
  appInputClass,
  appLabelClass,
} from '@/components/shared/AppPrimitives'
import type { TournamentTeamSummary } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const emptyForm = {
  name: '',
  shortCode: '',
  primaryColor: '#1e3a8a',
  logoCloudinaryId: '',
}

export default function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const tournamentId = parseInt(id, 10)
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const isAdmin = isAuthenticated && session?.user?.role === 'admin'

  const [tournamentName, setTournamentName] = useState('')
  const [teams, setTeams] = useState<TournamentTeamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [editingTeam, setEditingTeam] = useState<TournamentTeamSummary | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}`)
    if (res.ok) {
      const data = await res.json()
      setTournamentName(data.name)
      setTeams(data.teams ?? [])
    }
    setLoading(false)
  }, [tournamentId])

  useEffect(() => {
    load()
  }, [load])

  function handleAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const normalized = name === 'shortCode' ? value.toUpperCase().slice(0, 3) : value
    setForm((current) => ({ ...current, [name]: normalized }))
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const normalized = name === 'shortCode' ? value.toUpperCase().slice(0, 3) : value
    setEditForm((current) => ({ ...current, [name]: normalized }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          shortCode: form.shortCode,
          primaryColor: form.primaryColor,
          logoCloudinaryId: form.logoCloudinaryId || null,
        }),
      })
      if (res.ok) {
        setForm(emptyForm)
        setShowForm(false)
        await load()
      } else {
        const data = await res.json()
        setAddError(data.error ?? 'Failed to create team')
      }
    } finally {
      setAdding(false)
    }
  }

  function openEdit(team: TournamentTeamSummary) {
    setEditingTeam(team)
    setEditForm({
      name: team.name,
      shortCode: team.shortCode,
      primaryColor: team.primaryColor,
      logoCloudinaryId: team.logoCloudinaryId ?? '',
    })
    setEditError('')
  }

  function closeEdit() {
    setEditingTeam(null)
  }

  async function handleEditSave() {
    if (!editingTeam) return
    setSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          shortCode: editForm.shortCode,
          primaryColor: editForm.primaryColor,
          logoCloudinaryId: editForm.logoCloudinaryId || null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTeams((current) =>
          current.map((team) => (team.id === updated.id ? { ...team, ...updated } : team)),
        )
        closeEdit()
      } else {
        const data = await res.json()
        setEditError(data.error ?? 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(teamId: number) {
    if (!confirm('Delete this team and all its players?')) return
    await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}`, { method: 'DELETE' })
    setTeams((current) => current.filter((team) => team.id !== teamId))
  }

  return (
    <AppPage className="space-y-6">
      <TournamentNav tournamentId={tournamentId} />

      {isAuthenticated ? (
        <div className="flex justify-end -mt-3">
          <AppButton
            type="button"
            onClick={() => {
              setShowForm((current) => !current)
              setAddError('')
            }}
          >
            {showForm ? 'Close Form' : 'Add Team'}
          </AppButton>
        </div>
      ) : null}

      {addError ? (
        <SurfaceCard className="border-[#f4c3c1] bg-[#fff3f2] text-sm text-[#b94342]">
          {addError}
        </SurfaceCard>
      ) : null}

      {showForm && isAuthenticated ? (
        <SurfaceCard className="space-y-5">
          <div>
            <p className="app-kicker">Create Team</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Add Team to Tournament
            </h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            <ImageUpload
              value={form.logoCloudinaryId || null}
              onChange={(value) =>
                setForm((current) => ({ ...current, logoCloudinaryId: value }))
              }
              folder="team-logos"
              label="Team Logo (optional)"
              previewShape="circle"
              id="add-team-logo"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={appLabelClass}>Team Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleAddChange}
                  className={appInputClass}
                  placeholder="e.g. Mumbai Indians"
                  required
                />
              </div>
              <div>
                <label className={appLabelClass}>Short Code</label>
                <input
                  name="shortCode"
                  value={form.shortCode}
                  onChange={handleAddChange}
                  className={appInputClass}
                  maxLength={3}
                  placeholder="e.g. MI"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={appLabelClass}>Team Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="primaryColor"
                    value={form.primaryColor}
                    onChange={handleAddChange}
                    className="h-11 w-14 rounded-2xl border border-[#d7ddd6] bg-white p-1"
                  />
                  <input
                    name="primaryColor"
                    value={form.primaryColor}
                    onChange={handleAddChange}
                    className={appInputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <AppButton type="submit" disabled={adding}>
                {adding ? 'Creating...' : 'Create Team'}
              </AppButton>
            </div>
          </form>
        </SurfaceCard>
      ) : null}

      {loading ? (
        <SurfaceCard className="py-16 text-center text-sm text-slate-500">
          Loading teams...
        </SurfaceCard>
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams added"
          description="Create a team for this tournament first, then attach players and use the same data in match setup."
          action={
            isAuthenticated ? (
              <AppButton type="button" onClick={() => setShowForm(true)}>
                Add First Team
              </AppButton>
            ) : undefined
          }
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <SurfaceCard
              key={team.id}
              className={`flex h-full flex-col gap-4 transition ${isAuthenticated ? 'cursor-pointer hover:border-[#b8d7c0] hover:bg-[#f8fcf9]' : ''}`}
              role={isAuthenticated ? 'button' : undefined}
              tabIndex={isAuthenticated ? 0 : undefined}
              onClick={isAuthenticated ? () => openEdit(team) : undefined}
              onKeyDown={
                isAuthenticated
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openEdit(team)
                      }
                    }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-4">
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

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    {team.name}
                  </h3>
                  <p
                    className="text-sm font-semibold tracking-[0.18em]"
                    style={{ color: team.primaryColor }}
                  >
                    {team.shortCode}
                  </p>
                </div>
                <span
                  className="mt-1 h-[70px] w-[40px] shrink-0 rounded-full border border-white"
                  style={{ backgroundColor: team.primaryColor }}
                  aria-label={`${team.name} team color`}
                />
              </div>

              <div
                className="mt-auto h-[30px] flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <AppButton
                  href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}&tournamentId=${tournamentId}&tournamentName=${encodeURIComponent(tournamentName)}`}
                  variant="primary"
                  className="h-[30px] w-full px-3 text-xs sm:w-auto"
                >
                  Manage Players
                </AppButton>
                {isAuthenticated ? (
                  <div className="flex gap-2 sm:contents">
                    <AppButton
                      type="button"
                      variant="danger"
                      onClick={() => handleDelete(team.id)}
                      className="h-[30px] flex-1 px-3 text-xs sm:flex-none"
                    >
                      Delete
                    </AppButton>
                  </div>
                ) : null}
              </div>
            </SurfaceCard>
          ))}
        </section>
      )}

      {editingTeam ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08110d]/70 px-4 py-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit()
          }}
        >
          <div className="w-full max-w-2xl rounded-[2rem] border border-[#d7ddd6] bg-[#fbfcf8] p-6 shadow-[0_32px_90px_rgba(8,17,13,0.26)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">Team Update</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Edit Team
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d7ddd6] text-slate-500 transition hover:bg-white hover:text-slate-900"
                aria-label="Close edit team modal"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {editError ? (
                <div className="rounded-2xl border border-[#f4c3c1] bg-[#fff3f2] px-4 py-3 text-sm text-[#b94342]">
                  {editError}
                </div>
              ) : null}

              <ImageUpload
                value={editForm.logoCloudinaryId || null}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, logoCloudinaryId: value }))
                }
                folder="team-logos"
                label="Team Logo"
                previewShape="circle"
                id={`edit-team-logo-${editingTeam.id}`}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={appLabelClass}>Team Name</label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className={appInputClass}
                    required
                  />
                </div>
                <div>
                  <label className={appLabelClass}>Short Code</label>
                  <input
                    name="shortCode"
                    value={editForm.shortCode}
                    onChange={handleEditChange}
                    className={appInputClass}
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={appLabelClass}>Team Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="primaryColor"
                      value={editForm.primaryColor}
                      onChange={handleEditChange}
                      className="h-11 w-14 rounded-2xl border border-[#d7ddd6] bg-white p-1"
                    />
                    <input
                      name="primaryColor"
                      value={editForm.primaryColor}
                      onChange={handleEditChange}
                      className={appInputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <AppButton type="button" variant="secondary" onClick={closeEdit}>
                  Cancel
                </AppButton>
                <AppButton type="button" onClick={handleEditSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppPage>
  )
}
