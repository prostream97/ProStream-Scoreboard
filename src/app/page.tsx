import { auth } from '@/lib/auth/config'
import { getTournamentListWithCounts } from '@/lib/db/queries/tournament'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function Dashboard() {
  const session = await auth()
  const userId =
    session?.user?.role === 'operator' ? parseInt(session.user.id, 10) : undefined

  let tournaments: any[] = []
  try {
    tournaments = await getTournamentListWithCounts(userId)
  } catch {
    // DB unavailable — render empty dashboard rather than 500
  }

  return (
    <DashboardClient tournaments={tournaments} />
  )
}
