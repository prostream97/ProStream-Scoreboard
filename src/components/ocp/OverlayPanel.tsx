'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'

type Element = 'scorebug' | 'playerCard' | 'wicketAlert' | 'partnership' | 'ticker' | 'summary' | 'tossResult' | 'header' | 'mostWickets' | 'mostBoundaries' | 'lastOutCard' | 'teamVsTeam'

const ELEMENTS: { key: Element; label: string }[] = [
  { key: 'header', label: 'Header' },
  { key: 'scorebug', label: 'Scorebug' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'summary', label: 'Innings Summary' },
  { key: 'tossResult', label: 'Toss Result' },
  { key: 'mostWickets', label: 'Most Wickets' },
  { key: 'mostBoundaries', label: 'Most Boundaries' },
  { key: 'ticker', label: 'Ticker' },
]

// Standard 1 exclusive elements (simple toggles)
const S1_SIMPLE_ELEMENTS: { key: Element; label: string }[] = [
  { key: 'teamVsTeam', label: 'S1 · Team Vs Team' },
  { key: 'lastOutCard', label: 'S1 · Last Out Card' },
]

// Standard 1 elements that require team selection
type TeamElement = 'teamSquad' | 'squadWithImage'
const S1_TEAM_ELEMENTS: { key: TeamElement; label: string }[] = [
  { key: 'teamSquad', label: 'S1 · Team Squad' },
  { key: 'squadWithImage', label: 'S1 · Squad w/ Image' },
]

export function OverlayPanel() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const display = useUIStore((s) => s.display)
  const setDisplay = useUIStore((s) => s.setDisplay)
  const showTeamSquad = useUIStore((s) => s.showTeamSquad)
  const hideTeamSquad = useUIStore((s) => s.hideTeamSquad)
  const showSquadWithImage = useUIStore((s) => s.showSquadWithImage)
  const hideSquadWithImage = useUIStore((s) => s.hideSquadWithImage)

  // Pending team selection for each team element before triggering
  const [pendingTeam, setPendingTeam] = useState<Record<TeamElement, 'home' | 'away'>>({
    teamSquad: 'home',
    squadWithImage: 'home',
  })

  if (!snapshot) return null

  async function toggle(element: Element) {
    if (!snapshot) return
    const newVisible = !display[element]
    setDisplay(element, newVisible)

    const themeScope = (element === 'teamVsTeam' || element === 'lastOutCard')
      ? 'standard1'
      : 'all'

    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot.matchId,
        event: 'display.toggle',
        payload: { element, visible: newVisible, themeScope },
      }),
    })
  }

  async function toggleTeamElement(element: TeamElement) {
    if (!snapshot) return
    const newVisible = !display[element]
    const teamId = pendingTeam[element] === 'home' ? snapshot.homeTeam.id : snapshot.awayTeam.id

    if (newVisible) {
      if (element === 'teamSquad') showTeamSquad(teamId)
      else showSquadWithImage(teamId)
    } else {
      if (element === 'teamSquad') hideTeamSquad()
      else hideSquadWithImage()
    }

    const payloadExtra = element === 'teamSquad'
      ? { teamSquadTeamId: teamId }
      : { squadWithImageTeamId: teamId }

    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot.matchId,
        event: 'display.toggle',
        payload: { element, visible: newVisible, themeScope: 'standard1', ...payloadExtra },
      }),
    })
  }

  const visibleElements = snapshot.tournamentId
    ? ELEMENTS
    : ELEMENTS.filter(({ key }) => key !== 'mostWickets' && key !== 'mostBoundaries')

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
            {display[key] ? 'On' : 'Off'} · {label}
          </button>
        ))}

        {/* Standard 1 simple elements */}
        {S1_SIMPLE_ELEMENTS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm font-semibold transition ${
              display[key]
                ? 'border-[#cce8d4] bg-[#eef8f1] text-[#10994c]'
                : 'border-[#e1e7df] bg-[#f8faf7] text-slate-600 hover:bg-white'
            }`}
          >
            {display[key] ? 'On' : 'Off'} · {label}
          </button>
        ))}

        {/* Standard 1 team-selector elements */}
        {S1_TEAM_ELEMENTS.map(({ key, label }) => (
          <div key={key} className="flex gap-1">
            <select
              value={pendingTeam[key]}
              onChange={(e) => setPendingTeam((p) => ({ ...p, [key]: e.target.value as 'home' | 'away' }))}
              className="rounded-[1.2rem] border border-[#e1e7df] bg-[#f8faf7] px-3 py-3 text-xs font-semibold text-slate-600"
            >
              <option value="home">{snapshot.homeTeam.shortCode}</option>
              <option value="away">{snapshot.awayTeam.shortCode}</option>
            </select>
            <button
              onClick={() => toggleTeamElement(key)}
              className={`flex-1 rounded-[1.2rem] border px-4 py-3 text-left text-sm font-semibold transition ${
                display[key]
                  ? 'border-[#cce8d4] bg-[#eef8f1] text-[#10994c]'
                  : 'border-[#e1e7df] bg-[#f8faf7] text-slate-600 hover:bg-white'
              }`}
            >
              {display[key] ? 'On' : 'Off'} · {label}
            </button>
          </div>
        ))}
      </div>

    </section>
  )
}
