import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { overlayLinks } from '@/lib/db/schema'
import { getMatchSnapshot, getTournamentMostWickets } from '@/lib/db/queries/match'
import { OverlayClient } from '@/app/overlay/[matchId]/OverlayClient'

type Props = {
  params: Promise<{ token: string }>
}

export default async function TokenOverlayPage({ params }: Props) {
  const { token } = await params

  const link = await db.query.overlayLinks.findFirst({
    where: and(eq(overlayLinks.token, token), eq(overlayLinks.isActive, true)),
  })

  if (!link) notFound()

  const [snapshot, initialMostWickets] = await Promise.all([
    getMatchSnapshot(link.matchId),
    getTournamentMostWickets(link.matchId),
  ])
  if (!snapshot) notFound()

  return <OverlayClient matchId={link.matchId} initialSnapshot={snapshot} initialMostWickets={initialMostWickets} />
}
