'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Monitor,
  Shield,
  Trophy,
  Wallet,
} from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  match: (pathname: string) => boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isOpen, toggle } = useSidebar()

  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    if (
      pathname.startsWith('/admin/users') ||
      pathname.startsWith('/admin/access') ||
      pathname.startsWith('/admin/pricing') ||
      pathname.startsWith('/admin/settings')
    ) {
      setAdminOpen(true)
    }
  }, [pathname])

  const isDashboardActive = pathname === '/'
  const isTournamentsActive = pathname.startsWith('/admin/tournaments')
  const isOverlayActive = pathname.startsWith('/overlay-manager')
  const isWalletActive = pathname.startsWith('/wallet')
  const isAdminActive =
    pathname.startsWith('/admin/users') ||
    pathname.startsWith('/admin/access') ||
    pathname.startsWith('/admin/pricing') ||
    pathname.startsWith('/admin/settings')
  const isAdmin = session?.user?.role === 'admin'

  const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: LayoutDashboard, match: (path) => path === '/' },
    {
      href: '/admin/tournaments',
      label: 'Tournaments',
      icon: Trophy,
      match: (path) => path.startsWith('/admin/tournaments'),
    },
    {
      href: '/overlay-manager',
      label: 'Overlay',
      icon: Monitor,
      match: (path) => path.startsWith('/overlay-manager'),
    },
    {
      href: '/wallet',
      label: 'Wallet',
      icon: Wallet,
      match: (path) => path.startsWith('/wallet'),
    },
  ]

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={toggle} /> : null}

      <aside
        className={`app-shell-surface fixed left-0 z-40 hidden overflow-hidden border-r transition-[width] duration-300 ease-in-out md:flex md:flex-col ${
          isOpen ? 'w-[280px]' : 'w-[88px]'
        }`}
        style={{ top: '4.75rem', height: 'calc(100vh - 4.75rem)' }}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ href, icon: Icon, label, match }) => {
            if (href === '/overlay-manager' && !session) return null
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                title={!isOpen ? label : undefined}
                className={`group flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 transition ${
                  active ? 'bg-[#17b45b] text-white shadow-[0_12px_24px_rgba(23,180,91,0.22)]' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={`whitespace-nowrap text-sm font-semibold transition-[opacity,transform] duration-300 ${
                    isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none absolute -translate-x-2 opacity-0'
                  }`}
                >
                  {label}
                </span>
              </Link>
            )
          })}

          {isAdmin ? (
            <>
              <button
                onClick={() => setAdminOpen((v) => !v)}
                title={!isOpen ? 'Admin' : undefined}
                className={`group flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 transition ${
                  isAdminActive ? 'bg-[#17b45b] text-white shadow-[0_12px_24px_rgba(23,180,91,0.22)]' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Shield className="h-5 w-5 shrink-0" />
                <span
                  className={`flex-1 text-left text-sm font-semibold transition-[opacity,transform] duration-300 ${
                    isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none absolute -translate-x-2 opacity-0'
                  }`}
                >
                  Admin
                </span>
                {isOpen ? (
                  <span className="shrink-0">{adminOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                ) : null}
              </button>

              {adminOpen && isOpen ? (
                <div className="space-y-1 pl-4">
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
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm transition ${
                          isRowActive ? 'bg-white text-slate-950' : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isRowActive ? 'bg-[#17b45b]' : 'bg-slate-300'}`} />
                        {label}
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </>
          ) : null}
        </nav>

        <div className="shrink-0 border-t border-[#e6ece5] px-3 py-3">
          <button
            onClick={toggle}
            className="flex h-10 w-full items-center justify-center rounded-2xl bg-[#f6f8f4] text-slate-500 transition hover:bg-white hover:text-slate-900"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <ChevronDown className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <aside
        className={`app-shell-surface fixed left-3 right-3 top-[5.25rem] z-40 rounded-[2rem] border p-3 shadow-[0_24px_70px_rgba(10,14,18,0.18)] transition md:hidden ${
          isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <nav className="space-y-1">
          {navItems.map(({ href, icon: Icon, label, match }) => {
            if (href === '/overlay-manager' && !session) return null
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                onClick={toggle}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  active ? 'bg-[#17b45b] text-white' : 'text-slate-700 hover:bg-[#f4f7f2]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-semibold">{label}</span>
              </Link>
            )
          })}

          {isAdmin ? (
            <>
              <div className="px-4 pt-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Admin</p>
              </div>
              <Link href="/admin/users" onClick={toggle} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${pathname.startsWith('/admin/users') ? 'bg-[#17b45b] text-white' : 'text-slate-700 hover:bg-[#f4f7f2]'}`}>
                <Shield className="h-5 w-5" />
                <span className="font-semibold">User Management</span>
              </Link>
              <Link href="/admin/access" onClick={toggle} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${pathname.startsWith('/admin/access') ? 'bg-[#17b45b] text-white' : 'text-slate-700 hover:bg-[#f4f7f2]'}`}>
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Tournament Access</span>
              </Link>
              <Link href="/admin/pricing" onClick={toggle} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${pathname.startsWith('/admin/pricing') ? 'bg-[#17b45b] text-white' : 'text-slate-700 hover:bg-[#f4f7f2]'}`}>
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Pricing</span>
              </Link>
            </>
          ) : null}
        </nav>
      </aside>

      <div className="app-shell-surface fixed inset-x-3 bottom-3 z-40 rounded-full border px-2 py-2 shadow-[0_18px_50px_rgba(10,14,18,0.16)] md:hidden">
        <nav className="grid grid-cols-4 gap-1">
          <BottomNavLink href="/" label="Home" active={isDashboardActive} icon={LayoutDashboard} />
          <BottomNavLink href="/admin/tournaments" label="Series" active={isTournamentsActive} icon={Trophy} />
          <BottomNavLink
            href={isAdmin ? '/admin/users' : '/overlay-manager'}
            label={isAdmin ? 'Admin' : 'Overlay'}
            active={isAdmin ? isAdminActive : isOverlayActive}
            icon={isAdmin ? Shield : Monitor}
          />
          <BottomNavLink href="/wallet" label="Wallet" active={isWalletActive} icon={Wallet} />
        </nav>
      </div>
    </>
  )
}

function BottomNavLink({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string
  label: string
  active: boolean
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center rounded-full px-2 py-2 text-[0.7rem] font-medium transition ${
        active ? 'bg-[#17b45b] text-white shadow-[0_10px_24px_rgba(23,180,91,0.2)]' : 'text-slate-500'
      }`}
    >
      <Icon className="mb-1 h-4 w-4" />
      {label}
    </Link>
  )
}
