'use client'

import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'

type Element = 'scorebug' | 'playerCard' | 'wicketAlert' | 'partnership' | 'ticker' | 'summary' | 'header' | 'mostWickets'

const ELEMENTS: { key: Element; label: string }[] = [
  { key: 'header', label: 'Header' },
  { key: 'scorebug', label: 'Scorebug' },
  { key: 'playerCard', label: 'Player Card' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'summary', label: 'Innings Summary' },
  { key: 'mostWickets', label: 'Most Wickets' },
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
  const visibleElements = snapshot.tournamentId
    ? ELEMENTS
    : ELEMENTS.filter(({ key }) => key !== 'mostWickets')

  return (
    <section className="rounded-[1.8rem] border border-[#d7ddd6] bg-white p-4 shadow-[0_18px_45px_rgba(26,36,32,0.06)]">
      <div className="mb-4">
        <p className="app-kicker">Overlay control</p>
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">On-air elements</h3>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {visibleElements.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm font-semibold transition ${
              display[key]
                ? 'border-[#cce8d4] bg-[#eef8f1] text-[#10994c]'
                : 'border-[#e1e7df] bg-[#f8faf7] text-slate-600 hover:bg-white'
            }`}
          >
            {display[key] ? 'On' : 'Off'} . {label}
          </button>
        ))}
      </div>

      <div className="mt-5 border-t border-[#e2e8e1] pt-4">
        <p className="app-kicker !text-slate-400">Quick player cards</p>
        <div className="mt-3 grid gap-2">
          {striker ? (
            <button
              onClick={() => showPlayerCard((striker as { id?: number; playerId?: number }).id ?? (striker as { playerId?: number }).playerId!)}
              className="rounded-[1.2rem] bg-[#eef8f1] px-4 py-3 text-left text-sm font-semibold text-[#10994c]"
            >
              Striker: {'displayName' in striker ? striker.displayName : (striker as { displayName: string }).displayName}
            </button>
          ) : null}
          {nonStriker && nonStriker !== striker ? (
            <button
              onClick={() => showPlayerCard((nonStriker as { id?: number; playerId?: number }).id ?? (nonStriker as { playerId?: number }).playerId!)}
              className="rounded-[1.2rem] bg-[#f8faf7] px-4 py-3 text-left text-sm font-semibold text-slate-700"
            >
              Non-striker: {'displayName' in nonStriker ? nonStriker.displayName : (nonStriker as { displayName: string }).displayName}
            </button>
          ) : null}
          {currentBowler ? (
            <button
              onClick={() => showPlayerCard((currentBowler as { id?: number; playerId?: number }).id ?? (currentBowler as { playerId?: number }).playerId!)}
              className="rounded-[1.2rem] bg-[#eef4fb] px-4 py-3 text-left text-sm font-semibold text-[#2d6fb0]"
            >
              Bowler: {'displayName' in currentBowler ? currentBowler.displayName : (currentBowler as { displayName: string }).displayName}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
