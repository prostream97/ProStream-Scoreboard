import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { wallets, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

// GET /api/admin/wallets — all wallets with user info (admin-only)
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get all users (to include those without wallets yet)
  const allUsers = await db.query.users.findMany({
    columns: { id: true, username: true, displayName: true, role: true },
    orderBy: (t, { asc }) => [asc(t.username)],
  })

  const allWallets = await db.query.wallets.findMany()
  const walletMap = new Map(allWallets.map((w) => [w.userId, w.balance]))

  const result = allUsers.map((u) => ({
    userId: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    balance: walletMap.get(u.id) ?? 0,
  }))

  return NextResponse.json(result)
}
