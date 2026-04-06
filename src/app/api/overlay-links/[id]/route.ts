import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { overlayLinks } from '@/lib/db/schema'

export const runtime = 'nodejs'

// PATCH /api/overlay-links/[id]
// body: { isActive: false }  — soft revoke
// Admin can revoke any link. Operator can only revoke their own.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const linkId = parseInt(id, 10)
  if (isNaN(linkId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const userId = parseInt(session.user.id, 10)
  const isAdmin = isAdminSession(session)

  const body = await req.json()
  if (typeof body.isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive (boolean) is required' }, { status: 400 })
  }

  // Build where clause — admin can target any link, operator only their own
  const whereClause = isAdmin
    ? eq(overlayLinks.id, linkId)
    : and(eq(overlayLinks.id, linkId), eq(overlayLinks.userId, userId))

  try {
    const [updated] = await db
      .update(overlayLinks)
      .set({ isActive: body.isActive })
      .where(whereClause)
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Link not found or access denied' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Overlay link update error:', err)
    return NextResponse.json({ error: 'Failed to update overlay link' }, { status: 500 })
  }
}
