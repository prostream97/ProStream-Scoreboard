import type { ReactNode } from 'react'

// Overlay layout: fixed 1920×1080 transparent canvas for OBS browser source
export default function OverlayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Lato font for innings summary overlay */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&display=swap"
      />
      <div
        style={{
          width: 1920,
          height: 1080,
          overflow: 'hidden',
          background: 'transparent',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </>
  )
}
