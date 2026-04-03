import type { Metadata } from 'next'
import { Inter, Bebas_Neue, Rajdhani, Barlow_Condensed } from 'next/font/google'
import Providers from '@/components/shared/Providers'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AppShell } from '@/components/shared/AppShell'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ProStream Scoreboard',
  description: 'Real-time cricket scoring and broadcast overlay system',
  icons: {
    icon: 'https://res.cloudinary.com/diitsd6nz/image/upload/v1760794476/ProSteam_logo_h9pb8b.png',
    shortcut: 'https://res.cloudinary.com/diitsd6nz/image/upload/v1760794476/ProSteam_logo_h9pb8b.png',
    apple: 'https://res.cloudinary.com/diitsd6nz/image/upload/v1760794476/ProSteam_logo_h9pb8b.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bebasNeue.variable} ${rajdhani.variable} ${barlowCondensed.variable}`}
    >
      <body suppressHydrationWarning>
        <Providers>
          <SidebarProvider>
            <AppShell>{children}</AppShell>
            <Toaster theme="dark" position="bottom-right" />
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  )
}
