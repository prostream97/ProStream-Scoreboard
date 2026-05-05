'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'

type Element = 'scorebug' | 'playerCard' | 'wicketAlert' | 'partnership' | 'summary' | 'tossResult' | 'header' | 'mostWickets' | 'mostBoundaries' | 'lastOutCard' | 'teamVsTeam' | 'matchWon'

const ELEMENTS: { key: Element; label: string }[] = [
  { key: 'header', label: 'Header' },
  { key: 'scorebug', label: 'Scorebug' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'summary', label: 'Match Summary' },
  { key: 'tossResult', label: 'Toss Result' },
  { key: 'mostWickets', label: 'Most Wickets' },
  { key: 'mostBoundaries', label: 'Most Boundaries' },
  { key: 'teamVsTeam', label: 'Team Vs Team' },
  { key: 'lastOutCard', label: 'Last Out Card' },
  { key: 'matchWon', label: 'Match Won' },
]

export function OverlayPanel() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const display = useUIStore((s) => s.display)
  const setDisplay = useUIStore((s) => s.setDisplay)
  const showTeamSquad = useUIStore((s) => s.showTeamSquad)
  const hideTeamSquad = useUIStore((s) => s.hideTeamSquad)
  const showSquadWithImage = useUIStore((s) => s.showSquadWithImage)
  const hideSquadWithImage = useUIStore((s) => s.hideSquadWithImage)

  const [pendingSquadTeam, setPendingSquadTeam] = useState<'home' | 'away'>('home')

  if (!snapshot) return null

  async function toggle(element: Element) {
    if (!snapshot) return
    const newVisible = !display[element]
    setDisplay(element, newVisible)

    const themeScope = 'all'

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

  async function toggleSquadWithImage() {
    if (!snapshot) return
    const newVisible = !display.squadWithImage
    const teamId = pendingSquadTeam === 'home' ? snapshot.homeTeam.id : snapshot.awayTeam.id

    if (newVisible) {
      showSquadWithImage(teamId)
    } else {
      hideSquadWithImage()
    }

    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot.matchId,
        event: 'display.toggle',
        payload: { element: 'squadWithImage', visible: newVisible, themeScope: 'all', squadWithImageTeamId: teamId },
      }),
    })
  }

  async function toggleTeamSquad() {
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
  }

  const visibleElements = snapshot.tournamentId
    ? ELEMENTS
    : ELEMENTS.filter(({ key }) => key !== 'mostWickets' && key !== 'mostBoundaries')
  const onStateClass = '!border-[#f5c6c4] !bg-[#fff1f0] !text-[#c54e4c] hover:!bg-[#ffe5e3]'
  const offStateClass = '!border-[#b8e4cc] !bg-[#eef8f1] !text-[#2f7a4d] hover:!bg-[#e3f3e8]'

  return (
    <section className="rounded-[1.8rem] border-4 border-[#1cbd00] bg-white p-4 shadow-[0_18px_45px_rgba(26,36,32,0.06)]">
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
                ? onStateClass
                : offStateClass
            }`}
          >
            {display[key] ? 'On' : 'Off'} · {label}
          </button>
        ))}

        <button
          onClick={toggleTeamSquad}
          className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm font-semibold transition ${
            display.teamSquad
              ? onStateClass
              : offStateClass
          }`}
        >
          {display.teamSquad ? 'On' : 'Off'} · Team Squad
        </button>

        {/* Squad with Image — single trigger for all themes */}
        <div className="flex gap-1">
          <select
            value={pendingSquadTeam}
            onChange={(e) => setPendingSquadTeam(e.target.value as 'home' | 'away')}
            className="rounded-[1.2rem] border border-[#e1e7df] bg-[#f8faf7] px-3 py-3 text-xs font-semibold text-slate-600"
          >
            <option value="home">{snapshot.homeTeam.shortCode}</option>
            <option value="away">{snapshot.awayTeam.shortCode}</option>
          </select>
          <button
            onClick={toggleSquadWithImage}
            className={`flex-1 rounded-[1.2rem] border px-4 py-3 text-left text-sm font-semibold transition ${
              display.squadWithImage
                ? onStateClass
                : offStateClass
            }`}
          >
            {display.squadWithImage ? 'On' : 'Off'} · Squad w/ Image
          </button>
        </div>
      </div>

    </section>
  )
}
