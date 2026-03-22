'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { CloudinaryUpload } from '@/components/shared/CloudinaryUpload'
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

function PlayersContent() {
  const { status } = useSession()
  const isAuthed = status === 'authenticated'
  const searchParams = useSearchParams()
  const teamId = searchParams.get('teamId')
  const teamName = searchParams.get('teamName') ?? 'Team'

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', displayName: '', role: 'batsman' as Role, battingStyle: '', bowlingStyle: '' })
  const [error, setError] = useState('')
  const [csvText, setCsvText] = useState('')
  const [csvMode, setCsvMode] = useState(false)

  async function loadPlayers() {
    if (!teamId) return
    const res = await fetch(`/api/teams/${teamId}/players`)
    if (res.ok) setPlayers(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadPlayers() }, [teamId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAdding(true)
    try {
      const payload = {
        name: form.name,
        displayName: form.displayName || form.name,
        role: form.role,
        battingStyle: form.battingStyle || null,
        bowlingStyle: form.bowlingStyle || null,
      }
      const res = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setForm({ name: '', displayName: '', role: 'batsman', battingStyle: '', bowlingStyle: '' })
        setShowForm(false)
        await loadPlayers()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to add player')
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleCsvImport() {
    setError('')
    setAdding(true)
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
        setError('CSV import failed')
      }
    } finally {
      setAdding(false)
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

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 font-stats text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/admin/teams" className="hover:text-gray-300 transition-colors">Teams</Link>
          <span>/</span>
          <span className="text-gray-300">{teamName}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-4xl text-primary tracking-wider">PLAYERS</h1>
            <p className="font-stats text-gray-400 text-sm mt-1">{teamName} · {players.length} players</p>
          </div>
          <div className="flex gap-2">
            {isAuthed ? (
              <>
                <button
                  onClick={() => { setCsvMode((v) => !v); setShowForm(false) }}
                  className="px-3 py-2 bg-gray-800 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {csvMode ? 'Cancel CSV' : 'CSV Import'}
                </button>
                <button
                  onClick={() => { setShowForm((v) => !v); setCsvMode(false); setError('') }}
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

        {error && <p className="text-red-400 font-stats text-sm mb-4">{error}</p>}

        {/* Single player form */}
        {showForm && isAuthed && (
          <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6 space-y-4">
            <h2 className="font-stats font-semibold text-gray-200">Add Player</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input name="name" value={form.name} onChange={handleChange} className={inputCls} placeholder="e.g. Rohit Sharma" required />
              </div>
              <div>
                <label className={labelCls}>Display Name</label>
                <input name="displayName" value={form.displayName} onChange={handleChange} className={inputCls} placeholder="e.g. RG Sharma" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Role</label>
                <select name="role" value={form.role} onChange={handleChange} className={inputCls}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Batting Style</label>
                <select name="battingStyle" value={form.battingStyle} onChange={handleChange} className={inputCls}>
                  <option value="">—</option>
                  <option value="right-hand">Right Hand</option>
                  <option value="left-hand">Left Hand</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Bowling Style</label>
                <select name="bowlingStyle" value={form.bowlingStyle} onChange={handleChange} className={inputCls}>
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

            <button type="submit" disabled={adding} className="w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors text-sm">
              {adding ? 'Adding...' : 'Add Player'}
            </button>
          </form>
        )}

        {/* CSV import */}
        {csvMode && isAuthed && (
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
              disabled={adding || !csvText.trim()}
              className="w-full py-2.5 bg-secondary text-white font-stats font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-40 transition-colors text-sm"
            >
              {adding ? 'Importing...' : `Import ${csvText.trim().split('\n').filter(Boolean).length} Players`}
            </button>
          </div>
        )}

        {/* Player list */}
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
                  {isAuthed && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-stats text-xs text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.headshotCloudinaryId ? (
                          <Image
                            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_32,h_32,f_webp/${p.headshotCloudinaryId}`}
                            alt={p.displayName}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-stats text-xs text-gray-400">
                            {p.displayName.charAt(0)}
                          </div>
                        )}
                      <p className="font-stats font-semibold text-white text-sm">{p.displayName}</p>
                      {p.displayName !== p.name && <p className="font-stats text-xs text-gray-500">{p.name}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-stats text-xs font-semibold capitalize ${ROLE_COLORS[p.role]}`}>{p.role}</span>
                    </td>
                    <td className="px-4 py-3 font-stats text-xs text-gray-400">{p.battingStyle ?? '—'}</td>
                    <td className="px-4 py-3 font-stats text-xs text-gray-400">{p.bowlingStyle ?? '—'}</td>
                    {isAuthed && (
                      <td className="px-4 py-3">
                        <CloudinaryUpload
                          label="Photo"
                          preset="player-headshot"
                          onUploaded={async (publicId) => {
                            await fetch(`/api/teams/${teamId}/players/${p.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ headshotCloudinaryId: publicId }),
                            })
                            await loadPlayers()
                          }}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
