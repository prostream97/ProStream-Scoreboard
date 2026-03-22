import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { players } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; playerId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId } = await params
  const id = parseInt(playerId, 10)
  const body = await req.json() as Record<string, unknown>

  const allowed = ['name', 'displayName', 'role', 'battingStyle', 'bowlingStyle', 'headshotCloudinaryId']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const [updated] = await db
    .update(players)
    .set(patch as Partial<InferInsertModel<typeof players>>)
    .where(eq(players.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string; playerId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId } = await params
  await db.delete(players).where(eq(players.id, parseInt(playerId, 10)))
  return NextResponse.json({ ok: true })
}
