'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

const EXCLUDED = ['/login', '/overlay/']

function isExcluded(pathname: string) {
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
        className="transition-[padding-left] duration-300 ease-in-out min-h-screen bg-gray-950 text-gray-100"
        style={{ paddingTop: '5.5rem', paddingLeft: 'var(--sidebar-width, 240px)' }}
      >
        {children}
      </div>
    </>
  )
}
