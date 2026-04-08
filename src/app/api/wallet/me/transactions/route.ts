import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { wallets, walletTransactions } from '@/lib/db/schema'

export const runtime = 'nodejs'

// GET /api/wallet/me/transactions — returns current user's full transaction history
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(session.user.id, 10)

  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, userId),
  })

  if (!wallet) return NextResponse.json({ balance: 0, transactions: [] })

  const transactions = await db.query.walletTransactions.findMany({
    where: eq(walletTransactions.walletId, wallet.id),
    orderBy: [desc(walletTransactions.createdAt)],
  })

  return NextResponse.json({ balance: wallet.balance, transactions })
}
