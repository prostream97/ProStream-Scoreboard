import { getTournamentListWithCounts } from '@/lib/db/queries/tournament'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function Dashboard() {
  const tournaments = await getTournamentListWithCounts()

  return (
    <main className="min-h-screen bg-gray-950 px-4 sm:px-8">
      <DashboardClient tournaments={tournaments} />
    </main>
  )
}
