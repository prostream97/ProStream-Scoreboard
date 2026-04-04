'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Trophy, Calendar } from 'lucide-react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import type { Tournament } from '@/types/tournament'

const FORMAT_OVERS: Record<string, number> = { T20: 20, ODI: 50, T10: 10, custom: 20 }
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const fmtId = (id: number) => `TRN-${id.toString().padStart(3, '0')}`

const today = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  name: '',
  shortName: '',
  format: 'T20',
  totalOvers: 20,
  ballsPerOver: 6,
  logoCloudinaryId: '',
  match_days_from: '',
  match_days_to: '',
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-gray-800/50 text-gray-300 border border-gray-700 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]',
  group_stage: 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[inset_0_0_10px_rgba(59,130,246,0.2)]',
  knockout: 'bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-[inset_0_0_10px_rgba(249,115,22,0.2)]',
  complete: 'bg-gray-800/50 text-gray-500 border border-gray-800 shadow-none',
}

function fmtDate(d: string | null) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function TournamentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin'
  const isAuthenticated = status === 'authenticated'

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
    } else if (name === 'ballsPerOver') {
      setForm((f) => ({ ...f, ballsPerOver: Math.max(1, parseInt(value, 10) || 6) }))
    } else if (name === 'match_days_from') {
      // Reset to_date if it's now before from_date
      setForm((f) => ({
        ...f,
        match_days_from: value,
        match_days_to: f.match_days_to < value ? '' : f.match_days_to,
      }))
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateError('')

    // Client-side match days validation for operators
    if (!isAdmin) {
      if (!form.match_days_from || !form.match_days_to) {
        setCreateError('Match days from and to are required')
        return
      }
      const from = new Date(form.match_days_from)
      const to = new Date(form.match_days_to)
      const diffDays = Math.round((to.getTime() - from.getTime()) / 86_400_000)
      if (diffDays > 1) {
        setCreateError('Match days window cannot exceed 2 days')
        return
      }
    }

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
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 font-stats text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-300">Tournaments</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-display text-4xl text-white tracking-wider">TOURNAMENTS</h1>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => { setShowForm(true); setCreateError('') }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-stats font-semibold rounded-xl hover:bg-indigo-600 hover:shadow-[0_4px_20px_rgba(79,70,229,0.4)] transition-all duration-300 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Tournament
            </button>
          )}
        </div>

        {/* ── Create slide-over form ── */}
        <AnimatePresence>
          {showForm && isAuthenticated && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowForm(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-md bg-gray-900 border-l border-gray-800 h-full shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                  <h2 className="font-display text-2xl text-white tracking-widest">NEW TOURNAMENT</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <form id="create-tournament-form" onSubmit={handleCreate} className="space-y-6">
                    {createError && <p className="text-red-400 font-stats text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">{createError}</p>}

                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Tournament Name</label>
                        <input name="name" value={form.name} onChange={handleChange} className={inputCls} placeholder="e.g. IPL 2025" required />
                      </div>
                      <div>
                        <label className={labelCls}>Short Name</label>
                        <input name="shortName" value={form.shortName} onChange={handleChange} className={inputCls} placeholder="e.g. IPL25" maxLength={20} required />
                      </div>
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
                      <div>
                        <label className={labelCls}>Balls Per Over</label>
                        <input name="ballsPerOver" type="number" min={1} max={10} value={form.ballsPerOver} onChange={handleChange} className={inputCls} required />
                        <p className="mt-1 font-stats text-[10px] text-gray-500">Standard is 6. Use 5 for Super 5s, etc.</p>
                      </div>

                      {/* Match Days Window */}
                      <div className="pt-2 border-t border-gray-800">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-stats text-xs text-gray-300 uppercase tracking-wider">Match Days Window</span>
                          {isAdmin && <span className="font-stats text-[10px] text-gray-500">(optional for admin)</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>
                              From {!isAdmin && <span className="text-red-400">*</span>}
                            </label>
                            <input
                              name="match_days_from"
                              type="date"
                              value={form.match_days_from}
                              onChange={handleChange}
                              min={today()}
                              className={inputCls}
                              required={!isAdmin}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>
                              To {!isAdmin && <span className="text-red-400">*</span>}
                            </label>
                            <input
                              name="match_days_to"
                              type="date"
                              value={form.match_days_to}
                              onChange={handleChange}
                              min={form.match_days_from || today()}
                              className={inputCls}
                              required={!isAdmin}
                            />
                          </div>
                        </div>
                        {!isAdmin && (
                          <p className="mt-2 font-stats text-[10px] text-amber-400/80">
                            Max 2-day window. Overlay creation is locked after this period.
                          </p>
                        )}
                      </div>

                      <div>
                        <ImageUpload
                          value={form.logoCloudinaryId || null}
                          onChange={(publicId) => setForm((f) => ({ ...f, logoCloudinaryId: publicId }))}
                          folder="tournament-logos"
                          label="Tournament Logo (optional)"
                          previewShape="square"
                          id="create-tournament-logo"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                <div className="p-6 border-t border-gray-800 bg-gray-900/50 backdrop-blur-md">
                  <button
                    form="create-tournament-form"
                    type="submit"
                    disabled={creating}
                    className="w-full py-3 bg-primary text-white font-stats font-semibold tracking-wide rounded-xl hover:bg-indigo-600 hover:shadow-[0_4px_20px_rgba(79,70,229,0.4)] disabled:opacity-40 transition-all text-sm"
                  >
                    {creating ? 'CREATING...' : 'CREATE TOURNAMENT'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Tournament list ── */}
        {loading ? (
          <div className="text-center py-12 font-stats text-gray-500">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="font-display text-3xl mb-2">NO TOURNAMENTS YET</p>
            <p className="font-stats text-sm">Create your first tournament above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-800 shadow-xl">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 font-stats text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold w-16">Logo</th>
                  <th className="px-6 py-4 font-semibold">Tournament</th>
                  <th className="px-6 py-4 font-semibold">Format</th>
                  <th className="px-6 py-4 font-semibold">Match Days</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {tournaments.map((t) => {
                  const windowActive = t.matchDaysFrom && t.matchDaysTo
                    ? (() => {
                        const now = today()
                        return now >= t.matchDaysFrom! && now <= t.matchDaysTo!
                      })()
                    : null
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/admin/tournaments/${t.id}`)}
                      className="group hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center border border-gray-700">
                          {t.logoCloudinaryId && CLOUDINARY_CLOUD ? (
                            <img
                              src={`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/c_fill,w_40,h_40,f_webp/${t.logoCloudinaryId}`}
                              alt={t.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Trophy className="w-4 h-4 text-primary opacity-60" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-display text-lg text-white tracking-wider mb-1 group-hover:text-primary transition-colors">{t.name}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-[10px] tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {t.shortName}
                          </span>
                          <span className="font-stats text-[10px] text-gray-500 bg-gray-800/80 px-2 py-0.5 rounded font-mono">
                            {fmtId(t.id)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-stats text-sm text-gray-300">
                          {t.format} <span className="mx-1 text-gray-600">•</span> {t.totalOvers} overs
                          {t.ballsPerOver !== 6 && (
                            <div className="text-[11px] text-orange-400 mt-0.5">({t.ballsPerOver} balls/over)</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {t.matchDaysFrom && t.matchDaysTo ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${windowActive ? 'bg-green-400' : 'bg-gray-600'}`} />
                            <div className="font-stats text-xs text-gray-400 leading-tight">
                              <div>{fmtDate(t.matchDaysFrom)}</div>
                              <div>{fmtDate(t.matchDaysTo)}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="font-stats text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-stats text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest ${statusColors[t.status] ?? statusColors.upcoming}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-stats text-sm">
                          Manage &rarr;
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
