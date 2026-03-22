import { notFound } from 'next/navigation'
import { getMatchSnapshot } from '@/lib/db/queries/match'
import { ViewerClient } from '@/components/viewer/ViewerClient'

type Props = {
  params: Promise<{ matchId: string }>
}

export default async function ViewerPage({ params }: Props) {
  const { matchId } = await params
  const id = parseInt(matchId, 10)

  if (isNaN(id)) notFound()

  const snapshot = await getMatchSnapshot(id)
  if (!snapshot) notFound()

  return <ViewerClient matchId={id} initialSnapshot={snapshot} />
}
