import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq, and, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { normalizeUsername } from '@/lib/auth/utils'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(session.user.id, 10)
  const body = await req.json()
  const { displayName, username, phone, photoCloudinaryId, currentPassword, newPassword } = body

  if (displayName !== undefined && !String(displayName).trim()) {
    return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  if (displayName !== undefined) updateData.displayName = String(displayName).trim()
  if (phone !== undefined) updateData.phone = String(phone).trim() || null
  if (photoCloudinaryId !== undefined) updateData.photoCloudinaryId = photoCloudinaryId || null

  if (username !== undefined) {
    const normalized = normalizeUsername(username)
    if (!normalized || normalized.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    const existing = await db.query.users.findFirst({
      where: and(eq(users.username, normalized), ne(users.id, userId)),
    })
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
    updateData.username = normalized
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 })
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    updateData.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      phone: users.phone,
      photoCloudinaryId: users.photoCloudinaryId,
      role: users.role,
    })

  return NextResponse.json(updated)
}
