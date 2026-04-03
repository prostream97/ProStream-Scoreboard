import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tournaments } from '@/lib/db/schema'
import { ne } from 'drizzle-orm'
import { OverlayManagerClient } from '@/components/overlay-manager/OverlayManagerClient'
import type { Tournament } from '@/types/tournament'

export default async function OverlayManagerPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/overlay-manager')

  const rows = await db.query.tournaments.findMany({
    where: ne(tournaments.status, 'complete'),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  const initialTournaments: Tournament[] = rows.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }))

  return (
    <OverlayManagerClient
      initialTournaments={initialTournaments}
      isAdmin={session.user.role === 'admin'}
    />
  )
}
