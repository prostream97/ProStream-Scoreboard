'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { DollarSign, Save, Settings } from 'lucide-react'
import { AdminNav } from './AdminNav'
import { AppButton, AppPage, PageHeader, SurfaceCard, appInputClass, appLabelClass } from '@/components/shared/AppPrimitives'

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

  return (
    <AppPage className="max-w-5xl">
      <PageHeader
        eyebrow="Admin panel"
        title="Pricing and operator wallet policy"
        description="Set the credit cost for overlay generation without changing any backend behavior."
      />

      <AdminNav active="pricing" />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f7ee] text-[#10994c]">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Overlay pricing</h2>
              <p className="text-sm text-slate-500">Charges applied when operators generate a fresh overlay URL.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={appLabelClass}>Match Overlay (LKR)</label>
              <input
                type="number"
                min={0}
                value={matchPrice}
                onChange={(e) => setMatchPrice(e.target.value)}
                className={appInputClass}
              />
            </div>
            <div>
              <label className={appLabelClass}>Tournament Overlay (LKR)</label>
              <input
                type="number"
                min={0}
                value={tournamentPrice}
                onChange={(e) => setTournamentPrice(e.target.value)}
                className={appInputClass}
              />
            </div>
          </div>

          <AppButton onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Pricing'}
          </AppButton>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#2d6fb0]">
            <Settings className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Usage notes</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>Operators are charged when creating a new overlay URL.</li>
            <li>Admins remain unrestricted.</li>
            <li>Existing API routes and wallet flows remain unchanged.</li>
          </ul>
        </SurfaceCard>
      </div>
    </AppPage>
  )
}
