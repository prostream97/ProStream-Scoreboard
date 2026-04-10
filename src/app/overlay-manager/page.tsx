import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { OverlayManagerClient } from '@/components/overlay-manager/OverlayManagerClient'
import { getAccessibleTournaments, getTournamentList } from '@/lib/db/queries/tournament'
import type { Tournament } from '@/types/tournament'

export default async function OverlayManagerPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/overlay-manager')

  const isAdmin = isAdminSession(session)
  const rows = (isAdmin
    ? await getTournamentList()
    : await getAccessibleTournaments(parseInt(session.user.id, 10)))
    .filter((t) => t.status !== 'complete')

  const initialTournaments: Tournament[] = rows.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }))

  return (
    <OverlayManagerClient
      initialTournaments={initialTournaments}
      isAdmin={isAdmin}
    />
  )
}
