'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X, Trophy, Calendar } from 'lucide-react'
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

const statusTone: Record<string, 'neutral' | 'blue' | 'amber'> = {
  upcoming: 'neutral',
  group_stage: 'blue',
  knockout: 'amber',
  complete: 'neutral',
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

  const loadTournaments = useCallback(async () => {
    const res = await fetch('/api/tournaments')
    if (res.ok) setTournaments(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadTournaments() }, [loadTournaments])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    if (name === 'format') {
      setForm((f) => ({ ...f, format: value, totalOvers: FORMAT_OVERS[value] ?? 20 }))
    } else if (name === 'totalOvers') {
      setForm((f) => ({ ...f, totalOvers: parseInt(value, 10) || 0 }))
    } else if (name === 'ballsPerOver') {
      setForm((f) => ({ ...f, ballsPerOver: Math.max(1, parseInt(value, 10) || 6) }))
    } else if (name === 'match_days_from') {
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

  return (
    <AppPage className="max-w-7xl">
      <PageHeader
        eyebrow="Tournament management"
        title="Series, formats, windows, and launch setup"
        description="Manage tournaments."
        actions={
          isAuthenticated ? (
            <AppButton onClick={() => { setShowForm(true); setCreateError('') }}>
              <Plus className="h-4 w-4" />
              Create Tournament
            </AppButton>
          ) : null
        }
      />

      <AnimatePresence>
        {showForm && isAuthenticated ? (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative flex h-full w-full max-w-xl flex-col border-l border-[#d7ddd6] bg-[#f8faf7] shadow-[0_24px_70px_rgba(10,14,18,0.18)]"
            >
              <div className="flex items-center justify-between border-b border-[#dfe6df] px-6 py-5">
                <div>
                  <p className="app-kicker">New tournament</p>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Create tournament</h2>
                </div>
                <button onClick={() => setShowForm(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 transition hover:text-slate-900">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <form id="create-tournament-form" onSubmit={handleCreate} className="space-y-5">
                  {createError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{createError}</p> : null}

                  <Field label="Tournament Name"><input name="name" value={form.name} onChange={handleChange} className={appInputClass} placeholder="e.g. IPL 2025" required /></Field>
                  <Field label="Short Name"><input name="shortName" value={form.shortName} onChange={handleChange} className={appInputClass} placeholder="e.g. IPL25" maxLength={20} required /></Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Format">
                      <select name="format" value={form.format} onChange={handleChange} className={appInputClass}>
                        <option value="T20">T20</option>
                        <option value="ODI">ODI</option>
                        <option value="T10">T10</option>
                        <option value="custom">Custom</option>
                      </select>
                    </Field>
                    <Field label="Total Overs"><input name="totalOvers" type="number" min={1} max={100} value={form.totalOvers} onChange={handleChange} className={appInputClass} required /></Field>
                  </div>

                  <Field label="Balls Per Over">
                    <input name="ballsPerOver" type="number" min={1} max={10} value={form.ballsPerOver} onChange={handleChange} className={appInputClass} required />
                  </Field>

                  <SurfaceCard className="space-y-4 bg-[#f3f7f2]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#10994c]" />
                      <p className="app-kicker !text-slate-600">Match days window</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={`From${!isAdmin ? ' *' : ''}`}>
                        <input
                          name="match_days_from"
                          type="date"
                          value={form.match_days_from}
                          onChange={handleChange}
                          min={today()}
                          className={appInputClass}
                          required={!isAdmin}
                        />
                      </Field>
                      <Field label={`To${!isAdmin ? ' *' : ''}`}>
                        <input
                          name="match_days_to"
                          type="date"
                          value={form.match_days_to}
                          onChange={handleChange}
                          min={form.match_days_from || today()}
                          className={appInputClass}
                          required={!isAdmin}
                        />
                      </Field>
                    </div>
                  </SurfaceCard>

                  <ImageUpload
                    value={form.logoCloudinaryId || null}
                    onChange={(publicId) => setForm((f) => ({ ...f, logoCloudinaryId: publicId }))}
                    folder="tournament-logos"
                    label="Tournament Logo (optional)"
                    previewShape="square"
                    id="create-tournament-logo"
                  />
                </form>
              </div>

              <div className="border-t border-[#dfe6df] px-6 py-5">
                <AppButton form="create-tournament-form" type="submit" disabled={creating} className="w-full">
                  {creating ? 'Creating...' : 'Create Tournament'}
                </AppButton>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {loading ? (
        <SurfaceCard>
          <p className="py-12 text-center text-sm text-slate-500">Loading tournaments...</p>
        </SurfaceCard>
      ) : tournaments.length === 0 ? (
        <EmptyState
          title="No tournaments yet"
          description="Create your first tournament to begin team setup, fixtures, scoring, and overlays."
          action={isAuthenticated ? <AppButton onClick={() => setShowForm(true)}>Create Tournament</AppButton> : undefined}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tournaments.map((t) => {
            const windowActive = t.matchDaysFrom && t.matchDaysTo
              ? (() => {
                const now = today()
                return now >= t.matchDaysFrom! && now <= t.matchDaysTo!
              })()
              : null

            return (
              <button
                key={t.id}
                onClick={() => router.push(`/admin/tournaments/${t.id}`)}
                className="text-left"
              >
                <SurfaceCard className="h-full transition hover:-translate-y-0.5 hover:border-[#b8d7c0] hover:shadow-[0_18px_38px_rgba(26,36,32,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.2rem] border border-[#dfe6df] bg-[#f4f7f2]">
                        {t.logoCloudinaryId && CLOUDINARY_CLOUD ? (
                          <img
                            src={`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/c_fill,w_80,h_80,f_webp/${t.logoCloudinaryId}`}
                            alt={t.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Trophy className="h-6 w-6 text-[#10994c]" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{t.name}</p>
                          <AppBadge tone="neutral">{t.shortName}</AppBadge>
                          <AppBadge tone={statusTone[t.status] ?? 'neutral'}>{t.status.replace('_', ' ')}</AppBadge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {t.format} . {t.totalOvers} overs
                          {t.ballsPerOver !== 6 ? ` . ${t.ballsPerOver} balls/over` : ''}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">{fmtId(t.id)}</p>
                      </div>
                    </div>
                    <AppButton variant="secondary" className="hidden sm:inline-flex">Manage</AppButton>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-[#e1e7df] bg-[#f8faf7] p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Match window</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {t.matchDaysFrom && t.matchDaysTo ? `${fmtDate(t.matchDaysFrom)} - ${fmtDate(t.matchDaysTo)}` : 'Not set'}
                      </p>
                      {windowActive !== null ? (
                        <p className={`mt-1 text-xs font-medium ${windowActive ? 'text-[#10994c]' : 'text-slate-500'}`}>
                          {windowActive ? 'Currently active' : 'Outside active window'}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-[1.25rem] border border-[#e1e7df] bg-[#f8faf7] p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Format summary</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{t.format}</p>
                      <p className="mt-1 text-sm text-slate-500">{t.totalOvers} overs</p>
                    </div>
                  </div>
                </SurfaceCard>
              </button>
            )
          })}
        </div>
      )}
    </AppPage>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={appLabelClass}>{label}</label>
      {children}
    </div>
  )
}
