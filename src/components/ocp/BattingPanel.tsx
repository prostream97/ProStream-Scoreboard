'use client'

import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { EditIcon } from '@/components/shared/EditIcon'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!

export function BattingPanel() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const openPlayerEdit = useUIStore((s) => s.openPlayerEdit)
  const setDisplay = useUIStore((s) => s.setDisplay)
  const activePlayerId = useUIStore((s) => s.activePlayerId)
  const setActivePlayer = useUIStore((s) => s.setActivePlayer)
  if (!snapshot) return null

  const { batters, strikerId, nonStrikerId, partnership, battingTeamPlayers, currentInningsState } = snapshot
  const battingTeamId = currentInningsState?.battingTeamId

  function resolveOrSynth(playerId: number | null, isStriker: boolean) {
    if (!playerId) return undefined
    const fromStats = batters.find((b) => b.playerId === playerId)
    if (fromStats) return fromStats
    const p = battingTeamPlayers.find((tp) => tp.id === playerId)
    if (!p) return undefined
    return {
      playerId,
      playerName: p.name,
      displayName: p.displayName,
      runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0,
      isStriker, isOut: false, dismissalType: null as null,
    }
  }

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

  const striker = resolveOrSynth(strikerId, true)
  const nonStriker = resolveOrSynth(nonStrikerId, false)

  return (
    <section className="rounded-[1.8rem] border border-[#d7ddd6] bg-white p-4 shadow-[0_18px_45px_rgba(26,36,32,0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="app-kicker">Batting</p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Current pair</h3>
        </div>
        {partnership ? <span className="text-sm font-medium text-[#10994c]">{partnership.runs} in {partnership.balls}</span> : null}
      </div>

      <div className="space-y-3">
        <BatterRow
          batter={striker}
          isStriker
          headshotId={strikerId ? battingTeamPlayers.find((p) => p.id === strikerId)?.headshotCloudinaryId ?? null : null}
          onEdit={strikerId && battingTeamId ? () => openPlayerEdit(strikerId, battingTeamId) : undefined}
          onShow={strikerId ? () => showPlayerCard(strikerId) : undefined}
          onHide={hidePlayerCard}
          isActive={strikerId !== null && activePlayerId === strikerId}
        />
        <BatterRow
          batter={nonStriker}
          isStriker={false}
          headshotId={nonStrikerId ? battingTeamPlayers.find((p) => p.id === nonStrikerId)?.headshotCloudinaryId ?? null : null}
          onEdit={nonStrikerId && battingTeamId ? () => openPlayerEdit(nonStrikerId, battingTeamId) : undefined}
          onShow={nonStrikerId ? () => showPlayerCard(nonStrikerId) : undefined}
          onHide={hidePlayerCard}
          isActive={nonStrikerId !== null && activePlayerId === nonStrikerId}
        />
      </div>
    </section>
  )
}

function BatterRow({
  batter,
  isStriker,
  headshotId,
  onEdit,
  onShow,
  onHide,
  isActive,
}: {
  batter: ReturnType<typeof useMatchStore.getState>['snapshot'] extends null ? undefined : NonNullable<ReturnType<typeof useMatchStore.getState>['snapshot']>['batters'][number] | undefined
  isStriker: boolean
  headshotId: string | null
  onEdit?: () => void
  onShow?: () => void
  onHide?: () => void
  isActive?: boolean
}) {
  if (!batter) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-[#d7ddd6] px-4 py-6 text-sm text-slate-500">
        Waiting for batter selection
      </div>
    )
  }

  return (
    <div className={`rounded-[1.4rem] border px-4 py-4 ${isStriker ? 'border-[#cce8d4] bg-[#eef8f1]' : 'border-[#e1e7df] bg-[#f8faf7]'}`}>
      <div className="flex items-start gap-3">
        {headshotId ? (
          <img
            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_40,h_40,f_webp/${headshotId}`}
            className="h-10 w-10 rounded-full object-cover"
            alt=""
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500">
            {batter.displayName[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">
                {isStriker ? '* ' : ''}{batter.displayName}
              </p>
              <p className="text-sm text-slate-500">{batter.isOut ? `b. ${batter.dismissalType}` : 'Not out'}</p>
            </div>
            <div className="flex items-center gap-2">
              {isActive ? (
                <button
                  onClick={onHide}
                  className="rounded-full border border-[#f5c6c4] bg-[#fff1f0] px-3 py-1.5 text-xs font-semibold text-[#c54e4c] transition hover:bg-[#ffe5e3]"
                  title="Hide player card"
                >
                  Hide
                </button>
              ) : onShow ? (
                <button
                  onClick={onShow}
                  className="rounded-full border border-[#b8e4cc] bg-[#eef8f1] px-3 py-1.5 text-xs font-semibold text-[#10994c] transition hover:bg-[#dff0e4]"
                  title="Show player card on overlay"
                >
                  Show
                </button>
              ) : null}
              {onEdit ? (
                <button onClick={onEdit} className="rounded-full bg-white p-2 text-[#c54e4c] transition hover:bg-[#fff1f0]" title="Edit player">
                  <EditIcon className="h-4 w-4" />
                </button>
              ) : null}
              <p className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">{batter.runs}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>{batter.balls}b</span>
            <span>{batter.fours}x4</span>
            <span>{batter.sixes}x6</span>
            <span>SR {batter.strikeRate.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
