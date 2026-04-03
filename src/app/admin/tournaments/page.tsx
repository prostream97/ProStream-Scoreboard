'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Trophy } from 'lucide-react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import type { Tournament } from '@/types/tournament'

const FORMAT_OVERS: Record<string, number> = { T20: 20, ODI: 50, T10: 10, custom: 20 }
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const fmtId = (id: number) => `TRN-${id.toString().padStart(3, '0')}`

const emptyForm = {
  name: '',
  shortName: '',
  format: 'T20',
  totalOvers: 20,
  ballsPerOver: 6,
  logoCloudinaryId: '',
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-gray-800/50 text-gray-300 border border-gray-700 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]',
  group_stage: 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[inset_0_0_10px_rgba(59,130,246,0.2)]',
  knockout: 'bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-[inset_0_0_10px_rgba(249,115,22,0.2)]',
  complete: 'bg-gray-800/50 text-gray-500 border border-gray-800 shadow-none',
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
    } else if (name === 'ballsPerOver') {
      setForm((f) => ({ ...f, ballsPerOver: Math.max(1, parseInt(value, 10) || 6) }))
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

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-display text-4xl text-white tracking-wider">TOURNAMENTS</h1>
          </div>
          {isAuthed ? (
            <button
              onClick={() => { setShowForm(true); setCreateError('') }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-stats font-semibold rounded-xl hover:bg-indigo-600 hover:shadow-[0_4px_20px_rgba(79,70,229,0.4)] transition-all duration-300 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Tournament
            </button>
          ) : (
            <button
              onClick={() => signIn(undefined, { callbackUrl: '/admin/tournaments' })}
              className="px-5 py-2.5 bg-gray-800 text-gray-300 font-stats font-semibold rounded-xl hover:bg-gray-700 border border-gray-700 transition-all text-sm"
            >
              Sign in to manage
            </button>
          )}
        </div>

        {/* ── Create slide-over form ── */}
        <AnimatePresence>
          {showForm && isAuthed && (
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
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                        <input
                          name="ballsPerOver"
                          type="number"
                          min={1}
                          max={10}
                          value={form.ballsPerOver}
                          onChange={handleChange}
                          className={inputCls}
                          required
                        />
                        <p className="mt-1 font-stats text-[10px] text-gray-500">Standard is 6. Use 5 for Super 5s, etc.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tournaments/${t.id}`}
              >
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 hover:border-primary/50 shadow-lg hover:shadow-primary/10 transition-all flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Tournament logo or Trophy icon fallback */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center border border-gray-700">
                        {t.logoCloudinaryId && CLOUDINARY_CLOUD ? (
                          <img
                            src={`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/c_fill,w_48,h_48,f_webp/${t.logoCloudinaryId}`}
                            alt={t.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Trophy className="w-5 h-5 text-primary opacity-60" />
                        )}
                      </div>
                      <div>
                        <h2 className="font-display text-2xl text-white tracking-wider mb-1">{t.name}</h2>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {t.shortName}
                          </span>
                          <span className="font-stats text-xs text-gray-500 bg-gray-800/80 px-2 py-0.5 rounded font-mono">
                            {fmtId(t.id)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`font-stats text-[0.65rem] px-2.5 py-1 rounded-full uppercase tracking-widest ${statusColors[t.status] ?? statusColors.upcoming}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-800/50 flex items-center justify-between text-sm">
                     <p className="font-stats text-gray-400">
                        {t.format} <span className="mx-1 text-gray-600">•</span> {t.totalOvers} overs
                        {t.ballsPerOver !== 6 && (
                          <span className="ml-1 text-orange-400">({t.ballsPerOver} balls/over)</span>
                        )}
                     </p>
                     <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">Manage →</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
