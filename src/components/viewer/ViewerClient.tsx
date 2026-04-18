'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, WifiOff } from 'lucide-react'
import { PusherProvider, useEvent } from '@/components/shared/PusherProvider'
import { getPusherClient } from '@/lib/pusher/client'
import { MatchGraphs } from '@/components/viewer/MatchGraphs'
import { AppBadge } from '@/components/shared/AppPrimitives'
import type { MatchSnapshot, BatterStats, BowlerStats, InningsState } from '@/types/match'
import type { DeliveryAddedPayload, WicketPayload, InningsChangePayload } from '@/types/pusher'
import { applyDeliveryToPartnershipStats, createPartnershipStats } from '@/lib/match/partnership'

type ViewerClientProps = {
  matchId: number
  initialSnapshot: MatchSnapshot
}

function applyDeliveryToBatters(
  batters: BatterStats[],
  data: DeliveryAddedPayload,
  battingTeamPlayers: MatchSnapshot['battingTeamPlayers'],
): BatterStats[] {
  const existing = batters.find((b) => b.playerId === data.batsmanId)
  if (!existing) {
    const p = battingTeamPlayers.find((tp) => tp.id === data.batsmanId)
    return [
      ...batters,
      {
        playerId: data.batsmanId,
        playerName: p?.name ?? '',
        displayName: p?.displayName ?? String(data.batsmanId),
        runs: data.runs,
        balls: data.isLegal ? 1 : 0,
        fours: data.runs === 4 ? 1 : 0,
        sixes: data.runs === 6 ? 1 : 0,
        strikeRate: data.isLegal && data.runs > 0 ? data.runs * 100 : 0,
        isStriker: true,
        isOut: data.isWicket,
        dismissalType: null,
      },
    ]
  }
  return batters.map((b) => {
    if (b.playerId !== data.batsmanId) return b
    const newRuns = b.runs + data.runs
    const newBalls = b.balls + (data.isLegal ? 1 : 0)
    return {
      ...b,
      runs: newRuns,
      balls: newBalls,
      fours: b.fours + (data.runs === 4 ? 1 : 0),
      sixes: b.sixes + (data.runs === 6 ? 1 : 0),
      strikeRate: newBalls > 0 ? Math.round((newRuns / newBalls) * 10000) / 100 : 0,
      isOut: b.isOut || data.isWicket,
    }
  })
}

function applyDeliveryToBowlers(
  bowlers: BowlerStats[],
  data: DeliveryAddedPayload,
  bowlingTeamPlayers: MatchSnapshot['bowlingTeamPlayers'],
  bpo: number,
): BowlerStats[] {
  const existing = bowlers.find((b) => b.playerId === data.bowlerId)
  if (!existing) {
    const p = bowlingTeamPlayers.find((tp) => tp.id === data.bowlerId)
    return [
      ...bowlers.map((b) => ({ ...b, isCurrent: false })),
      {
        playerId: data.bowlerId,
        playerName: p?.name ?? '',
        displayName: p?.displayName ?? String(data.bowlerId),
        overs: 0,
        balls: data.isLegal ? 1 : 0,
        maidens: 0,
        runs: data.runs + data.extraRuns,
        wickets: data.isWicket ? 1 : 0,
        economy: 0,
        isCurrent: true,
      },
    ]
  }
  return bowlers.map((b) => {
    if (b.playerId !== data.bowlerId) return b
    const newLegal = b.balls + (data.isLegal ? 1 : 0)
    const completedOvers = b.overs + Math.floor(newLegal / bpo)
    const ballsInOver = newLegal % bpo
    const newRuns = b.runs + data.runs + data.extraRuns
    const totalLegal = completedOvers * bpo + ballsInOver
    return {
      ...b,
      overs: completedOvers,
      balls: ballsInOver,
      runs: newRuns,
      wickets: b.wickets + (data.isWicket ? 1 : 0),
      economy: totalLegal > 0 ? Math.round((newRuns / (totalLegal / bpo)) * 100) / 100 : 0,
    }
  })
}

