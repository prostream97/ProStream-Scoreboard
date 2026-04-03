import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { tournamentAccess, users, tournaments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { TournamentAccessClient } from '@/components/admin/TournamentAccessClient'

export default async function AccessPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/admin/access')
  if (!isAdminSession(session)) redirect('/')

  const allTournaments = await db.query.tournaments.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  const allUsers = await db.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.username)],
  })

  const accessRows = await db
    .select({
      userId: tournamentAccess.userId,
      tournamentId: tournamentAccess.tournamentId,
    })
    .from(tournamentAccess)

  return (
    <TournamentAccessClient
      tournaments={allTournaments.map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, status: t.status }))}
      users={allUsers.map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, role: u.role }))}
      access={accessRows}
    />
  )
}
