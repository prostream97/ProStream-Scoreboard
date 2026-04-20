'use client'

import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'

type Element = 'scorebug' | 'playerCard' | 'wicketAlert' | 'partnership' | 'tossResult' | 'mostWickets' | 'mostBoundaries' | 'matchSummary'

const ELEMENTS: { key: Element; label: string }[] = [
  { key: 'scorebug', label: 'Scorebug' },
  { key: 'playerCard', label: 'Player Card' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'tossResult', label: 'Toss Result' },
  { key: 'mostWickets', label: 'Most Wickets' },
  { key: 'mostBoundaries', label: 'Most Boundaries' },
  { key: 'matchSummary', label: 'Match Summary' },
]

export function DisplayControls() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const display = useUIStore((s) => s.display)
  const setDisplay = useUIStore((s) => s.setDisplay)
  const showTeamSummary = useUIStore((s) => s.showTeamSummary)
  const hideTeamSummary = useUIStore((s) => s.hideTeamSummary)
  const activeSummaryView = useUIStore((s) => s.activeSummaryView)
  const showTeamSquad = useUIStore((s) => s.showTeamSquad)
  const hideTeamSquad = useUIStore((s) => s.hideTeamSquad)

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
          payload: { element, visible: newVisible, themeScope: 'all' },
        }),
      })
  }

  async function toggleBattingSummary() {
    if (!snapshot) return
    const battingTeamId = snapshot.currentInningsState?.battingTeamId
    if (!battingTeamId) return
    const newVisible = !(display.teamSummary && activeSummaryView === 'batting')
    if (newVisible) {
      showTeamSummary(battingTeamId, 'batting')
    } else {
      hideTeamSummary()
    }
    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot.matchId,
        event: 'display.toggle',
        payload: { element: 'teamSummary', visible: newVisible, summaryView: 'batting', summaryTeamId: battingTeamId, themeScope: 'all' },
      }),
    })
  }

  async function toggleBowlingSummary() {
    if (!snapshot) return
    const bowlingTeamId = snapshot.currentInningsState?.bowlingTeamId
    if (!bowlingTeamId) return
    const newVisible = !(display.teamSummary && activeSummaryView === 'bowling')
    if (newVisible) {
      showTeamSummary(bowlingTeamId, 'bowling')
    } else {
      hideTeamSummary()
    }
    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot.matchId,
        event: 'display.toggle',
        payload: { element: 'teamSummary', visible: newVisible, summaryView: 'bowling', summaryTeamId: bowlingTeamId, themeScope: 'all' },
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
    : ELEMENTS.filter(({ key }) => key !== 'mostWickets' && key !== 'mostBoundaries')

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-6 py-3">
      <p className="font-stats text-xs text-gray-500 uppercase tracking-wider mb-3">Overlays</p>
      <div className="flex flex-wrap gap-2">
        {/* Toggle buttons */}
        {visibleElements.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`px-3 py-1.5 font-stats text-xs rounded-lg border transition-colors ${
              display[key]
                ? 'bg-[#00a832] border-[#cce8d4] text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {display[key] ? '●' : '○'} {label}
          </button>
        ))}

        {/* Team Squad toggle */}
        <button
          onClick={async () => {
            if (!snapshot) return
            const newVisible = !display.teamSquad
            if (newVisible) showTeamSquad()
            else hideTeamSquad()
            await fetch('/api/pusher/trigger', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                matchId: snapshot.matchId,
                event: 'display.toggle',
                payload: { element: 'teamSquad', visible: newVisible, themeScope: 'all' },
              }),
            })
          }}
          className={`px-3 py-1.5 font-stats text-xs rounded-lg border transition-colors ${
            display.teamSquad
              ? 'bg-[#00a832] border-[#cce8d4] text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {display.teamSquad ? '●' : '○'} Team Squad
        </button>

        {/* Batting summary toggle */}
        <button
          onClick={toggleBattingSummary}
          className={`px-3 py-1.5 font-stats text-xs rounded-lg border transition-colors ${
            display.teamSummary && activeSummaryView === 'batting'
              ? 'bg-[#00a832] border-[#cce8d4] text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {display.teamSummary && activeSummaryView === 'batting' ? '●' : '○'} Batting Summary
        </button>

        {/* Bowling summary toggle */}
        <button
          onClick={toggleBowlingSummary}
          className={`px-3 py-1.5 font-stats text-xs rounded-lg border transition-colors ${
            display.teamSummary && activeSummaryView === 'bowling'
              ? 'bg-[#00a832] border-[#cce8d4] text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {display.teamSummary && activeSummaryView === 'bowling' ? '●' : '○'} Bowling Summary
        </button>

        {/* Quick player card buttons */}
        <div className="w-full border-t border-gray-800 mt-2 pt-2 flex gap-2 flex-wrap">
          <span className="font-stats text-xs text-gray-600 self-center mr-1">Show card:</span>
          {striker && (
            <button
              onClick={() => showPlayerCard(
                (striker as { id?: number; playerId?: number }).id
                  ?? (striker as { playerId?: number }).playerId!
              )}
              className="px-3 py-1.5 bg-secondary/10 border border-secondary/40 text-secondary font-stats text-xs rounded-lg hover:bg-secondary/20 transition-colors"
            >
              * {'displayName' in striker ? striker.displayName : (striker as {displayName: string}).displayName}
            </button>
          )}
          {nonStriker && nonStriker !== striker && (
            <button
              onClick={() => showPlayerCard(
                (nonStriker as { id?: number; playerId?: number }).id
                  ?? (nonStriker as { playerId?: number }).playerId!
              )}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-xs rounded-lg hover:bg-gray-700 transition-colors"
            >
              {'displayName' in nonStriker ? nonStriker.displayName : (nonStriker as {displayName: string}).displayName}
            </button>
          )}
          {currentBowler && (
            <button
              onClick={() => showPlayerCard(
                (currentBowler as { id?: number; playerId?: number }).id
                  ?? (currentBowler as { playerId?: number }).playerId!
              )}
              className="px-3 py-1.5 bg-primary/10 border border-primary/40 text-primary font-stats text-xs rounded-lg hover:bg-primary/20 transition-colors"
            >
              ▶ {'displayName' in currentBowler ? currentBowler.displayName : (currentBowler as {displayName: string}).displayName}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
