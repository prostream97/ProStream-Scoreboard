'use client'

import { AnimatePresence } from 'framer-motion'
import { PusherProvider } from '@/components/shared/PusherProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useOverlayState } from './useOverlayState'
import type { MatchSnapshot } from '@/types/match'
import type { TournamentMostWicketsData } from '@/lib/db/queries/match'
import { RetroPulseScorebug } from '@/components/overlay/theme1/RetroPulseScorebug'
import { Theme1TeamVsTeamOverlay } from '@/components/overlay/theme1/Theme1TeamVsTeamOverlay'

type Props = {
  matchId: number
  initialSnapshot: MatchSnapshot
  initialMostWickets: TournamentMostWicketsData | null
}

function OverlayInner({ matchId, initialSnapshot, initialMostWickets }: Props) {
  const { snapshot, scorebugVisible, lastBoundary, lastWicket, teamVsTeamVisible } = useOverlayState({
    matchId,
    initialSnapshot,
    initialMostWickets,
    overlayTheme: 'theme1',
  })

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <AnimatePresence>
        {scorebugVisible && (
          <RetroPulseScorebug snapshot={snapshot} boundary={lastBoundary} wicket={lastWicket} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teamVsTeamVisible && (
          <Theme1TeamVsTeamOverlay snapshot={snapshot} />
        )}
      </AnimatePresence>
    </div>
  )
}

export function OverlayClientTheme1(props: Props) {
  return (
    <ErrorBoundary fallback={
      <div style={{ color: 'white', padding: 16, fontFamily: 'monospace', fontSize: 14 }}>
        Overlay unavailable — please reload.
      </div>
    }>
      <PusherProvider>
        <OverlayInner {...props} />
      </PusherProvider>
    </ErrorBoundary>
  )
}
