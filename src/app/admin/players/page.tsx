'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  appTextareaClass,
} from '@/components/shared/AppPrimitives'
import type { Player } from '@/types/player'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Role = 'batsman' | 'bowler' | 'allrounder' | 'keeper'

const ROLES: Role[] = ['batsman', 'bowler', 'allrounder', 'keeper']

const ROLE_TONES: Record<Role, 'green' | 'blue' | 'amber' | 'neutral'> = {
  batsman: 'blue',
  bowler: 'green',
  allrounder: 'amber',
  keeper: 'neutral',
}

const emptyForm = {
  name: '',
  displayName: '',
  role: 'batsman' as Role,
  battingStyle: '',
  bowlingStyle: '',
  headshotCloudinaryId: '',
}

function PlayersContent() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const isAdmin = isAuthenticated && session?.user?.role === 'admin'
  const searchParams = useSearchParams()
  const teamId = searchParams.get('teamId')
  const teamName = searchParams.get('teamName') ?? 'Team'
  const tournamentId = searchParams.get('tournamentId')
  const tournamentName = searchParams.get('tournamentName') ?? 'Tournament'

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [addError, setAddError] = useState('')
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [csvText, setCsvText] = useState('')
  const [csvMode, setCsvMode] = useState(false)
  const [csvAdding, setCsvAdding] = useState(false)

  const loadPlayers = useCallback(async () => {
    if (!teamId) {
      setLoading(false)
      return
    }
    const res = await fetch(`/api/teams/${teamId}/players`)
    if (res.ok) setPlayers(await res.json())
    setLoading(false)
  }, [teamId])

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  function handleAddChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleEditChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setEditForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    try {
      const payload = {
        name: form.name,
        displayName: form.displayName || form.name,
        role: form.role,
        battingStyle: form.battingStyle || null,
        bowlingStyle: form.bowlingStyle || null,
        headshotCloudinaryId: form.headshotCloudinaryId || null,
      }
      const res = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setForm(emptyForm)
        setShowForm(false)
        await loadPlayers()
      } else {
        const data = await res.json()
        setAddError(data.error ?? 'Failed to add player')
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleCsvImport() {
    setAddError('')
    setCsvAdding(true)
    try {
      const lines = csvText.trim().split('\n').filter(Boolean)
      const parsed = lines.map((line) => {
        const [name, displayName, role, battingStyle, bowlingStyle] = line
          .split(',')
          .map((segment) => segment.trim())
        return {
          name,
          displayName: displayName || name,
          role: (ROLES.includes(role as Role) ? role : 'batsman') as Role,
          battingStyle: battingStyle || null,
          bowlingStyle: bowlingStyle || null,
        }
      })
      const res = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      if (res.ok) {
        setCsvText('')
        setCsvMode(false)
        await loadPlayers()
      } else {
        setAddError('CSV import failed')
      }
    } finally {
      setCsvAdding(false)
    }
  }

  function openEdit(player: Player) {
    setEditingPlayer(player)
    setEditForm({
      name: player.name,
      displayName: player.displayName,
      role: player.role as Role,
      battingStyle: player.battingStyle ?? '',
      bowlingStyle: player.bowlingStyle ?? '',
      headshotCloudinaryId: player.headshotCloudinaryId ?? '',
    })
    setEditError('')
  }

  function closeEdit() {
    setEditingPlayer(null)
  }

  async function handleEditSave() {
    if (!editingPlayer) return
    setSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/teams/${teamId}/players/${editingPlayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          displayName: editForm.displayName || editForm.name,
          role: editForm.role,
          battingStyle: editForm.battingStyle || null,
          bowlingStyle: editForm.bowlingStyle || null,
          headshotCloudinaryId: editForm.headshotCloudinaryId || null,
        }),
      })
      if (res.ok) {
        const updated: Player = await res.json()
        setPlayers((current) =>
          current.map((player) => (player.id === updated.id ? updated : player)),
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

  if (!teamId) {
    return (
      <AppPage className="mx-auto max-w-3xl">
        <EmptyState
          title="No team selected"
          description="Pick a team first so player management stays scoped to the right roster."
          action={<AppButton href="/admin/teams">Back to Teams</AppButton>}
        />
      </AppPage>
    )
  }

  function StyleFields({
    value,
    onChange,
  }: {
    value: typeof emptyForm
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => void
  }) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={appLabelClass}>Role</label>
          <select
            name="role"
            value={value.role}
            onChange={onChange}
            className={appInputClass}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={appLabelClass}>Batting Style</label>
          <select
            name="battingStyle"
            value={value.battingStyle}
            onChange={onChange}
            className={appInputClass}
          >
            <option value="">Not set</option>
            <option value="right-hand">Right Hand</option>
            <option value="left-hand">Left Hand</option>
          </select>
        </div>
        <div>
          <label className={appLabelClass}>Bowling Style</label>
          <select
            name="bowlingStyle"
            value={value.bowlingStyle}
            onChange={onChange}
            className={appInputClass}
          >
            <option value="">Not set</option>
            <option value="right-arm-fast">RA Fast</option>
            <option value="right-arm-medium">RA Medium</option>
            <option value="right-arm-offbreak">RA Off Break</option>
            <option value="right-arm-legbreak">RA Leg Break</option>
            <option value="left-arm-fast">LA Fast</option>
            <option value="left-arm-medium">LA Medium</option>
            <option value="left-arm-orthodox">LA Orthodox</option>
            <option value="left-arm-chinaman">LA Chinaman</option>
          </select>
        </div>
      </div>
    )
  }

  const manageCallback = `/admin/players?teamId=${teamId}&teamName=${encodeURIComponent(teamName)}`

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
          {tournamentId ? (
            <>
              <span>/</span>
              <Link
                href={`/admin/tournaments/${tournamentId}`}
                className="transition hover:text-slate-800"
              >
                {tournamentName}
              </Link>
            </>
          ) : null}
          <span>/</span>
          <span className="text-slate-900">{teamName}</span>
        </div>

        {tournamentId ? (
          <TournamentNav
            tournamentId={parseInt(tournamentId, 10)}
            activeSegment="players"
          />
        ) : null}
      </div>

      <PageHeader
        eyebrow="Team Roster"
        title={teamName}
        description="Manage every squad member, import players in bulk, and keep the roster ready for the operator and viewer experiences."
        actions={
          isAdmin ? (
            <>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setCsvMode((current) => !current)
                  setShowForm(false)
                }}
              >
                {csvMode ? 'Close CSV' : 'CSV Import'}
              </AppButton>
              <AppButton
                type="button"
                onClick={() => {
                  setShowForm((current) => !current)
                  setCsvMode(false)
                  setAddError('')
                }}
              >
                {showForm ? 'Close Form' : 'Add Player'}
              </AppButton>
            </>
          ) : (
            <AppButton
              type="button"
              onClick={() => signIn(undefined, { callbackUrl: manageCallback })}
            >
              Sign In to Manage
            </AppButton>
          )
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Players</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {players.length}
          </p>
          <p className="text-sm text-slate-500">Active roster entries available for match setup.</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Editable</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {isAdmin ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-slate-500">Admin sign-in still controls write access.</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="app-kicker">Quick Path</p>
          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
            Bulk import or hand-edit
          </p>
          <p className="text-sm text-slate-500">Both flows continue to hit the existing team player APIs.</p>
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
            <p className="app-kicker">Manual Entry</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Add Player
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <ImageUpload
              value={form.headshotCloudinaryId || null}
              onChange={(publicId) =>
                setForm((current) => ({ ...current, headshotCloudinaryId: publicId }))
              }
              folder="player-headshots"
              label="Player Photo (optional)"
              previewShape="circle"
              id="add-player-photo"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={appLabelClass}>Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleAddChange}
                  className={appInputClass}
                  placeholder="e.g. Rohit Sharma"
                  required
                />
              </div>
              <div>
                <label className={appLabelClass}>Display Name</label>
                <input
                  name="displayName"
                  value={form.displayName}
                  onChange={handleAddChange}
                  className={appInputClass}
                  placeholder="e.g. RG Sharma"
                />
              </div>
            </div>

            <StyleFields value={form} onChange={handleAddChange} />

            <div className="flex justify-end">
              <AppButton type="submit" disabled={adding}>
                {adding ? 'Adding...' : 'Add Player'}
              </AppButton>
            </div>
          </form>
        </SurfaceCard>
      ) : null}

      {csvMode && isAdmin ? (
        <SurfaceCard className="space-y-4">
          <div>
            <p className="app-kicker">Bulk Import</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              CSV Paste
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Format each line as: <code>Name, Display Name, Role, Batting Style, Bowling Style</code>
            </p>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className={appTextareaClass + ' min-h-40'}
            placeholder={
              'Virat Kohli, V Kohli, batsman, right-hand\nJasprit Bumrah, JJ Bumrah, bowler, right-hand, right-arm-fast'
            }
          />

          <div className="flex justify-end">
            <AppButton
              type="button"
              disabled={csvAdding || !csvText.trim()}
              onClick={handleCsvImport}
            >
              {csvAdding
                ? 'Importing...'
                : `Import ${csvText.trim().split('\n').filter(Boolean).length} Players`}
            </AppButton>
          </div>
        </SurfaceCard>
      ) : null}

      {loading ? (
        <SurfaceCard className="py-16 text-center text-sm text-slate-500">
          Loading players...
        </SurfaceCard>
      ) : players.length === 0 ? (
        <EmptyState
          title="No players yet"
          description="Add players manually or import a CSV to populate this team before creating a match."
          action={
            isAdmin ? (
              <AppButton
                type="button"
                onClick={() => {
                  setShowForm(true)
                  setCsvMode(false)
                }}
              >
                Add First Player
              </AppButton>
            ) : undefined
          }
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
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

              {isAdmin ? (
                <div className="mt-auto flex justify-end">
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={() => openEdit(player)}
                  >
                    Edit Player
                  </AppButton>
                </div>
              ) : null}
            </SurfaceCard>
          ))}
        </section>
      )}

      {editingPlayer ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08110d]/70 px-4 py-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit()
          }}
        >
          <div className="w-full max-w-2xl rounded-[2rem] border border-[#d7ddd6] bg-[#fbfcf8] p-6 shadow-[0_32px_90px_rgba(8,17,13,0.26)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">Roster Update</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Edit Player
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d7ddd6] text-slate-500 transition hover:bg-white hover:text-slate-900"
                aria-label="Close edit player modal"
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
                value={editForm.headshotCloudinaryId || null}
                onChange={(publicId) =>
                  setEditForm((current) => ({
                    ...current,
                    headshotCloudinaryId: publicId,
                  }))
                }
                folder="player-headshots"
                label="Player Photo"
                previewShape="circle"
                id={`edit-player-photo-${editingPlayer.id}`}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={appLabelClass}>Full Name</label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className={appInputClass}
                    required
                  />
                </div>
                <div>
                  <label className={appLabelClass}>Display Name</label>
                  <input
                    name="displayName"
                    value={editForm.displayName}
                    onChange={handleEditChange}
                    className={appInputClass}
                  />
                </div>
              </div>

              <StyleFields value={editForm} onChange={handleEditChange} />

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

export default function PlayersPage() {
  return (
    <Suspense
      fallback={
        <AppPage className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
          Loading...
        </AppPage>
      }
    >
      <PlayersContent />
    </Suspense>
  )
}
