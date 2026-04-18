'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMatchStore } from '@/store/matchStore'
import { useUIStore } from '@/store/uiStore'
import { OCPTopBar } from './OCPTopBar'
import { BattingPanel } from './BattingPanel'
import { ScoringControls } from './ScoringControls'
import { BowlingPanel } from './BowlingPanel'
import { OverlayPanel } from './OverlayPanel'
import { WicketModal } from './WicketModal'
import { BowlerSelect } from './BowlerSelect'
import { SquadPanel } from './SquadPanel'
import { PlayerEditModal } from './PlayerEditModal'
import { PusherProvider, useEvent } from '@/components/shared/PusherProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { MatchSnapshot } from '@/types/match'
import type { DeliveryAddedPayload, OverCompletePayload, WicketPayload } from '@/types/pusher'

type OCPLayoutProps = {
  initialSnapshot: MatchSnapshot
}

function OCPInner({ initialSnapshot }: OCPLayoutProps) {
  const hydrate = useMatchStore((s) => s.hydrate)
  const updateFromPusher = useMatchStore((s) => s.updateFromPusher)
  const legalDeliveryCount = useMatchStore((s) => s.legalDeliveryCount)
  const ballsPerOver = useMatchStore((s) => s.snapshot?.ballsPerOver ?? 6)
  const winDetected = useMatchStore((s) => s.winDetected)
  const clearWinDetected = useMatchStore((s) => s.clearWinDetected)
  const openBowlerSelect = useUIStore((s) => s.openBowlerSelect)
  const isBowlerSelectOpen = useUIStore((s) => s.isBowlerSelectOpen)
  const router = useRouter()

  useEffect(() => {
    hydrate(initialSnapshot)
  }, [hydrate, initialSnapshot])

  useEffect(() => {
    if (legalDeliveryCount === ballsPerOver && !isBowlerSelectOpen) {
      openBowlerSelect()
    }
  }, [legalDeliveryCount, ballsPerOver, isBowlerSelectOpen, openBowlerSelect])

  useEffect(() => {
    if (winDetected) {
      clearWinDetected()
      router.push('/')
    }
  }, [winDetected, clearWinDetected, router])

  useEvent(`match-${initialSnapshot.matchId}`, 'delivery.added', (data: DeliveryAddedPayload) => {
    updateFromPusher({
      strikerId: data.strikerId,
      nonStrikerId: data.nonStrikerId,
    })
  })

  useEvent(`match-${initialSnapshot.matchId}`, 'wicket.fell', (_data: WicketPayload) => {
    fetch(`/api/match/${initialSnapshot.matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => hydrate(fresh))
      .catch((err) => { console.warn('[OCPLayout] Wicket state refetch failed:', err) })
  })

  useEvent(`match-${initialSnapshot.matchId}`, 'over.complete', (_data: OverCompletePayload) => {
    // handled by legalDeliveryCount watcher
  })

  useEvent(`match-${initialSnapshot.matchId}`, 'state.refresh', () => {
    fetch(`/api/match/${initialSnapshot.matchId}/state`)
      .then((r) => r.json())
      .then((fresh: MatchSnapshot) => hydrate(fresh))
      .catch((err) => { console.warn('[OCPLayout] state.refresh refetch failed:', err) })
  })

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7faf5_0%,#eef3ed_100%)]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4">
        <OCPTopBar />

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
          <div className="grid gap-4">
            <BattingPanel />
            <BowlingPanel />
          </div>
          <ScoringControls />
          <OverlayPanel />
        </div>
      </div>

      <WicketModal />
      <BowlerSelect />
      <SquadPanel />
      <PlayerEditModal />
    </div>
  )
}

export function OCPLayout({ initialSnapshot }: OCPLayoutProps) {
  return (
    <ErrorBoundary>
      <PusherProvider>
        <OCPInner initialSnapshot={initialSnapshot} />
      </PusherProvider>
    </ErrorBoundary>
  )
}
