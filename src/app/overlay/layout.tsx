// Overlay layout: transparent background for OBS browser source
// No html/body wrappers that add backgrounds — just pass children through

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-transparent" style={{ background: 'transparent' }}>
      {children}
    </div>
  )
}
