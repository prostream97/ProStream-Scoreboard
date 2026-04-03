'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { TournamentNav } from '@/components/shared/TournamentNav'
import type { TournamentTeamSummary } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const emptyForm = {
  name: '',
  shortCode: '',
  primaryColor: '#4F46E5',
  secondaryColor: '#10B981',
  logoCloudinaryId: '',
}

export default function TeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tournamentId = parseInt(id, 10)
  const { data: session, status } = useSession()
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin'

  const [tournamentName, setTournamentName] = useState('')
  const [teams, setTeams] = useState<TournamentTeamSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Add form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit modal
  const [editingTeam, setEditingTeam] = useState<TournamentTeamSummary | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function load() {
    const res = await fetch(`/api/tournaments/${tournamentId}`)
    if (res.ok) {
      const data = await res.json()
      setTournamentName(data.name)
      setTeams(data.teams ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [tournamentId])

  function handleAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setEditForm((f) => ({ ...f, [name]: value }))
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

  function closeEdit() { setEditingTeam(null) }

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
          shortCode: editForm.shortCode.toUpperCase().slice(0, 3),
          primaryColor: editForm.primaryColor,
          secondaryColor: editForm.secondaryColor,
          logoCloudinaryId: editForm.logoCloudinaryId || null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTeams((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t))
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
    setTeams((prev) => prev.filter((t) => t.id !== teamId))
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm'
  const labelCls = 'block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider'

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
          <span className="text-gray-300">Teams</span>
        </div>

        <TournamentNav tournamentId={tournamentId} />

        <div className="flex items-center justify-between mb-6 mt-6">
          <div>
            <h1 className="font-display text-4xl text-primary tracking-wider">TEAMS</h1>
            <p className="font-stats text-gray-400 text-sm mt-1">{tournamentName} · {teams.length} {teams.length === 1 ? 'team' : 'teams'}</p>
          </div>
          {isAdmin ? (
            <button
              onClick={() => { setShowForm((v) => !v); setAddError('') }}
              className="px-4 py-2 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 transition-colors text-sm"
            >
              {showForm ? 'Cancel' : '+ Add Team'}
            </button>
          ) : (
            <button
              onClick={() => signIn()}
              className="px-4 py-2 bg-gray-700 text-gray-300 font-stats font-semibold rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Sign in to manage
            </button>
          )}
        </div>

        {addError && <p className="text-red-400 font-stats text-sm mb-4">{addError}</p>}

        {/* ── Add Team Form ── */}
        {showForm && isAdmin && (
          <form onSubmit={handleCreate} className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6 space-y-4">
            <h2 className="font-stats font-semibold text-gray-200">Add Team</h2>

            <ImageUpload
              value={form.logoCloudinaryId || null}
              onChange={(id) => setForm((f) => ({ ...f, logoCloudinaryId: id }))}
              folder="team-logos"
              label="Team Logo (optional)"
              previewShape="circle"
              id="add-team-logo"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Team Name</label>
                <input name="name" value={form.name} onChange={handleAddChange} className={inputCls} placeholder="e.g. Mumbai Indians" required />
              </div>
              <div>
                <label className={labelCls}>Short Code (3 chars)</label>
                <input name="shortCode" value={form.shortCode} onChange={handleAddChange} className={inputCls} placeholder="e.g. MI" maxLength={3} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" name="primaryColor" value={form.primaryColor} onChange={handleAddChange} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                  <input name="primaryColor" value={form.primaryColor} onChange={handleAddChange} className={inputCls} placeholder="#4F46E5" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" name="secondaryColor" value={form.secondaryColor} onChange={handleAddChange} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                  <input name="secondaryColor" value={form.secondaryColor} onChange={handleAddChange} className={inputCls} placeholder="#10B981" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={adding} className="w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors text-sm">
              {adding ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        )}

        {/* ── Team List ── */}
        {loading ? (
          <div className="text-center py-12 font-stats text-gray-500">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="font-display text-3xl mb-2">NO TEAMS YET</p>
            <p className="font-stats text-sm">Add teams using the form above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div key={team.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {team.logoCloudinaryId ? (
                    <img
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_48,h_48,f_webp/${team.logoCloudinaryId}`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-display text-sm" style={{ backgroundColor: team.primaryColor + '33', color: team.primaryColor }}>
                      {team.shortCode}
                    </div>
                  )}
                  <div>
                    <p className="font-display tracking-wider text-sm" style={{ color: team.primaryColor }}>{team.shortCode}</p>
                    <p className="font-stats font-semibold text-white">{team.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.primaryColor }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.secondaryColor }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}&tournamentId=${tournamentId}&tournamentName=${encodeURIComponent(tournamentName)}`}
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-xs rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Players
                  </Link>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(team)}
                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-xs rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(team.id)}
                        className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 font-stats text-xs rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
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

            <ImageUpload
              value={editForm.logoCloudinaryId || null}
              onChange={(id) => setEditForm((f) => ({ ...f, logoCloudinaryId: id }))}
              folder="team-logos"
              label="Team Logo"
              previewShape="circle"
              id={`edit-team-logo-${editingTeam.id}`}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Team Name</label>
                <input name="name" value={editForm.name} onChange={handleEditChange} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Short Code</label>
                <input name="shortCode" value={editForm.shortCode} onChange={handleEditChange} className={inputCls} maxLength={3} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" name="primaryColor" value={editForm.primaryColor} onChange={handleEditChange} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                  <input name="primaryColor" value={editForm.primaryColor} onChange={handleEditChange} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" name="secondaryColor" value={editForm.secondaryColor} onChange={handleEditChange} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                  <input name="secondaryColor" value={editForm.secondaryColor} onChange={handleEditChange} className={inputCls} />
                </div>
              </div>
            </div>

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
