import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { tournamentAccess } from '@/lib/db/schema'

export const runtime = 'nodejs'

// DELETE — revoke a user's access to a tournament (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; tournamentId: string }> },
) {
  const session = await auth()
  if (!session || !isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId: userIdStr, tournamentId: tournamentIdStr } = await params
  const userId = parseInt(userIdStr, 10)
  const tournamentId = parseInt(tournamentIdStr, 10)

  if (Number.isNaN(userId) || Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  await db
    .delete(tournamentAccess)
    .where(and(eq(tournamentAccess.userId, userId), eq(tournamentAccess.tournamentId, tournamentId)))

  return NextResponse.json({ ok: true })
}
