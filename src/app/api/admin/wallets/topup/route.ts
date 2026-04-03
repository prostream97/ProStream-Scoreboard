import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { wallets, walletTransactions } from '@/lib/db/schema'

export const runtime = 'nodejs'

// POST /api/admin/wallets/topup — admin manually adds LKR credits to a user's wallet
// body: { userId: number, amount: number, description?: string }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminId = parseInt(session.user.id, 10)
  const body = await req.json()
  const { userId, amount, description } = body

  if (!userId || isNaN(parseInt(userId, 10))) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  const userIdNum = parseInt(userId, 10)

  if (!amount || isNaN(parseInt(amount, 10)) || parseInt(amount, 10) <= 0) {
    return NextResponse.json({ error: 'amount must be a positive integer' }, { status: 400 })
  }
  const amountNum = parseInt(amount, 10)

  let wallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, userIdNum) })
  if (!wallet) {
    const [created] = await db.insert(wallets).values({ userId: userIdNum, balance: 0 }).returning()
    wallet = created
  }

  const updatedBalance = wallet.balance + amountNum

  await db.insert(walletTransactions).values({
    walletId: wallet.id,
    type: 'topup',
    amount: amountNum,
    balanceBefore: wallet.balance,
    balanceAfter: updatedBalance,
    description: description || `Admin top-up by ${session.user.username}`,
    createdBy: adminId,
  })

  await db.update(wallets).set({ balance: updatedBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id))

  return NextResponse.json({ newBalance: updatedBalance }, { status: 201 })
}
