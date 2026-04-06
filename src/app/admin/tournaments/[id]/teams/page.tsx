'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { ImageUpload } from '@/components/shared/ImageUpload'
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
import type { TournamentTeamSummary } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const emptyForm = {
  name: '',
  shortCode: '',
  primaryColor: '#1e3a8a',
  secondaryColor: '#17b45b',
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
          secondaryColor: form.secondaryColor,
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
      secondaryColor: team.secondaryColor,
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
          secondaryColor: editForm.secondaryColor,
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
          <span className="text-slate-900">Teams</span>
        </div>

        <TournamentNav tournamentId={tournamentId} />
      </div>

      <PageHeader
        eyebrow="Tournament Squads"
        title="Teams"
        description="Manage the teams assigned to this tournament and keep roster access one step away."
        actions={
          isAdmin ? (
            <AppButton
              type="button"
              onClick={() => {
                setShowForm((current) => !current)
                setAddError('')
              }}
            >
              {showForm ? 'Close Form' : 'Add Team'}
            </AppButton>
          ) : (
            <AppButton type="button" onClick={() => signIn()}>
              Sign In to Manage
            </AppButton>
          )
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Teams</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {teams.length}
          </p>
          <p className="text-sm text-slate-500">Tournament entries currently available.</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Player Access</p>
          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
            Per-team management
          </p>
          <p className="text-sm text-slate-500">Each card routes into the existing player editor for that team.</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Branding</p>
          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
            Colors and logo stay intact
          </p>
          <p className="text-sm text-slate-500">Overlay and scoreboard identity keep using the same stored values.</p>
        </SurfaceCard>
      </section>

      {addError ? (
        <SurfaceCard className="border-[#f4c3c1] bg-[#fff3f2] text-sm text-[#b94342]">
          {addError}
        </SurfaceCard>
      ) : null}

      {showForm && isAdmin ? (
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
                <label className={appLabelClass}>Primary Color</label>
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
              <div>
                <label className={appLabelClass}>Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="secondaryColor"
                    value={form.secondaryColor}
                    onChange={handleAddChange}
                    className="h-11 w-14 rounded-2xl border border-[#d7ddd6] bg-white p-1"
                  />
                  <input
                    name="secondaryColor"
                    value={form.secondaryColor}
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
            isAdmin ? (
              <AppButton type="button" onClick={() => setShowForm(true)}>
                Add First Team
              </AppButton>
            ) : undefined
          }
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <SurfaceCard key={team.id} className="flex h-full flex-col gap-4">
              <div className="flex items-start gap-4">
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AppBadge tone="blue">Manage Roster</AppBadge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-[1.4rem] bg-[#f4f7f2] p-4">
                <div>
                  <p className="app-kicker">Primary</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-white"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {team.primaryColor}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="app-kicker">Secondary</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-white"
                      style={{ backgroundColor: team.secondaryColor }}
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {team.secondaryColor}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap justify-end gap-3">
                <AppButton
                  href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}&tournamentId=${tournamentId}&tournamentName=${encodeURIComponent(tournamentName)}`}
                  variant="primary"
                >
                  Manage Players
                </AppButton>
                {isAdmin ? (
                  <>
                    <AppButton
                      type="button"
                      variant="secondary"
                      onClick={() => openEdit(team)}
                    >
                      Edit
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="danger"
                      onClick={() => handleDelete(team.id)}
                    >
                      Delete
                    </AppButton>
                  </>
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
                  <label className={appLabelClass}>Primary Color</label>
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
                <div>
                  <label className={appLabelClass}>Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="secondaryColor"
                      value={editForm.secondaryColor}
                      onChange={handleEditChange}
                      className="h-11 w-14 rounded-2xl border border-[#d7ddd6] bg-white p-1"
                    />
                    <input
                      name="secondaryColor"
                      value={editForm.secondaryColor}
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
