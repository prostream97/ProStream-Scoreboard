'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { toast } from 'sonner'
import { AppBadge } from '@/components/shared/AppPrimitives'
import type { ExtraType, DeliveryRecord } from '@/types/match'

function ballDotColor(ball: DeliveryRecord): string {
  if (ball.isWicket) return 'bg-[#ffc4c0] text-black'
  if (ball.extraType === 'penalty') return 'bg-[#fcd0d0] text-black'
  if (ball.extraType === 'wide') return 'bg-[#ffdca8] text-black'
  if (ball.extraType === 'noball') return 'bg-[#ffcdb3] text-black'
  if (ball.runs === 6) return 'bg-[#bfdfff] text-black'
  if (ball.runs === 4) return 'bg-[#bee6ce] text-black'
  if (ball.runs === 0) return 'bg-[#d5dfcf] text-black'
  return 'bg-[#e3e3e3] text-black'
}

function ballDotLabel(ball: DeliveryRecord): string {
  if (ball.isWicket) return 'W'
  if (ball.extraType === 'penalty') return ball.extraRuns > 0 ? `P+${ball.extraRuns}` : ball.extraRuns < 0 ? `P${ball.extraRuns}` : 'P0'
  if (ball.extraType === 'wide') return ball.extraRuns > 1 ? `Wd${ball.extraRuns}` : 'Wd'
  if (ball.extraType === 'noball') return ball.runs > 0 ? `${ball.runs}nb` : 'Nb'
  if (ball.extraType === 'bye') return ball.extraRuns > 0 ? `${ball.extraRuns}B` : 'B'
  if (ball.extraType === 'legbye') return ball.extraRuns > 0 ? `${ball.extraRuns}Lb` : 'Lb'
  if (ball.runs === 4) return ball.isBoundary ? '4' : '4r'
  if (ball.runs === 6) return '6'
  return String(ball.runs)
}

type PendingExtra = 'wide' | 'noball' | 'penalty' | null

