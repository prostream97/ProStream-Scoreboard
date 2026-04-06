'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'

export function BowlerSelect() {
  const isOpen = useUIStore((s) => s.isBowlerSelectOpen)
  const closeBowlerSelect = useUIStore((s) => s.closeBowlerSelect)

  const snapshot = useMatchStore((s) => s.snapshot)
  const setBowler = useMatchStore((s) => s.setBowler)
  const setStriker = useMatchStore((s) => s.setStriker)
  const setNonStriker = useMatchStore((s) => s.setNonStriker)
  const startNextOver = useMatchStore((s) => s.startNextOver)

  const [selectedBowlerId, setSelectedBowlerId] = useState<number | null>(null)
  const [selectedStrikerId, setSelectedStrikerId] = useState<number | null>(null)
  const [selectedNonStrikerId, setSelectedNonStrikerId] = useState<number | null>(null)

  if (!isOpen || !snapshot) return null

  // isInningsStart: true only when openers haven't been chosen yet (not after every over)
  const isInningsStart = !snapshot.strikerId && !snapshot.nonStrikerId

  // Can't bowl consecutive overs
  const lastBowlerId = isInningsStart ? null : snapshot.currentBowlerId
  const bowlerList = snapshot.bowlingTeamPlayers.filter((p) => p.id !== lastBowlerId)
  const battingList = snapshot.battingTeamPlayers

  const canConfirm = isInningsStart
    ? selectedBowlerId && selectedStrikerId && selectedNonStrikerId && selectedStrikerId !== selectedNonStrikerId
    : !!selectedBowlerId

  async function handleConfirm() {
    if (!selectedBowlerId || !snapshot) return

    const newStrikerId = isInningsStart ? selectedStrikerId : snapshot.strikerId
    const newNonStrikerId = isInningsStart ? selectedNonStrikerId : snapshot.nonStrikerId

    // startNextOver() must run BEFORE setBowler(). startNextOver increments the over counter and
    // resets currentBowlerId to null. setBowler then writes to the already-advanced snapshot.
    // Both are synchronous Zustand mutations — this ordering is intentional and safe.
    if (!isInningsStart) {
      startNextOver()
    }

    if (isInningsStart && selectedStrikerId && selectedNonStrikerId) {
      setStriker(selectedStrikerId)
      setNonStriker(selectedNonStrikerId)
    }

    setBowler(selectedBowlerId)

    // Persist to DB so players survive page refresh
    try {
      const res = await fetch(`/api/match/${snapshot.matchId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strikerId: newStrikerId,
          nonStrikerId: newNonStrikerId,
          currentBowlerId: selectedBowlerId,
        }),
      })
      if (!res.ok) console.error('[BowlerSelect] Failed to persist state to DB:', res.status)
    } catch (err) {
      console.error('[BowlerSelect] Failed to persist state to DB:', err)
    }

    setSelectedBowlerId(null)
    setSelectedStrikerId(null)
    setSelectedNonStrikerId(null)
    closeBowlerSelect()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="font-display text-2xl text-accent tracking-wider">
            {isInningsStart ? 'START INNINGS' : 'OVER COMPLETE'}
          </h2>
          <p className="font-stats text-sm text-gray-400 mt-1">
            {isInningsStart
              ? 'Set opening batsmen and bowler'
              : `Over ${snapshot.currentOver + 1} — Select next bowler`}
          </p>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Opening batsmen — only shown at innings start */}
          {isInningsStart && (
            <>
              <div>
                <p className="font-stats text-xs text-gray-400 uppercase tracking-wider mb-2">Striker (facing)</p>
                <div className="space-y-1.5">
                  {battingList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (selectedNonStrikerId === p.id) setSelectedNonStrikerId(null)
                        setSelectedStrikerId(p.id)
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border font-stats text-sm transition-colors ${
                        selectedStrikerId === p.id
                          ? 'bg-secondary/20 border-secondary text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {selectedStrikerId === p.id && <span className="mr-2 text-secondary">*</span>}
                      {p.displayName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-stats text-xs text-gray-400 uppercase tracking-wider mb-2">Non-Striker</p>
                <div className="space-y-1.5">
                  {battingList.filter((p) => p.id !== selectedStrikerId).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedNonStrikerId(p.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border font-stats text-sm transition-colors ${
                        selectedNonStrikerId === p.id
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {p.displayName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4" />
            </>
          )}

          {/* Bowler */}
          <div>
            <p className="font-stats text-xs text-gray-400 uppercase tracking-wider mb-2">Bowler</p>
            <div className="space-y-1.5">
              {bowlerList.map((p) => {
                const stats = snapshot.bowlers.find((b) => b.playerId === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedBowlerId(p.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border font-stats transition-colors ${
                      selectedBowlerId === p.id
                        ? 'bg-accent/20 border-accent text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{p.displayName}</span>
                      {stats && (
                        <span className="text-xs text-gray-400">
                          {stats.overs}.{stats.balls}–{stats.runs}–{stats.wickets}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{p.role}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full py-3 bg-accent text-white font-stats font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isInningsStart ? 'Start Play' : 'Confirm Bowler'}
          </button>
        </div>
      </div>
    </div>
  )
}
