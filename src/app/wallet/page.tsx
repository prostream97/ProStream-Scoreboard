'use client'

import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import {
  AppPage,
  SurfaceCard,
  AppBadge,
} from '@/components/shared/AppPrimitives'

type Transaction = {
  id: number
  type: 'topup' | 'deduction'
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatLKR(amount: number) {
  return `LKR ${Math.abs(amount).toLocaleString()}`
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/wallet/me/transactions')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setBalance(data.balance)
          setTransactions(data.transactions)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppPage className="space-y-6">
      {/* Balance card */}
      <SurfaceCard className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="app-kicker">Current Balance</p>
          <p className="mt-1 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
            {balance === null ? '—' : `LKR ${balance.toLocaleString()}`}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Available balance in your ProStream wallet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AppBadge tone={balance !== null && balance > 0 ? 'green' : 'neutral'}>
            {balance !== null && balance > 0 ? 'Active' : 'Low Balance'}
          </AppBadge>
        </div>
      </SurfaceCard>

      {/* Transaction history */}
      <SurfaceCard className="space-y-4">
        <div>
          <p className="app-kicker">History</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Transactions
          </h2>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-[#edf0ec]">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    tx.type === 'topup'
                      ? 'bg-[#dcfce7] text-[#16a34a]'
                      : 'bg-[#fee2e2] text-[#dc2626]'
                  }`}
                >
                  {tx.type === 'topup' ? (
                    <ArrowDownLeft className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </div>

                {/* Description + date */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {tx.description}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDate(tx.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Balance: {formatLKR(tx.balanceBefore)} → {formatLKR(tx.balanceAfter)}
                  </p>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${
                      tx.type === 'topup' ? 'text-[#16a34a]' : 'text-[#dc2626]'
                    }`}
                  >
                    {tx.type === 'topup' ? '+' : '−'}{formatLKR(tx.amount)}
                  </p>
                  <AppBadge tone={tx.type === 'topup' ? 'green' : 'neutral'}>
                    {tx.type === 'topup' ? 'Top-up' : 'Deduction'}
                  </AppBadge>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </AppPage>
  )
}
