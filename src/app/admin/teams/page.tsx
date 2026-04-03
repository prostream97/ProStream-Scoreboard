'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import type { Team } from '@/types/player'
import type { Tournament } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const emptyForm = {
  tournamentId: '',
  name: '',
  shortCode: '',
  primaryColor: '#4F46E5',
  secondaryColor: '#10B981',
  logoCloudinaryId: '',
}

export default function TeamsPage() {
  const { data: session, status } = useSession()
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin'
  const [teams, setTeams] = useState<Team[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [createError, setCreateError] = useState('')

  // Edit modal
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function loadTeams() {
    const [teamsRes, tournamentsRes] = await Promise.all([
      fetch('/api/teams'),
      fetch('/api/tournaments'),
    ])

    if (teamsRes.ok) setTeams(await teamsRes.json())
    if (tournamentsRes.ok) setTournaments(await tournamentsRes.json())
    setLoading(false)
  }

  useEffect(() => { loadTeams() }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, target: 'create' | 'edit') {
    const { name, value } = e.target
    const val = name === 'shortCode' ? value.toUpperCase().slice(0, 3) : value
    if (target === 'create') setForm((f) => ({ ...f, [name]: val }))
    else setEditForm((f) => ({ ...f, [name]: val }))
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

  function closeEdit() { setEditingTeam(null) }

  async function handleEditSave() {
    if (!editingTeam) return
    setSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, logoCloudinaryId: editForm.logoCloudinaryId || null }),
      })
      if (res.ok) {
        const updated: Team = await res.json()
        setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        closeEdit()
      } else {
        const data = await res.json()
        setEditError(data.error ?? 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm'
  const labelCls = 'block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider'

  function TeamFormFields({
    f,
    onChange,
    idPrefix,
    showTournamentField = false,
  }: {
    f: typeof emptyForm
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    idPrefix: string
    showTournamentField?: boolean
  }) {
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          {showTournamentField && (
            <div className="col-span-2">
              <label className={labelCls}>Tournament</label>
              <select
                name="tournamentId"
                value={f.tournamentId}
                onChange={onChange}
                className={inputCls}
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
          )}
          <div>
            <label className={labelCls}>Team Name</label>
            <input name="name" value={f.name} onChange={onChange} className={inputCls} placeholder="e.g. Mumbai Indians" required />
          </div>
          <div>
            <label className={labelCls}>Short Code (3 letters)</label>
            <input name="shortCode" value={f.shortCode} onChange={onChange} className={inputCls} placeholder="e.g. MI" maxLength={3} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Primary Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" name="primaryColor" value={f.primaryColor} onChange={onChange} className="h-10 w-12 rounded border border-gray-700 bg-gray-800 cursor-pointer" />
              <input name="primaryColor" value={f.primaryColor} onChange={onChange} className={`${inputCls} flex-1`} placeholder="#4F46E5" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Secondary Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" name="secondaryColor" value={f.secondaryColor} onChange={onChange} className="h-10 w-12 rounded border border-gray-700 bg-gray-800 cursor-pointer" />
              <input name="secondaryColor" value={f.secondaryColor} onChange={onChange} className={`${inputCls} flex-1`} placeholder="#10B981" />
            </div>
          </div>
        </div>

        <ImageUpload
          value={f.logoCloudinaryId || null}
          onChange={(publicId) => {
            // Dispatch a synthetic change to the parent setter via the name convention
            onChange({ target: { name: 'logoCloudinaryId', value: publicId } } as React.ChangeEvent<HTMLInputElement>)
          }}
          folder="team-logos"
          label="Team Logo (optional)"
          previewShape="square"
          id={`${idPrefix}-logo`}
        />

        {/* Preview strip */}
        <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
          {f.logoCloudinaryId
            ? <img src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_32,h_32,f_webp/${f.logoCloudinaryId}`} alt="" className="w-8 h-8 rounded-full object-cover" />
            : <>
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: f.primaryColor }} />
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: f.secondaryColor }} />
              </>
          }
          <span className="font-display text-xl tracking-wider" style={{ color: f.primaryColor }}>{f.shortCode || 'XXX'}</span>
          <span className="font-stats text-gray-300 text-sm">{f.name || 'Team Name'}</span>
        </div>
      </>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 font-stats text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-300">Teams</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-4xl text-primary tracking-wider">TEAMS</h1>
          {isAdmin ? (
            <button
              onClick={() => { setShowForm((v) => !v); setCreateError('') }}
              className="px-4 py-2 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 transition-colors text-sm"
            >
              {showForm ? 'Cancel' : '+ Create Team'}
            </button>
          ) : (
            <button
              onClick={() => signIn(undefined, { callbackUrl: '/admin/teams' })}
              className="px-4 py-2 bg-gray-700 text-gray-300 font-stats font-semibold rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Sign in to manage
            </button>
          )}
        </div>

        {/* ── Create team form ── */}
        {showForm && isAdmin && (
          <form
            onSubmit={handleCreate}
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6 space-y-4"
          >
            <h2 className="font-stats font-semibold text-gray-200">New Team</h2>
            {createError && <p className="text-red-400 font-stats text-sm">{createError}</p>}
            <TeamFormFields f={form} onChange={(e) => handleChange(e, 'create')} idPrefix="new" showTournamentField />
            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors text-sm"
            >
              {creating ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        )}

        {/* ── Team list ── */}
        {loading ? (
          <div className="text-center py-12 font-stats text-gray-500">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="font-display text-3xl mb-2">NO TEAMS YET</p>
            <p className="font-stats text-sm">Create your first team above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {/* Logo (single display) */}
                  {team.logoCloudinaryId ? (
                    <img
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_64,h_64,f_webp/${team.logoCloudinaryId}`}
                      alt={team.name}
                      className="w-16 h-16 rounded-xl object-cover border border-gray-700 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center font-display text-xl tracking-wider border border-white/10 flex-shrink-0"
                      style={{ backgroundColor: team.primaryColor + '33', color: team.primaryColor }}
                    >
                      {team.shortCode}
                    </div>
                  )}
                  <div>
                    <p className="font-stats font-semibold text-white text-base">{team.name}</p>
                    <p className="font-display text-lg tracking-wider" style={{ color: team.primaryColor }}>{team.shortCode}</p>
                    <div className="flex gap-1.5 mt-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.primaryColor }} title="Primary" />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.secondaryColor }} title="Secondary" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => openEdit(team)}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <Link
                    href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}`}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Manage Players
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Team Modal ── */}
      {editingTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit() }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-stats font-semibold text-white text-lg">Edit Team</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>

            {editError && <p className="text-red-400 font-stats text-sm">{editError}</p>}

            <TeamFormFields f={editForm} onChange={(e) => handleChange(e, 'edit')} idPrefix={`edit-${editingTeam.id}`} />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary text-white font-stats font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
