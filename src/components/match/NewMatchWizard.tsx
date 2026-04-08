'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Users, LayoutList, ChevronRight, ChevronLeft, MapPin, CalendarClock } from 'lucide-react'
import { getBattingFirstTeamId } from '@/lib/auth/utils'
import { AppButton, AppPage, PageHeader, SurfaceCard, appInputClass, appLabelClass } from '@/components/shared/AppPrimitives'

type WizardProps = {
  tournaments: {
    id: number
    name: string
    format: string
    totalOvers: number
    teams: {
      id: number
      name: string
      shortCode: string
      primaryColor: string
      logoCloudinaryId: string | null
    }[]
  }[]
}

const steps = [
  { id: 1, title: 'Tournament', icon: Trophy },
  { id: 2, title: 'Teams', icon: Users },
  { id: 3, title: 'Details', icon: LayoutList },
]

export function NewMatchWizard({ tournaments }: WizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    tournamentId: '',
    homeTeamId: '',
    awayTeamId: '',
    matchStage: 'group',
    matchLabel: '',
    venue: '',
    date: '',
    tossWinnerId: '',
    tossDecision: '',
  })

  const selectedTournament = tournaments.find((t) => t.id.toString() === form.tournamentId)
  const availableTeams = selectedTournament?.teams ?? []

  const canProceed = () => {
    if (step === 1) return !!form.tournamentId
    if (step === 2) return !!form.homeTeamId && !!form.awayTeamId && form.homeTeamId !== form.awayTeamId
    if (step === 3) return true
    return false
  }

  const handleNext = () => {
    if (canProceed() && step < 3) setStep((s) => s + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    if (!canProceed()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/tournaments/${form.tournamentId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeamId: parseInt(form.homeTeamId, 10),
          awayTeamId: parseInt(form.awayTeamId, 10),
          venue: form.venue || null,
          date: form.date || null,
          matchStage: form.matchStage,
          matchLabel: form.matchLabel || null,
          tossWinnerId: form.tossWinnerId ? parseInt(form.tossWinnerId, 10) : null,
          tossDecision: form.tossDecision || null,
          battingFirstTeamId: getBattingFirstTeamId({
            homeTeamId: parseInt(form.homeTeamId, 10),
            awayTeamId: parseInt(form.awayTeamId, 10),
            tossWinnerId: form.tossWinnerId ? parseInt(form.tossWinnerId, 10) : null,
            tossDecision: form.tossDecision === 'bat' || form.tossDecision === 'field' ? form.tossDecision : null,
          }),
        }),
      })

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Failed to create match')
      }

      const created = await res.json()
      router.push(`/match/${created.match.id}/operator`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <AppPage className="max-w-6xl">
      <PageHeader
        eyebrow="Match setup"
        title="Start a live match"
        description="Choose the tournament, assign the teams, and launch the operator control room."
      />

      <SurfaceCard className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((s) => {
            const Icon = s.icon
            const active = step >= s.id
            const current = step === s.id
            return (
              <div
                key={s.id}
                className={`rounded-[1.5rem] border px-4 py-4 transition ${
                  active ? 'border-[#cce8d4] bg-[#eef8f1]' : 'border-[#e2e8e1] bg-[#f8faf7]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${active ? 'bg-[#17b45b] text-white' : 'bg-white text-slate-400'}`}>
                    <Icon className={`h-5 w-5 ${current ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <p className="app-kicker !text-slate-400">Step {s.id}</p>
                    <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{s.title}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <p className="app-kicker">Step 1</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Select tournament</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tournaments.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setForm((f) => ({ ...f, tournamentId: t.id.toString(), homeTeamId: '', awayTeamId: '' }))}
                    className={`rounded-[1.5rem] border p-4 text-left transition ${
                      form.tournamentId === t.id.toString()
                        ? 'border-[#b9dfc4] bg-[#eef8f1] shadow-[0_14px_26px_rgba(23,180,91,0.12)]'
                        : 'border-[#e2e8e1] bg-[#f8faf7] hover:bg-white'
                    }`}
                  >
                    <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{t.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{t.format} . {t.totalOvers} overs</p>
                    <p className="mt-4 text-sm font-medium text-slate-700">{t.teams.length} teams enrolled</p>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <p className="app-kicker">Step 2</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Select teams</h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
                <TeamColumn
                  title="Home Team"
                  activeId={form.homeTeamId}
                  disabledId={form.awayTeamId}
                  teams={availableTeams}
                  onSelect={(id) => setForm((f) => ({ ...f, homeTeamId: id.toString() }))}
                />
                <div className="hidden items-center justify-center lg:flex">
                  <div className="rounded-full bg-[#f4f7f2] px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">VS</div>
                </div>
                <TeamColumn
                  title="Away Team"
                  activeId={form.awayTeamId}
                  disabledId={form.homeTeamId}
                  teams={availableTeams}
                  onSelect={(id) => setForm((f) => ({ ...f, awayTeamId: id.toString() }))}
                />
              </div>
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <p className="app-kicker">Step 3</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Match details</h2>
              </div>
              {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Stage">
                  <select value={form.matchStage} onChange={(e) => setForm((f) => ({ ...f, matchStage: e.target.value }))} className={appInputClass} required>
                    <option value="group">Group Stage</option>
                    <option value="quarter_final">Quarter Final</option>
                    <option value="semi_final">Semi Final</option>
                    <option value="final">Final</option>
                    <option value="third_place">Third Place</option>
                  </select>
                </Field>
                <Field label="Custom Label">
                  <input type="text" value={form.matchLabel} onChange={(e) => setForm((f) => ({ ...f, matchLabel: e.target.value }))} placeholder="e.g. M1, QF2" className={appInputClass} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Venue">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input type="text" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Stadium Name" className={`${appInputClass} pr-10`} />
                  </div>
                </Field>
                <Field label="Date & Time">
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={`${appInputClass} pr-10`} />
                  </div>
                </Field>
              </div>

              <SurfaceCard className="space-y-4 bg-[#f3f7f2]">
                <div>
                  <p className="app-kicker">Optional</p>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Initial toss information</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Toss Winner">
                    <select value={form.tossWinnerId} onChange={(e) => setForm((f) => ({ ...f, tossWinnerId: e.target.value }))} className={appInputClass}>
                      <option value="">-- TBA --</option>
                      <option value={form.homeTeamId}>Home Team</option>
                      <option value={form.awayTeamId}>Away Team</option>
                    </select>
                  </Field>
                  <Field label="Elected To">
                    <select value={form.tossDecision} onChange={(e) => setForm((f) => ({ ...f, tossDecision: e.target.value }))} className={appInputClass}>
                      <option value="">-- TBA --</option>
                      <option value="bat">Bat</option>
                      <option value="field">Field</option>
                    </select>
                  </Field>
                </div>
              </SurfaceCard>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex flex-col gap-3 border-t border-[#e3e9e2] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <AppButton variant="secondary" onClick={handleBack} className={step > 1 ? '' : 'pointer-events-none opacity-0'}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </AppButton>

          {step < 3 ? (
            <AppButton onClick={handleNext} disabled={!canProceed()}>
              Continue
              <ChevronRight className="h-4 w-4" />
            </AppButton>
          ) : (
            <AppButton onClick={handleSubmit} disabled={!canProceed() || loading}>
              {loading ? 'Starting...' : 'Start Match'}
            </AppButton>
          )}
        </div>
      </SurfaceCard>
    </AppPage>
  )
}

function TeamColumn({
  title,
  teams,
  activeId,
  disabledId,
  onSelect,
}: {
  title: string
  teams: WizardProps['tournaments'][number]['teams']
  activeId: string
  disabledId: string
  onSelect: (id: number) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="app-kicker">{title}</p>
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
      </div>
      <div className="grid gap-3">
        {teams.map((t) => {
          const active = activeId === t.id.toString()
          const disabled = disabledId === t.id.toString()
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => onSelect(t.id)}
              className={`flex items-center gap-3 rounded-[1.35rem] border p-3 text-left transition ${
                active
                  ? 'border-[#b9dfc4] bg-[#eef8f1] shadow-[0_14px_26px_rgba(23,180,91,0.12)]'
                  : disabled
                    ? 'cursor-not-allowed border-[#e7ece6] bg-[#f8faf7] opacity-45'
                    : 'border-[#e2e8e1] bg-[#f8faf7] hover:bg-white'
              }`}
            >
              <div className="h-10 w-10 rounded-full" style={{ backgroundColor: t.primaryColor }} />
              <div className="min-w-0">
                <p className="font-semibold text-slate-950">{t.shortCode}</p>
                <p className="truncate text-sm text-slate-500">{t.name}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
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
