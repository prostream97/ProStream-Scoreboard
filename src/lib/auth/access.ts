import type { Session } from 'next-auth'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tournaments, tournamentAccess, users } from '@/lib/db/schema'
import { isAdminSession } from './utils'
import type { TournamentUserSummary } from '@/types/tournament'

export type TournamentPermissionContext = {
  tournamentId: number
  owner: TournamentUserSummary | null
  isAdmin: boolean
  isOwner: boolean
  isOperator: boolean
  canAccessTournament: boolean
  canEditTournament: boolean
}

export async function getTournamentPermissionContext(
  session: Session | null,
  tournamentId: number,
): Promise<TournamentPermissionContext | null> {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    columns: { id: true, createdBy: true },
  })

  if (!tournament) return null

  const owner = tournament.createdBy
    ? await db.query.users.findFirst({
        where: eq(users.id, tournament.createdBy),
        columns: {
          id: true,
          username: true,
          displayName: true,
          photoCloudinaryId: true,
        },
      })
    : null

  if (!session) {
    return {
      tournamentId,
      owner: owner ?? null,
      isAdmin: false,
      isOwner: false,
      isOperator: false,
      canAccessTournament: false,
      canEditTournament: false,
    }
  }

  const isAdmin = isAdminSession(session)
  const userId = parseInt(session.user.id, 10)

  if (isAdmin) {
    return {
      tournamentId,
      owner: owner ?? null,
      isAdmin: true,
      isOwner: owner?.id === userId,
      isOperator: false,
      canAccessTournament: true,
      canEditTournament: true,
    }
  }

  if (Number.isNaN(userId)) {
    return {
      tournamentId,
      owner: owner ?? null,
      isAdmin: false,
      isOwner: false,
      isOperator: false,
      canAccessTournament: false,
      canEditTournament: false,
    }
  }

  const isOwner = tournament.createdBy === userId
  const accessRow = await db.query.tournamentAccess.findFirst({
    where: and(eq(tournamentAccess.userId, userId), eq(tournamentAccess.tournamentId, tournamentId)),
    columns: { id: true },
  })
  const hasAccessRow = accessRow !== undefined

  return {
    tournamentId,
    owner: owner ?? null,
    isAdmin: false,
    isOwner,
    isOperator: hasAccessRow && !isOwner,
    canAccessTournament: isOwner || hasAccessRow,
    canEditTournament: isOwner || hasAccessRow,
  }
}

// Server-only: never import this from client components.
// Returns true if the session user is admin, owns the tournament, or has been granted access.
export async function canAccessTournament(
  session: Session | null,
  tournamentId: number,
): Promise<boolean> {
  const ctx = await getTournamentPermissionContext(session, tournamentId)
  return ctx?.canAccessTournament ?? false
}

export async function canEditTournament(
  session: Session | null,
  tournamentId: number,
): Promise<boolean> {
  const ctx = await getTournamentPermissionContext(session, tournamentId)
  return ctx?.canEditTournament ?? false
}
