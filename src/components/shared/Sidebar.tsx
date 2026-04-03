'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { LayoutDashboard, Trophy, ChevronDown, ChevronRight } from 'lucide-react'

type TournamentOption = { id: number; name: string; shortName: string; status: string }


export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()

  const [tournaments, setTournaments] = useState<TournamentOption[]>([])
  const [tournamentsOpen, setTournamentsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/tournaments')
      .then((r) => r.json())
      .then((data: TournamentOption[]) => setTournaments(data))
      .catch(() => {})
  }, [])

  // Auto-open dropdown when on any tournament sub-page
  useEffect(() => {
    if (pathname.startsWith('/admin/tournaments')) {
      setTournamentsOpen(true)
    }
  }, [pathname])

  const isDashboardActive = pathname === '/'
  const isTournamentsActive = pathname.startsWith('/admin/tournaments')

  const activeTournaments = tournaments.filter((t) => t.status !== 'complete')

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 z-40 flex flex-col border-r border-gray-800 overflow-hidden transition-[width] duration-300 ease-in-out bg-gray-900 ${
          isOpen ? 'w-60' : 'w-0 md:w-16'
        }`}
        style={{ top: '5.5rem', height: 'calc(100vh - 5.5rem)' }}
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {/* Dashboard */}
          <Link
            href="/"
            title={!isOpen ? 'Dashboard' : undefined}
            className={`group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${
              isDashboardActive 
                ? 'bg-primary/10 font-semibold relative before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:bg-primary before:shadow-[0_0_12px_var(--tw-colors-primary)]' 
                : 'hover:bg-gray-800'
            }`}
          >
            <span className={`transition-colors duration-200 shrink-0 ${isDashboardActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-100'}`}>
              <LayoutDashboard className="w-5 h-5" />
            </span>
            <span className={`font-stats text-sm transition-[opacity,transform] duration-300 ${
              isDashboardActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-100'
            } ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none absolute'}`}>
              Dashboard
            </span>
          </Link>

          {/* Tournaments toggle button */}
          <button
            onClick={() => setTournamentsOpen((v) => !v)}
            title={!isOpen ? 'Tournaments' : undefined}
            className={`group w-[calc(100%-1rem)] flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${
              isTournamentsActive 
                ? 'bg-primary/10 font-semibold relative before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:bg-primary before:shadow-[0_0_12px_var(--tw-colors-primary)]' 
                : 'hover:bg-gray-800'
            }`}
          >
            <span className={`transition-colors duration-200 shrink-0 ${isTournamentsActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-100'}`}>
              <Trophy className="w-5 h-5" />
            </span>
            <span className={`flex-1 text-left font-stats text-sm transition-[opacity,transform] duration-300 ${
              isTournamentsActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-100'
            } ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none absolute'}`}>
              Tournaments
            </span>
            {isOpen && (
              <span className={`shrink-0 transition-colors duration-200 ${isTournamentsActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300'}`}>
                {tournamentsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            )}
          </button>

          {/* Tournament dropdown */}
          {tournamentsOpen && isOpen && (
            <div className="mx-3 mb-2 rounded-lg overflow-hidden">
              {activeTournaments.length === 0 ? (
                <p className="font-stats text-xs text-gray-600 italic px-3 py-2">No active tournaments</p>
              ) : (
                <div className="space-y-0.5 mb-0.5">
                  {activeTournaments.map((t) => {
                    const isRowActive = pathname.startsWith(`/admin/tournaments/${t.id}`)
                    return (
                      <Link
                        key={t.id}
                        href={`/admin/tournaments/${t.id}`}
                        className={`flex items-center gap-2 pl-4 pr-3 py-2 rounded-lg transition-colors overflow-hidden ${
                          isRowActive
                            ? 'bg-primary/15 text-primary relative before:absolute before:inset-y-0 before:-left-0 before:w-1 before:bg-primary shadow-[inset_2px_0_10px_rgba(79,70,229,0.1)]'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRowActive ? 'bg-primary' : 'bg-gray-600'}`} />
                        <span className="font-stats text-xs truncate">{t.shortName}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
              <Link
                href="/admin/tournaments"
                className={`flex items-center gap-2 pl-4 pr-3 py-2 rounded-lg font-stats text-xs transition-colors ${
                  pathname === '/admin/tournaments'
                    ? 'text-primary bg-primary/15'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="text-gray-600">≡</span>
                <span>All Tournaments</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Collapse toggle at bottom */}
        <div className="shrink-0 border-t border-gray-800 flex items-center justify-end px-3 py-3">
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors duration-200"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <ChevronDown className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  )
}
