import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { wallets, walletTransactions } from '@/lib/db/schema'

export const runtime = 'nodejs'

// GET /api/wallet/me — returns current user's balance + last 10 transactions
// Creates a wallet with 0 balance if none exists yet.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(session.user.id, 10)

  let wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, userId),
  })

  if (!wallet) {
    const [created] = await db
      .insert(wallets)
      .values({ userId, balance: 0 })
      .returning()
    wallet = created
  }

  const transactions = await db.query.walletTransactions.findMany({
    where: eq(walletTransactions.walletId, wallet.id),
    orderBy: [desc(walletTransactions.createdAt)],
    limit: 10,
  })

  return NextResponse.json({ balance: wallet.balance, transactions })
}
