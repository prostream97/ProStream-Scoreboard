'use client'

import type { MatchSnapshot } from '@/types/match'

type Props = { snapshot: MatchSnapshot }

export function Scorebug({ snapshot }: Props) {
  const inn = snapshot.currentInningsState
  const batting =
    inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowling =
    inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.awayTeam : snapshot.homeTeam

  const oversStr = `${inn?.overs ?? 0}.${inn?.balls ?? 0}`

  return (
    // 1920×60 bottom bar — use OBS browser source at 1920×60
    <div
      className="flex items-center h-[60px] w-[1920px] font-stats overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
    >
      {/* Left accent bar */}
      <div className="w-1.5 h-full" style={{ backgroundColor: batting.primaryColor }} />

      {/* Team badges */}
      <div className="flex items-center gap-0 h-full">
        <div
          className="px-5 h-full flex items-center gap-3"
          style={{ backgroundColor: batting.primaryColor + '22' }}
        >
          <span
            className="font-display text-2xl tracking-widest"
            style={{ color: batting.primaryColor }}
          >
            {batting.shortCode}
          </span>
          <span className="font-display text-3xl text-white tracking-wider">
            {inn?.totalRuns ?? 0}/{inn?.wickets ?? 0}
          </span>
          <span className="text-gray-300 text-lg">
            ({oversStr})
          </span>
        </div>

        {/* vs divider */}
        <div className="px-4 text-gray-500 font-stats text-sm">vs</div>

        {/* Bowling team */}
        <div className="px-4 h-full flex items-center">
          <span className="font-display text-xl tracking-wider text-gray-400">
            {bowling.shortCode}
          </span>
        </div>
      </div>

      {/* Center: run rate */}
      <div className="flex-1 flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-gray-500 text-xs uppercase tracking-wider leading-none mb-0.5">CRR</p>
          <p className="text-secondary font-semibold text-lg leading-none">
            {snapshot.currentRunRate.toFixed(2)}
          </p>
        </div>
        {snapshot.requiredRunRate !== null && snapshot.currentInnings === 2 && (
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider leading-none mb-0.5">RRR</p>
            <p
              className="font-semibold text-lg leading-none"
              style={{
                color:
                  snapshot.requiredRunRate > snapshot.currentRunRate + 2
                    ? '#ef4444'
                    : '#10b981',
              }}
            >
              {snapshot.requiredRunRate.toFixed(2)}
            </p>
          </div>
        )}
        {inn?.target && snapshot.currentInnings === 2 && (
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider leading-none mb-0.5">Target</p>
            <p className="text-yellow-400 font-semibold text-lg leading-none">{inn.target}</p>
          </div>
        )}
      </div>

      {/* Right: format + status */}
      <div className="pr-6 text-right">
        <p className="text-gray-400 font-stats text-sm">{snapshot.format}</p>
        {snapshot.status === 'active' && (
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>

      {/* Right accent bar */}
      <div className="w-1.5 h-full" style={{ backgroundColor: bowling.primaryColor }} />
    </div>
  )
}
