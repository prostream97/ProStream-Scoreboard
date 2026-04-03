'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Users, LayoutList, ChevronRight, ChevronLeft, MapPin, CalendarClock } from 'lucide-react'
import { getBattingFirstTeamId } from '@/lib/auth/utils'

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

  const selectedTournament = tournaments.find(t => t.id.toString() === form.tournamentId)
  const availableTeams = selectedTournament?.teams ?? []

  const canProceed = () => {
    if (step === 1) return !!form.tournamentId
    if (step === 2) return !!form.homeTeamId && !!form.awayTeamId && form.homeTeamId !== form.awayTeamId
    if (step === 3) return true
    return false
  }

  const handleNext = () => {
    if (canProceed() && step < 3) setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
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

  const inputCls = 'w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white font-body focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all'
  const labelCls = 'block text-xs font-stats font-semibold text-gray-400 mb-2 uppercase tracking-wider'

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* ── Header & Progress ── */}
      <div className="mb-12">
        <h1 className="font-display text-4xl text-white tracking-wider mb-8 text-center">MATCH SETUP</h1>
        
        <div className="flex items-center justify-between relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -z-10 -translate-y-1/2" />
          <div 
            className="absolute top-1/2 left-4 h-0.5 bg-primary -z-10 transition-all duration-500 ease-out -translate-y-1/2" 
            style={{ width: `calc(${(step - 1) / (steps.length - 1)} * calc(100% - 2rem))` }} 
          />
          
          {steps.map((s) => {
            const active = step >= s.id
            const current = step === s.id
            const Icon = s.icon
            return (
              <div key={s.id} className="flex flex-col items-center gap-3 bg-gray-950 px-2 relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${active ? 'bg-primary text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'bg-gray-900 border-2 border-gray-800 text-gray-500'}`}>
                  <Icon className={`w-5 h-5 ${current ? 'animate-pulse' : ''}`} />
                </div>
                <span className={`font-stats text-xs tracking-wider uppercase absolute -bottom-6 w-max ${active ? 'text-primary font-semibold' : 'text-gray-600'}`}>
                  {s.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 md:p-8 min-h-[400px] flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <h2 className="font-stats font-semibold text-xl text-white mb-6">Select Tournament</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm(f => ({ ...f, tournamentId: t.id.toString(), homeTeamId: '', awayTeamId: '' }))}
                    className={`flex flex-col text-left p-4 rounded-xl border transition-all ${form.tournamentId === t.id.toString() ? 'bg-primary/10 border-primary shadow-[inset_0_0_15px_rgba(79,70,229,0.15)] ring-1 ring-primary' : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
                  >
                    <span className="font-display tracking-widest text-lg text-white mb-1">{t.name}</span>
                    <span className="font-stats text-gray-400 text-sm">{t.format} • {t.totalOvers} Overs</span>
                    <span className="font-stats text-gray-500 text-xs mt-3">{t.teams.length} Teams Enrolled</span>
                  </button>
                ))}
                {tournaments.length === 0 && (
                  <p className="text-gray-500 font-stats col-span-2 text-center py-10">No tournaments available. Create one first.</p>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="font-stats font-semibold text-xl text-white mb-6">Select Teams</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 md:gap-8 items-center flex-1">
                {/* Home Team */}
                <div className="space-y-3">
                  <label className="font-display tracking-widest text-lg text-primary text-center block">HOME TEAM</label>
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableTeams.map(t => (
                      <button
                        key={t.id}
                        disabled={form.awayTeamId === t.id.toString()}
                        onClick={() => setForm(f => ({ ...f, homeTeamId: t.id.toString() }))}
                        className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${form.homeTeamId === t.id.toString() ? 'bg-gray-800 border-primary ring-1 ring-primary' : form.awayTeamId === t.id.toString() ? 'opacity-30 cursor-not-allowed bg-gray-900/50 border-gray-800' : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
                      >
                        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: t.primaryColor }} />
                        <div className="text-left flex-1">
                          <p className="font-stats font-semibold text-white leading-tight">{t.shortCode}</p>
                          <p className="font-stats text-xs text-gray-400 truncate">{t.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="font-display text-4xl text-gray-800 mx-auto opacity-50">VS</div>

                {/* Away Team */}
                <div className="space-y-3">
                  <label className="font-display tracking-widest text-lg text-secondary text-center block">AWAY TEAM</label>
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableTeams.map(t => (
                      <button
                        key={t.id}
                        disabled={form.homeTeamId === t.id.toString()}
                        onClick={() => setForm(f => ({ ...f, awayTeamId: t.id.toString() }))}
                        className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${form.awayTeamId === t.id.toString() ? 'bg-gray-800 border-secondary ring-1 ring-secondary' : form.homeTeamId === t.id.toString() ? 'opacity-30 cursor-not-allowed bg-gray-900/50 border-gray-800' : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
                      >
                        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: t.primaryColor }} />
                        <div className="text-left flex-1">
                          <p className="font-stats font-semibold text-white leading-tight">{t.shortCode}</p>
                          <p className="font-stats text-xs text-gray-400 truncate">{t.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <h2 className="font-stats font-semibold text-xl text-white mb-6">Match Details</h2>
              {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 font-stats rounded-xl text-sm">{error}</div>}
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Stage</label>
                    <select value={form.matchStage} onChange={e => setForm(f => ({ ...f, matchStage: e.target.value }))} className={inputCls} required>
                      <option value="group">Group Stage</option>
                      <option value="quarter_final">Quarter Final</option>
                      <option value="semi_final">Semi Final</option>
                      <option value="final">Final</option>
                      <option value="third_place">Third Place</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Custom Label</label>
                    <input type="text" value={form.matchLabel} onChange={e => setForm(f => ({ ...f, matchLabel: e.target.value }))} placeholder="e.g. M1, QF2" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className={labelCls}>Venue</label>
                    <MapPin className="absolute right-4 top-10 w-5 h-5 text-gray-600" />
                    <input type="text" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Stadium Name" className={inputCls} />
                  </div>
                  <div className="relative">
                    <label className={labelCls}>Date & Time</label>
                    <CalendarClock className="absolute right-4 top-10 w-5 h-5 text-gray-600" />
                    <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl border-dashed">
                  <h3 className="font-stats text-sm text-gray-400 uppercase tracking-wider mb-4">Initial Toss Info (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className={labelCls}>Toss Winner</label>
                       <select value={form.tossWinnerId} onChange={e => setForm(f => ({ ...f, tossWinnerId: e.target.value }))} className={inputCls}>
                         <option value="">-- TBA --</option>
                         <option value={form.homeTeamId}>Home Team</option>
                         <option value={form.awayTeamId}>Away Team</option>
                       </select>
                     </div>
                     <div>
                       <label className={labelCls}>Elected To</label>
                       <select value={form.tossDecision} onChange={e => setForm(f => ({ ...f, tossDecision: e.target.value }))} className={inputCls}>
                         <option value="">-- TBA --</option>
                         <option value="bat">Bat</option>
                         <option value="field">Field</option>
                       </select>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer ── */}
        <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-stats font-semibold transition-colors ${step > 1 ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'opacity-0 pointer-events-none'}`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-stats font-semibold rounded-xl hover:bg-indigo-600 hover:shadow-[0_4px_20px_rgba(79,70,229,0.4)] transition-all disabled:opacity-30 disabled:hover:shadow-none"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="flex items-center justify-center min-w-[160px] gap-2 px-6 py-2.5 bg-emerald-600 text-white font-stats font-semibold tracking-wider rounded-xl hover:bg-emerald-500 hover:shadow-[0_4px_25px_rgba(52,211,153,0.4)] transition-all disabled:opacity-40 disabled:hover:shadow-none"
            >
              {loading ? 'STARTING...' : 'START MATCH'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
