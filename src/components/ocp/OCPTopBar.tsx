'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!

async function updateMatchStatus(matchId: number, status: string) {
  await fetch(`/api/match/${matchId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export function OCPTopBar() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const setStatus = useMatchStore((s) => s.setStatus)
  const flushOverToNeon = useMatchStore((s) => s.flushOverToNeon)
  const hydrate = useMatchStore((s) => s.hydrate)
  const openBowlerSelect = useUIStore((s) => s.openBowlerSelect)
  const openSquadPanel = useUIStore((s) => s.openSquadPanel)
  const router = useRouter()
  const [endingInnings, setEndingInnings] = useState(false)

  if (!snapshot) return null

  const {
    status, matchId, currentInnings,
    homeTeam, awayTeam, currentInningsState, currentRunRate, requiredRunRate,
  } = snapshot

  const innings = currentInningsState
  const scoreText = innings ? `${innings.totalRuns}/${innings.wickets}` : '0/0'
  const oversText = innings ? `${innings.overs}.${innings.balls}` : '0.0'
  // Only show run rates after 1 full over (6 legal balls) — avoids extreme values from early extras
  const totalLegalBalls = (innings?.overs ?? 0) * 6 + (innings?.balls ?? 0)
  const ratesReady = totalLegalBalls >= 6
  const battingTeam = innings?.battingTeamId === homeTeam.id ? homeTeam : awayTeam
  const bowlingTeam = innings?.bowlingTeamId === homeTeam.id ? homeTeam : awayTeam

  async function handleStart() {
    await updateMatchStatus(matchId, 'active')
    setStatus('active')
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
          const stateRes = await fetch(`/api/match/${matchId}/state`)
          if (stateRes.ok) hydrate(await stateRes.json())
          openBowlerSelect()
        }
      } else {
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
    <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-3">

      {/* ── LEFT: match controls ─────────────────────────────── */}
      <span className="font-stats text-xs text-gray-400 uppercase tracking-wider mr-1">Match</span>

      {status === 'setup' && (
        <button onClick={handleStart} className="px-4 py-2 bg-secondary text-white font-stats font-semibold rounded-lg hover:bg-emerald-600 transition-colors text-sm">
          Start Match
        </button>
      )}

      {status === 'active' && (
        <>
          <button onClick={handlePause} className="px-4 py-2 bg-yellow-600 text-white font-stats font-semibold rounded-lg hover:bg-yellow-700 transition-colors text-sm">
            Pause
          </button>
          <button onClick={handleBreak} className="px-4 py-2 bg-blue-700/80 text-white font-stats font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Break
          </button>
          <button onClick={handleEndInnings} disabled={endingInnings} className="px-4 py-2 bg-red-700/80 text-white font-stats font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50">
            {endingInnings ? 'Ending…' : currentInnings === 1 ? 'End Innings' : 'End Match'}
          </button>
        </>
      )}

      {status === 'paused' && (
        <>
          <button onClick={handleResume} className="px-4 py-2 bg-secondary text-white font-stats font-semibold rounded-lg hover:bg-emerald-600 transition-colors text-sm">
            Resume
          </button>
          <button onClick={handleEndInnings} disabled={endingInnings} className="px-4 py-2 bg-red-700/80 text-white font-stats font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50">
            {currentInnings === 1 ? 'End Innings' : 'End Match'}
          </button>
        </>
      )}

      {status === 'break' && (
        <>
          <button onClick={handleResumeBreak} className="px-4 py-2 bg-secondary text-white font-stats font-semibold rounded-lg hover:bg-emerald-600 transition-colors text-sm">
            Resume Play
          </button>
          <button onClick={handleEndInnings} disabled={endingInnings} className="px-4 py-2 bg-red-700/80 text-white font-stats font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50">
            {currentInnings === 1 ? 'End Innings' : 'End Match'}
          </button>
        </>
      )}

      {/* Innings badge */}
      <span className="font-stats text-xs text-gray-500 uppercase tracking-wider">
        Innings {currentInnings}
      </span>

      {/* Squads */}
      <button onClick={openSquadPanel} className="px-4 py-2 bg-indigo-600 border border-indigo-500 text-white font-stats font-semibold text-sm rounded-lg hover:bg-indigo-500 transition-colors">
        Squads
      </button>

      {/* Status dot */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          status === 'active' ? 'bg-secondary animate-pulse' :
          status === 'paused' ? 'bg-yellow-500' :
          status === 'break'  ? 'bg-blue-500 animate-pulse' :
          'bg-gray-600'
        }`} />
        <span className="font-stats text-xs text-gray-400 uppercase tracking-wider">{status}</span>
      </div>

      {/* ── DIVIDER ──────────────────────────────────────────── */}
      <div className="border-l border-gray-700 h-10 mx-3 flex-shrink-0" />

      {/* ── RIGHT: single tile, four sections spread across ── */}
      <div
        className="flex-1 flex items-center justify-between rounded-lg border border-gray-700 overflow-hidden"
        style={{
          background: `linear-gradient(90deg, ${battingTeam.primaryColor}18 0%, #1f2937 30%, #1f2937 70%, ${bowlingTeam.primaryColor}18 100%)`,
        }}
      >
        {/* Batting team */}
        <div className="flex items-center gap-3 px-5 py-2">
          {battingTeam.logoCloudinaryId
            ? <img
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_32,h_32,f_webp/${battingTeam.logoCloudinaryId}`}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                alt=""
              />
            : <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: battingTeam.primaryColor }} />
          }
          <div>
            <p className="font-stats text-[10px] text-gray-400 uppercase tracking-widest leading-none mb-1">Batting</p>
            <p className="font-stats font-bold text-white text-base leading-none">{battingTeam.shortCode}</p>
            <p className="font-stats text-[10px] text-gray-500 leading-none mt-0.5">{battingTeam.name}</p>
          </div>
        </div>

        <div className="w-px self-stretch bg-gray-700/60" />

        {/* Score + overs */}
        <div className="flex flex-col items-center justify-center px-6 py-2">
          <div className="font-display text-3xl text-white tracking-wider leading-none">{scoreText}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-stats text-xs text-gray-400">{oversText} ov</span>
            {innings?.target && (
              <span className="font-stats text-xs text-overlay-lime">· Target {innings.target}</span>
            )}
          </div>
        </div>

        <div className="w-px self-stretch bg-gray-700/60" />

        {/* CRR / RRR */}
        <div className="flex items-center gap-4 px-6 py-2">
          <div className="text-center">
            <p className="font-stats text-[10px] text-gray-500 uppercase tracking-widest leading-none mb-1">CRR</p>
            <p className="font-stats text-lg font-bold text-secondary leading-none">{ratesReady ? currentRunRate.toFixed(2) : '—'}</p>
          </div>
          {requiredRunRate !== null && ratesReady && (
            <>
              <div className="w-px h-6 bg-gray-700" />
              <div className="text-center">
                <p className="font-stats text-[10px] text-gray-500 uppercase tracking-widest leading-none mb-1">RRR</p>
                <p
                  className="font-stats text-lg font-bold leading-none"
                  style={{ color: requiredRunRate > currentRunRate ? '#ef4444' : '#10B981' }}
                >
                  {requiredRunRate.toFixed(2)}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="w-px self-stretch bg-gray-700/60" />

        {/* Bowling team */}
        <div className="flex items-center gap-3 px-5 py-2">
          <div className="text-right">
            <p className="font-stats text-[10px] text-gray-400 uppercase tracking-widest leading-none mb-1">Bowling</p>
            <p className="font-stats font-bold text-white text-base leading-none">{bowlingTeam.shortCode}</p>
            <p className="font-stats text-[10px] text-gray-500 leading-none mt-0.5">{bowlingTeam.name}</p>
          </div>
          {bowlingTeam.logoCloudinaryId
            ? <img
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_32,h_32,f_webp/${bowlingTeam.logoCloudinaryId}`}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                alt=""
              />
            : <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: bowlingTeam.primaryColor }} />
          }
        </div>
      </div>

    </div>
  )
}
