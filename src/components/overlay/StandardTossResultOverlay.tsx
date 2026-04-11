'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const BLUE = '#232882'
const RED = '#FF1E50'
const WHITE = '#FFFFFF'

type Props = {
  snapshot: MatchSnapshot
}

function cloudUrl(id: string, w: number, h: number) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${w},h_${h},f_webp/${id}`
}

function Logo({ id, alt, fallback, size }: {
  id: string | null
  alt: string
  fallback: string
  size: number
}) {
  return (
    <div style={{ width: size, height: size, borderRadius: 9999, overflow: 'hidden', background: WHITE, flexShrink: 0 }}>
      {id
        ? <Image src={cloudUrl(id, size, size)} alt={alt} width={size} height={size} style={{ objectFit: 'cover' }} />
        : <span style={{ color: BLUE, fontFamily: 'Lato, sans-serif', fontWeight: 700, fontSize: size * 0.3, display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>}
    </div>
  )
}

function OverlayShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 130, damping: 22 }}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          width: 1863.39,
          height: 1100.37,
          left: -240.97,
          top: 598.95,
          position: 'absolute',
          transform: 'rotate(-27deg)',
          transformOrigin: 'top left',
          borderRadius: '100%',
          background: 'linear-gradient(80deg, rgba(35,40,130,0.60) 24%, rgba(255,30,80,0.60) 100%)',
        }} />
        <div style={{ width: 1346, height: 930, left: 261, top: 46, position: 'absolute', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </motion.div>
  )
}

function TitlePill() {
  return (
    <div style={{
      width: 520,
      height: 78,
      left: 413,
      top: 168,
      position: 'absolute',
      borderRadius: 80,
      background: `linear-gradient(180deg, ${RED} 22%, #8B0020 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0px 24px 45px -18px rgba(35,40,130,0.22)',
    }}>
      <span style={{
        color: WHITE,
        fontSize: 34,
        fontFamily: 'Lato, sans-serif',
        fontWeight: 700,
        letterSpacing: 2.4,
      }}>
        TOSS RESULT
      </span>
    </div>
  )
}

export function StandardTossResultOverlay({ snapshot }: Props) {
  if (!snapshot.tossWinnerId || !snapshot.tossDecision) return null

  const winningTeam = snapshot.homeTeam.id === snapshot.tossWinnerId
    ? snapshot.homeTeam
    : snapshot.awayTeam.id === snapshot.tossWinnerId
      ? snapshot.awayTeam
      : null

  if (!winningTeam) return null

  const statement = `${winningTeam.name.toUpperCase()} won the toss and elected to ${snapshot.tossDecision}.`
  const tournamentFallback = snapshot.tournamentName
    ? snapshot.tournamentName.slice(0, 2).toUpperCase()
    : winningTeam.shortCode.slice(0, 2)

  return (
    <OverlayShell>
      <div style={{ width: 150, height: 150, left: 598, top: 0, position: 'absolute', borderRadius: 100 }}>
        <Logo
          id={snapshot.tournamentLogoCloudinaryId ?? null}
          alt={snapshot.tournamentName ?? winningTeam.name}
          fallback={tournamentFallback}
          size={150}
        />
      </div>

      <TitlePill />

      <div style={{
        width: 1040,
        height: 460,
        left: 153,
        top: 320,
        position: 'absolute',
        borderRadius: 56,
        background: WHITE,
        boxShadow: '0px 32px 60px -24px rgba(35,40,130,0.28)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '100%',
          height: 142,
          background: `linear-gradient(90deg, ${RED} 0%, ${WHITE} 18%, ${WHITE} 82%, ${RED} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '0 48px',
        }}>
          <Logo
            id={winningTeam.logoCloudinaryId}
            alt={winningTeam.name}
            fallback={winningTeam.shortCode.slice(0, 2)}
            size={104}
          />
          <div style={{
            color: BLUE,
            fontSize: 52,
            lineHeight: 1.05,
            fontFamily: 'Lato, sans-serif',
            fontWeight: 700,
            textAlign: 'center',
            wordBreak: 'break-word',
          }}>
            {winningTeam.name.toUpperCase()}
          </div>
        </div>

        <div style={{
          padding: '54px 92px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            color: RED,
            fontSize: 24,
            fontFamily: 'Lato, sans-serif',
            fontWeight: 700,
            letterSpacing: 1.6,
            marginBottom: 18,
          }}>
            MATCH UPDATE
          </div>
          <div style={{
            color: BLUE,
            fontSize: 44,
            lineHeight: 1.25,
            fontFamily: 'Lato, sans-serif',
            fontWeight: 700,
            wordBreak: 'break-word',
          }}>
            {statement}
          </div>
        </div>
      </div>
    </OverlayShell>
  )
}
