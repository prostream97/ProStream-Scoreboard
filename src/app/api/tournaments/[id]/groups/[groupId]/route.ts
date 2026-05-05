import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { canEditTournament } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { tournamentGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { updateGroup, deleteGroup } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

async function resolveGroup(tournamentId: number, groupId: number) {
  return db.query.tournamentGroups.findFirst({
    where: eq(tournamentGroups.id, groupId),
    columns: { id: true, tournamentId: true },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, groupId: groupIdStr } = await params
  const tournamentId = parseInt(id, 10)
  const groupId = parseInt(groupIdStr, 10)

  if (!await canEditTournament(session, tournamentId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await resolveGroup(tournamentId, groupId)
  if (!existing || existing.tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  const body = await req.json() as { name?: string; shortName?: string; qualifyCount?: number; sortOrder?: number }
  const patch: Partial<{ name: string; shortName: string; qualifyCount: number; sortOrder: number }> = {}

  if (typeof body.name === 'string') {
    if (body.name.trim().length === 0) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    patch.name = body.name.trim()
  }
  if (typeof body.shortName === 'string') {
    if (body.shortName.trim().length === 0) return NextResponse.json({ error: 'shortName cannot be empty' }, { status: 400 })
    if (body.shortName.length > 10) return NextResponse.json({ error: 'shortName must be 10 characters or fewer' }, { status: 400 })
    patch.shortName = body.shortName.trim()
  }
  if (typeof body.qualifyCount === 'number') {
    if (body.qualifyCount < 1) return NextResponse.json({ error: 'qualifyCount must be at least 1' }, { status: 400 })
    patch.qualifyCount = body.qualifyCount
  }
  if (typeof body.sortOrder === 'number') patch.sortOrder = body.sortOrder

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const group = await updateGroup(groupId, patch)
  return NextResponse.json({ group })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, groupId: groupIdStr } = await params
  const tournamentId = parseInt(id, 10)
  const groupId = parseInt(groupIdStr, 10)

  if (!await canEditTournament(session, tournamentId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await resolveGroup(tournamentId, groupId)
  if (!existing || existing.tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  await deleteGroup(groupId)
  return NextResponse.json({ success: true })
}
