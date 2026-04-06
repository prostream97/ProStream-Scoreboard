import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getTournamentsWithTeams } from '@/lib/db/queries/tournament'
import { NewMatchWizard } from '@/components/match/NewMatchWizard'

export default async function NewMatchPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/match/new')

  const tournaments = await getTournamentsWithTeams()

  return (
    <NewMatchWizard tournaments={tournaments} />
  )
}
