'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import type { Tournament } from '@/types/tournament'

const FORMAT_OVERS: Record<string, number> = { T20: 20, ODI: 50, T10: 10, custom: 20 }

const fmtId = (id: number) => `TRN-${id.toString().padStart(3, '0')}`

const emptyForm = {
  name: '',
  shortName: '',
  format: 'T20',
  totalOvers: 20,
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-gray-700 text-gray-300',
  group_stage: 'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  knockout: 'bg-orange-500/20 text-orange-400 border border-orange-500/50',
  complete: 'bg-gray-700 text-gray-400',
}

export default function TournamentsPage() {
  const { status } = useSession()
  const isAuthed = status === 'authenticated'

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  async function loadTournaments() {
    const res = await fetch('/api/tournaments')
    if (res.ok) setTournaments(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadTournaments() }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    if (name === 'format') {
      setForm((f) => ({ ...f, format: value, totalOvers: FORMAT_OVERS[value] ?? 20 }))
    } else if (name === 'totalOvers') {
      setForm((f) => ({ ...f, totalOvers: parseInt(value, 10) || 0 }))
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm(emptyForm)
        setShowForm(false)
        await loadTournaments()
      } else {
        const data = await res.json()
        setCreateError(data.error ?? 'Failed to create tournament')
      }
    } finally {
      setCreating(false)
    }
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
          <span className="text-gray-300">Tournaments</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-4xl text-primary tracking-wider">TOURNAMENTS</h1>
          {isAuthed ? (
            <button
              onClick={() => { setShowForm((v) => !v); setCreateError('') }}
              className="px-4 py-2 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 transition-colors text-sm"
            >
              {showForm ? 'Cancel' : '+ Create Tournament'}
            </button>
          ) : (
            <button
              onClick={() => signIn(undefined, { callbackUrl: '/admin/tournaments' })}
              className="px-4 py-2 bg-gray-700 text-gray-300 font-stats font-semibold rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Sign in to manage
            </button>
          )}
        </div>

        {/* ── Create form ── */}
        {showForm && isAuthed && (
          <form
            onSubmit={handleCreate}
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6 space-y-4"
          >
            <h2 className="font-stats font-semibold text-gray-200">New Tournament</h2>
            {createError && <p className="text-red-400 font-stats text-sm">{createError}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tournament Name</label>
                <input name="name" value={form.name} onChange={handleChange} className={inputCls} placeholder="e.g. IPL 2025" required />
              </div>
              <div>
                <label className={labelCls}>Short Name</label>
                <input name="shortName" value={form.shortName} onChange={handleChange} className={inputCls} placeholder="e.g. IPL25" maxLength={20} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Format</label>
                <select name="format" value={form.format} onChange={handleChange} className={inputCls}>
                  <option value="T20">T20</option>
                  <option value="ODI">ODI</option>
                  <option value="T10">T10</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Total Overs</label>
                <input name="totalOvers" type="number" min={1} max={100} value={form.totalOvers} onChange={handleChange} className={inputCls} required />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors text-sm"
            >
              {creating ? 'Creating...' : 'Create Tournament'}
            </button>
          </form>
        )}

        {/* ── Tournament list ── */}
        {loading ? (
          <div className="text-center py-12 font-stats text-gray-500">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="font-display text-3xl mb-2">NO TOURNAMENTS YET</p>
            <p className="font-stats text-sm">Create your first tournament above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tournaments/${t.id}`}
                className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-stats font-semibold text-white text-lg">{t.name}</span>
                      <span className="font-display text-xs tracking-wider text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                        {t.shortName}
                      </span>
                      <span className="font-stats text-xs text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded font-mono">
                        {fmtId(t.id)}
                      </span>
                      <span className={`font-stats text-xs px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColors[t.status] ?? statusColors.upcoming}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="font-stats text-sm text-gray-400">
                      {t.format} · {t.totalOvers} overs · {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-stats text-xs text-gray-500">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
