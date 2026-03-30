'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useMatchStore } from '@/store/matchStore'
import { ImageUpload } from '@/components/shared/ImageUpload'
import type { PlayerSummary } from '@/types/match'
import type { PlayerRole, BattingStyle, BowlingStyle } from '@/types/player'

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: 'batsman', label: 'Batsman' },
  { value: 'bowler', label: 'Bowler' },
  { value: 'allrounder', label: 'All-rounder' },
  { value: 'keeper', label: 'Wicket-keeper' },
]

const BATTING_STYLES: { value: BattingStyle; label: string }[] = [
  { value: 'right-hand', label: 'Right-hand' },
  { value: 'left-hand', label: 'Left-hand' },
]

const BOWLING_STYLES: { value: BowlingStyle; label: string }[] = [
  { value: 'right-arm-fast', label: 'Right-arm Fast' },
  { value: 'right-arm-medium', label: 'Right-arm Medium' },
  { value: 'right-arm-offbreak', label: 'Right-arm Off-break' },
  { value: 'right-arm-legbreak', label: 'Right-arm Leg-break' },
  { value: 'left-arm-fast', label: 'Left-arm Fast' },
  { value: 'left-arm-medium', label: 'Left-arm Medium' },
  { value: 'left-arm-orthodox', label: 'Left-arm Orthodox' },
  { value: 'left-arm-chinaman', label: 'Left-arm Chinaman' },
]

export function PlayerEditModal() {
  const isOpen = useUIStore((s) => s.isPlayerEditOpen)
  const ctx = useUIStore((s) => s.editingPlayerCtx)
  const closePlayerEdit = useUIStore((s) => s.closePlayerEdit)
  const snapshot = useMatchStore((s) => s.snapshot)
  const updatePlayerInSquad = useMatchStore((s) => s.updatePlayerInSquad)
  const addPlayerToSquad = useMatchStore((s) => s.addPlayerToSquad)

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<PlayerRole>('batsman')
  const [battingStyle, setBattingStyle] = useState<BattingStyle | ''>('')
  const [bowlingStyle, setBowlingStyle] = useState<BowlingStyle | ''>('')
  const [headshotCloudinaryId, setHeadshotCloudinaryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = ctx?.playerId != null

  // Pre-fill form when editing an existing player
  useEffect(() => {
    if (!isOpen || !ctx || !snapshot) return
    if (!ctx.playerId) {
      // Add mode — blank form
      setName('')
      setDisplayName('')
      setRole('batsman')
      setBattingStyle('')
      setBowlingStyle('')
      setHeadshotCloudinaryId(null)
      setError(null)
      return
    }
    const allPlayers = [
      ...snapshot.battingTeamPlayers,
      ...snapshot.bowlingTeamPlayers,
    ]
    const p = allPlayers.find((pl) => pl.id === ctx.playerId)
    if (p) {
      setName(p.name)
      setDisplayName(p.displayName)
      setRole(p.role as PlayerRole)
      setBattingStyle((p.battingStyle as BattingStyle) ?? '')
      setBowlingStyle((p.bowlingStyle as BowlingStyle) ?? '')
      setHeadshotCloudinaryId(p.headshotCloudinaryId ?? null)
    }
    setError(null)
  }, [isOpen, ctx, snapshot])

  if (!isOpen || !ctx) return null

  async function handleSave() {
    if (!ctx) return
    if (!name.trim() || !displayName.trim()) {
      setError('Name and display name are required.')
      return
    }
    setSaving(true)
    setError(null)

    const body = {
      name: name.trim(),
      displayName: displayName.trim(),
      role,
      battingStyle: battingStyle || null,
      bowlingStyle: bowlingStyle || null,
      headshotCloudinaryId,
    }

    try {
      if (isEditMode) {
        // PATCH existing player
        const res = await fetch(`/api/teams/${ctx.teamId}/players/${ctx.playerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to update player')
        const updated: PlayerSummary = await res.json()
        updatePlayerInSquad(ctx.teamId, ctx.playerId!, updated)
      } else {
        // POST new player
        const res = await fetch(`/api/teams/${ctx.teamId}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to add player')
        const created: PlayerSummary = await res.json()
        addPlayerToSquad(ctx.teamId, created)
      }
      closePlayerEdit()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) closePlayerEdit() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-stats font-semibold text-white text-lg">
            {isEditMode ? 'Edit Player' : 'Add Player'}
          </h2>
          <button
            onClick={closePlayerEdit}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Headshot */}
          <ImageUpload
            value={headshotCloudinaryId}
            onChange={(id) => setHeadshotCloudinaryId(id)}
            folder="player-headshots"
            label="Player Photo"
            previewShape="circle"
            id={`player-photo-${ctx?.playerId ?? 'new'}`}
          />

          {/* Display Name — most commonly edited, shown first */}
          <div>
            <label className="font-stats text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-stats text-sm focus:outline-none focus:border-primary"
              placeholder="Short name shown on overlay"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="font-stats text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-stats text-sm focus:outline-none focus:border-primary"
              placeholder="Full player name"
            />
          </div>

          {/* Role */}
          <div>
            <label className="font-stats text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as PlayerRole)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-stats text-sm focus:outline-none focus:border-primary"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Batting Style */}
          <div>
            <label className="font-stats text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Batting Style
            </label>
            <select
              value={battingStyle}
              onChange={(e) => setBattingStyle(e.target.value as BattingStyle | '')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-stats text-sm focus:outline-none focus:border-primary"
            >
              <option value="">— Not specified</option>
              {BATTING_STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Bowling Style */}
          <div>
            <label className="font-stats text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Bowling Style
            </label>
            <select
              value={bowlingStyle}
              onChange={(e) => setBowlingStyle(e.target.value as BowlingStyle | '')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-stats text-sm focus:outline-none focus:border-primary"
            >
              <option value="">— Not specified</option>
              {BOWLING_STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-3 font-stats text-xs text-red-400">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={closePlayerEdit}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-primary text-white font-stats font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Player'}
          </button>
        </div>
      </div>
    </div>
  )
}
