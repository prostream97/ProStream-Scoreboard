'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Settings, DollarSign, Save } from 'lucide-react'
import { AdminNav } from './AdminNav'

type Props = {
  initialPricing: Record<string, number>
}

export function PricingClient({ initialPricing }: Props) {
  const [matchPrice, setMatchPrice] = useState(String(initialPricing.overlay_per_match ?? 100))
  const [tournamentPrice, setTournamentPrice] = useState(
    String(initialPricing.overlay_per_tournament ?? 500),
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overlay_per_match: parseInt(matchPrice, 10),
          overlay_per_tournament: parseInt(tournamentPrice, 10),
        }),
      })
      if (res.ok) {
        toast.success('Pricing updated')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to save')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm'
  const labelCls = 'block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider'

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl text-primary tracking-wider">Admin Panel</h1>
            <p className="font-stats text-sm text-gray-500">Manage users, access, and pricing</p>
          </div>
        </div>

        <AdminNav active="pricing" />

        {/* Pricing Card */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h2 className="font-stats font-semibold text-gray-300 text-sm uppercase tracking-wider">
              Overlay Pricing (LKR)
            </h2>
          </div>
          <p className="text-xs font-stats text-gray-500">
            Set the LKR cost charged to operators when generating a new overlay URL.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Match Overlay (LKR)</label>
              <input
                type="number"
                min={0}
                value={matchPrice}
                onChange={(e) => setMatchPrice(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Tournament Overlay (LKR)</label>
              <input
                type="number"
                min={0}
                value={tournamentPrice}
                onChange={(e) => setTournamentPrice(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Pricing'}
          </button>
        </div>
      </div>
    </main>
  )
}
