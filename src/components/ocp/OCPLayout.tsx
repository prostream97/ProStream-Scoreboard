'use client'

import { useEffect, useState } from 'react'
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
  const snapshot = useMatchStore((s) => s.snapshot)
  const winDetected = useMatchStore((s) => s.winDetected)
  const clearWinDetected = useMatchStore((s) => s.clearWinDetected)
  const openBowlerSelect = useUIStore((s) => s.openBowlerSelect)
  const isBowlerSelectOpen = useUIStore((s) => s.isBowlerSelectOpen)
  const router = useRouter()
  const [matchComplete, setMatchComplete] = useState(false)

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
      setMatchComplete(true)
    }
  }, [winDetected, clearWinDetected])

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
      {matchComplete && snapshot && (
        <MatchCompleteModal snapshot={snapshot} onNavigate={() => router.push('/')} />
      )}
    </div>
  )
}

function MatchCompleteModal({ snapshot, onNavigate }: { snapshot: MatchSnapshot; onNavigate: () => void }) {
  const isTie = snapshot.resultType === 'tie'
  const winner = !isTie && snapshot.resultWinnerId
    ? (snapshot.resultWinnerId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam)
    : null

  let resultText = 'Match Complete'
  if (snapshot.resultType === 'tie') {
    resultText = 'Match Tied'
  } else if (winner && snapshot.resultMargin != null) {
    const unit = snapshot.resultType === 'wickets' ? 'wicket' : 'run'
    const suffix = snapshot.resultMargin === 1 ? unit : `${unit}s`
    resultText = `${winner.name} won by ${snapshot.resultMargin} ${suffix}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-[2rem] bg-[#f8faf7] p-8 shadow-[0_24px_70px_rgba(10,14,18,0.25)] text-center">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#10994c]">Match Complete</div>
        <h2 className="mb-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          {winner ? winner.name : 'Final Result'}
        </h2>
        <p className="mb-8 text-lg text-slate-600">{resultText}</p>
        <button
          onClick={onNavigate}
          className="w-full rounded-[1.2rem] bg-[#10994c] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0c7a3a]"
        >
          Back to Tournament
        </button>
      </div>
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
