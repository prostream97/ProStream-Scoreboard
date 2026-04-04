'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSidebar } from '@/contexts/SidebarContext'
import { LayoutDashboard, Trophy, ChevronDown, ChevronRight, Monitor, Shield } from 'lucide-react'



export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isOpen, toggle } = useSidebar()

  const [adminOpen, setAdminOpen] = useState(false)

  // Auto-open dropdowns based on current path
  useEffect(() => {
    if (
      pathname.startsWith('/admin/users') ||
      pathname.startsWith('/admin/access') ||
      pathname.startsWith('/admin/pricing') ||
      pathname.startsWith('/admin/settings')
    ) setAdminOpen(true)
  }, [pathname])

  const isDashboardActive = pathname === '/'
  const isTournamentsActive = pathname.startsWith('/admin/tournaments')
  const isOverlayActive = pathname.startsWith('/overlay-manager')
  const isAdminActive =
    pathname.startsWith('/admin/users') ||
    pathname.startsWith('/admin/access') ||
    pathname.startsWith('/admin/pricing') ||
    pathname.startsWith('/admin/settings')
  const isAdmin = session?.user?.role === 'admin'


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

          {/* Tournaments */}
          <Link
            href="/admin/tournaments"
            title={!isOpen ? 'Tournaments' : undefined}
            className={`group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${
              isTournamentsActive 
                ? 'bg-primary/10 font-semibold relative before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:bg-primary before:shadow-[0_0_12px_var(--tw-colors-primary)]' 
                : 'hover:bg-gray-800'
            }`}
          >
            <span className={`transition-colors duration-200 shrink-0 ${isTournamentsActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-100'}`}>
              <Trophy className="w-5 h-5" />
            </span>
            <span className={`font-stats text-sm transition-[opacity,transform] duration-300 ${
              isTournamentsActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-100'
            } ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none absolute'}`}>
              Tournaments
            </span>
          </Link>

          {/* Overlay — visible to all authenticated users */}
          {session && (
            <Link
              href="/overlay-manager"
              title={!isOpen ? 'Overlay' : undefined}
              className={`group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${
                isOverlayActive
                  ? 'bg-primary/10 font-semibold relative before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:bg-primary before:shadow-[0_0_12px_var(--tw-colors-primary)]'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className={`transition-colors duration-200 shrink-0 ${isOverlayActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-100'}`}>
                <Monitor className="w-5 h-5" />
              </span>
              <span className={`font-stats text-sm transition-[opacity,transform] duration-300 ${
                isOverlayActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-100'
              } ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none absolute'}`}>
                Overlay
              </span>
            </Link>
          )}

          {/* Admin dropdown — admin only */}
          {isAdmin && (
            <>
              <button
                onClick={() => setAdminOpen((v) => !v)}
                title={!isOpen ? 'Admin' : undefined}
                className={`group w-[calc(100%-1rem)] flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${
                  isAdminActive
                    ? 'bg-primary/10 font-semibold relative before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:bg-primary before:shadow-[0_0_12px_var(--tw-colors-primary)]'
                    : 'hover:bg-gray-800'
                }`}
              >
                <span className={`transition-colors duration-200 shrink-0 ${isAdminActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-100'}`}>
                  <Shield className="w-5 h-5" />
                </span>
                <span className={`flex-1 text-left font-stats text-sm transition-[opacity,transform] duration-300 ${
                  isAdminActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-100'
                } ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none absolute'}`}>
                  Admin
                </span>
                {isOpen && (
                  <span className={`shrink-0 transition-colors duration-200 ${isAdminActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {adminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                )}
              </button>

              {adminOpen && isOpen && (
                <div className="mx-3 mb-2 rounded-lg overflow-hidden space-y-0.5">
                  {[
                    { href: '/admin/users', label: 'User Management' },
                    { href: '/admin/access', label: 'Tournament Access' },
                    { href: '/admin/pricing', label: 'Pricing' },
                  ].map(({ href, label }) => {
                    const isRowActive = pathname.startsWith(href)
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-2 pl-4 pr-3 py-2 rounded-lg transition-colors overflow-hidden font-stats text-xs ${
                          isRowActive
                            ? 'bg-primary/15 text-primary'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRowActive ? 'bg-primary' : 'bg-gray-600'}`} />
                        {label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
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
