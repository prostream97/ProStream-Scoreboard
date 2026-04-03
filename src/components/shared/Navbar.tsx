'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useSidebar } from '@/contexts/SidebarContext'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

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

  // Fetch wallet balance for operators only
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
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 h-[5.5rem] transition-all duration-300 ${
        scrolled
          ? 'bg-gray-900/80 backdrop-blur-md border-b border-gray-800'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors duration-200"
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img
              src="https://res.cloudinary.com/diitsd6nz/image/upload/v1760794476/ProSteam_logo_h9pb8b.png"
              alt="ProStream"
              className="h-9 w-9 object-contain relative z-10"
            />
          </div>
          <div className="flex flex-col">
            <p className="font-display text-xl leading-none tracking-tight">
              <span className="text-primary">Pro</span>
              <span className="text-secondary">Stream</span>
            </p>
            <span className="font-stats text-[0.65rem] uppercase tracking-[0.2em] font-bold text-gray-500">
              Scoreboard
            </span>
          </div>
        </Link>

        {/* Breadcrumbs */}
        {pathname !== '/' && !pathname.startsWith('/login') && (
          <div className="hidden md:flex items-center gap-2 ml-6 px-4 py-1.5 rounded-full bg-gray-900/60 border border-gray-800 shadow-inner">
            <Link href="/" className="text-gray-400 hover:text-primary transition-colors text-sm font-stats">Dashboard</Link>
            
            {pathname.startsWith('/admin/tournaments') && (
              <>
                <span className="text-gray-600 text-xs">/</span>
                <Link href="/admin/tournaments" className="text-gray-300 hover:text-primary transition-colors text-sm font-stats">Tournaments</Link>
                {pathname.split('/').length > 3 && (
                  <>
                    <span className="text-gray-600 text-xs">/</span>
                    <span className="text-primary text-sm font-stats">Details</span>
                  </>
                )}
              </>
            )}

            {pathname.startsWith('/match/new') && (
              <>
                <span className="text-gray-600 text-xs">/</span>
                <span className="text-primary text-sm font-stats">New Match</span>
              </>
            )}
            
            {pathname.startsWith('/match/') && !pathname.startsWith('/match/new') && (
              <>
                <span className="text-gray-600 text-xs">/</span>
                <span className="text-primary text-sm font-stats">Match Control</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: user profile + logout */}
      <div className="flex items-center gap-3">
        {session ? (
          <>
            {/* User profile pill */}
            <div className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full bg-gray-900 border border-gray-800">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-700 border border-gray-600 flex items-center justify-center">
                {session.user.photoCloudinaryId && CLOUD_NAME ? (
                  <img
                    src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_64,h_64,f_webp/${session.user.photoCloudinaryId}`}
                    alt={session.user.name ?? session.user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-stats text-sm font-bold text-gray-300 leading-none">
                    {(session.user.name ?? session.user.username ?? '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name + wallet balance */}
              <div className="flex flex-col leading-none">
                <span className="font-stats text-sm text-white font-semibold truncate max-w-[120px]">
                  {session.user.name ?? session.user.username}
                </span>
                {session.user.role === 'operator' && walletBalance !== null && (
                  <span className="font-stats text-[0.65rem] text-primary mt-0.5">
                    ◈ {walletBalance} LKR
                  </span>
                )}
                {session.user.role === 'admin' && (
                  <span className="font-stats text-[0.65rem] text-gray-500 mt-0.5 uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full font-stats text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 transition-all duration-200"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="px-5 py-2 rounded-full font-stats text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}
