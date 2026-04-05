import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { tournamentAccess, tournaments, users } from '@/lib/db/schema'

export const runtime = 'nodejs'

// GET — list all tournament access entries grouped by tournament (admin only)
export async function GET() {
  const session = await auth()
  if (!session || !isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id: tournamentAccess.id,
      userId: tournamentAccess.userId,
      tournamentId: tournamentAccess.tournamentId,
      grantedAt: tournamentAccess.grantedAt,
      username: users.username,
      displayName: users.displayName,
      tournamentName: tournaments.name,
      tournamentShortName: tournaments.shortName,
    })
    .from(tournamentAccess)
    .innerJoin(users, eq(users.id, tournamentAccess.userId))
    .innerJoin(tournaments, eq(tournaments.id, tournamentAccess.tournamentId))

  return NextResponse.json(rows)
}

// POST — grant a user access to a tournament (admin only)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as Record<string, unknown>
  const userId = typeof body.userId === 'number' ? body.userId : null
  const tournamentId = typeof body.tournamentId === 'number' ? body.tournamentId : null

  if (!userId || !tournamentId) {
    return NextResponse.json({ error: 'userId and tournamentId are required' }, { status: 400 })
  }

  const adminId = parseInt(session.user.id, 10)
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, role: true },
  })
  if (!targetUser || targetUser.role !== 'operator') {
    return NextResponse.json({ error: 'Only operator accounts can be granted tournament access' }, { status: 400 })
  }

  try {
    const [row] = await db
      .insert(tournamentAccess)
      .values({ userId, tournamentId, grantedBy: Number.isNaN(adminId) ? null : adminId })
      .returning()
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const e = error as { code?: string }
    if (e.code === '23505') {
      return NextResponse.json({ error: 'Access already granted' }, { status: 409 })
    }
    console.error('Grant access error:', error)
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
  }
}
