'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Main', segment: '' },
  { label: 'Teams', segment: 'teams' },
  { label: 'Players', segment: 'players' },
  { label: 'Access', segment: 'access' },
]

export function TournamentNav({ tournamentId, activeSegment }: { tournamentId: number; activeSegment?: string }) {
  const pathname = usePathname()
  const base = `/admin/tournaments/${tournamentId}`

  return (
    <div className="app-tabbar">
      {TABS.map(({ label, segment }) => {
        const href = segment ? `${base}/${segment}` : base
        const active = activeSegment !== undefined
          ? activeSegment === segment
          : segment
            ? pathname.startsWith(`${base}/${segment}`)
            : pathname === base

        return (
          <Link
            key={label}
            href={href}
            className={`app-tab shrink-0 ${
              active ? 'app-tab-active font-semibold' : 'hover:bg-[#f4f7f2] hover:text-slate-900'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
