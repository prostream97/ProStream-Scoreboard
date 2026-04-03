'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { toast } from 'sonner'
import type { ExtraType, DeliveryRecord } from '@/types/match'

function ballDotColor(ball: DeliveryRecord): string {
  if (ball.isWicket) return 'bg-red-500 text-white'
  if (ball.extraType === 'wide') return 'bg-yellow-500 text-black'
  if (ball.extraType === 'noball') return 'bg-orange-500 text-black'
  if (ball.runs === 6) return 'bg-primary text-white'
  if (ball.runs === 4) return 'bg-secondary text-black'
  if (ball.runs === 0) return 'bg-gray-700 text-gray-400'
  return 'bg-gray-600 text-white'
}

function ballDotLabel(ball: DeliveryRecord): string {
  if (ball.isWicket) return 'W'
  if (ball.extraType === 'wide') return 'Wd'
  if (ball.extraType === 'noball') return 'Nb'
  if (ball.extraType === 'bye') return 'B'
  if (ball.extraType === 'legbye') return 'Lb'
  return String(ball.runs)
}

type PendingExtra = 'wide' | 'noball' | null

export function ScoringControls() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const addDelivery = useMatchStore((s) => s.addDelivery)
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
      dismissalType: null,
      fielder1Id: null,
      fielder2Id: null,
    })
    
    if (runs === 4 || runs === 6) {
      toast.success(`${runs} RUNS!`, { description: 'Boundary scored', icon: '🔥' })
    } else {
      toast(`+${runs} runs scored`, { className: 'bg-gray-800 text-white border-gray-700' })
    }
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
    
    toast(`+${extraRuns} ${type.toUpperCase()}`, { className: 'bg-gray-800 text-gray-300 border-gray-700' })
  }

  // Confirm a wide delivery: extraRuns = 1 (penalty) + additional runs
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
    toast.warning(`WIDE + ${additionalRuns} runs`, { icon: '⚠️' })
  }

  // Confirm a no-ball delivery: runs = bat runs, extraRuns = 1 (penalty always)
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
    toast.error(`NO BALL + ${batRuns} runs off bat`, { icon: '🚨' })
  }

  // Show a toast whenever a sync error is set, with a dismiss+clear action
  useEffect(() => {
    if (!syncError) return
    toast.error(syncError, {
      duration: Infinity,
      action: { label: 'Dismiss', onClick: clearSyncError },
    })
  }, [syncError, clearSyncError])

  const pendingBalls = currentOverBalls.length - flushedBallCount

  // Keyboard shortcuts — disabled when a pending extra is waiting for confirmation
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
  }, [isActive, pendingExtra, addDelivery, undoDelivery, openWicketModal])

  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
      {/* Header + sync status */}
      <div className="flex items-center justify-between">
        <h3 className="font-stats text-xs text-gray-400 uppercase tracking-wider">Scoring</h3>
        <span className={`font-stats text-[10px] flex items-center gap-1 ${
          syncError ? 'text-red-400' : isFlushing ? 'text-yellow-400' : pendingBalls > 0 ? 'text-orange-400' : 'text-emerald-500'
        }`}>
          {syncError
            ? '✗ Sync error'
            : isFlushing
            ? '⟳ Syncing…'
            : pendingBalls > 0
            ? `⚠ ${pendingBalls} unsaved`
            : '● Synced'}
        </span>
      </div>

      {/* Over visualizer — current over ball dots */}
      {currentOverBalls.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {currentOverBalls.map((ball, i) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center rounded-full w-7 h-7 font-stats text-[10px] font-bold ${ballDotColor(ball)} ${i >= flushedBallCount ? 'ring-1 ring-white/20' : 'opacity-60'}`}
            >
              {ballDotLabel(ball)}
            </span>
          ))}
        </div>
      )}

      {/* Run buttons */}
      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 6].map((runs) => (
          <motion.button
            whileTap={isActive && !pendingExtra ? { scale: 0.92 } : undefined}
            key={runs}
            onClick={() => scoreRuns(runs)}
            disabled={!isActive || !!pendingExtra}
            className={`
              h-14 rounded-lg font-display text-2xl tracking-wider transition-colors shadow-sm
              disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-50
              ${runs === 4
                ? 'bg-secondary/20 border-2 border-secondary text-secondary hover:bg-secondary/40'
                : runs === 6
                ? 'bg-primary/20 border-2 border-primary text-primary hover:bg-primary/40'
                : 'bg-gray-800 border-b-2 border-gray-700 text-white hover:bg-gray-700'
              }
            `}
          >
            {runs}
          </motion.button>
        ))}
      </div>

      {/* ── Extras row OR pending-extra sub-panel ── */}
      <AnimatePresence mode="popLayout">
        {pendingExtra === null ? (
          /* Normal extras row */
          <motion.div
            key="extras-row"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-4 gap-2"
          >
            {(
              [
                { label: 'WD', type: 'wide' as ExtraType, color: 'yellow' },
                { label: 'NB', type: 'noball' as ExtraType, color: 'orange' },
                { label: 'BYE', type: 'bye' as ExtraType, color: 'gray' },
                { label: 'LB', type: 'legbye' as ExtraType, color: 'gray' },
              ] as const
            ).map(({ label, type, color }) => (
              <motion.button
                whileTap={isActive ? { scale: 0.92 } : undefined}
                key={type}
                onClick={() => {
                  if (type === 'wide' || type === 'noball') {
                    if (isActive) setPendingExtra(type)
                  } else {
                    scoreExtra(type)
                  }
                }}
                disabled={!isActive}
                className={`
                  h-10 rounded-lg font-stats text-sm font-semibold transition-colors shadow-sm
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-50
                  ${color === 'yellow'
                    ? 'bg-yellow-600/20 border border-yellow-600 text-yellow-400 hover:bg-yellow-600/40'
                    : color === 'orange'
                    ? 'bg-orange-600/20 border border-orange-600 text-orange-400 hover:bg-orange-600/40'
                    : 'bg-gray-800 border-b-2 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }
                `}
              >
                {label}
              </motion.button>
            ))}
          </motion.div>
        ) : pendingExtra === 'wide' ? (
          /* Wide sub-panel */
          <motion.div
            key="wide-panel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="rounded-lg border border-yellow-600/60 bg-yellow-600/20 p-3 flex flex-col gap-2 shadow-[0_0_15px_rgba(202,138,4,0.15)]"
          >
            <p className="font-stats text-xs text-yellow-500 uppercase tracking-wider font-semibold">
              Wide · Additional runs (1 penalty auto-added)
            </p>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <motion.button
                whileTap={{ scale: 0.92 }}
                key={n}
                onClick={() => confirmWide(n)}
                className="h-10 rounded-lg font-display text-xl bg-yellow-600/20 border border-yellow-600 text-yellow-300 hover:bg-yellow-600/40 transition-colors shadow-sm"
              >
                {n}
              </motion.button>
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setPendingExtra(null)}
            className="w-full h-8 rounded-lg font-stats text-xs text-yellow-600/70 hover:text-yellow-500 bg-black/20 hover:bg-black/40 transition-colors"
          >
            Cancel [Esc]
          </motion.button>
        </motion.div>
      ) : (
        /* No Ball sub-panel */
        <motion.div
          key="noball-panel"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="rounded-lg border border-orange-600/60 bg-orange-600/20 p-3 flex flex-col gap-2 shadow-[0_0_15px_rgba(234,88,12,0.15)]"
        >
          <p className="font-stats text-xs text-orange-500 uppercase tracking-wider font-semibold">
            No Ball · Runs off the bat (1 NB penalty auto-added)
          </p>
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 6].map((n) => (
              <motion.button
                whileTap={{ scale: 0.92 }}
                key={n}
                onClick={() => confirmNoBall(n)}
                className={`
                  h-10 rounded-lg font-display text-xl border transition-colors shadow-sm
                  ${n === 4
                    ? 'bg-orange-600/20 border-2 border-orange-400 text-orange-300 hover:bg-orange-600/40'
                    : n === 6
                    ? 'bg-orange-700/30 border-2 border-orange-300 text-orange-200 hover:bg-orange-600/40'
                    : 'bg-orange-600/20 border border-orange-600 text-orange-300 hover:bg-orange-600/40'
                  }
                `}
              >
                {n}
              </motion.button>
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setPendingExtra(null)}
            className="w-full h-8 rounded-lg font-stats text-xs text-orange-600/70 hover:text-orange-500 bg-black/20 hover:bg-black/40 transition-colors"
          >
            Cancel [Esc]
          </motion.button>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Wicket + Undo */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <motion.button
          whileTap={isActive && !pendingExtra ? { scale: 0.95 } : undefined}
          onClick={openWicketModal}
          disabled={!isActive || !!pendingExtra}
          className="h-12 rounded-lg bg-red-600/20 border-b-4 border-t border-l border-r border-red-600 text-red-500 font-stats font-bold text-lg hover:bg-red-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-50 shadow-sm"
        >
          WICKET
          <span className="text-xs ml-1.5 opacity-70 font-mono tracking-tighter shadow-inner px-1.5 py-0.5 rounded bg-black/20">W</span>
        </motion.button>
        <motion.button
          whileHover={!pendingExtra ? { x: -2 } : undefined}
          whileTap={!pendingExtra ? { scale: 0.95 } : undefined}
          onClick={() => { setPendingExtra(null); undoDelivery(); toast.info('Delivery Undone', { description: 'Last action reverted.' }) }}
          disabled={!!pendingExtra}
          className="h-12 rounded-lg bg-gray-800 border-b-2 border-l border-r border-t border-gray-700 text-gray-300 font-stats font-semibold hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-50 relative overflow-hidden flex items-center justify-center gap-1.5 shadow-sm"
        >
          {/* Subtle icon/text positioning */}
          UNDO
          <span className="text-xs opacity-60 font-mono tracking-tighter px-1.5 py-0.5 shadow-inner rounded bg-black/30">U</span>
        </motion.button>
      </div>

      {/* Keyboard hint */}
      <p className="font-stats text-xs text-gray-500 text-center flex items-center justify-center gap-2 mt-2">
        {pendingExtra ? (
          <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Esc to cancel</span>
        ) : (
          <>
            <span>Keys: <kbd className="bg-gray-800 px-1 py-0.5 rounded border-b-2 border-gray-700 ml-1">0</kbd> – <kbd className="bg-gray-800 px-1 py-0.5 rounded border-b-2 border-gray-700 leading-none">6</kbd></span>
            <span className="text-gray-700">•</span>
            <span><kbd className="bg-red-900/40 text-red-400 px-1 py-0.5 rounded border-b-2 border-red-900/60 leading-none">W</kbd> Wicket</span>
            <span className="text-gray-700">•</span>
            <span><kbd className="bg-gray-800 px-1 py-0.5 rounded border-b-2 border-gray-700 leading-none">U</kbd> Undo</span>
          </>
        )}
      </p>
    </div>
  )
}
