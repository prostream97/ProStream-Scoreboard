'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, X, Check, ChevronDown, ChevronRight, ArrowLeft, Plus } from 'lucide-react'
import type { ScoreDataResponse, DeliveryDetail, InningsDetail } from '@/app/api/match/[matchId]/score-data/route'

type Team = { id: number; name: string; shortCode: string; primaryColor: string }

type Props = {
  initialData: ScoreDataResponse
  homeTeam: Team
  awayTeam: Team
  tournamentId: number | null
  matchStatus: string
  operatorHref: string
}

const EXTRA_TYPES = ['wide', 'noball', 'bye', 'legbye'] as const
const DISMISSAL_TYPES = ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'obstructingfield', 'handledball', 'timedout'] as const

type EditState = {
  runs: number
  extraRuns: number
  extraType: string
  isLegal: boolean
  isBoundary: boolean
  isWicket: boolean
  dismissalType: string
  dismissedBatterId: string
  batsmanId: string
  bowlerId: string
}

function deliveryToEditState(d: DeliveryDetail): EditState {
  return {
    runs: d.runs,
    extraRuns: d.extraRuns,
    extraType: d.extraType ?? '',
    isLegal: d.isLegal,
    isBoundary: false,
    isWicket: d.isWicket,
    dismissalType: d.dismissalType ?? '',
    dismissedBatterId: d.dismissedBatterId != null ? String(d.dismissedBatterId) : '',
    batsmanId: String(d.batsmanId),
    bowlerId: String(d.bowlerId),
  }
}

function ballLabel(d: DeliveryDetail, overDeliveries: DeliveryDetail[]): string {
  if (!d.isLegal) {
    const shortExtraLabels: Record<string, string> = { wide: 'Wd', noball: 'Nb', bye: 'B', legbye: 'Lb' }
    return d.extraType ? shortExtraLabels[d.extraType] ?? 'E' : 'E'
  }
  // Count legal balls up to and including this one
  const legalIdx = overDeliveries.filter((x) => x.isLegal && x.ballNumber <= d.ballNumber).length
  return String(legalIdx)
}

function runsDisplay(d: DeliveryDetail) {
  if (d.isWicket) return <span className="font-bold text-red-600">W{d.runs > 0 ? `+${d.runs}` : ''}</span>
  if (d.runs === 6) return <span className="font-bold text-blue-600">6</span>
  if (d.runs === 4) return <span className="font-bold text-green-600">4</span>
  if (d.extraRuns > 0) return <span className="text-amber-600">{d.runs + d.extraRuns}</span>
  return <span>{d.runs}</span>
}

function oversDisplay(overs: number, balls: number) {
  return `${overs}.${balls}`
}

// ── Delivery Row ──────────────────────────────────────────────────────────────

