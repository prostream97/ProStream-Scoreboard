'use client'

import { useEffect, useState } from 'react'
import { PusherProvider, useEvent } from '@/components/shared/PusherProvider'
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
    const completedOvers = b.overs + Math.floor(newLegal / 6)
    const ballsInOver = newLegal % 6
    const newRuns = b.runs + data.runs + data.extraRuns
    const totalLegal = completedOvers * 6 + ballsInOver
    return {
      ...b,
      overs: completedOvers,
      balls: ballsInOver,
      runs: newRuns,
      wickets: b.wickets + (data.isWicket ? 1 : 0),
      economy: totalLegal > 0 ? Math.round((newRuns / (totalLegal / 6)) * 100) / 100 : 0,
    }
  })
}

function LiveScoreboard({ matchId, initialSnapshot }: ViewerClientProps) {
  const [snapshot, setSnapshot] = useState<MatchSnapshot>(initialSnapshot)

  useEffect(() => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
      .catch(() => {})
  }, [matchId])

  useEvent(`match-${matchId}`, 'delivery.added', (data: DeliveryAddedPayload) => {
    setSnapshot((s) => {
      const updatedInnings: InningsState[] = s.innings.map((inn) =>
        inn.inningsNumber === s.currentInnings
          ? { ...inn, totalRuns: data.inningsRuns, wickets: data.inningsWickets, overs: data.inningsOvers, balls: data.inningsBalls }
          : inn,
      )
      const currentInningsState = updatedInnings.find((i) => i.inningsNumber === s.currentInnings) ?? null
      const totalBalls = (currentInningsState?.overs ?? 0) * 6 + (currentInningsState?.balls ?? 0)
      const currentRunRate = totalBalls > 0
        ? Math.round(((currentInningsState?.totalRuns ?? 0) / (totalBalls / 6)) * 100) / 100
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
        bowlers: applyDeliveryToBowlers(s.bowlers, data, s.bowlingTeamPlayers),
        partnership: s.strikerId && s.nonStrikerId
          ? {
              runs: (s.partnership?.runs ?? 0) + data.runs + data.extraRuns,
              balls: (s.partnership?.balls ?? 0) + (data.isLegal ? 1 : 0),
              batter1Id: data.strikerId,
              batter2Id: data.nonStrikerId,
            }
          : s.partnership,
      }
    })
  })

  useEvent(`match-${matchId}`, 'wicket.fell', (_data: WicketPayload) => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
      .catch(() => {})
  })

  useEvent(`match-${matchId}`, 'innings.change', (_data: InningsChangePayload) => {
    fetch(`/api/match/${matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => setSnapshot(fresh))
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
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-5">

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

          <div className="text-center my-4">
            <div className="font-display text-8xl text-white tracking-wider leading-none">
              {inn?.totalRuns ?? 0}/{inn?.wickets ?? 0}
            </div>
            <div className="font-stats text-gray-400 mt-2 text-lg">
              {inn?.overs ?? 0}.{inn?.balls ?? 0} overs
              {inn?.target && (
                <span className="ml-3 text-yellow-400">
                  · Target {inn.target} · Need{' '}
                  {Math.max(0, inn.target - inn.totalRuns)} off{' '}
                  {Math.max(0, (snapshot.totalOvers - inn.overs) * 6 - inn.balls)} balls
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
              <div className="text-center">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Partnership</p>
                <p className="text-white font-semibold text-xl">
                  {snapshot.partnership.runs}
                  <span className="text-gray-500 font-normal text-sm ml-1">
                    ({snapshot.partnership.balls}b)
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Batting scorecard */}
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-stats font-semibold text-gray-400 uppercase tracking-wider text-xs">Batting</h2>
            <span className="font-stats text-xs text-gray-500">{battingTeam.shortCode}</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="font-stats text-xs text-gray-600 uppercase">
                <th className="text-left px-4 py-2">Batter</th>
                <th className="text-right px-3 py-2">R</th>
                <th className="text-right px-3 py-2">B</th>
                <th className="text-right px-3 py-2">4s</th>
                <th className="text-right px-3 py-2">6s</th>
                <th className="text-right px-4 py-2">SR</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.batters.map((b) => (
                <tr
                  key={b.playerId}
                  className={`border-t border-gray-800/60 transition-colors ${
                    b.playerId === snapshot.strikerId ? 'bg-secondary/5' : b.isOut ? 'opacity-40' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-stats text-sm">
                    {b.playerId === snapshot.strikerId && <span className="text-secondary mr-1 font-bold">*</span>}
                    {b.playerId === snapshot.nonStrikerId && <span className="text-gray-600 mr-1">†</span>}
                    {b.displayName}
                    {b.isOut && <span className="text-gray-600 text-xs ml-1.5">({b.dismissalType})</span>}
                  </td>
                  <td className="text-right px-3 py-2.5 font-stats text-sm font-bold text-white">{b.runs}</td>
                  <td className="text-right px-3 py-2.5 font-stats text-sm text-gray-400">{b.balls}</td>
                  <td className="text-right px-3 py-2.5 font-stats text-sm text-gray-400">{b.fours}</td>
                  <td className="text-right px-3 py-2.5 font-stats text-sm text-gray-400">{b.sixes}</td>
                  <td className="text-right px-4 py-2.5 font-stats text-sm text-gray-400">{b.strikeRate.toFixed(1)}</td>
                </tr>
              ))}
              {snapshot.batters.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center font-stats text-gray-700 text-sm">Innings not started</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bowling scorecard */}
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-stats font-semibold text-gray-400 uppercase tracking-wider text-xs">Bowling</h2>
            <span className="font-stats text-xs text-gray-500">{bowlingTeam.shortCode}</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="font-stats text-xs text-gray-600 uppercase">
                <th className="text-left px-4 py-2">Bowler</th>
                <th className="text-right px-3 py-2">O</th>
                <th className="text-right px-3 py-2">M</th>
                <th className="text-right px-3 py-2">R</th>
                <th className="text-right px-3 py-2">W</th>
                <th className="text-right px-4 py-2">Econ</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.bowlers.map((b) => (
                <tr key={b.playerId} className={`border-t border-gray-800/60 ${b.isCurrent ? 'bg-accent/5' : ''}`}>
                  <td className="px-4 py-2.5 font-stats text-sm">
                    {b.isCurrent && <span className="text-accent mr-1.5 text-xs">▶</span>}
                    {b.displayName}
                  </td>
                  <td className="text-right px-3 py-2.5 font-stats text-sm text-gray-400">{b.overs}.{b.balls}</td>
                  <td className="text-right px-3 py-2.5 font-stats text-sm text-gray-400">{b.maidens}</td>
                  <td className="text-right px-3 py-2.5 font-stats text-sm text-gray-400">{b.runs}</td>
                  <td className="text-right px-3 py-2.5 font-stats text-sm font-bold text-white">{b.wickets}</td>
                  <td className="text-right px-4 py-2.5 font-stats text-sm text-gray-400">{b.economy.toFixed(1)}</td>
                </tr>
              ))}
              {snapshot.bowlers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center font-stats text-gray-700 text-sm">No bowling data yet</td></tr>
              )}
            </tbody>
          </table>
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
