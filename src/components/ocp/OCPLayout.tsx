'use client'

import { useEffect } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { ScoreHeader } from './ScoreHeader'
import { BattingPanel } from './BattingPanel'
import { ScoringControls } from './ScoringControls'
import { BowlingPanel } from './BowlingPanel'
import { MatchControls } from './MatchControls'
import { DisplayControls } from './DisplayControls'
import { WicketModal } from './WicketModal'
import { BowlerSelect } from './BowlerSelect'
import { PusherProvider, useEvent } from '@/components/shared/PusherProvider'
import type { MatchSnapshot } from '@/types/match'
import type { DeliveryAddedPayload, OverCompletePayload } from '@/types/pusher'

type OCPLayoutProps = {
  initialSnapshot: MatchSnapshot
}

function OCPInner({ initialSnapshot }: OCPLayoutProps) {
  const hydrate = useMatchStore((s) => s.hydrate)
  const updateFromPusher = useMatchStore((s) => s.updateFromPusher)
  const legalDeliveryCount = useMatchStore((s) => s.legalDeliveryCount)
  const openBowlerSelect = useUIStore((s) => s.openBowlerSelect)
  const isBowlerSelectOpen = useUIStore((s) => s.isBowlerSelectOpen)

  // Hydrate Zustand from server-fetched snapshot — inside useEffect to avoid SSR mismatch
  useEffect(() => {
    hydrate(initialSnapshot)
  }, [hydrate, initialSnapshot])

  // Watch for over completion (6 legal deliveries) — open BowlerSelect
  // isBowlerSelectOpen guard prevents double-opening within same render cycle
  useEffect(() => {
    if (legalDeliveryCount === 6 && !isBowlerSelectOpen) {
      openBowlerSelect()
    }
  }, [legalDeliveryCount, isBowlerSelectOpen, openBowlerSelect])

  // Keep operator view in sync with Pusher (multi-device safety)
  useEvent(`match-${initialSnapshot.matchId}`, 'delivery.added', (data: DeliveryAddedPayload) => {
    updateFromPusher({
      strikerId: data.strikerId,
      nonStrikerId: data.nonStrikerId,
    })
  })

  useEvent(`match-${initialSnapshot.matchId}`, 'over.complete', (_data: OverCompletePayload) => {
    // Handled locally via legalDeliveryCount watcher above
  })

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] bg-gray-950">
      {/* Top: score header */}
      <ScoreHeader />

      {/* Middle: three-column OCP */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        <BattingPanel />
        <ScoringControls />
        <BowlingPanel />
      </div>

      {/* Bottom: match controls + display controls */}
      <MatchControls />
      <DisplayControls />

      {/* Modals */}
      <WicketModal />
      <BowlerSelect />
    </div>
  )
}

export function OCPLayout({ initialSnapshot }: OCPLayoutProps) {
  return (
    <PusherProvider>
      <OCPInner initialSnapshot={initialSnapshot} />
    </PusherProvider>
  )
}
