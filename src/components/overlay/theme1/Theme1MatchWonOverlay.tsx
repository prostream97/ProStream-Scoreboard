'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const GOLD_GRAD = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 100%)'
const BLUE_GOLD_GRAD = 'linear-gradient(280deg, rgb(0,67,222) 0%, rgba(0,0,0,0.8) 50%, rgb(249,204,1) 100%)'
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

function buildResultText(snapshot: MatchSnapshot): string {
  if (!snapshot.resultType) return 'MATCH COMPLETE'
  if (snapshot.resultType === 'tie') return 'MATCH TIED'
  if (!snapshot.resultWinnerId || snapshot.resultMargin == null) return 'RESULT RECORDED'
  const winner = snapshot.resultWinnerId === snapshot.homeTeam.id
    ? snapshot.homeTeam : snapshot.awayTeam
  const unit = snapshot.resultType === 'wickets' ? 'WICKET' : 'RUN'
  const suffix = snapshot.resultMargin === 1 ? unit : `${unit}S`
  return `${winner.shortCode} WON BY ${snapshot.resultMargin} ${suffix}`
}

export function Theme1MatchWonOverlay({ snapshot }: { snapshot: MatchSnapshot }) {
  const isTie = snapshot.resultType === 'tie' || !snapshot.resultWinnerId
  const winner = !isTie && snapshot.resultWinnerId
    ? (snapshot.resultWinnerId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam)
    : null
  const resultText = buildResultText(snapshot)

  return (
    <motion.div
      key="theme1-match-won"
      initial={{ opacity: 0, y: -60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -60 }}
      transition={{ type: 'spring', stiffness: 130, damping: 18 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30000,
        fontFamily: '"Source Sans Pro", sans-serif',
      }}
    >
      <div style={{ width: 1090, position: 'relative' }}>

        {/* Winner logo — overlaps header */}
        {winner?.logoCloudinaryId && CLOUD_NAME && (
          <div
            style={{
              position: 'absolute',
              top: -50,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 140,
              height: 140,
              borderRadius: '50%',
              overflow: 'hidden',
              zIndex: 2,
              boxShadow: 'rgba(0,0,0,0.75) 0px 0px 24px 0px',
              border: '4px solid rgba(249,204,1,0.7)',
            }}
          >
            <Image
              src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_140,h_140,f_webp/${winner.logoCloudinaryId}`}
              alt={winner.name}
              width={140}
              height={140}
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Header */}
        <div
          style={{
            background: GOLD_GRAD,
            color: 'rgb(255,255,255)',
            fontSize: 38,
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: winner?.logoCloudinaryId && CLOUD_NAME ? '60px 0 14px' : '18px 0 14px',
            lineHeight: '44px',
          }}
        >
          MATCH RESULT
          {snapshot.tournamentName && (
            <div style={{ fontSize: 22, fontWeight: 500, opacity: 0.85, marginTop: 4 }}>
              {snapshot.tournamentName}
            </div>
          )}
        </div>

        {/* Winner name */}
        {winner && (
          <div
            style={{
              background: BLUE_GOLD_GRAD,
              color: 'rgb(255,255,255)',
              fontSize: 54,
              fontWeight: 900,
              textTransform: 'uppercase',
              textAlign: 'center',
              padding: '20px',
              letterSpacing: '0.04em',
              lineHeight: '62px',
            }}
          >
            {winner.name}
          </div>
        )}

        {/* Result line */}
        <div
          style={{
            background: GOLD_GRAD,
            color: 'rgb(255,255,255)',
            textAlign: 'center',
            fontSize: 36,
            fontWeight: 700,
            padding: '16px 0',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {resultText}
        </div>
      </div>
    </motion.div>
  )
}
