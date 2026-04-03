'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, WifiOff } from 'lucide-react'
import { PusherProvider, useEvent } from '@/components/shared/PusherProvider'
import { getPusherClient } from '@/lib/pusher/client'
import { MatchGraphs } from '@/components/viewer/MatchGraphs'
import type { MatchSnapshot, BatterStats, BowlerStats, InningsState } from '@/types/match'
import type { DeliveryAddedPayload, WicketPayload, InningsChangePayload } from '@/types/pusher'

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
        if (isMountedRef.current) setFetchError('Failed to load match data — showing cached state.')
      })
  }, [matchId])

  // Pusher connection state — show reconnect banner on disconnect
  useEffect(() => {
    const client = getPusherClient()
    const handler = ({ current }: { current: string }) => {
      if (!isMountedRef.current) return
      if (current === 'connected') {
        setIsReconnecting(false)
        // Re-fetch state after reconnect to catch up on missed events
        fetch(`/api/match/${matchId}/state`)
          .then((r) => r.json())
          .then((fresh: MatchSnapshot) => {
            if (isMountedRef.current) setSnapshot(fresh)
          })
          .catch(() => {})
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
          ? {
              runs: (s.partnership?.runs ?? 0) + (data.runs ?? 0) + (data.extraRuns ?? 0),
              balls: (s.partnership?.balls ?? 0) + (data.isLegal ? 1 : 0),
              batter1Id: data.strikerId ?? s.strikerId,
              batter2Id: data.nonStrikerId ?? s.nonStrikerId,
            }
          : s.partnership,
      }
    })
  })

  useEvent(`match-${matchId}`, 'wicket.fell', (_data: WicketPayload) => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => { if (isMountedRef.current) setSnapshot(fresh) })
      .catch(() => {})
  })

  useEvent(`match-${matchId}`, 'innings.change', (_data: InningsChangePayload) => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => { if (isMountedRef.current) setSnapshot(fresh) })
      .catch(() => {})
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
    <div className="relative min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-hidden">
      {/* Dynamic Background Glow */}
      <div
        className="absolute top-0 left-0 w-full h-full opacity-[0.04] pointer-events-none transition-colors duration-1000"
        style={{ background: `radial-gradient(circle at 50% 0%, ${battingTeam.primaryColor}, transparent 70%)` }}
      />

      {/* Reconnecting banner */}
      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-yellow-600/90 backdrop-blur-sm py-2 font-stats text-sm text-yellow-100"
          >
            <WifiOff className="w-4 h-4" />
            Reconnecting to live feed…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stale-data notice */}
      {fetchError && (
        <div className="mb-3 rounded-lg border border-yellow-600/40 bg-yellow-600/10 px-4 py-2 font-stats text-xs text-yellow-400 text-center">
          {fetchError}
        </div>
      )}

      <div className="relative max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="text-center">
          <p className="font-stats text-xs text-gray-500 uppercase tracking-widest mb-1">
            {snapshot.format} · {snapshot.venue ?? 'Live Match'}
          </p>
          <div className="flex items-center justify-center gap-5">
            <span className="font-display text-2xl tracking-wider" style={{ color: snapshot.homeTeam.primaryColor }}>
              {snapshot.homeTeam.shortCode}
            </span>
            <span className="font-stats text-gray-600">vs</span>
            <span className="font-display text-2xl tracking-wider" style={{ color: snapshot.awayTeam.primaryColor }}>
              {snapshot.awayTeam.shortCode}
            </span>
          </div>
        </div>

        {/* 1st innings summary bar */}
        {snapshot.currentInnings === 2 && prevInnings && (
          <div className="bg-gray-900/60 rounded-xl px-5 py-3 border border-gray-800 flex items-center justify-between">
            <span className="font-stats text-sm text-gray-400">
              {snapshot.innings[0].battingTeamId === snapshot.homeTeam.id
                ? snapshot.homeTeam.shortCode
                : snapshot.awayTeam.shortCode}{' '}
              1st innings
            </span>
            <span className="font-display text-xl text-gray-200">
              {prevInnings.totalRuns}/{prevInnings.wickets}
              <span className="font-stats text-sm text-gray-500 ml-2">
                ({prevInnings.overs}.{prevInnings.balls} ov)
              </span>
            </span>
          </div>
        )}

        {/* Live score block */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-stats text-xs text-gray-500 uppercase tracking-wider">Batting</p>
              <p className="font-stats font-bold text-white">{battingTeam.name}</p>
            </div>
            <div className="text-right">
              <p className="font-stats text-xs text-gray-500 uppercase tracking-wider">Bowling</p>
              <p className="font-stats font-bold text-white">{bowlingTeam.name}</p>
            </div>
          </div>

          <div className="text-center my-4 overflow-hidden relative">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${inn?.totalRuns}-${inn?.wickets}`}
                initial={{ y: -20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="font-display text-8xl text-white tracking-wider leading-none"
              >
                {inn?.totalRuns ?? 0}/{inn?.wickets ?? 0}
              </motion.div>
            </AnimatePresence>
            <div className="font-stats text-gray-400 mt-2 text-lg">
              {inn?.overs ?? 0}.{inn?.balls ?? 0} overs
              {inn?.target && (
                <span className="ml-3 text-yellow-400">
                  · Target {inn.target} · Need{' '}
                  {Math.max(0, inn.target - inn.totalRuns)} off{' '}
                  {Math.max(0, (snapshot.totalOvers - inn.overs) * (snapshot.ballsPerOver ?? 6) - inn.balls)} balls
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-10 font-stats text-sm border-t border-gray-800 pt-4 mt-3">
            <div className="text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">CRR</p>
              <p className="text-secondary font-semibold text-xl">{snapshot.currentRunRate.toFixed(2)}</p>
            </div>
            {snapshot.requiredRunRate !== null && snapshot.currentInnings === 2 && (
              <div className="text-center">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">RRR</p>
                <p
                  className="font-semibold text-xl"
                  style={{
                    color:
                      snapshot.requiredRunRate > snapshot.currentRunRate + 2
                        ? '#ef4444'
                        : snapshot.requiredRunRate > snapshot.currentRunRate
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                >
                  {snapshot.requiredRunRate.toFixed(2)}
                </p>
              </div>
            )}
            {snapshot.partnership && (
              <div className="text-center flex flex-col items-center">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Partnership</p>
                <div className="relative w-14 h-14 flex items-center justify-center rounded-full border border-gray-700 bg-gray-800">
                  {/* Subtle indication of partnership scale could be added here */}
                  <div className="flex flex-col items-center leading-none mt-0.5">
                    <span className="text-white font-semibold text-lg">{snapshot.partnership.runs}</span>
                    <span className="text-gray-500 font-stats text-[10px] uppercase">runs</span>
                  </div>
                </div>
                <p className="text-gray-400 font-stats text-xs mt-1">({snapshot.partnership.balls} balls)</p>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Graphs */}
        <MatchGraphs snapshot={snapshot} />

        {/* Batting scorecard - Cards Layout */}
        <div className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h2 className="font-stats font-semibold text-gray-400 uppercase tracking-wider text-xs">Batting</h2>
            <span className="font-stats text-xs text-gray-500">{battingTeam.shortCode}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {snapshot.batters.map((b) => (
                <motion.div
                  key={b.playerId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-gray-900/80 backdrop-blur-sm border ${
                    b.playerId === snapshot.strikerId ? 'border-secondary/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-gray-800'
                  } rounded-xl p-4 flex flex-col gap-2 transition-colors ${b.isOut ? 'opacity-50 grayscale' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-stats text-sm font-semibold text-gray-200 flex items-center gap-2">
                      <div className="relative flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500 opacity-60" />
                        {b.playerId === snapshot.strikerId && (
                          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span>{b.displayName} {b.playerId === snapshot.nonStrikerId && <span className="text-gray-500 text-[10px] ml-1">▼</span>}</span>
                      </div>
                    </div>
                    <div className="font-display text-3xl leading-none">{b.runs}</div>
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <div className="font-stats text-xs text-gray-500 truncate max-w-[120px]">
                      {b.isOut ? `b. ${b.dismissalType}` : 'Not Out'}
                    </div>
                    <div className="flex gap-3 font-stats text-xs text-gray-400">
                      <span>B: <strong className="text-gray-300">{b.balls}</strong></span>
                      <span>4s: <strong className="text-gray-300">{b.fours}</strong></span>
                      <span>6s: <strong className="text-gray-300">{b.sixes}</strong></span>
                      <span>SR: <strong className="text-gray-300">{b.strikeRate.toFixed(1)}</strong></span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {snapshot.batters.length === 0 && (
              <div className="col-span-1 sm:col-span-2 py-8 text-center bg-gray-900/60 border border-gray-800 rounded-xl font-stats text-gray-600 text-sm">
                Innings not started
              </div>
            )}
          </div>
        </div>

        {/* Bowling scorecard - Cards Layout */}
        <div className="space-y-3 pb-4">
          <div className="px-1 flex items-center justify-between">
            <h2 className="font-stats font-semibold text-gray-400 uppercase tracking-wider text-xs">Bowling</h2>
            <span className="font-stats text-xs text-gray-500">{bowlingTeam.shortCode}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {snapshot.bowlers.map((b) => (
                <motion.div
                  key={b.playerId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-gray-900/80 backdrop-blur-sm border ${
                    b.isCurrent ? 'border-accent/40 shadow-[0_0_15px_rgba(139,92,246,0.1)]' : 'border-gray-800'
                  } rounded-xl p-4 flex flex-col gap-2 transition-colors`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-stats text-sm font-semibold text-gray-200 flex items-center gap-2">
                      {b.isCurrent && <span className="text-accent text-[10px]">▶</span>}
                      {b.displayName}
                    </div>
                    <div className="font-display text-3xl leading-none text-gray-300">
                      {b.wickets}<span className="text-lg text-gray-600 mx-1">-</span>{b.runs}
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <div className="font-stats text-xs text-gray-500">
                      {b.overs}.{b.balls} Overs
                    </div>
                    <div className="flex gap-4 font-stats text-xs text-gray-400">
                      <span>M: <strong className="text-gray-300">{b.maidens}</strong></span>
                      <span>Econ: <strong className="text-gray-300">{b.economy.toFixed(1)}</strong></span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {snapshot.bowlers.length === 0 && (
              <div className="col-span-1 sm:col-span-2 py-8 text-center bg-gray-900/60 border border-gray-800 rounded-xl font-stats text-gray-600 text-sm">
                No bowling data yet
              </div>
            )}
          </div>
        </div>

        {/* Status footer */}
        <div className="flex items-center justify-center gap-2 pb-4">
          {snapshot.status === 'active' && (
            <><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="font-stats text-xs text-gray-600 uppercase tracking-wider">Live</span></>
          )}
          {snapshot.status === 'paused' && (
            <span className="font-stats text-xs text-yellow-600 uppercase tracking-wider">Paused</span>
          )}
          {snapshot.status === 'break' && (
            <span className="font-stats text-xs text-orange-500 uppercase tracking-wider">Break in play</span>
          )}
          {snapshot.status === 'complete' && (
            <span className="font-display text-2xl text-gray-500 tracking-wider">MATCH COMPLETE</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function ViewerClient({ matchId, initialSnapshot }: ViewerClientProps) {
  return (
    <PusherProvider>
      <LiveScoreboard matchId={matchId} initialSnapshot={initialSnapshot} />
    </PusherProvider>
  )
}
