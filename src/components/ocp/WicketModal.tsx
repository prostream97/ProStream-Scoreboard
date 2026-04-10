'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import type { DismissalType } from '@/types/match'

type Step = 'dismissal' | 'fielder' | 'batsman'

type DismissalOption = {
  type: DismissalType
  label: string
  needsFielder: boolean
  fielderCount: number
  color: string
}

const DISMISSALS: DismissalOption[] = [
  { type: 'bowled',           label: 'Bowled',             needsFielder: false, fielderCount: 0, color: 'bg-red-600/20 border-red-600 text-red-300' },
  { type: 'caught',           label: 'Caught',             needsFielder: true,  fielderCount: 1, color: 'bg-orange-600/20 border-orange-600 text-orange-300' },
  { type: 'lbw',              label: 'LBW',                needsFielder: false, fielderCount: 0, color: 'bg-red-600/20 border-red-600 text-red-300' },
  { type: 'runout',           label: 'Run Out',            needsFielder: true,  fielderCount: 2, color: 'bg-yellow-600/20 border-yellow-600 text-yellow-300' },
  { type: 'stumped',          label: 'Stumped',            needsFielder: true,  fielderCount: 1, color: 'bg-purple-600/20 border-purple-600 text-purple-300' },
  { type: 'hitwicket',        label: 'Hit Wicket',         needsFielder: false, fielderCount: 0, color: 'bg-red-600/20 border-red-600 text-red-300' },
  { type: 'obstructingfield', label: 'Obstructing Field',  needsFielder: false, fielderCount: 0, color: 'bg-gray-600/20 border-gray-600 text-gray-300' },
  { type: 'handledball',      label: 'Handled Ball',       needsFielder: false, fielderCount: 0, color: 'bg-gray-600/20 border-gray-600 text-gray-300' },
  { type: 'timedout',         label: 'Timed Out',          needsFielder: false, fielderCount: 0, color: 'bg-gray-600/20 border-gray-600 text-gray-300' },
]

