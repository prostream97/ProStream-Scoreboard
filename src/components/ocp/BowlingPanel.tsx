'use client'

import { useMatchStore } from '@/store/matchStore'

export function BowlingPanel() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const currentOverBalls = useMatchStore((s) => s.currentOverBalls)
  if (!snapshot) return null

  // Fall back to squad list when bowler hasn't bowled a delivery yet
  const currentBowlerId = snapshot.currentBowlerId
  const currentBowler = snapshot.bowlers.find((b) => b.isCurrent) ?? (() => {
    if (!currentBowlerId) return undefined
    const p = snapshot.bowlingTeamPlayers.find((tp) => tp.id === currentBowlerId)
    if (!p) return undefined
    return {
      playerId: currentBowlerId,
      playerName: p.name,
      displayName: p.displayName,
      overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0,
      isCurrent: true,
    }
  })()

  return (
    <div className="bg-gray-900 rounded-xl p-4 h-full flex flex-col gap-4">
      <h3 className="font-stats text-xs text-gray-400 uppercase tracking-wider">Bowling</h3>

      {/* Current bowler */}
      {currentBowler ? (
        <div className="bg-gray-800 rounded-lg p-3 border border-accent/30">
          <p className="font-stats font-semibold text-white mb-2">{currentBowler.displayName}</p>
          <div className="grid grid-cols-4 gap-1 text-center">
            {[
              { label: 'O', value: `${currentBowler.overs}.${currentBowler.balls}` },
              { label: 'R', value: currentBowler.runs },
              { label: 'W', value: currentBowler.wickets },
              { label: 'Econ', value: currentBowler.economy.toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="font-stats text-xs text-gray-400">{label}</p>
                <p className="font-stats font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-3 opacity-40">
          <p className="font-stats text-gray-500">No bowler selected</p>
        </div>
      )}

      {/* Current over dot log */}
      <div>
        <p className="font-stats text-xs text-gray-400 uppercase tracking-wider mb-2">This Over</p>
        <div className="flex gap-2 flex-wrap">
          {currentOverBalls.map((ball, i) => (
            <BallDot key={i} ball={ball} />
          ))}
          {currentOverBalls.length === 0 && (
            <span className="font-stats text-xs text-gray-600">—</span>
          )}
        </div>
      </div>

      {/* Other bowlers */}
      {snapshot.bowlers.filter((b) => !b.isCurrent).length > 0 && (
        <div className="mt-auto">
          <p className="font-stats text-xs text-gray-400 uppercase tracking-wider mb-2">Bowlers</p>
          <div className="space-y-1">
            {snapshot.bowlers
              .filter((b) => !b.isCurrent)
              .map((b) => (
                <div key={b.playerId} className="flex justify-between font-stats text-sm">
                  <span className="text-gray-300">{b.displayName}</span>
                  <span className="text-gray-400">
                    {b.overs}.{b.balls}-{b.runs}-{b.wickets}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BallDot({ ball }: { ball: { runs: number; isWicket: boolean; extraType: string | null; isLegal: boolean } }) {
  if (ball.isWicket) {
    return (
      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-stats text-xs font-bold text-white">
        W
      </div>
    )
  }
  if (ball.extraType === 'wide') {
    return (
      <div className="w-8 h-8 rounded-full bg-yellow-600/30 border border-yellow-600 flex items-center justify-center font-stats text-xs text-yellow-400">
        Wd
      </div>
    )
  }
  if (ball.extraType === 'noball') {
    return (
      <div className="w-8 h-8 rounded-full bg-orange-600/30 border border-orange-600 flex items-center justify-center font-stats text-xs text-orange-400">
        Nb
      </div>
    )
  }
  if (ball.runs === 4) {
    return (
      <div className="w-8 h-8 rounded-full bg-secondary/20 border border-secondary flex items-center justify-center font-stats text-xs font-bold text-secondary">
        4
      </div>
    )
  }
  if (ball.runs === 6) {
    return (
      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center font-stats text-xs font-bold text-primary">
        6
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-stats text-xs text-gray-300">
      {ball.runs === 0 ? '·' : ball.runs}
    </div>
  )
}
