'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { ImageUpload } from '@/components/shared/ImageUpload'
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
import type { Team } from '@/types/player'
import type { Tournament } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const emptyForm = {
  tournamentId: '',
  name: '',
  shortCode: '',
  primaryColor: '#1e3a8a',
  secondaryColor: '#17b45b',
  logoCloudinaryId: '',
}

export default function TeamsPage() {
  const { data: session, status } = useSession()
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin'
  const [teams, setTeams] = useState<Team[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [createError, setCreateError] = useState('')
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const loadTeams = useCallback(async () => {
    const [teamsRes, tournamentsRes] = await Promise.all([
      fetch('/api/teams'),
      fetch('/api/tournaments'),
    ])

    if (teamsRes.ok) setTeams(await teamsRes.json())
    if (tournamentsRes.ok) setTournaments(await tournamentsRes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    target: 'create' | 'edit',
  ) {
    const { name, value } = e.target
    const normalized = name === 'shortCode' ? value.toUpperCase().slice(0, 3) : value
    if (target === 'create') {
      setForm((current) => ({ ...current, [name]: normalized }))
    } else {
      setEditForm((current) => ({ ...current, [name]: normalized }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tournamentId: parseInt(form.tournamentId, 10),
          logoCloudinaryId: form.logoCloudinaryId || null,
        }),
      })
      if (res.ok) {
        setForm(emptyForm)
        setShowForm(false)
        await loadTeams()
      } else {
        const data = await res.json()
        setCreateError(data.error ?? 'Failed to create team')
      }
    } finally {
      setCreating(false)
    }
  }

  function openEdit(team: Team) {
    setEditingTeam(team)
    setEditForm({
      tournamentId: String(team.tournamentId),
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
          ...editForm,
          logoCloudinaryId: editForm.logoCloudinaryId || null,
        }),
      })
      if (res.ok) {
        const updated: Team = await res.json()
        setTeams((current) =>
          current.map((team) => (team.id === updated.id ? updated : team)),
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

  function TeamFormFields({
    value,
    onChange,
    idPrefix,
    showTournamentField = false,
  }: {
    value: typeof emptyForm
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    idPrefix: string
    showTournamentField?: boolean
  }) {
    return (
      <div className="space-y-5">
        {showTournamentField ? (
          <div>
            <label className={appLabelClass}>Tournament</label>
            <select
              name="tournamentId"
              value={value.tournamentId}
              onChange={onChange}
              className={appInputClass}
              required
            >
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} ({tournament.shortName})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={appLabelClass}>Team Name</label>
            <input
              name="name"
              value={value.name}
              onChange={onChange}
              className={appInputClass}
              placeholder="e.g. Mumbai Indians"
              required
            />
          </div>
          <div>
            <label className={appLabelClass}>Short Code</label>
            <input
              name="shortCode"
              value={value.shortCode}
              onChange={onChange}
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
                value={value.primaryColor}
                onChange={onChange}
                className="h-11 w-14 rounded-2xl border border-[#d7ddd6] bg-white p-1"
              />
              <input
                name="primaryColor"
                value={value.primaryColor}
                onChange={onChange}
                className={appInputClass}
                placeholder="#1e3a8a"
              />
            </div>
          </div>
          <div>
            <label className={appLabelClass}>Secondary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="secondaryColor"
                value={value.secondaryColor}
                onChange={onChange}
                className="h-11 w-14 rounded-2xl border border-[#d7ddd6] bg-white p-1"
              />
              <input
                name="secondaryColor"
                value={value.secondaryColor}
                onChange={onChange}
                className={appInputClass}
                placeholder="#17b45b"
              />
            </div>
          </div>
        </div>

        <ImageUpload
          value={value.logoCloudinaryId || null}
          onChange={(publicId) =>
            onChange({
              target: { name: 'logoCloudinaryId', value: publicId },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          folder="team-logos"
          label="Team Logo (optional)"
          previewShape="square"
          id={`${idPrefix}-logo`}
        />

        <div className="rounded-[1.5rem] bg-[#f4f7f2] p-4">
          <p className="app-kicker">Preview</p>
          <div className="mt-3 flex items-center gap-3">
            {value.logoCloudinaryId ? (
              <img
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_56,h_56,f_webp/${value.logoCloudinaryId}`}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex gap-2">
                <div
                  className="h-12 w-12 rounded-2xl"
                  style={{ backgroundColor: value.primaryColor }}
                />
                <div
                  className="h-12 w-12 rounded-2xl"
                  style={{ backgroundColor: value.secondaryColor }}
                />
              </div>
            )}
            <div>
              <p
                className="text-xl font-semibold tracking-[0.18em]"
                style={{ color: value.primaryColor }}
              >
                {value.shortCode || 'XXX'}
              </p>
              <p className="text-sm text-slate-600">{value.name || 'Team Name'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppPage className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="transition hover:text-slate-800">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-900">Teams</span>
      </div>

      <PageHeader
        eyebrow="Clubs and Squads"
        title="Teams"
        description="Manage tournament teams, their branding, and the player management entry point without changing the existing team APIs."
        actions={
          isAdmin ? (
            <AppButton
              type="button"
              onClick={() => {
                setShowForm((current) => !current)
                setCreateError('')
              }}
            >
              {showForm ? 'Close Form' : 'Create Team'}
            </AppButton>
          ) : (
            <AppButton
              type="button"
              onClick={() => signIn(undefined, { callbackUrl: '/admin/teams' })}
            >
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
          <p className="text-sm text-slate-500">All teams available for match setup and overlays.</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Tournaments</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {tournaments.length}
          </p>
          <p className="text-sm text-slate-500">Team creation still requires assigning a tournament.</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Roster Flow</p>
          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
            Team branding plus players
          </p>
          <p className="text-sm text-slate-500">Team cards link directly into the existing player management route.</p>
        </SurfaceCard>
      </section>

      {showForm && isAdmin ? (
        <SurfaceCard className="space-y-5">
          <div>
            <p className="app-kicker">Create Team</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              New Team
            </h2>
          </div>

          {createError ? (
            <div className="rounded-2xl border border-[#f4c3c1] bg-[#fff3f2] px-4 py-3 text-sm text-[#b94342]">
              {createError}
            </div>
          ) : null}

          <form onSubmit={handleCreate} className="space-y-5">
            <TeamFormFields
              value={form}
              onChange={(e) => handleChange(e, 'create')}
              idPrefix="new-team"
              showTournamentField
            />
            <div className="flex justify-end">
              <AppButton type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Team'}
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
          title="No teams yet"
          description="Create a team first, then attach players and use that roster in match setup."
          action={
            isAdmin ? (
              <AppButton type="button" onClick={() => setShowForm(true)}>
                Create First Team
              </AppButton>
            ) : undefined
          }
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const tournament = tournaments.find(
              (entry) => entry.id === team.tournamentId,
            )

            return (
              <SurfaceCard key={team.id} className="flex h-full flex-col gap-4">
                <div className="flex items-start gap-4">
                  {team.logoCloudinaryId ? (
                    <img
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_88,h_88,f_webp/${team.logoCloudinaryId}`}
                      alt={team.name}
                      className="h-18 w-18 rounded-[1.35rem] object-cover"
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

                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
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
                    {tournament ? (
                      <AppBadge tone="neutral">{tournament.shortName}</AppBadge>
                    ) : null}
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
                  {isAdmin ? (
                    <AppButton
                      type="button"
                      variant="secondary"
                      onClick={() => openEdit(team)}
                    >
                      Edit
                    </AppButton>
                  ) : null}
                  <AppButton
                    href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}`}
                    variant="primary"
                  >
                    Manage Players
                  </AppButton>
                </div>
              </SurfaceCard>
            )
          })}
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

              <TeamFormFields
                value={editForm}
                onChange={(e) => handleChange(e, 'edit')}
                idPrefix={`edit-team-${editingTeam.id}`}
              />

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
