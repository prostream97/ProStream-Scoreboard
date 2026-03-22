'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Team } from '@/types/player'

export default function NewMatchPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    format: 'T20',
    totalOvers: '20',
    venue: '',
    tossWinnerId: '',
    tossDecision: 'bat',
  })

  useEffect(() => {
    fetch('/api/teams').then((r) => r.json()).then(setTeams).catch(() => {})
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === 'format' ? { totalOvers: value === 'T20' ? '20' : value === 'ODI' ? '50' : value === 'T10' ? '10' : f.totalOvers } : {}),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/match/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeamId: parseInt(form.homeTeamId),
          awayTeamId: parseInt(form.awayTeamId),
          format: form.format,
          totalOvers: parseInt(form.totalOvers),
          venue: form.venue || undefined,
          tossWinnerId: form.tossWinnerId ? parseInt(form.tossWinnerId) : undefined,
          tossDecision: form.tossDecision || undefined,
          battingFirstTeamId: form.tossWinnerId ? parseInt(form.tossWinnerId) : undefined,
        }),
      })

      if (res.ok) {
        const { match } = await res.json()
        router.push(`/match/${match.id}/operator`)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary'
  const labelCls = 'block text-sm font-stats text-gray-400 mb-1'

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="font-display text-4xl text-primary tracking-wider mb-8">NEW MATCH</h1>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-8 border border-gray-800 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Home Team</label>
              <select name="homeTeamId" value={form.homeTeamId} onChange={handleChange} className={inputCls} required>
                <option value="">Select team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Away Team</label>
              <select name="awayTeamId" value={form.awayTeamId} onChange={handleChange} className={inputCls} required>
                <option value="">Select team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
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
              <input type="number" name="totalOvers" value={form.totalOvers} onChange={handleChange} className={inputCls} min={1} max={50} required />
            </div>
          </div>

          <div>
            <label className={labelCls}>Venue (optional)</label>
            <input type="text" name="venue" value={form.venue} onChange={handleChange} className={inputCls} placeholder="e.g. MCG, Melbourne" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Toss Winner</label>
              <select name="tossWinnerId" value={form.tossWinnerId} onChange={handleChange} className={inputCls}>
                <option value="">— TBD —</option>
                {teams.filter((t) => t.id === parseInt(form.homeTeamId) || t.id === parseInt(form.awayTeamId)).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Elected To</label>
              <select name="tossDecision" value={form.tossDecision} onChange={handleChange} className={inputCls}>
                <option value="bat">Bat</option>
                <option value="field">Field</option>
              </select>
            </div>
          </div>

          {teams.length === 0 && (
            <p className="text-yellow-400 font-stats text-sm">
              No teams found. <a href="/admin/teams" className="underline">Create teams first.</a>
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !form.homeTeamId || !form.awayTeamId}
            className="w-full py-3 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Match & Open Scoring'}
          </button>
        </form>
      </div>
    </main>
  )
}
