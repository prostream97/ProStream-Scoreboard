import { auth } from '@/lib/auth/config'
import { getTournamentListWithCounts } from '@/lib/db/queries/tournament'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function Dashboard() {
  const session = await auth()
  const userId =
    session?.user?.role === 'operator' ? parseInt(session.user.id, 10) : undefined
  const tournaments = await getTournamentListWithCounts(userId)

  return (
    <DashboardClient tournaments={tournaments} />
  )
}
