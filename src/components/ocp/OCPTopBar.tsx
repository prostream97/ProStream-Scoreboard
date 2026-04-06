'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'
import { AppBadge, AppButton } from '@/components/shared/AppPrimitives'

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
    <section className="overflow-hidden rounded-[2rem] border border-[#d7ddd6] bg-white shadow-[0_24px_60px_rgba(26,36,32,0.08)]">
      <div className="bg-[#151822] px-4 py-5 text-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {status === 'setup' ? <AppButton onClick={handleStart}>Start Match</AppButton> : null}
            {status === 'active' ? (
              <>
                <AppButton variant="secondary" onClick={handlePause}>Pause</AppButton>
                <AppButton variant="secondary" onClick={handleBreak}>Break</AppButton>
                <AppButton variant="danger" onClick={handleEndInnings} disabled={endingInnings}>
                  {endingInnings ? 'Ending...' : currentInnings === 1 ? 'End Innings' : 'End Match'}
                </AppButton>
              </>
            ) : null}
            {status === 'paused' ? (
              <>
                <AppButton onClick={handleResume}>Resume</AppButton>
                <AppButton variant="danger" onClick={handleEndInnings} disabled={endingInnings}>
                  {currentInnings === 1 ? 'End Innings' : 'End Match'}
                </AppButton>
              </>
            ) : null}
            {status === 'break' ? (
              <>
                <AppButton onClick={handleResumeBreak}>Resume Play</AppButton>
                <AppButton variant="danger" onClick={handleEndInnings} disabled={endingInnings}>
                  {currentInnings === 1 ? 'End Innings' : 'End Match'}
                </AppButton>
              </>
            ) : null}
            <AppButton variant="secondary" onClick={openSquadPanel}>Squads</AppButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone={status === 'active' ? 'green' : status === 'paused' || status === 'break' ? 'amber' : 'neutral'}>
              {status}
            </AppBadge>
            <AppBadge tone="neutral">Innings {currentInnings}</AppBadge>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto_1fr_auto_1fr] xl:items-center">
          <TeamLabel team={battingTeam} label="Batting" align="left" />

          <div className="rounded-[1.7rem] bg-white px-6 py-4 text-center text-slate-950">
            <p className="text-5xl font-semibold leading-none tracking-[-0.06em]">{scoreText}</p>
            <p className="mt-2 text-sm font-medium text-slate-500">{oversText} ov</p>
            {innings?.target ? <p className="mt-2 text-sm font-semibold text-[#10994c]">Target {innings.target}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] bg-white/7 px-4 py-4">
            <RateCard label="CRR" value={ratesReady ? currentRunRate.toFixed(2) : '-'} />
            <RateCard label="RRR" value={requiredRunRate !== null && ratesReady ? requiredRunRate.toFixed(2) : '-'} />
          </div>

          <TeamLabel team={bowlingTeam} label="Bowling" align="right" />
        </div>
      </div>
    </section>
  )
}

function TeamLabel({
  team,
  label,
  align,
}: {
  team: { logoCloudinaryId: string | null; primaryColor: string; shortCode: string; name: string }
  label: string
  align: 'left' | 'right'
}) {
  return (
    <div className={`flex items-center gap-3 ${align === 'right' ? 'xl:justify-end' : ''}`}>
      {align === 'right' ? (
        <div className="text-right">
          <p className="font-stats text-[0.72rem] uppercase tracking-[0.22em] text-white/45">{label}</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: team.primaryColor }}>{team.shortCode}</p>
          <p className="text-sm text-white/65">{team.name}</p>
        </div>
      ) : null}
      {team.logoCloudinaryId ? (
        <img
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_48,h_48,f_webp/${team.logoCloudinaryId}`}
          className="h-12 w-12 rounded-full object-cover"
          alt=""
        />
      ) : (
        <div className="h-12 w-12 rounded-full" style={{ backgroundColor: team.primaryColor }} />
      )}
      {align === 'left' ? (
        <div>
          <p className="font-stats text-[0.72rem] uppercase tracking-[0.22em] text-white/45">{label}</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: team.primaryColor }}>{team.shortCode}</p>
          <p className="text-sm text-white/65">{team.name}</p>
        </div>
      ) : null}
    </div>
  )
}

function RateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white px-4 py-3 text-center text-slate-950">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  )
}
