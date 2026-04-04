'use client'

import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'

type Element = 'scorebug' | 'playerCard' | 'wicketAlert' | 'partnership' | 'ticker'

const ELEMENTS: { key: Element; label: string }[] = [
  { key: 'scorebug', label: 'Scorebug' },
  { key: 'playerCard', label: 'Player Card' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'ticker', label: 'Ticker' },
]

export function OverlayPanel() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const display = useUIStore((s) => s.display)
  const setDisplay = useUIStore((s) => s.setDisplay)

  if (!snapshot) return null

  async function toggle(element: Element) {
    if (!snapshot) return
    const newVisible = !display[element]
    setDisplay(element, newVisible)

    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot.matchId,
        event: 'display.toggle',
        payload: { element, visible: newVisible },
      }),
    })
  }

  async function showPlayerCard(playerId: number) {
    if (!snapshot) return
    setDisplay('playerCard', true)
    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot.matchId,
        event: 'display.toggle',
        payload: { element: 'playerCard', visible: true, playerId },
      }),
    })
  }

  const striker = snapshot.batters.find((b) => b.playerId === snapshot.strikerId)
    ?? snapshot.battingTeamPlayers.find((p) => p.id === snapshot.strikerId)
  const nonStriker = snapshot.batters.find((b) => b.playerId === snapshot.nonStrikerId)
    ?? snapshot.battingTeamPlayers.find((p) => p.id === snapshot.nonStrikerId)
  const currentBowler = snapshot.bowlers.find((b) => b.isCurrent)
    ?? snapshot.bowlingTeamPlayers.find((p) => p.id === snapshot.currentBowlerId)

  return (
    <div className="bg-gray-900 rounded-xl p-4 h-full flex flex-col gap-4 overflow-hidden">
      <p className="font-stats text-xs text-gray-500 uppercase tracking-wider">Overlays</p>

      {/* Toggle buttons */}
      <div className="flex flex-col gap-2">
        {ELEMENTS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`px-3 py-2 font-stats text-xs rounded-lg border transition-colors text-left ${
              display[key]
                ? 'bg-accent/20 border-accent text-accent'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {display[key] ? '●' : '○'} {label}
          </button>
        ))}
      </div>

      {/* Quick player card section */}
      <div className="border-t border-gray-800 pt-3 flex flex-col gap-2">
        <span className="font-stats text-xs text-gray-600">Show card:</span>
        {striker && (
          <button
            onClick={() => showPlayerCard(
              (striker as { id?: number; playerId?: number }).id
                ?? (striker as { playerId?: number }).playerId!
            )}
            className="px-3 py-2 bg-secondary/10 border border-secondary/40 text-secondary font-stats text-xs rounded-lg hover:bg-secondary/20 transition-colors text-left"
          >
            * {'displayName' in striker ? striker.displayName : (striker as { displayName: string }).displayName}
          </button>
        )}
        {nonStriker && nonStriker !== striker && (
          <button
            onClick={() => showPlayerCard(
              (nonStriker as { id?: number; playerId?: number }).id
                ?? (nonStriker as { playerId?: number }).playerId!
            )}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-xs rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            {'displayName' in nonStriker ? nonStriker.displayName : (nonStriker as { displayName: string }).displayName}
          </button>
        )}
        {currentBowler && (
          <button
            onClick={() => showPlayerCard(
              (currentBowler as { id?: number; playerId?: number }).id
                ?? (currentBowler as { playerId?: number }).playerId!
            )}
            className="px-3 py-2 bg-primary/10 border border-primary/40 text-primary font-stats text-xs rounded-lg hover:bg-primary/20 transition-colors text-left"
          >
            ▶ {'displayName' in currentBowler ? currentBowler.displayName : (currentBowler as { displayName: string }).displayName}
          </button>
        )}
      </div>
    </div>
  )
}