function DeliveryRow({
  delivery,
  overDeliveries,
  matchId,
  players,
  battingTeamId,
  bowlingTeamId,
  onSaved,
}: {
  delivery: DeliveryDetail
  overDeliveries: DeliveryDetail[]
  matchId: number
  players: ScoreDataResponse['players']
  battingTeamId: number
  bowlingTeamId: number
  onSaved: (updatedInnings: { totalRuns: number; wickets: number; overs: number; balls: number }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState<EditState>(() => deliveryToEditState(delivery))

  const batters = players.filter((p) => p.teamId === battingTeamId)
  const bowlers = players.filter((p) => p.teamId === bowlingTeamId)

  const batsmanName = players.find((p) => p.id === delivery.batsmanId)?.displayName ?? `#${delivery.batsmanId}`
  const bowlerName = players.find((p) => p.id === delivery.bowlerId)?.displayName ?? `#${delivery.bowlerId}`
  const label = ballLabel(delivery, overDeliveries)

  function handleChange(field: keyof EditState, value: string | boolean | number) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      // Auto-derive isLegal
      if (field === 'extraType') {
        next.isLegal = value !== 'wide' && value !== 'noball'
        if (!value) next.extraRuns = 0
      }
      if (field === 'isWicket' && !value) {
        next.dismissalType = ''
        next.dismissedBatterId = ''
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const patch: Record<string, unknown> = {
        runs: form.runs,
        extraRuns: form.extraRuns,
        extraType: form.extraType || null,
        isLegal: form.isLegal,
        isWicket: form.isWicket,
        dismissalType: form.dismissalType || null,
        dismissedBatterId: form.dismissedBatterId ? parseInt(form.dismissedBatterId) : null,
        batsmanId: parseInt(form.batsmanId),
        bowlerId: parseInt(form.bowlerId),
      }

      const res = await fetch(`/api/match/${matchId}/score-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId: delivery.id, patch }),
      })
      const json = await res.json()
      if (!res.ok) {
        setToast(json.error ?? 'Save failed')
        setTimeout(() => setToast(null), 3000)
        return
      }
      onSaved(json.updatedInnings)
      setEditing(false)
      setToast('Saved')
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast('Network error')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm(deliveryToEditState(delivery))
    setEditing(false)
  }

  return (
    <div className={`border-b border-gray-100 last:border-0 ${editing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
      {/* Read-only row */}
      {!editing && (
        <div className="flex items-center gap-3 px-4 py-2 text-sm">
          <span className="w-8 text-center text-xs font-mono font-semibold text-gray-500 shrink-0">{label}</span>
          <span className="w-28 truncate text-gray-700 shrink-0">{batsmanName}</span>
          <span className="w-28 truncate text-gray-500 shrink-0">{bowlerName}</span>
          <span className="w-12 text-center">{runsDisplay(delivery)}</span>
          {delivery.extraType ? (
            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{delivery.extraType}</span>
          ) : <span className="w-12" />}
          {delivery.extraRuns > 0 && (
            <span className="text-xs text-gray-500">+{delivery.extraRuns}e</span>
          )}
          {toast && (
            <span className={`text-xs ml-auto ${toast === 'Saved' ? 'text-green-600' : 'text-red-500'}`}>{toast}</span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="ml-auto p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
            title="Edit delivery"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="px-4 py-3 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Batsman */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Batsman</label>
              <select
                value={form.batsmanId}
                onChange={(e) => handleChange('batsmanId', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white min-w-[140px]"
              >
                {batters.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>

            {/* Bowler */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bowler</label>
              <select
                value={form.bowlerId}
                onChange={(e) => handleChange('bowlerId', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white min-w-[140px]"
              >
                {bowlers.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>

            {/* Runs */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Runs (bat)</label>
              <input
                type="number"
                min={0}
                max={7}
                value={form.runs}
                onChange={(e) => handleChange('runs', parseInt(e.target.value) || 0)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 w-20"
              />
            </div>

            {/* Extra type */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Extra type</label>
              <select
                value={form.extraType}
                onChange={(e) => handleChange('extraType', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
              >
                <option value="">None</option>
                {EXTRA_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Extra runs */}
            {form.extraType && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Extra runs</label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={form.extraRuns}
                  onChange={(e) => handleChange('extraRuns', parseInt(e.target.value) || 0)}
                  className="text-sm border border-gray-300 rounded px-2 py-1.5 w-20"
                />
              </div>
            )}

            {/* Wicket */}
            <div className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                id={`wicket-${delivery.id}`}
                checked={form.isWicket}
                onChange={(e) => handleChange('isWicket', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor={`wicket-${delivery.id}`} className="text-sm text-gray-700">Wicket</label>
            </div>
          </div>

          {/* Wicket details */}
          {form.isWicket && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dismissal type</label>
                <select
                  value={form.dismissalType}
                  onChange={(e) => handleChange('dismissalType', e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
                >
                  <option value="">Select...</option>
                  {DISMISSAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dismissed batter</label>
                <select
                  value={form.dismissedBatterId}
                  onChange={(e) => handleChange('dismissedBatterId', e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white min-w-[140px]"
                >
                  <option value="">Same as batsman</option>
                  {batters.map((p) => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 disabled:opacity-60 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            {toast && (
              <span className={`text-xs self-center ${toast === 'Saved' ? 'text-green-600' : 'text-red-500'}`}>{toast}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Over Section ──────────────────────────────────────────────────────────────

function OverSection({
  over,
  matchId,
  players,
  battingTeamId,
  bowlingTeamId,
  onSaved,
}: {
  over: InningsDetail['oversDetail'][0]
  matchId: number
  players: ScoreDataResponse['players']
  battingTeamId: number
  bowlingTeamId: number
  onSaved: (updatedInnings: { totalRuns: number; wickets: number; overs: number; balls: number }) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          <span className="text-sm font-semibold text-gray-700">{over.overLabel}</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>{over.overRuns} runs</span>
          {over.overWickets > 0 && <span className="text-red-600">{over.overWickets}W</span>}
          <span>{over.deliveries.length} balls</span>
        </div>
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {/* Header */}
          <div className="flex gap-3 px-4 py-1.5 text-xs font-medium text-gray-400 bg-white">
            <span className="w-8 text-center">Ball</span>
            <span className="w-28">Batsman</span>
            <span className="w-28">Bowler</span>
            <span className="w-12 text-center">Runs</span>
            <span>Extra</span>
          </div>
          {over.deliveries.map((d) => (
            <DeliveryRow
              key={d.id}
              delivery={d}
              overDeliveries={over.deliveries}
              matchId={matchId}
              players={players}
              battingTeamId={battingTeamId}
              bowlingTeamId={bowlingTeamId}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add delivery (append to an over) ─────────────────────────────────────────

function emptyAddForm(batters: { id: number }[], bowlers: { id: number }[]): EditState {
  return {
    runs: 0,
    extraRuns: 0,
    extraType: '',
    isLegal: true,
    isBoundary: false,
    isWicket: false,
    dismissalType: '',
    dismissedBatterId: '',
    batsmanId: String(batters[0]?.id ?? ''),
    bowlerId: String(bowlers[0]?.id ?? ''),
  }
}

function AddDeliveryForm({
  matchId,
  inningsId,
  inningsDetail,
  players,
  battingTeamId,
  bowlingTeamId,
  onAdded,
}: {
  matchId: number
  inningsId: number
  inningsDetail: InningsDetail
  players: ScoreDataResponse['players']
  battingTeamId: number
  bowlingTeamId: number
  onAdded: () => void
}) {
  const batters = players.filter((p) => p.teamId === battingTeamId)
  const bowlers = players.filter((p) => p.teamId === bowlingTeamId)
  const maxOverInData = inningsDetail.oversDetail.length
    ? Math.max(...inningsDetail.oversDetail.map((o) => o.overNumber))
    : -1
  const defaultOver = Math.max(0, maxOverInData)

  const [open, setOpen] = useState(false)
  const [overNumber, setOverNumber] = useState(defaultOver)
  const [form, setForm] = useState<EditState>(() => emptyAddForm(batters, bowlers))
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function handleChange(field: keyof EditState, value: string | boolean | number) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'extraType') {
        next.isLegal = value !== 'wide' && value !== 'noball'
        if (!value) next.extraRuns = 0
      }
      if (field === 'isWicket' && !value) {
        next.dismissalType = ''
        next.dismissedBatterId = ''
      }
      return next
    })
  }

  async function handleSubmit() {
    if (!form.batsmanId || !form.bowlerId) {
      setToast('Choose batsman and bowler')
      return
    }
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch(`/api/match/${matchId}/score-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inningsId,
          overNumber,
          batsmanId: parseInt(form.batsmanId, 10),
          bowlerId: parseInt(form.bowlerId, 10),
          runs: form.runs,
          extraRuns: form.extraRuns,
          isLegal: form.isLegal,
          extraType: form.extraType || null,
          isBoundary: form.isBoundary,
          isWicket: form.isWicket,
          dismissalType: form.dismissalType || null,
          dismissedBatterId: form.dismissedBatterId ? parseInt(form.dismissedBatterId, 10) : null,
          fielder1Id: null,
          fielder2Id: null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setToast(json.error ?? 'Failed to add')
        return
      }
      setForm(emptyAddForm(batters, bowlers))
      setOpen(false)
      onAdded()
      setToast('Delivery added')
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast('Network error')
    } finally {
      setSaving(false)
    }
  }

  const overOptions: number[] = []
  const maxOpt = Math.max(defaultOver + 1, 0)
  for (let o = 0; o <= maxOpt; o++) overOptions.push(o)

  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <Plus className="h-4 w-4" />
        {open ? 'Hide' : 'Add'} delivery (appends next ball in the chosen over)
      </button>
      {toast && <p className="text-xs mt-2 text-green-600">{toast}</p>}
      {open && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Over (0 = 1st over)</label>
            <select
              value={overNumber}
              onChange={(e) => setOverNumber(parseInt(e.target.value, 10))}
              className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
            >
              {overOptions.map((o) => (
                <option key={o} value={o}>
                  Over {o + 1}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              The new ball is appended after existing balls in this over (wide/no-ball use the next index automatically).
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Batsman</label>
              <select
                value={form.batsmanId}
                onChange={(e) => handleChange('batsmanId', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white min-w-[140px]"
              >
                {batters.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bowler</label>
              <select
                value={form.bowlerId}
                onChange={(e) => handleChange('bowlerId', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white min-w-[140px]"
              >
                {bowlers.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Runs (bat)</label>
              <input
                type="number"
                min={0}
                max={7}
                value={form.runs}
                onChange={(e) => handleChange('runs', parseInt(e.target.value) || 0)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Extra type</label>
              <select
                value={form.extraType}
                onChange={(e) => handleChange('extraType', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
              >
                <option value="">None</option>
                {EXTRA_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {form.extraType ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Extra runs</label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={form.extraRuns}
                  onChange={(e) => handleChange('extraRuns', parseInt(e.target.value) || 0)}
                  className="text-sm border border-gray-300 rounded px-2 py-1.5 w-20"
                />
              </div>
            ) : null}
            <div className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                id="add-wicket"
                checked={form.isWicket}
                onChange={(e) => handleChange('isWicket', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="add-wicket" className="text-sm text-gray-700">Wicket</label>
            </div>
          </div>

          {form.isWicket ? (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dismissal type</label>
                <select
                  value={form.dismissalType}
                  onChange={(e) => handleChange('dismissalType', e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
                >
                  <option value="">Select...</option>
                  {DISMISSAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dismissed batter</label>
                <select
                  value={form.dismissedBatterId}
                  onChange={(e) => handleChange('dismissedBatterId', e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white min-w-[140px]"
                >
                  <option value="">Same as batsman</option>
                  {batters.map((p) => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Add delivery'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Client ───────────────────────────────────────────────────────────────

export function ScoreEditorClient({ initialData, homeTeam, awayTeam, tournamentId, matchStatus, operatorHref }: Props) {
  const [data, setData] = useState<ScoreDataResponse>(initialData)
  const [activeInningsIdx, setActiveInningsIdx] = useState(0)

  const activeInnings = data.innings[activeInningsIdx]

  const battingTeam = activeInnings?.battingTeamId === homeTeam.id ? homeTeam : awayTeam
  const bowlingTeam = activeInnings?.bowlingTeamId === homeTeam.id ? homeTeam : awayTeam

  async function reloadScoreData() {
    const res = await fetch(`/api/match/${data.match.id}/score-data`)
    if (!res.ok) return
    const json: ScoreDataResponse = await res.json()
    setData(json)
  }

  function handleSaved(
    inningsIdx: number,
    updatedTotals: { totalRuns: number; wickets: number; overs: number; balls: number },
  ) {
    setData((d) => ({
      ...d,
      innings: d.innings.map((inn, i) =>
        i === inningsIdx ? { ...inn, ...updatedTotals } : inn,
      ),
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={tournamentId ? `/admin/tournaments/${tournamentId}` : '/admin/tournaments'}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                <span style={{ color: homeTeam.primaryColor }}>{homeTeam.shortCode}</span>
                <span className="mx-2 text-gray-300">vs</span>
                <span style={{ color: awayTeam.primaryColor }}>{awayTeam.shortCode}</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {matchStatus === 'complete'
                  ? 'Score editor — finished match'
                  : `Correct past deliveries — live match (${matchStatus}). Saving updates totals and refreshes the operator view and overlays.`}
              </p>
              {matchStatus !== 'complete' ? (
                <Link
                  href={operatorHref}
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  Back to operator scoring
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Innings tabs */}
        <div className="flex gap-1 mb-4 bg-gray-200 rounded-lg p-1 w-fit">
          {data.innings.map((inn, i) => {
            const team = inn.battingTeamId === homeTeam.id ? homeTeam : awayTeam
            return (
              <button
                key={inn.id}
                onClick={() => setActiveInningsIdx(i)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeInningsIdx === i
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Innings {inn.inningsNumber} — {team.shortCode}
              </button>
            )
          })}
        </div>

        {activeInnings && (
          <>
            {/* Innings totals bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-8">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Batting</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: battingTeam.primaryColor }}>
                  {battingTeam.shortCode}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Score</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {activeInnings.totalRuns}/{activeInnings.wickets}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Overs</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {oversDisplay(activeInnings.overs, activeInnings.balls)}
                </p>
              </div>
              <div className="ml-auto self-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Bowling</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: bowlingTeam.primaryColor }}>
                  {bowlingTeam.shortCode}
                </p>
              </div>
            </div>

            <AddDeliveryForm
              matchId={data.match.id}
              inningsId={activeInnings.id}
              inningsDetail={activeInnings}
              players={data.players}
              battingTeamId={activeInnings.battingTeamId}
              bowlingTeamId={activeInnings.bowlingTeamId}
              onAdded={reloadScoreData}
            />

            {/* Overs list */}
            {activeInnings.oversDetail.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8 bg-white rounded-xl border border-gray-200">
                No deliveries recorded for this innings.
              </div>
            ) : (
              activeInnings.oversDetail.map((over) => (
                <OverSection
                  key={over.overNumber}
                  over={over}
                  matchId={data.match.id}
                  players={data.players}
                  battingTeamId={activeInnings.battingTeamId}
                  bowlingTeamId={activeInnings.bowlingTeamId}
                  onSaved={(totals) => handleSaved(activeInningsIdx, totals)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
