import type { Session } from 'next-auth'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tournaments, tournamentAccess } from '@/lib/db/schema'
import { isAdminSession } from './utils'

// Server-only: never import this from client components.
// Returns true if the session user is admin, owns the tournament, or has been granted access.
export async function canAccessTournament(
  session: Session | null,
  tournamentId: number,
): Promise<boolean> {
  if (!session) return false
  if (isAdminSession(session)) return true
  const userId = parseInt(session.user.id, 10)
  if (Number.isNaN(userId)) return false

  // 1. Ownership check — creator always has access to their own tournament
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    columns: { id: true, createdBy: true },
  })
  if (tournament?.createdBy === userId) return true

  // 2. Granted access check (admin-granted via tournament_access table)
  const row = await db.query.tournamentAccess.findFirst({
    where: and(eq(tournamentAccess.userId, userId), eq(tournamentAccess.tournamentId, tournamentId)),
  })
  return row !== undefined
}
