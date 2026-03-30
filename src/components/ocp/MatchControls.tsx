'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'


async function updateMatchStatus(matchId: number, status: string) {
  await fetch(`/api/match/${matchId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export function MatchControls() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const setStatus = useMatchStore((s) => s.setStatus)
  const flushOverToNeon = useMatchStore((s) => s.flushOverToNeon)
  const hydrate = useMatchStore((s) => s.hydrate)
  const openBowlerSelect = useUIStore((s) => s.openBowlerSelect)
  const openSquadPanel = useUIStore((s) => s.openSquadPanel)
  const router = useRouter()
  const [endingInnings, setEndingInnings] = useState(false)

  if (!snapshot) return null

  const { status, matchId, currentInnings } = snapshot

  async function handleStart() {
    await updateMatchStatus(matchId, 'active')
    setStatus('active')
    // Prompt for opening batsmen setup
    openBowlerSelect()
  }

  async function handlePause() {
    await flushOverToNeon()
    await updateMatchStatus(matchId, 'paused')
    setStatus('paused')
  }

  async function handleResume() {
    await updateMatchStatus(matchId, 'active')
    setStatus('active')
  }

  async function handleBreak() {
    await flushOverToNeon()
    await updateMatchStatus(matchId, 'break')
    setStatus('break')
    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, event: 'break.start', payload: {} }),
    })
  }

  async function handleResumeBreak() {
    await updateMatchStatus(matchId, 'active')
    setStatus('active')
    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, event: 'break.end', payload: {} }),
    })
  }

  async function handleEndInnings() {
    setEndingInnings(true)
    try {
      await flushOverToNeon()

      if (currentInnings === 1) {
        const res = await fetch(`/api/match/${matchId}/innings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'end' }),
        })
        if (res.ok) {
          // Refresh snapshot for innings 2
          const stateRes = await fetch(`/api/match/${matchId}/state`)
          if (stateRes.ok) {
            const fresh = await stateRes.json()
            hydrate(fresh)
          }
          openBowlerSelect()
        }
      } else {
        // Innings 2 — match complete
        await fetch(`/api/match/${matchId}/innings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' }),
        })
        await updateMatchStatus(matchId, 'complete')
        setStatus('complete')
        router.push('/')
      }
    } finally {
      setEndingInnings(false)
    }
  }

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-6 py-3 flex items-center gap-3 flex-wrap">
      <span className="font-stats text-xs text-gray-400 uppercase tracking-wider mr-2">Match</span>

      {status === 'setup' && (
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-secondary text-white font-stats font-semibold rounded-lg hover:bg-emerald-600 transition-colors text-sm"
        >
          Start Match
        </button>
      )}

      {status === 'active' && (
        <>
          <button
            onClick={handlePause}
            className="px-4 py-2 bg-yellow-600 text-white font-stats font-semibold rounded-lg hover:bg-yellow-700 transition-colors text-sm"
          >
            Pause
          </button>
          <button
            onClick={handleBreak}
            className="px-4 py-2 bg-blue-700/80 text-white font-stats font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Break
          </button>
          <button
            onClick={handleEndInnings}
            disabled={endingInnings}
            className="px-4 py-2 bg-red-700/80 text-white font-stats font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
          >
            {endingInnings ? 'Ending...' : currentInnings === 1 ? 'End Innings' : 'End Match'}
          </button>
        </>
      )}

      {status === 'paused' && (
        <>
          <button
            onClick={handleResume}
            className="px-4 py-2 bg-secondary text-white font-stats font-semibold rounded-lg hover:bg-emerald-600 transition-colors text-sm"
          >
            Resume
          </button>
          <button
            onClick={handleEndInnings}
            disabled={endingInnings}
            className="px-4 py-2 bg-red-700/80 text-white font-stats font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
          >
            {currentInnings === 1 ? 'End Innings' : 'End Match'}
          </button>
        </>
      )}

      {status === 'break' && (
        <>
          <button
            onClick={handleResumeBreak}
            className="px-4 py-2 bg-secondary text-white font-stats font-semibold rounded-lg hover:bg-emerald-600 transition-colors text-sm"
          >
            Resume Play
          </button>
          <button
            onClick={handleEndInnings}
            disabled={endingInnings}
            className="px-4 py-2 bg-red-700/80 text-white font-stats font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
          >
            {currentInnings === 1 ? 'End Innings' : 'End Match'}
          </button>
        </>
      )}

      {/* Innings badge */}
      <div className="font-stats text-xs text-gray-500 uppercase tracking-wider">
        Innings {currentInnings}
      </div>

      {/* Squads button */}
      <button
        onClick={openSquadPanel}
        className="px-4 py-2 bg-indigo-600 border border-indigo-500 text-white font-stats font-semibold text-sm rounded-lg hover:bg-indigo-500 transition-colors"
      >
        Squads
      </button>

      {/* Status badge */}
      <div className="ml-auto flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            status === 'active'
              ? 'bg-secondary animate-pulse'
              : status === 'paused'
              ? 'bg-yellow-500'
              : status === 'break'
              ? 'bg-blue-500 animate-pulse'
              : status === 'complete'
              ? 'bg-gray-600'
              : 'bg-gray-600'
          }`}
        />
        <span className="font-stats text-sm text-gray-400 uppercase tracking-wider">
          {status}
        </span>
      </div>
    </div>
  )
}
