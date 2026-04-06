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
    <div className="app-tabbar">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`app-tab flex-1 sm:flex-none ${
            active === tab.key ? 'app-tab-active' : 'hover:bg-[#f4f7f2] hover:text-slate-900'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
