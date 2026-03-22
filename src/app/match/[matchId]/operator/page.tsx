import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getMatchSnapshot } from '@/lib/db/queries/match'
import { OCPLayout } from '@/components/ocp/OCPLayout'

type Props = {
  params: Promise<{ matchId: string }>
}

export default async function OperatorPage({ params }: Props) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const { matchId } = await params
  const id = parseInt(matchId, 10)

  if (isNaN(id)) notFound()

  const snapshot = await getMatchSnapshot(id)
  if (!snapshot) notFound()

  return <OCPLayout initialSnapshot={snapshot} />
}
