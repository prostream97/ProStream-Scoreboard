'use client'

import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { EditIcon } from '@/components/shared/EditIcon'



const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!

export function BowlingPanel() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const currentOverBalls = useMatchStore((s) => s.currentOverBalls)
  const legalDeliveryCount = useMatchStore((s) => s.legalDeliveryCount)
  const openPlayerEdit = useUIStore((s) => s.openPlayerEdit)
  const openBowlerSelect = useUIStore((s) => s.openBowlerSelect)
  const isBowlerSelectOpen = useUIStore((s) => s.isBowlerSelectOpen)
  const setDisplay = useUIStore((s) => s.setDisplay)
  const activePlayerId = useUIStore((s) => s.activePlayerId)
  const setActivePlayer = useUIStore((s) => s.setActivePlayer)
  if (!snapshot) return null

  async function showPlayerCard(playerId: number) {
    setDisplay('playerCard', true)
    setActivePlayer(playerId)
    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot!.matchId,
        event: 'display.toggle',
        payload: { element: 'playerCard', visible: true, playerId },
      }),
    })
  }

  async function hidePlayerCard() {
    setDisplay('playerCard', false)
    setActivePlayer(null)
    await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: snapshot!.matchId,
        event: 'display.toggle',
        payload: { element: 'playerCard', visible: false },
      }),
    })
  }

  const currentBowlerId = snapshot.currentBowlerId
  const bowlingTeamId = snapshot.currentInningsState?.bowlingTeamId
  const canChangeBowler =
    snapshot.status === 'active'
    && currentOverBalls.length === 0
    && legalDeliveryCount === 0
    && !isBowlerSelectOpen
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

  const bowlerHeadshot = currentBowler
    ? snapshot.bowlingTeamPlayers.find((p) => p.id === currentBowler.playerId)?.headshotCloudinaryId ?? null
    : null

  return (
    <section className="rounded-[1.8rem] border border-[#0400ff] bg-white p-4 shadow-[0_18px_45px_rgba(26,36,32,0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="app-kicker">Bowling</p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Current spell</h3>
        </div>
        {canChangeBowler ? (
          <button
            onClick={openBowlerSelect}
            className="rounded-full border border-black bg-[#f4f7f2] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-[#e9efe5]"
          >
            {currentBowlerId ? 'Change bowler' : 'Select bowler'}
          </button>
        ) : null}
      </div>

      {currentBowler ? (
        <div className="rounded-[1.4rem] border border-[#d2def2] bg-[#eef4fb] p-4">
          <div className="flex items-start gap-3">
            {bowlerHeadshot ? (
              <img
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_40,h_40,f_webp/${bowlerHeadshot}`}
                className="h-10 w-10 rounded-full object-cover"
                alt=""
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500">
                {currentBowler.displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{currentBowler.displayName}</p>
                  <p className="text-sm text-slate-500">Current bowler</p>
                </div>
                <div className="flex items-center gap-2">
                  {activePlayerId === currentBowler.playerId ? (
                    <button
                      onClick={hidePlayerCard}
                      className="rounded-full border border-[#f5c6c4] bg-[#fff1f0] px-3 py-1.5 text-xs font-semibold text-[#c54e4c] transition hover:bg-[#ffe5e3]"
                      style={{ borderColor: '#f5c6c4', backgroundColor: '#fff1f0', color: '#c54e4c' }}
                      title="Hide player card"
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => showPlayerCard(currentBowler.playerId)}
                      className="rounded-full border border-[#b8e4cc] bg-[#00b336] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#dff0e4]"
                      style={{ borderColor: '#b8e4cc', backgroundColor: '#00b336', color: '#ffffff' }}
                      title="Show player card on overlay"
                    >
                      Show
                    </button>
                  )}
                  {bowlingTeamId ? (
                    <button
                      onClick={() => openPlayerEdit(currentBowler.playerId, bowlingTeamId)}
                      className="rounded-full border border-[#737373] bg-white p-2 text-[#c54e4c] transition hover:bg-[#fff1f0]"
                      title="Edit player"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { label: 'Overs', value: `${currentBowler.overs}.${currentBowler.balls}` },
                  { label: 'Runs', value: currentBowler.runs },
                  { label: 'Wickets', value: currentBowler.wickets },
                  { label: 'Econ', value: currentBowler.economy.toFixed(1) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-[1rem] bg-white px-3 py-3 text-center">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.4rem] border border-dashed border-[#d7ddd6] px-4 py-6 text-sm text-slate-500">
          No bowler selected
        </div>
      )}

      <div className="mt-4">
        <p className="app-kicker !text-slate-400">This over</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {currentOverBalls.length === 0 ? <span className="text-sm text-slate-500">No deliveries yet</span> : currentOverBalls.map((ball, i) => (
            <BallDot key={`over-${snapshot.currentOver}-ball-${i}`} ball={ball} />
          ))}
        </div>
      </div>

      {snapshot.bowlers.filter((b) => !b.isCurrent).length > 0 ? (
        <div className="mt-4">
          <p className="app-kicker !text-slate-400">Other bowlers</p>
          <div className="mt-2 space-y-2">
            {snapshot.bowlers.filter((b) => !b.isCurrent).map((b) => (
              <div key={b.playerId} className="flex items-center justify-between rounded-[1.2rem] border border-[#e1e7df] bg-[#f8faf7] px-4 py-3 text-sm">
                <span className="flex-1 min-w-0 truncate mr-2 font-medium text-slate-900">{b.displayName}</span>
                <span className="text-slate-500">{b.overs}.{b.balls}-{b.runs}-{b.wickets}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function BallDot({ ball }: { ball: { runs: number; isWicket: boolean; extraType: string | null; isLegal: boolean } }) {
  if (ball.isWicket) {
    return <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/30 bg-[#ffc4c0] text-sm font-semibold text-black">W</div>
  }
  if (ball.extraType === 'wide') {
    return <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/30 bg-[#ffdca8] text-xs font-semibold text-black">Wd</div>
  }
  if (ball.extraType === 'noball') {
    return <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/30 bg-[#ffcdb3] text-xs font-semibold text-black">{ball.runs > 0 ? `${ball.runs}nb` : 'Nb'}</div>
  }
  if (ball.runs === 4) {
    return <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/30 bg-[#bee6ce] text-sm font-semibold text-black">4</div>
  }
  if (ball.runs === 6) {
    return <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/30 bg-[#bfdfff] text-sm font-semibold text-black">6</div>
  }
  return <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/30 bg-[#d5dfcf] text-sm font-semibold text-black">{ball.runs === 0 ? '.' : ball.runs}</div>
}
