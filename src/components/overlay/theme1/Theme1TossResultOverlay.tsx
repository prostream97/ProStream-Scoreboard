'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const GOLD_GRAD = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 100%)'
const BLUE_GOLD_GRAD = 'linear-gradient(280deg, rgb(0,67,222) 0%, rgba(0,0,0,0.8) 50%, rgb(249,204,1) 100%)'

type Props = { snapshot: MatchSnapshot }

function teamLogoUrl(logoId: string | null, size: number): string | null {
  if (!logoId || !CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${logoId}`
}

function TeamLogo({ logoId, fallback }: { logoId: string | null; fallback: string }) {
  const src = teamLogoUrl(logoId, 120)
  if (!src) {
    return (
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgb(255,255,255)',
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        {fallback.charAt(0)}
      </div>
    )
  }
  return (
    <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden' }}>
      <Image src={src} alt={fallback} width={120} height={120} style={{ objectFit: 'cover' }} />
    </div>
  )
}

export function Theme1TossResultOverlay({ snapshot }: Props) {
  if (!snapshot.tossWinnerId || !snapshot.tossDecision) return null

  const winner = snapshot.tossWinnerId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const decisionText = snapshot.tossDecision === 'bat' ? 'ELECTED TO BAT' : 'ELECTED TO BOWL'

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 130, damping: 18 }}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 50,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 20000,
        fontFamily: '"Source Sans Pro", sans-serif',
      }}
    >
      <div style={{ width: 1090, overflow: 'hidden', boxShadow: 'rgba(0,0,0,0.75) 0px 24px 60px 0px' }}>
        <div
          style={{
            background: GOLD_GRAD,
            color: 'rgb(255,255,255)',
            textAlign: 'center',
            fontSize: 34,
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '14px 20px',
            letterSpacing: '0.05em',
          }}
        >
          Toss Result
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.9)',
            display: 'grid',
            gridTemplateColumns: '180px 1fr 180px',
            alignItems: 'center',
            minHeight: 190,
            padding: '18px 28px',
            gap: 18,
            color: 'rgb(255,255,255)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TeamLogo logoId={snapshot.homeTeam.logoCloudinaryId} fallback={snapshot.homeTeam.shortCode} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                background: BLUE_GOLD_GRAD,
                padding: '8px 20px',
                fontSize: 32,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                textAlign: 'center',
              }}
            >
              {winner.name}
            </div>
            <div style={{ fontSize: 20, opacity: 0.78 }}>won the toss and</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: 'rgb(249,204,1)', letterSpacing: '0.04em' }}>
              {decisionText}
            </div>
            {snapshot.tournamentName && (
              <div style={{ fontSize: 16, opacity: 0.78, textTransform: 'uppercase' }}>{snapshot.tournamentName}</div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TeamLogo logoId={snapshot.awayTeam.logoCloudinaryId} fallback={snapshot.awayTeam.shortCode} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
