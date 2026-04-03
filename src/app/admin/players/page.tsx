'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { TournamentNav } from '@/components/shared/TournamentNav'
import type { Player } from '@/types/player'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Role = 'batsman' | 'bowler' | 'allrounder' | 'keeper'

const ROLES: Role[] = ['batsman', 'bowler', 'allrounder', 'keeper']

const ROLE_COLORS: Record<Role, string> = {
  batsman: 'text-secondary',
  bowler: 'text-primary',
  allrounder: 'text-accent',
  keeper: 'text-overlay-cyan',
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
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin'
  const searchParams = useSearchParams()
  const teamId = searchParams.get('teamId')
  const teamName = searchParams.get('teamName') ?? 'Team'
  const tournamentId = searchParams.get('tournamentId')
  const tournamentName = searchParams.get('tournamentName') ?? 'Tournament'

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  // Add form
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [addError, setAddError] = useState('')

  // Edit modal
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // CSV
  const [csvText, setCsvText] = useState('')
  const [csvMode, setCsvMode] = useState(false)
  const [csvAdding, setCsvAdding] = useState(false)

  async function loadPlayers() {
    if (!teamId) return
    const res = await fetch(`/api/teams/${teamId}/players`)
    if (res.ok) setPlayers(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadPlayers() }, [teamId])

  function handleAddChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setEditForm((f) => ({ ...f, [name]: value }))
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
        const [name, displayName, role, battingStyle, bowlingStyle] = line.split(',').map((s) => s.trim())
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

  function openEdit(p: Player) {
    setEditingPlayer(p)
    setEditForm({
      name: p.name,
      displayName: p.displayName,
      role: p.role as Role,
      battingStyle: p.battingStyle ?? '',
      bowlingStyle: p.bowlingStyle ?? '',
      headshotCloudinaryId: p.headshotCloudinaryId ?? '',
    })
    setEditError('')
  }

  function closeEdit() { setEditingPlayer(null) }

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
        setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
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
      <div className="text-center py-12">
        <p className="font-stats text-gray-400">No team selected.</p>
        <Link href="/admin/teams" className="text-primary hover:underline font-stats text-sm mt-2 inline-block">← Back to Teams</Link>
      </div>
    )
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm'
  const labelCls = 'block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider'

  // Shared player fields (role + batting/bowling style selects)
  function StyleFields({ f, onChange }: { f: typeof emptyForm; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void }) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Role</label>
          <select name="role" value={f.role} onChange={onChange} className={inputCls}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Batting Style</label>
          <select name="battingStyle" value={f.battingStyle} onChange={onChange} className={inputCls}>
            <option value="">—</option>
            <option value="right-hand">Right Hand</option>
            <option value="left-hand">Left Hand</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Bowling Style</label>
          <select name="bowlingStyle" value={f.bowlingStyle} onChange={onChange} className={inputCls}>
            <option value="">—</option>
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

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 font-stats text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/admin/tournaments" className="hover:text-gray-300 transition-colors">Tournaments</Link>
          {tournamentId && (
            <>
              <span>/</span>
              <Link href={`/admin/tournaments/${tournamentId}`} className="hover:text-gray-300 transition-colors">{tournamentName}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-300">{teamName}</span>
        </div>

        {tournamentId && (
          <TournamentNav tournamentId={parseInt(tournamentId, 10)} activeSegment="players" />
        )}

        <div className="flex items-center justify-between mb-6 mt-6">
          <div>
            <h1 className="font-display text-4xl text-primary tracking-wider">PLAYERS</h1>
            <p className="font-stats text-gray-400 text-sm mt-1">{teamName} · {players.length} players</p>
          </div>
          <div className="flex gap-2">
            {isAdmin ? (
              <>
                <button
                  onClick={() => { setCsvMode((v) => !v); setShowForm(false) }}
                  className="px-3 py-2 bg-gray-800 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {csvMode ? 'Cancel CSV' : 'CSV Import'}
                </button>
                <button
                  onClick={() => { setShowForm((v) => !v); setCsvMode(false); setAddError('') }}
                  className="px-4 py-2 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                >
                  {showForm ? 'Cancel' : '+ Add Player'}
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn(undefined, { callbackUrl: `/admin/players?teamId=${teamId}&teamName=${encodeURIComponent(teamName)}` })}
                className="px-4 py-2 bg-gray-700 text-gray-300 font-stats font-semibold rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Sign in to manage
              </button>
            )}
          </div>
        </div>

        {addError && <p className="text-red-400 font-stats text-sm mb-4">{addError}</p>}

        {/* ── Add Player form ── */}
        {showForm && isAdmin && (
          <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6 space-y-4">
            <h2 className="font-stats font-semibold text-gray-200">Add Player</h2>

            <ImageUpload
              value={form.headshotCloudinaryId || null}
              onChange={(publicId) => setForm((f) => ({ ...f, headshotCloudinaryId: publicId }))}
              folder="player-headshots"
              label="Player Photo (optional)"
              previewShape="circle"
              id="add-player-photo"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input name="name" value={form.name} onChange={handleAddChange} className={inputCls} placeholder="e.g. Rohit Sharma" required />
              </div>
              <div>
                <label className={labelCls}>Display Name</label>
                <input name="displayName" value={form.displayName} onChange={handleAddChange} className={inputCls} placeholder="e.g. RG Sharma" />
              </div>
            </div>

            <StyleFields f={form} onChange={handleAddChange} />

            <button type="submit" disabled={adding} className="w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors text-sm">
              {adding ? 'Adding...' : 'Add Player'}
            </button>
          </form>
        )}

        {/* ── CSV import ── */}
        {csvMode && isAdmin && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6 space-y-3">
            <div>
              <h2 className="font-stats font-semibold text-gray-200">CSV Import</h2>
              <p className="font-stats text-xs text-gray-500 mt-1">
                Format: Name, Display Name, Role, Batting Style, Bowling Style (one per line)
              </p>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full h-36 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-body text-sm focus:outline-none focus:border-primary resize-none"
              placeholder={`Virat Kohli, V Kohli, batsman, right-hand\nJasprit Bumrah, JJ Bumrah, bowler, right-hand, right-arm-fast`}
            />
            <button
              onClick={handleCsvImport}
              disabled={csvAdding || !csvText.trim()}
              className="w-full py-2.5 bg-secondary text-white font-stats font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-40 transition-colors text-sm"
            >
              {csvAdding ? 'Importing...' : `Import ${csvText.trim().split('\n').filter(Boolean).length} Players`}
            </button>
          </div>
        )}

        {/* ── Player list ── */}
        {loading ? (
          <div className="text-center py-12 font-stats text-gray-500">Loading players...</div>
        ) : players.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="font-display text-3xl mb-2">NO PLAYERS YET</p>
            <p className="font-stats text-sm">Add players using the form or CSV import above.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">Batting</th>
                  <th className="text-left px-4 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">Bowling</th>
                  {isAdmin && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-stats text-xs text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.headshotCloudinaryId ? (
                          <img
                            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_32,h_32,f_webp/${p.headshotCloudinaryId}`}
                            alt={p.displayName}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-stats text-xs text-gray-400 flex-shrink-0">
                            {p.displayName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-stats font-semibold text-white text-sm">{p.displayName}</p>
                          {p.displayName !== p.name && <p className="font-stats text-xs text-gray-500">{p.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-stats text-xs font-semibold capitalize ${ROLE_COLORS[p.role as Role]}`}>{p.role}</span>
                    </td>
                    <td className="px-4 py-3 font-stats text-xs text-gray-400">{p.battingStyle ?? '—'}</td>
                    <td className="px-4 py-3 font-stats text-xs text-gray-400">{p.bowlingStyle ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-xs rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Player Modal ── */}
      {editingPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit() }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-stats font-semibold text-white text-lg">Edit Player</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>

            {editError && <p className="text-red-400 font-stats text-sm">{editError}</p>}

            <ImageUpload
              value={editForm.headshotCloudinaryId || null}
              onChange={(publicId) => setEditForm((f) => ({ ...f, headshotCloudinaryId: publicId }))}
              folder="player-headshots"
              label="Player Photo"
              previewShape="circle"
              id={`edit-player-photo-${editingPlayer.id}`}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input name="name" value={editForm.name} onChange={handleEditChange} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Display Name</label>
                <input name="displayName" value={editForm.displayName} onChange={handleEditChange} className={inputCls} />
              </div>
            </div>

            <StyleFields f={editForm} onChange={handleEditChange} />

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

export default function PlayersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="font-stats text-gray-500">Loading...</p></div>}>
      <PlayersContent />
    </Suspense>
  )
}
