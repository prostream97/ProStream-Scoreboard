import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { teams } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const session = await auth()
  if (!session || !isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { teamId } = await params
  const id = parseInt(teamId, 10)
  const body = await req.json() as Record<string, unknown>

  const allowed: (keyof typeof teams.$inferInsert)[] = [
    'name', 'shortCode', 'primaryColor', 'secondaryColor', 'logoCloudinaryId',
  ]
  const patch: Partial<typeof teams.$inferInsert> = {}
  for (const key of allowed) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key]
  }

  const [updated] = await db.update(teams).set(patch).where(eq(teams.id, id)).returning()
  if (!updated) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const session = await auth()
  if (!session || !isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { teamId } = await params
  const id = parseInt(teamId, 10)
  await db.delete(teams).where(eq(teams.id, id))
  return NextResponse.json({ ok: true })
}
