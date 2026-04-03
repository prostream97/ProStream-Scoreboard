import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { asc } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession, normalizeUsername } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export const runtime = 'nodejs'

function sanitizeDisplayName(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function getCreateUserErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const maybeError = error as { code?: string; message?: string }

    if (maybeError.code === '23505') {
      return 'A user with that username already exists'
    }

    if (maybeError.message?.includes('relation "users" does not exist')) {
      return 'The users table does not exist yet. Run the Drizzle migration and restart the dev server.'
    }

    if (maybeError.message?.includes('type "user_role" does not exist')) {
      return 'The user_role enum does not exist yet. Run the Drizzle migration and restart the dev server.'
    }
  }

  return 'Failed to create user'
}

export async function GET() {
  const session = await auth()
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      phone: users.phone,
      photoCloudinaryId: users.photoCloudinaryId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(asc(users.username))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as Record<string, unknown>
  const username = normalizeUsername(typeof body.username === 'string' ? body.username : '')
  const password = typeof body.password === 'string' ? body.password : ''
  const role = body.role === 'admin' ? 'admin' : body.role === 'operator' ? 'operator' : null

  if (!username || username.length < 3) {
    return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  if (!role) {
    return NextResponse.json({ error: 'Role must be admin or operator' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
    const photoCloudinaryId = typeof body.photoCloudinaryId === 'string' ? body.photoCloudinaryId.trim() || null : null

    const [created] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        displayName: sanitizeDisplayName(body.displayName, username),
        role,
        phone,
        photoCloudinaryId,
      })
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

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('User create error:', error)
    return NextResponse.json({ error: getCreateUserErrorMessage(error) }, { status: 500 })
  }
}
