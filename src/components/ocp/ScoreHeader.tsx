'use client'

import { useMatchStore } from '@/store/matchStore'

export function ScoreHeader() {
  const snapshot = useMatchStore((s) => s.snapshot)
  if (!snapshot) return null

  const { homeTeam, awayTeam, currentInningsState, currentRunRate, requiredRunRate, currentInnings } = snapshot
  const innings = currentInningsState

  const scoreText = innings
    ? `${innings.totalRuns}/${innings.wickets}`
    : '0/0'

  const oversText = innings
    ? `${innings.overs}.${innings.balls}`
    : '0.0'

  const battingTeam = innings?.battingTeamId === homeTeam.id ? homeTeam : awayTeam
  const bowlingTeam = innings?.bowlingTeamId === homeTeam.id ? homeTeam : awayTeam

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Batting team */}
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-8 rounded-sm"
            style={{ backgroundColor: battingTeam.primaryColor }}
          />
          <div>
            <p className="font-stats text-xs text-gray-400 uppercase tracking-wider">Batting</p>
            <p className="font-stats font-semibold text-white">{battingTeam.shortCode}</p>
          </div>
        </div>

        {/* Score */}
        <div className="text-center">
          <div className="font-display text-5xl text-white tracking-wider leading-none">
            {scoreText}
          </div>
          <div className="font-stats text-sm text-gray-400 mt-0.5">
            {oversText} ov
            {innings?.target && (
              <span className="ml-2 text-overlay-lime">
                Target: {innings.target}
              </span>
            )}
          </div>
        </div>

        {/* Run rates */}
        <div className="text-right space-y-1">
          <div className="font-stats text-sm">
            <span className="text-gray-400">CRR </span>
            <span className="text-secondary font-semibold">{currentRunRate.toFixed(2)}</span>
          </div>
          {requiredRunRate !== null && currentInnings === 2 && (
            <div className="font-stats text-sm">
              <span className="text-gray-400">RRR </span>
              <span
                className="font-semibold"
                style={{ color: requiredRunRate > currentRunRate ? '#ef4444' : '#10B981' }}
              >
                {requiredRunRate.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Bowling team */}
        <div className="flex items-center gap-3">
          <div>
            <p className="font-stats text-xs text-gray-400 uppercase tracking-wider text-right">Bowling</p>
            <p className="font-stats font-semibold text-white text-right">{bowlingTeam.shortCode}</p>
          </div>
          <div
            className="w-3 h-8 rounded-sm"
            style={{ backgroundColor: bowlingTeam.primaryColor }}
          />
        </div>
      </div>
    </div>
  )
}
