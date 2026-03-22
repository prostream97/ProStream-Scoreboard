'use client'

import { useEffect } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import type { ExtraType } from '@/types/match'

export function ScoringControls() {
  const snapshot = useMatchStore((s) => s.snapshot)
  const addDelivery = useMatchStore((s) => s.addDelivery)
  const undoDelivery = useMatchStore((s) => s.undoDelivery)
  const openWicketModal = useUIStore((s) => s.openWicketModal)

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
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Ignore when typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return

      switch (e.key) {
        case '0': scoreRuns(0); break
        case '1': scoreRuns(1); break
        case '2': scoreRuns(2); break
        case '3': scoreRuns(3); break
        case '4': scoreRuns(4); break
        case '6': scoreRuns(6); break
        case 'w':
        case 'W': openWicketModal(); break
        case 'u':
        case 'U': undoDelivery(); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, snapshot])

  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="font-stats text-xs text-gray-400 uppercase tracking-wider">Scoring</h3>

      {/* Run buttons */}
      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 6].map((runs) => (
          <button
            key={runs}
            onClick={() => scoreRuns(runs)}
            disabled={!isActive}
            className={`
              h-14 rounded-lg font-display text-2xl tracking-wider transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              ${runs === 4
                ? 'bg-secondary/20 border-2 border-secondary text-secondary hover:bg-secondary/40'
                : runs === 6
                ? 'bg-primary/20 border-2 border-primary text-primary hover:bg-primary/40'
                : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700'
              }
            `}
          >
            {runs}
          </button>
        ))}
      </div>

      {/* Extras */}
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            { label: 'WD', type: 'wide' as ExtraType, color: 'yellow' },
            { label: 'NB', type: 'noball' as ExtraType, color: 'orange' },
            { label: 'BYE', type: 'bye' as ExtraType, color: 'gray' },
            { label: 'LB', type: 'legbye' as ExtraType, color: 'gray' },
          ] as const
        ).map(({ label, type, color }) => (
          <button
            key={type}
            onClick={() => scoreExtra(type)}
            disabled={!isActive}
            className={`
              h-10 rounded-lg font-stats text-sm font-semibold transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              ${color === 'yellow'
                ? 'bg-yellow-600/20 border border-yellow-600 text-yellow-400 hover:bg-yellow-600/40'
                : color === 'orange'
                ? 'bg-orange-600/20 border border-orange-600 text-orange-400 hover:bg-orange-600/40'
                : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Wicket + Undo */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={openWicketModal}
          disabled={!isActive}
          className="h-12 rounded-lg bg-red-600/20 border-2 border-red-600 text-red-400 font-stats font-bold text-lg hover:bg-red-600/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          WICKET
          <span className="text-xs ml-1 opacity-60">[W]</span>
        </button>
        <button
          onClick={() => undoDelivery()}
          className="h-12 rounded-lg bg-gray-800 border border-gray-600 text-gray-300 font-stats font-semibold hover:bg-gray-700 transition-all"
        >
          UNDO
          <span className="text-xs ml-1 opacity-60">[U]</span>
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="font-stats text-xs text-gray-600 text-center">
        Keys: 0–6 · W=Wicket · U=Undo
      </p>
    </div>
  )
}
