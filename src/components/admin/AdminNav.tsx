'use client'

import Link from 'next/link'

type AdminNavTab = 'users' | 'access' | 'pricing'

interface AdminNavProps {
  active: AdminNavTab
}

const tabs: { key: AdminNavTab; label: string; href: string }[] = [
  { key: 'users', label: 'User Management', href: '/admin/users' },
  { key: 'access', label: 'Tournament Access', href: '/admin/access' },
  { key: 'pricing', label: 'Pricing', href: '/admin/pricing' },
]

export function AdminNav({ active }: AdminNavProps) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-800 mb-6">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`px-4 py-2.5 font-stats text-sm font-medium transition-colors duration-200 border-b-2 -mb-px ${
            active === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
