import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { and, count, eq, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession, normalizeUsername } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export const runtime = 'nodejs'

function getUserMutationErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const maybeError = error as { code?: string; message?: string }

    if (maybeError.code === '23505') {
      return 'A user with that username already exists'
    }

    if (maybeError.message?.includes('relation "users" does not exist')) {
      return 'The users table does not exist yet. Run the Drizzle migration and restart the dev server.'
    }
  }

  return 'Failed to update user'
}

async function getAdminCount(excludeUserId?: number) {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(
      excludeUserId === undefined
        ? eq(users.role, 'admin')
        : and(eq(users.role, 'admin'), ne(users.id, excludeUserId)),
    )

  return row?.value ?? 0
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session || !isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id, 10)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  const body = await req.json() as Record<string, unknown>
  const patch: {
    username?: string
    displayName?: string
    role?: 'admin' | 'operator'
    passwordHash?: string
    phone?: string | null
    photoCloudinaryId?: string | null
    updatedAt: Date
  } = {
    updatedAt: new Date(),
  }

  if (typeof body.username === 'string') {
    const username = normalizeUsername(body.username)
    if (!username || username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    patch.username = username
  }

  if (typeof body.displayName === 'string') {
    const displayName = body.displayName.trim()
    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
    }
    patch.displayName = displayName
  }

  if (body.role === 'admin' || body.role === 'operator') {
    patch.role = body.role
  }

  if ('phone' in body) {
    patch.phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
  }

  if ('photoCloudinaryId' in body) {
    patch.photoCloudinaryId = typeof body.photoCloudinaryId === 'string' ? body.photoCloudinaryId.trim() || null : null
  }

  if (typeof body.password === 'string' && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    patch.passwordHash = await bcrypt.hash(body.password, 12)
  }

  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (existing.role === 'admin' && patch.role === 'operator') {
    const remainingAdmins = await getAdminCount(userId)
    if (remainingAdmins === 0) {
      return NextResponse.json({ error: 'At least one admin account is required' }, { status: 400 })
    }
  }

  try {
    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        phone: users.phone,
        photoCloudinaryId: users.photoCloudinaryId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json({ error: getUserMutationErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session || !isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id, 10)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  if (session.user.id === String(userId)) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (existing.role === 'admin') {
    const remainingAdmins = await getAdminCount(userId)
    if (remainingAdmins === 0) {
      return NextResponse.json({ error: 'You cannot delete the last admin account' }, { status: 400 })
    }
  }

  await db.delete(users).where(eq(users.id, userId))
  return NextResponse.json({ ok: true })
}
