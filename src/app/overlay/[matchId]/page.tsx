import { notFound } from 'next/navigation'
import { getMatchSnapshot } from '@/lib/db/queries/match'
import { OverlayClient } from './OverlayClient'

type Props = {
  params: Promise<{ matchId: string }>
}

export default async function OverlayPage({ params }: Props) {
  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) notFound()

  const snapshot = await getMatchSnapshot(id)
  if (!snapshot) notFound()

  return <OverlayClient matchId={id} initialSnapshot={snapshot} />
}
