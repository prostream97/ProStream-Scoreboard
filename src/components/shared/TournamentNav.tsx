'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Main', segment: '' },
  { label: 'Teams', segment: 'teams' },
  { label: 'Players', segment: 'players' },
]

export function TournamentNav({ tournamentId, activeSegment }: { tournamentId: number; activeSegment?: string }) {
  const pathname = usePathname()
  const base = `/admin/tournaments/${tournamentId}`

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-900 border border-gray-800 rounded-xl">
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
            className={`flex-1 text-center px-4 py-2 rounded-lg font-stats text-sm transition-colors ${
              active
                ? 'bg-primary text-white font-semibold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