function LiveScoreboard({ matchId, initialSnapshot }: ViewerClientProps) {
  const [snapshot, setSnapshot] = useState<MatchSnapshot>(initialSnapshot)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => {
        if (isMountedRef.current) {
          setSnapshot(fresh)
          setFetchError(null)
        }
      })
      .catch(() => {
        if (isMountedRef.current) setFetchError('Failed to load match data - showing cached state.')
      })
  }, [matchId])

  useEffect(() => {
    const client = getPusherClient()
    const handler = ({ current }: { current: string }) => {
      if (!isMountedRef.current) return
      if (current === 'connected') {
        setIsReconnecting(false)
        fetch(`/api/match/${matchId}/state`)
          .then((r) => r.json())
          .then((fresh: MatchSnapshot) => {
            if (isMountedRef.current) setSnapshot(fresh)
          })
          .catch((err) => {
            console.warn('[ViewerClient] Post-reconnect state refetch failed:', err)
          })
      } else if (current === 'connecting' || current === 'reconnecting') {
        setIsReconnecting(true)
      }
    }
    client.connection.bind('state_change', handler)
    return () => { client.connection.unbind('state_change', handler) }
  }, [matchId])

  useEvent(`match-${matchId}`, 'delivery.added', (data: DeliveryAddedPayload) => {
    setSnapshot((s) => {
      const updatedInnings: InningsState[] = s.innings.map((inn) =>
        inn.inningsNumber === s.currentInnings
          ? { ...inn, totalRuns: data.inningsRuns, wickets: data.inningsWickets, overs: data.inningsOvers, balls: data.inningsBalls }
          : inn,
      )
      const currentInningsState = updatedInnings.find((i) => i.inningsNumber === s.currentInnings) ?? null
      const bpo = s.ballsPerOver ?? 6
      const totalBalls = (currentInningsState?.overs ?? 0) * bpo + (currentInningsState?.balls ?? 0)
      const currentRunRate = totalBalls > 0
        ? Math.round(((currentInningsState?.totalRuns ?? 0) / (totalBalls / bpo)) * 100) / 100
        : 0
      return {
        ...s,
        innings: updatedInnings,
        currentInningsState,
        strikerId: data.strikerId,
        nonStrikerId: data.nonStrikerId,
        currentOver: data.overNumber,
        currentBalls: data.inningsBalls,
        currentRunRate,
        batters: applyDeliveryToBatters(s.batters, data, s.battingTeamPlayers),
        bowlers: applyDeliveryToBowlers(s.bowlers, data, s.bowlingTeamPlayers, bpo),
        partnership: s.strikerId && s.nonStrikerId
          ? (data.isWicket
              ? createPartnershipStats(data.strikerId ?? s.strikerId, data.nonStrikerId ?? s.nonStrikerId)
              : applyDeliveryToPartnershipStats(
                  s.partnership,
                  data.batsmanId,
                  data.strikerId ?? s.strikerId,
                  data.nonStrikerId ?? s.nonStrikerId,
                  data,
                ))
          : s.partnership,
      }
    })
  })

  useEvent(`match-${matchId}`, 'wicket.fell', (_data: WicketPayload) => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => { if (isMountedRef.current) setSnapshot(fresh) })
      .catch((err) => { console.warn('[ViewerClient] Wicket state refetch failed:', err) })
  })

  useEvent(`match-${matchId}`, 'innings.change', (_data: InningsChangePayload) => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => { if (isMountedRef.current) setSnapshot(fresh) })
      .catch((err) => { console.warn('[ViewerClient] Innings change state refetch failed:', err) })
  })

  useEvent(`match-${matchId}`, 'state.refresh', () => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => { if (isMountedRef.current) setSnapshot(fresh) })
      .catch((err) => { console.warn('[ViewerClient] state.refresh refetch failed:', err) })
  })

  useEvent(`match-${matchId}`, 'break.start', () => {
    setSnapshot((s) => ({ ...s, status: 'break' }))
  })

  useEvent(`match-${matchId}`, 'break.end', () => {
    setSnapshot((s) => ({ ...s, status: 'active' }))
  })

  const inn = snapshot.currentInningsState
  const battingTeam = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowlingTeam = inn?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const prevInnings = snapshot.innings.find((i) => i.inningsNumber === 1)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f9fbf7_0%,#f1f4ee_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <AnimatePresence>
        {isReconnecting ? (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed left-4 right-4 top-4 z-50 flex items-center justify-center gap-2 rounded-full bg-[#ffe9a8] px-4 py-2 text-sm font-medium text-[#7c5e02] shadow-[0_12px_24px_rgba(124,94,2,0.18)]"
          >
            <WifiOff className="h-4 w-4" />
            Reconnecting to live feed...
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        {fetchError ? (
          <div className="rounded-[1.5rem] border border-yellow-200 bg-yellow-50 px-4 py-3 text-center text-sm text-yellow-700">
            {fetchError}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[2rem] border border-[#d7ddd6] bg-white shadow-[0_24px_60px_rgba(26,36,32,0.08)]">
          <div className="bg-[#151822] px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-stats text-[0.72rem] uppercase tracking-[0.26em] text-white/45">
                  {snapshot.format} . {snapshot.venue ?? 'Live Match'}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-2xl font-semibold tracking-[-0.04em]" style={{ color: snapshot.homeTeam.primaryColor }}>
                    {snapshot.homeTeam.shortCode}
                  </span>
                  <span className="text-sm text-white/35">vs</span>
                  <span className="text-2xl font-semibold tracking-[-0.04em]" style={{ color: snapshot.awayTeam.primaryColor }}>
                    {snapshot.awayTeam.shortCode}
                  </span>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white px-5 py-4 text-center text-slate-950">
                <p className="text-5xl font-semibold leading-none tracking-[-0.06em]">
                  {inn?.totalRuns ?? 0}/{inn?.wickets ?? 0}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {inn?.overs ?? 0}.{inn?.balls ?? 0} overs
                </p>
                {inn?.target ? (
                  <p className="mt-2 text-sm font-semibold text-[#10994c]">
                    Need {Math.max(0, inn.target - inn.totalRuns)} from {Math.max(0, (snapshot.totalOvers - inn.overs) * (snapshot.ballsPerOver ?? 6) - inn.balls)} balls
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#dfe6df] bg-[#f8faf7] px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Batting" value={battingTeam.name} accent={battingTeam.primaryColor} />
            <MetricCard label="Bowling" value={bowlingTeam.name} accent={bowlingTeam.primaryColor} />
            <MetricCard label="CRR" value={snapshot.currentRunRate.toFixed(2)} accent="#10994c" />
            {snapshot.requiredRunRate !== null && snapshot.currentInnings === 2 ? (
              <MetricCard
                label="RRR"
                value={snapshot.requiredRunRate.toFixed(2)}
                accent={snapshot.requiredRunRate > snapshot.currentRunRate ? '#c54e4c' : '#10994c'}
              />
            ) : (
              <MetricCard label="Status" value={snapshot.status} accent="#2d6fb0" />
            )}
          </div>
        </section>

        {snapshot.currentInnings === 2 && prevInnings ? (
          <div className="rounded-[1.5rem] border border-[#d7ddd6] bg-white px-5 py-4 shadow-[0_16px_42px_rgba(26,36,32,0.05)]">
            <p className="text-sm text-slate-500">
              {snapshot.innings[0].battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam.shortCode : snapshot.awayTeam.shortCode} 1st innings
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {prevInnings.totalRuns}/{prevInnings.wickets}
              <span className="ml-2 text-sm font-medium text-slate-500">
                ({prevInnings.overs}.{prevInnings.balls} ov)
              </span>
            </p>
          </div>
        ) : null}

        {snapshot.partnership ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard title="Partnership" value={`${snapshot.partnership.runs}`} caption={`${snapshot.partnership.balls} balls`} />
            <SummaryCard title="Target" value={inn?.target ? `${inn.target}` : '-'} caption={inn?.target ? 'Chasing score' : 'No chase set'} />
            <SummaryCard title="Status" value={snapshot.status.toUpperCase()} caption="Live match state" />
          </div>
        ) : null}

        <MatchGraphs snapshot={snapshot} />

        <section className="grid gap-4 xl:grid-cols-2">
          <PlayerPanel title="Batting" subtitle={battingTeam.shortCode}>
            {snapshot.batters.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[#d7ddd6] px-4 py-10 text-center text-sm text-slate-500">
                Innings not started
              </div>
            ) : (
              snapshot.batters.map((b) => (
                <div
                  key={b.playerId}
                  className={`rounded-[1.4rem] border px-4 py-4 ${
                    b.playerId === snapshot.strikerId ? 'border-[#cce8d4] bg-[#eef8f1]' : 'border-[#e1e7df] bg-[#f8faf7]'
                  } ${b.isOut ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">
                          {b.displayName} {b.playerId === snapshot.nonStrikerId ? <span className="text-slate-400">(non-striker)</span> : null}
                        </p>
                        <p className="text-sm text-slate-500">{b.isOut ? `b. ${b.dismissalType}` : 'Not out'}</p>
                      </div>
                    </div>
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">{b.runs}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>B {b.balls}</span>
                    <span>4s {b.fours}</span>
                    <span>6s {b.sixes}</span>
                    <span>SR {b.strikeRate.toFixed(1)}</span>
                  </div>
                </div>
              ))
            )}
          </PlayerPanel>

          <PlayerPanel title="Bowling" subtitle={bowlingTeam.shortCode}>
            {snapshot.bowlers.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[#d7ddd6] px-4 py-10 text-center text-sm text-slate-500">
                No bowling data yet
              </div>
            ) : (
              snapshot.bowlers.map((b) => (
                <div
                  key={b.playerId}
                  className={`rounded-[1.4rem] border px-4 py-4 ${
                    b.isCurrent ? 'border-[#d2def2] bg-[#eef4fb]' : 'border-[#e1e7df] bg-[#f8faf7]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{b.displayName}</p>
                      <p className="text-sm text-slate-500">{b.overs}.{b.balls} overs</p>
                    </div>
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                      {b.wickets}-{b.runs}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>M {b.maidens}</span>
                    <span>Econ {b.economy.toFixed(1)}</span>
                    {b.isCurrent ? <AppBadge tone="blue">Current</AppBadge> : null}
                  </div>
                </div>
              ))
            )}
          </PlayerPanel>
        </section>

        <div className="pb-2 text-center">
          {snapshot.status === 'active' ? <AppBadge tone="green">Live</AppBadge> : null}
          {snapshot.status === 'paused' ? <AppBadge tone="amber">Paused</AppBadge> : null}
          {snapshot.status === 'break' ? <AppBadge tone="amber">Break in play</AppBadge> : null}
          {snapshot.status === 'complete' ? <AppBadge tone="neutral">Match complete</AppBadge> : null}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-[1.3rem] bg-white px-4 py-3 shadow-[0_8px_20px_rgba(26,36,32,0.04)]">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold" style={{ color: accent }}>{value}</p>
    </div>
  )
}

function SummaryCard({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#d7ddd6] bg-white p-4 shadow-[0_16px_32px_rgba(26,36,32,0.05)]">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{caption}</p>
    </div>
  )
}

function PlayerPanel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[1.8rem] border border-[#d7ddd6] bg-white p-4 shadow-[0_18px_45px_rgba(26,36,32,0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="app-kicker">{title}</p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{subtitle}</h3>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function ViewerClient({ matchId, initialSnapshot }: ViewerClientProps) {
  return (
    <PusherProvider>
      <LiveScoreboard matchId={matchId} initialSnapshot={initialSnapshot} />
    </PusherProvider>
  )
}