export function WicketModal() {
  const isOpen = useUIStore((s) => s.isWicketModalOpen)
  const closeWicketModal = useUIStore((s) => s.closeWicketModal)

  const snapshot = useMatchStore((s) => s.snapshot)
  const recordWicket = useMatchStore((s) => s.recordWicket)

  const [step, setStep] = useState<Step>('dismissal')
  const [selectedDismissal, setSelectedDismissal] = useState<DismissalOption | null>(null)
  const [fielder1Id, setFielder1Id] = useState<number | null>(null)
  const [fielder2Id, setFielder2Id] = useState<number | null>(null)
  const [runs, setRuns] = useState(0)
  const [dismissedBatterId, setDismissedBatterId] = useState<number | null>(null)

  if (!isOpen || !snapshot) return null
  const matchSnapshot = snapshot

  const bowlingPlayers = matchSnapshot.bowlingTeamPlayers
  const battingPlayers = matchSnapshot.battingTeamPlayers

  // Remaining batters (not currently in, not already out)
  const battedIds = new Set(matchSnapshot.batters.filter((b) => b.isOut || b.playerId === matchSnapshot.strikerId || b.playerId === matchSnapshot.nonStrikerId).map((b) => b.playerId))
  const remainingBatters = battingPlayers.filter((p) => !battedIds.has(p.id))

  function reset() {
    setStep('dismissal')
    setSelectedDismissal(null)
    setFielder1Id(null)
    setFielder2Id(null)
    setRuns(0)
    setDismissedBatterId(null)
  }

  function handleClose() {
    reset()
    closeWicketModal()
  }

  function handleDismissalSelect(d: DismissalOption) {
    setSelectedDismissal(d)
    setDismissedBatterId(matchSnapshot.strikerId)
    if (d.needsFielder) {
      setStep('fielder')
    } else {
      setStep('batsman')
    }
  }

  function handleFielderDone() {
    if (selectedDismissal!.fielderCount === 1 && !fielder1Id) return
    setStep('batsman')
  }

  async function handleBatsmanSelect(nextBatsmanId: number | null) {
    if (!selectedDismissal || !matchSnapshot.strikerId) return

    const selectedDismissedBatterId = selectedDismissal.type === 'runout'
      ? dismissedBatterId
      : matchSnapshot.strikerId

    if (!selectedDismissedBatterId) return

    await recordWicket({
      runs,
      dismissalType: selectedDismissal.type,
      dismissedBatterId: selectedDismissedBatterId,
      incomingBatterId: nextBatsmanId,
      fielder1Id,
      fielder2Id,
    })

    reset()
    closeWicketModal()
    // Prompt for new bowler only if it was the last ball of an over (handled in OCPLayout)
  }

  const dismissalInfo = selectedDismissal

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="font-display text-2xl text-red-400 tracking-wider">WICKET</h2>
            <div className="flex gap-2 mt-1">
              {(['dismissal', 'fielder', 'batsman'] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={`h-1 w-8 rounded-full transition-colors ${
                    step === s
                      ? 'bg-red-500'
                      : ['dismissal', 'fielder', 'batsman'].indexOf(step) > i
                      ? 'bg-gray-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-white font-stats text-2xl leading-none">×</button>
        </div>

        <div className="p-6">
          {/* ── Step 1: Dismissal Type ── */}
          {step === 'dismissal' && (
            <div>
              <p className="font-stats text-sm text-gray-400 mb-4">How was the batsman dismissed?</p>

              {/* Runs off the wicket delivery */}
              <div className="flex items-center gap-3 mb-4">
                <span className="font-stats text-sm text-gray-400">Runs scored:</span>
                {[0, 1, 2, 3, 4].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRuns(r)}
                    className={`w-9 h-9 rounded-lg font-stats font-semibold text-sm transition-colors ${
                      runs === r
                        ? 'bg-primary text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {DISMISSALS.map((d) => (
                  <button
                    key={d.type}
                    onClick={() => handleDismissalSelect(d)}
                    className={`py-3 px-2 rounded-lg border font-stats text-sm font-semibold transition-all hover:opacity-90 ${d.color}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Fielder Selection ── */}
          {step === 'fielder' && dismissalInfo && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep('dismissal')} className="text-gray-500 hover:text-white font-stats text-sm">← Back</button>
                <span className="font-stats text-sm text-gray-300">{dismissalInfo.label}</span>
              </div>

              <p className="font-stats text-sm text-gray-400 mb-3">
                {dismissalInfo.type === 'caught' ? 'Caught by:' :
                 dismissalInfo.type === 'stumped' ? 'Stumped by (keeper):' :
                 'Fielder(s) involved:'}
              </p>

              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                {bowlingPlayers.map((p) => {
                  const isF1 = fielder1Id === p.id
                  const isF2 = fielder2Id === p.id

                  function toggle() {
                    if (dismissalInfo!.fielderCount === 1) {
                      setFielder1Id(isF1 ? null : p.id)
                    } else {
                      if (isF1) { setFielder1Id(null) }
                      else if (isF2) { setFielder2Id(null) }
                      else if (!fielder1Id) { setFielder1Id(p.id) }
                      else if (!fielder2Id) { setFielder2Id(p.id) }
                    }
                  }

                  return (
                    <button
                      key={p.id}
                      onClick={toggle}
                      className={`w-full text-left px-4 py-2.5 rounded-lg font-stats text-sm transition-colors ${
                        isF1 || isF2
                          ? 'bg-primary/30 border border-primary text-white'
                          : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {p.displayName}
                      {isF1 && <span className="ml-2 text-xs text-primary">{dismissalInfo.fielderCount > 1 ? '(1st)' : ''}</span>}
                      {isF2 && <span className="ml-2 text-xs text-accent">(2nd)</span>}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleFielderDone}
                disabled={dismissalInfo.fielderCount === 1 && !fielder1Id}
                className="mt-4 w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next: Select Incoming Batsman
              </button>
            </div>
          )}

          {/* ── Step 3: Next Batsman ── */}
          {step === 'batsman' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setStep(dismissalInfo?.needsFielder ? 'fielder' : 'dismissal')}
                  className="text-gray-500 hover:text-white font-stats text-sm"
                >
                  ← Back
                </button>
                <span className="font-stats text-sm text-gray-300">
                  {dismissalInfo?.label}
                  {fielder1Id && ` · ${bowlingPlayers.find(p => p.id === fielder1Id)?.displayName}`}
                </span>
              </div>

              <p className="font-stats text-sm text-gray-400 mb-3">Incoming batsman:</p>

              {dismissalInfo?.type === 'runout' && (
                <div className="mb-4">
                  <p className="font-stats text-sm text-gray-400 mb-2">Who is out?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: matchSnapshot.strikerId, label: 'Striker' },
                      { id: matchSnapshot.nonStrikerId, label: 'Non-striker' },
                    ]
                      .filter((option): option is { id: number; label: string } => option.id != null)
                      .map((option) => {
                        const player = battingPlayers.find((p) => p.id === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => setDismissedBatterId(option.id)}
                            className={`rounded-lg border px-3 py-2 text-left font-stats text-sm transition-colors ${
                              dismissedBatterId === option.id
                                ? 'border-primary bg-primary/20 text-white'
                                : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            <div>{option.label}</div>
                            <div className="text-xs text-gray-500">{player?.displayName ?? 'Unknown player'}</div>
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}

              {remainingBatters.length === 0 ? (
                <div className="text-center py-6">
                  <p className="font-stats text-gray-400 mb-2">All Out!</p>
                  <p className="font-stats text-sm text-gray-500">No batsmen remaining</p>
                  <button
                    onClick={() => handleBatsmanSelect(null)}
                    className="mt-4 px-6 py-2.5 bg-red-600 text-white font-stats font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Confirm — Innings Over
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                  {remainingBatters.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleBatsmanSelect(p.id)}
                      className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-primary/20 hover:border-primary font-stats text-sm transition-colors"
                    >
                      {p.displayName}
                      <span className="ml-2 text-xs text-gray-500">{p.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
