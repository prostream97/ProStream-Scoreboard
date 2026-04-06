'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

const EXCLUDED = ['/login', '/overlay/', '/viewer/']

function isExcluded(pathname: string) {
  if (pathname.startsWith('/match/') && pathname.endsWith('/operator')) return true
  return EXCLUDED.some((prefix) => pathname.startsWith(prefix))
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isExcluded(pathname)) return <>{children}</>

  return (
    <>
      <Navbar />
      <Sidebar />
      <div
        className="min-h-screen transition-[padding-left] duration-300 ease-in-out"
        style={{
          paddingTop: '4.75rem',
          paddingLeft: 'var(--sidebar-width, 88px)',
          paddingBottom: '5.5rem',
        }}
      >
        {children}
      </div>
    </>
  )
}
