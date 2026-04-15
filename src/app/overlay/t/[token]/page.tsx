import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { matches, overlayLinks } from '@/lib/db/schema'
import { getMatchSnapshot, getTournamentMostWickets } from '@/lib/db/queries/match'
import { OverlayClient } from '@/app/overlay/[matchId]/OverlayClient'
import { OverlayClientICC2023 } from '@/app/overlay/[matchId]/OverlayClientICC2023'
import { OverlayClientStandard1 } from '@/app/overlay/[matchId]/OverlayClientStandard1'

type Props = {
  params: Promise<{ token: string }>
}

export default async function TokenOverlayPage({ params }: Props) {
  const { token } = await params

  const link = await db.query.overlayLinks.findFirst({
    where: and(eq(overlayLinks.token, token), eq(overlayLinks.isActive, true)),
  })

  if (!link) notFound()

  // Resolve matchId — either direct or via active match in the tournament
  let matchId: number | null = link.matchId ?? null

  if (matchId === null && link.tournamentId !== null) {
    // Tournament-scoped token: find the currently active match
    const activeMatch = await db.query.matches.findFirst({
      where: and(
        eq(matches.tournamentId, link.tournamentId),
        eq(matches.status, 'active'),
      ),
      columns: { id: true },
    })
    matchId = activeMatch?.id ?? null
  }

  // No active match — show standby screen
  if (matchId === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <p className="text-2xl font-bold tracking-widest uppercase opacity-60">No live match</p>
        <p className="mt-2 text-sm opacity-40">Waiting for a match to go live...</p>
      </div>
    )
  }

  const [snapshot, initialMostWickets] = await Promise.all([
    getMatchSnapshot(matchId),
    getTournamentMostWickets(matchId),
  ])

  if (!snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <p className="text-2xl font-bold tracking-widest uppercase opacity-60">No live match</p>
        <p className="mt-2 text-sm opacity-40">Waiting for a match to go live...</p>
      </div>
    )
  }

  const sharedProps = { matchId, initialSnapshot: snapshot, initialMostWickets }

  if (link.mode === 'icc2023') {
    return <OverlayClientICC2023 {...sharedProps} />
  }
  if (link.mode === 'standard1') {
    return <OverlayClientStandard1 {...sharedProps} />
  }
  return <OverlayClient {...sharedProps} />
}