export function ScoringControls() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const addDelivery = useMatchStore((s) => s.addDelivery)
  const addPenaltyRuns = useMatchStore((s) => s.addPenaltyRuns)
  const undoDelivery = useMatchStore((s) => s.undoDelivery)
  const isFlushing = useMatchStore((s) => s.isFlushing)
  const syncError = useMatchStore((s) => s.syncError)
  const clearSyncError = useMatchStore((s) => s.clearSyncError)
  const flushedBallCount = useMatchStore((s) => s.flushedBallCount)
  const currentOverBalls = useMatchStore((s) => s.currentOverBalls)
  const openWicketModal = useUIStore((s) => s.openWicketModal)

  const [pendingExtra, setPendingExtra] = useState<PendingExtra>(null)

  const isActive = snapshot?.status === 'active'

  function scoreRuns(runs: number) {
    if (!isActive) return
    addDelivery({
      runs,
      extraRuns: 0,
      isLegal: true,
      extraType: null,
      isWicket: false,
      isBoundary: false,
      dismissalType: null,
      fielder1Id: null,
      fielder2Id: null,
    })
    toast(`+${runs} runs scored`)
  }

  function scoreBoundary(runs: 4 | 6) {
    if (!isActive) return
    addDelivery({
      runs,
      extraRuns: 0,
      isLegal: true,
      extraType: null,
      isWicket: false,
      isBoundary: true,
      dismissalType: null,
      fielder1Id: null,
      fielder2Id: null,
    })
    toast.success(runs === 6 ? 'SIX!' : 'FOUR!', { description: 'Boundary scored' })
  }

  function scoreExtra(type: ExtraType, extraRuns = 1) {
    if (!isActive) return
    const isLegal = type === 'bye' || type === 'legbye'
    addDelivery({
      runs: 0,
      extraRuns,
      isLegal,
      extraType: type,
      isWicket: false,
      dismissalType: null,
      fielder1Id: null,
      fielder2Id: null,
    })
    toast(`+${extraRuns} ${type.toUpperCase()}`)
  }

  function confirmWide(additionalRuns: number) {
    if (!isActive) return
    addDelivery({
      runs: 0,
      extraRuns: 1 + additionalRuns,
      isLegal: false,
      extraType: 'wide',
      isWicket: false,
      dismissalType: null,
      fielder1Id: null,
      fielder2Id: null,
    })
    setPendingExtra(null)
    toast.warning(`WIDE + ${additionalRuns} runs`)
  }

  function confirmNoBall(batRuns: number) {
    if (!isActive) return
    addDelivery({
      runs: batRuns,
      extraRuns: 1,
      isLegal: false,
      extraType: 'noball',
      isWicket: false,
      dismissalType: null,
      fielder1Id: null,
      fielder2Id: null,
    })
    setPendingExtra(null)
    toast.error(`NO BALL + ${batRuns} runs off bat`)
  }

  function scorePenaltyRuns(runs: number) {
    if (!isActive) return
    addPenaltyRuns(runs)
    setPendingExtra(null)
    if (runs > 0) toast.warning(`+${runs} penalty runs awarded`)
    else if (runs < 0) toast.warning(`${runs} penalty runs deducted`)
    else toast(`Penalty: 0 runs`)
  }

  useEffect(() => {
    if (!syncError) return
    toast.error(syncError, {
      duration: Infinity,
      action: { label: 'Dismiss', onClick: clearSyncError },
    })
  }, [syncError, clearSyncError])

  const pendingBalls = currentOverBalls.length - flushedBallCount

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return
      if (pendingExtra) {
        if (e.key === 'Escape') setPendingExtra(null)
        return
      }
      switch (e.key) {
        case '0': scoreRuns(0); break
        case '1': scoreRuns(1); break
        case '2': scoreRuns(2); break
        case '3': scoreRuns(3); break
        case '4': scoreRuns(4); break
        case '6': scoreRuns(6); break
        case 'w':
        case 'W':
          openWicketModal()
          break
        case 'u':
        case 'U':
          undoDelivery()
          toast.info('Delivery Undone', { description: 'Last action reverted.' })
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [pendingExtra, undoDelivery, openWicketModal])

  return (
    <section className="rounded-[1.8rem] border border-black bg-white p-4 shadow-[0_18px_45px_rgba(26,36,32,0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="app-kicker">Scoring controls</p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Live input pad</h3>
        </div>
        <AppBadge tone={syncError ? 'red' : isFlushing ? 'amber' : pendingBalls > 0 ? 'amber' : 'green'}>
          {syncError ? 'Sync error' : isFlushing ? 'Syncing' : pendingBalls > 0 ? `${pendingBalls} pending` : 'Synced'}
        </AppBadge>
      </div>

      {currentOverBalls.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2 text-black">
          {currentOverBalls.map((ball, i) => (
            <span
              key={i}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/30 text-xs font-semibold ${ballDotColor(ball)} ${i >= flushedBallCount ? 'ring-2 ring-black/20' : 'opacity-60'}`}
            >
              {ballDotLabel(ball)}
            </span>
          ))}
        </div>
      ) : null}

      {/* Normal run buttons: 0,1,2,3 + plain 4 (running between wickets) */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((runs) => (
          <motion.button
            whileTap={isActive && !pendingExtra ? { scale: 0.94 } : undefined}
            key={runs}
            onClick={() => scoreRuns(runs)}
            disabled={!isActive || !!pendingExtra}
            className="h-16 rounded-[1.2rem] border border-black bg-[#f4f7f2] text-slate-900 text-2xl font-semibold tracking-[-0.04em] transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {runs}
          </motion.button>
        ))}
      </div>

      {/* Boundary buttons: 4 (green) and 6 (blue) */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <motion.button
          whileTap={isActive && !pendingExtra ? { scale: 0.94 } : undefined}
          onClick={() => scoreBoundary(4)}
          disabled={!isActive || !!pendingExtra}
          className="h-16 rounded-[1.2rem] border border-black bg-[#0047a380] text-black text-2xl font-semibold tracking-[-0.04em] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          4
        </motion.button>
        <motion.button
          whileTap={isActive && !pendingExtra ? { scale: 0.94 } : undefined}
          onClick={() => scoreBoundary(6)}
          disabled={!isActive || !!pendingExtra}
          className="h-16 rounded-[1.2rem] border border-black bg-[#ebf5ff] text-black text-2xl font-semibold tracking-[-0.04em] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          6
        </motion.button>
      </div>

      <AnimatePresence mode="popLayout">
        {pendingExtra === null ? (
          <motion.div
            key="extras-row"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            {(
              [
                { label: 'WD', type: 'wide' as ExtraType, className: 'bg-[#fff5e7] text-black' },
                { label: 'NB', type: 'noball' as ExtraType, className: 'bg-[#fff1ec] text-[#d07b2b]' },
                { label: 'BYE', type: 'bye' as ExtraType, className: 'bg-[#f4f7f2] text-slate-700' },
                { label: 'LB', type: 'legbye' as ExtraType, className: 'bg-[#f4f7f2] text-slate-700' },
              ] as const
            ).map(({ label, type, className }) => (
              <button
                key={type}
                onClick={() => {
                  if (type === 'wide' || type === 'noball') {
                    if (isActive) setPendingExtra(type)
                  } else {
                    scoreExtra(type)
                  }
                }}
                disabled={!isActive}
                className={`h-12 rounded-[1.2rem] border border-black text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => { if (isActive) setPendingExtra('penalty') }}
              disabled={!isActive}
              className="h-12 rounded-[1.2rem] border border-black bg-[#ff808080] text-sm font-semibold text-[#b91c1c] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              PEN
            </button>
          </motion.div>
        ) : pendingExtra === 'wide' ? (
          <ExtraChooser
            title="Wide - additional runs"
            toneClass="bg-[#fff5e7] text-[#c98010]"
            values={[0, 1, 2, 3, 4]}
            onSelect={confirmWide}
            onCancel={() => setPendingExtra(null)}
          />
        ) : pendingExtra === 'noball' ? (
          <ExtraChooser
            title="No ball - runs off the bat"
            toneClass="bg-[#fff1ec] text-[#d07b2b]"
            values={[0, 1, 2, 3, 4, 6]}
            onSelect={confirmNoBall}
            onCancel={() => setPendingExtra(null)}
          />
        ) : (
          <PenaltyChooser
            onSelect={scorePenaltyRuns}
            onCancel={() => setPendingExtra(null)}
          />
        )}
      </AnimatePresence>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={openWicketModal}
          disabled={!isActive || !!pendingExtra}
          className="h-14 rounded-[1.2rem] border border-black bg-[#ffeceb] text-sm font-semibold uppercase tracking-[0.18em] text-[#ab0a07] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Wicket
        </button>
        <button
          onClick={() => { setPendingExtra(null); undoDelivery(); toast.info('Delivery Undone', { description: 'Last action reverted.' }) }}
          disabled={!!pendingExtra}
          className="h-14 rounded-[1.2rem] border border-black bg-[#f4f7f2] text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Shortcuts: 0-6 to score, W for wicket, U to undo, Esc to cancel extra mode.
      </p>
    </section>
  )
}

