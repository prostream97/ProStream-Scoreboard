import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { getTournamentPermissionContext } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { tournamentAccess, users } from '@/lib/db/schema'
import { getTournamentAccessData } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: 'Invalid tournament id' }, { status: 400 })
  }

  const ctx = await getTournamentPermissionContext(session, tournamentId)
  if (!ctx) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (!ctx.canEditTournament) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const accessData = await getTournamentAccessData(tournamentId)
  if (!accessData) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const grantedIds = new Set([
    ...(accessData.owner ? [accessData.owner.id] : []),
    ...accessData.operators.map((operator) => operator.id),
  ])

  const availableOperators = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      photoCloudinaryId: users.photoCloudinaryId,
    })
    .from(users)
    .where(eq(users.role, 'operator'))

  return NextResponse.json({
    owner: accessData.owner,
    operators: accessData.operators,
    availableOperators: availableOperators
      .filter((operator) => !grantedIds.has(operator.id))
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: 'Invalid tournament id' }, { status: 400 })
  }

  const body = await req.json() as Record<string, unknown>
  const userId = typeof body.userId === 'number' ? body.userId : null
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const ctx = await getTournamentPermissionContext(session, tournamentId)
  if (!ctx) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (!ctx.canEditTournament) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ctx.owner?.id === userId) {
    return NextResponse.json({ error: 'Tournament owner is already assigned' }, { status: 409 })
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, role: true },
  })
  if (!targetUser || targetUser.role !== 'operator') {
    return NextResponse.json({ error: 'Only operator accounts can be granted tournament access' }, { status: 400 })
  }

  const grantedBy = parseInt(session.user.id, 10)

  try {
    const [row] = await db
      .insert(tournamentAccess)
      .values({
        userId,
        tournamentId,
        grantedBy: Number.isNaN(grantedBy) ? null : grantedBy,
      })
      .returning()
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const e = error as { code?: string }
    if (e.code === '23505') {
      return NextResponse.json({ error: 'Access already granted' }, { status: 409 })
    }
    console.error('Tournament access grant error:', error)
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
  }
}
