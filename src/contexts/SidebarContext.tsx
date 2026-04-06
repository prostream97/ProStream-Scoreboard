'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextValue {
  isOpen: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue>({ isOpen: true, toggle: () => {} })

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_open')
    const isMobile = window.innerWidth < 768
    setIsOpen(saved !== null ? saved === 'true' : !isMobile)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const width = isOpen ? '280px' : '88px'
    document.documentElement.style.setProperty('--sidebar-width', width)
    localStorage.setItem('sidebar_open', String(isOpen))
  }, [isOpen, mounted])

  return (
    <SidebarContext.Provider value={{ isOpen, toggle: () => setIsOpen((v) => !v) }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