function PenaltyChooser({
  onSelect,
  onCancel,
}: {
  onSelect: (runs: number) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'award' | 'deduct'>('award')

  return (
    <motion.div
      key="penalty-chooser"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className="mt-4 rounded-[1.4rem] bg-[#fef2f2] p-4 text-[#b91c1c]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em]">Penalty runs</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setMode('award')}
          className={`h-9 flex-1 rounded-[0.8rem] text-sm font-semibold transition ${mode === 'award' ? 'bg-[#2eba1c] text-white' : 'bg-white text-slate-700'}`}
        >
          Award
        </button>
        <button
          onClick={() => setMode('deduct')}
          className={`h-9 flex-1 rounded-[0.8rem] text-sm font-semibold transition ${mode === 'deduct' ? 'bg-[#2eba1c] text-white' : 'bg-white text-slate-700'}`}
        >
          Deduct
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => onSelect(mode === 'award' ? n : -n)}
            className="h-12 rounded-[1rem] bg-white text-lg font-semibold text-slate-900"
          >
            {n}
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="mt-3 text-sm font-medium underline">
        Cancel
      </button>
    </motion.div>
  )
}

function ExtraChooser({
  title,
  toneClass,
  values,
  onSelect,
  onCancel,
}: {
  title: string
  toneClass: string
  values: number[]
  onSelect: (value: number) => void
  onCancel: () => void
}) {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className={`mt-4 rounded-[1.4rem] p-4 ${toneClass}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em]">{title}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {values.map((n) => (
          <button
            key={n}
            onClick={() => onSelect(n)}
            className="h-12 rounded-[1rem] bg-white text-lg font-semibold text-slate-900"
          >
            {n}
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="mt-3 text-sm font-medium underline">
        Cancel
      </button>
    </motion.div>
  )
}
