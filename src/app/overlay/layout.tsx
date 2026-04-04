// Overlay layout: fixed 1920×1080 transparent canvas for OBS browser source
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
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
  )
}
