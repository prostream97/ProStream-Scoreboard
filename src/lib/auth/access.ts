import type { Session } from 'next-auth'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tournamentAccess } from '@/lib/db/schema'
import { isAdminSession } from './utils'

// Server-only: never import this from client components.
// Returns true if the session user is admin OR has been granted access to the tournament.
export async function canAccessTournament(
  session: Session | null,
  tournamentId: number,
): Promise<boolean> {
  if (!session) return false
  if (isAdminSession(session)) return true
  const userId = parseInt(session.user.id, 10)
  if (Number.isNaN(userId)) return false
  const row = await db.query.tournamentAccess.findFirst({
    where: and(eq(tournamentAccess.userId, userId), eq(tournamentAccess.tournamentId, tournamentId)),
  })
  return row !== undefined
}
