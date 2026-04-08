'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Bell, ChevronRight, Menu, Wallet } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const TITLES: Array<{ match: (pathname: string) => boolean; label: string }> = [
  { match: (pathname) => pathname === '/', label: 'Dashboard' },
  { match: (pathname) => pathname.startsWith('/admin/tournaments'), label: 'Tournaments' },
  { match: (pathname) => pathname.startsWith('/match/new'), label: 'Quick Match' },
  { match: (pathname) => pathname.startsWith('/overlay-manager'), label: 'Overlay Manager' },
  { match: (pathname) => pathname.startsWith('/wallet'), label: 'Wallet' },
  { match: (pathname) => pathname.startsWith('/admin/users'), label: 'User Management' },
  { match: (pathname) => pathname.startsWith('/admin/access'), label: 'Tournament Access' },
  { match: (pathname) => pathname.startsWith('/admin/pricing'), label: 'Pricing' },
]

function getPageTitle(pathname: string) {
  return TITLES.find((entry) => entry.match(pathname))?.label ?? 'ProStream'
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toggle } = useSidebar()
  const [scrolled, setScrolled] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'operator') {
      fetch('/api/wallet/me')
        .then((r) => r.json())
        .then((d) => setWalletBalance(d.balance))
        .catch(() => {})
    } else {
      setWalletBalance(null)
    }
  }, [status, session?.user?.role])

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/60 bg-[#151822]/96 shadow-[0_14px_32px_rgba(8,10,17,0.28)] backdrop-blur-md'
          : 'border-b border-transparent bg-[#151822]'
      }`}
    >
      <div className="flex h-[4.75rem] w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={toggle}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition hover:bg-white/10"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 ring-1 ring-white/8">
              <img
                src="https://res.cloudinary.com/diitsd6nz/image/upload/v1760794476/ProSteam_logo_h9pb8b.png"
                alt="ProStream"
                className="h-7 w-7 object-contain"
              />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="text-2xl font-bold leading-none tracking-tight">
                <span style={{ color: '#4F46E5' }}>Pro</span>
                <span style={{ color: '#10B981' }}>Stream</span>
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/45">{getPageTitle(pathname)}</p>
                {pathname !== '/' ? <ChevronRight className="h-3 w-3 text-white/30" /> : null}
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {session?.user?.role === 'operator' && walletBalance !== null ? (
            <div className="hidden items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-white/90 sm:flex">
              <Wallet className="h-4 w-4 text-emerald-300" />
              <div className="leading-none">
                <p className="font-stats text-[0.62rem] uppercase tracking-[0.22em] text-white/45">Wallet</p>
                <p className="font-stats text-xs font-semibold">{walletBalance} LKR</p>
              </div>
            </div>
          ) : null}

          <button className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/80 transition hover:bg-white/10 sm:flex">
            <Bell className="h-4 w-4" />
          </button>

          {session ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-2 py-1.5 text-white">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/8">
                  {session.user.photoCloudinaryId && CLOUD_NAME ? (
                    <img
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_64,h_64,f_webp/${session.user.photoCloudinaryId}`}
                      alt={session.user.name ?? session.user.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-stats text-sm font-bold leading-none text-white">
                      {(session.user.name ?? session.user.username ?? '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="hidden min-w-0 pr-2 sm:block">
                  <p className="truncate text-sm font-semibold text-white">{session.user.name ?? session.user.username}</p>
                  <p className="font-stats text-[0.62rem] uppercase tracking-[0.2em] text-white/45">
                    {session.user.role}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="hidden rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/82 transition hover:bg-white/10 sm:block"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#17b45b] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(23,180,91,0.28)] transition hover:bg-[#10994c]"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
