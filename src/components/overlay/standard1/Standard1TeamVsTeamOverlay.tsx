'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const YELLOW_MAIN = '#f6ce00'
const BLACK_GRAD = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'
const NAVY_GRAD = 'linear-gradient(to right, #000080, #00008a, #000095, #00009f, #0000aa)'

type Props = { snapshot: MatchSnapshot }

function cloudinaryUrl(id: string | null, size: number) {
  if (!id || !CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${id}`
}

function PlaceholderLogo({ label, size }: { label: string; size: number }) {
  const renderSize = size === 58 ? 150 : size
  return (
    <div
      style={{
        width: renderSize,
        height: renderSize,
        borderRadius: size === 170 || size === 58 ? 35 : 20,
        border: '4px solid rgba(255,255,255,0.65)',
        background:
          'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 35%), linear-gradient(135deg, #0a0d1f, #1d2d59 50%, #f6ce00 100%)',
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(renderSize * 0.28),
        fontWeight: 900,
        boxShadow: 'rgba(0, 0, 0, 0.56) 0 22px 70px 4px',
      }}
    >
      {label}
    </div>
  )
}

function LogoCard({
  logoId,
  fallback,
  alt,
  size,
}: {
  logoId: string | null
  fallback: string
  alt: string
  size: number
}) {
  const renderSize = size === 58 ? 150 : size
  const src = cloudinaryUrl(logoId, renderSize)

  if (!src) {
    return <PlaceholderLogo label={fallback} size={size} />
  }

  return (
    <div
      style={{
        position: 'relative',
        width: renderSize,
        height: renderSize,
        borderRadius: size === 170 || size === 58 ? 35 : 20,
        overflow: 'hidden',
        boxShadow: 'rgba(0, 0, 0, 0.56) 0 22px 70px 4px',
      }}
    >
      <Image src={src} alt={alt} fill sizes={`${renderSize}px`} style={{ objectFit: 'cover' }} />
    </div>
  )
}

function Beam() {
  return <div className="standard1-vs-beam" aria-hidden="true" />
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function normalizeHexColor(hex: string | null | undefined) {
  if (!hex) return null
  const trimmed = hex.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return null
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  }
}

function shiftHex(hex: string, delta: number) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = clamp(rgb.r + delta, 0, 255)
  const g = clamp(rgb.g + delta, 0, 255)
  const b = clamp(rgb.b + delta, 0, 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function teamStripColor(primaryColor: string) {
  const normalized = normalizeHexColor(primaryColor)
  return normalized ?? primaryColor
}

function teamStripTextColor(primaryColor: string) {
  const rgb = hexToRgb(primaryColor)
  if (!rgb) return '#fff'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.62 ? '#000' : '#fff'
}

export function Standard1TeamVsTeamOverlay({ snapshot }: Props) {
  const matchLabel = snapshot.matchLabel ?? `${snapshot.homeTeam.shortCode} VS ${snapshot.awayTeam.shortCode}`
  const tournamentLabel = snapshot.tournamentName ?? 'CRICKET MATCH'

  return (
    <>
      <style jsx>{`
        .standard1-vs-beam {
          position: absolute;
          inset: -50% auto auto -50%;
          width: 100%;
          height: 200%;
          background: linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
          animation: standard1-vs-beam 5s linear infinite;
          pointer-events: none;
        }

        @keyframes standard1-vs-beam {
          50% {
            transform: translate(-50%, 0%);
          }

          100% {
            transform: translate(0%, -50%);
          }
        }

        .standard1-vs-row-beam {
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.06) 35%,
            rgba(255, 255, 255, 0.75) 50%,
            rgba(255, 255, 255, 0.06) 65%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: standard1-vs-row-beam 3.2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes standard1-vs-row-beam {
          0% { transform: translateX(-35%); }
          100% { transform: translateX(35%); }
        }

        .standard1-vs-panel-shine {
          position: absolute;
          top: 0;
          left: -45%;
          width: 190%;
          height: 100%;
          background: linear-gradient(
            100deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.04) 32%,
            rgba(255, 255, 255, 0.42) 50%,
            rgba(255, 255, 255, 0.04) 68%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: standard1-vs-panel-shine 3.8s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
        }

        @keyframes standard1-vs-panel-shine {
          0% { transform: translateX(-42%); }
          100% { transform: translateX(42%); }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: -220, scaleY: 1.08 }}
        animate={{ opacity: 1, y: 0, scaleY: 1 }}
        exit={{ opacity: 0, y: -120 }}
        transition={{ type: 'spring', stiffness: 110, damping: 18 }}
        style={{
          position: 'absolute',
          left: 0,
          top: 905,
          width: 1920,
          height: 80,
          zIndex: 20,
          display: 'flex',
          justifyContent: 'center',
          fontFamily: '"Rajdhani", "Arial Narrow", Arial, sans-serif',
          letterSpacing: 1,
        }}
      >
        {/* Full-width scorebug content column */}
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Side team logos outside all three bars (render first so bars/text layer above) */}
          <div style={{ position: 'absolute', top: 25, left: 20, width: 150, height: 150, zIndex: 8 }}>
            <LogoCard
              logoId={snapshot.homeTeam.logoCloudinaryId}
              fallback={snapshot.homeTeam.shortCode}
              alt={snapshot.homeTeam.name}
              size={58}
            />
          </div>
          <div style={{ position: 'absolute', top: 25, right: 20, width: 150, height: 150, zIndex: 8 }}>
            <LogoCard
              logoId={snapshot.awayTeam.logoCloudinaryId}
              fallback={snapshot.awayTeam.shortCode}
              alt={snapshot.awayTeam.name}
              size={58}
            />
          </div>

          {/* Match number label */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              height: 50,
              marginBottom: 10,
              borderLeft: '10px solid #080a6a',
              borderRight: '10px solid #080a6a',
              background: YELLOW_MAIN,
              color: '#000',
              textAlign: 'center',
              lineHeight: '50px',
              boxShadow:
                'rgba(255,255,255,0.1) 0 1px 1px 0 inset, rgba(50,50,93,0.25) 0 50px 100px -20px, rgba(0,0,0,0.3) 0 30px 60px -30px',
            }}
          >
            <Beam />
            <span style={{ position: 'relative', fontSize: 30, fontWeight: 700, textTransform: 'uppercase' }}>
              {matchLabel}
            </span>
          </div>

          {/* Team names row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '0 190px' }}>

            {/* Home team box — outer black gradient, inner yellow */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                flex: 1,
                height: 80,
                borderRadius: 5,
                border: 'none',
                backgroundImage: BLACK_GRAD,
                boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
              }}
            >
              <div className="standard1-vs-row-beam" />
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  height: '100%',
                  borderRadius: 3,
                  borderWidth: 0,
                  borderStyle: 'none',
                  borderColor: 'transparent',
                  borderImage: 'none',
                  background: teamStripColor(snapshot.homeTeam.primaryColor),
                  color: teamStripTextColor(snapshot.homeTeam.primaryColor),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 35,
                  fontWeight: 1000,
                  textTransform: 'uppercase',
                  padding: '0 20px',
                }}
              >
                <Beam />
                <div className="standard1-vs-panel-shine" />
                <span style={{ position: 'relative', zIndex: 3, textAlign: 'center', lineHeight: 1 }}>
                  {snapshot.homeTeam.name}
                </span>
              </div>
            </div>

            {/* VS badge */}
            <div
              style={{
                position: 'relative',
                zIndex: 12,
                width: 50,
                height: 50,
                margin: 'auto -10px',
                border: '5px solid #fff',
                borderRadius: '50%',
                backgroundImage: 'linear-gradient(to right, #000000, #222020, #353332, #54524f, #70706d)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 1000,
                lineHeight: '50px',
                textAlign: 'center',
                boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
              }}
            >
              VS
            </div>

            {/* Away team box — outer black gradient, inner yellow */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                flex: 1,
                height: 80,
                borderRadius: 5,
                border: 'none',
                backgroundImage: BLACK_GRAD,
                boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
              }}
            >
              <div className="standard1-vs-row-beam" />
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  height: '100%',
                  borderRadius: 3,
                  borderWidth: 0,
                  borderStyle: 'none',
                  borderColor: 'transparent',
                  borderImage: 'none',
                  background: teamStripColor(snapshot.awayTeam.primaryColor),
                  color: teamStripTextColor(snapshot.awayTeam.primaryColor),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 35,
                  fontWeight: 1000,
                  textTransform: 'uppercase',
                  padding: '0 20px',
                }}
              >
                <Beam />
                <div className="standard1-vs-panel-shine" />
                <span style={{ position: 'relative', zIndex: 3, textAlign: 'center', lineHeight: 1 }}>
                  {snapshot.awayTeam.name}
                </span>
              </div>
            </div>
          </div>

          {/* Tournament name banner */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              height: 60,
              marginTop: 30,
              border: '4px solid #0000ff',
              borderRadius: 5,
              backgroundImage: NAVY_GRAD,
              color: '#fff',
              textAlign: 'center',
              lineHeight: '60px',
            }}
          >
            <Beam />
            <span style={{ position: 'relative', fontSize: 35, fontWeight: 1000, textTransform: 'uppercase' }}>
              {tournamentLabel}
            </span>
          </div>

          {/* Tournament logo — top-centre, 170×170 */}
          <div style={{ position: 'absolute', top: -161, left: '50%', transform: 'translateX(-50%)', width: 170, height: 170 }}>
            <LogoCard
              logoId={snapshot.tournamentLogoCloudinaryId}
              fallback="T"
              alt={tournamentLabel}
              size={170}
            />
          </div>
        </div>
      </motion.div>
    </>
  )
}
