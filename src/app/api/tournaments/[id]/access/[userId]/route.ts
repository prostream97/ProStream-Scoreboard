import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { getTournamentPermissionContext } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { tournamentAccess } from '@/lib/db/schema'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, userId: userIdStr } = await params
  const tournamentId = parseInt(id, 10)
  const userId = parseInt(userIdStr, 10)
  if (Number.isNaN(tournamentId) || Number.isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const ctx = await getTournamentPermissionContext(session, tournamentId)
  if (!ctx) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (!ctx.canEditTournament) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ctx.owner?.id === userId) {
    return NextResponse.json({ error: 'Tournament owner cannot be revoked' }, { status: 400 })
  }

  await db
    .delete(tournamentAccess)
    .where(and(eq(tournamentAccess.userId, userId), eq(tournamentAccess.tournamentId, tournamentId)))

  return NextResponse.json({ ok: true })
}
