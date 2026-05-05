'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const BLACK_GRAD = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'
const BLUE_GRAD = 'linear-gradient(to right, #0307e3, #1416ea, #1e21f1, #272af8, #2e32ff)'
const YELLOW_GRAD = 'linear-gradient(to right, #ffe400, #ffd921, #ffe435, #fcec38, #fff91e)'
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

export function Standard1MatchWonOverlay({ snapshot }: { snapshot: MatchSnapshot }) {
  const isTie = snapshot.resultType === 'tie' || !snapshot.resultWinnerId
  const winner = !isTie && snapshot.resultWinnerId
    ? (snapshot.resultWinnerId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam)
    : null
  const resultText = buildResultText(snapshot)

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 30000,
      }}
    >
      <motion.div
        key="match-won"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 130, damping: 18 }}
        style={{ width: 1500, fontFamily: 'Lato, sans-serif', boxSizing: 'border-box' }}
      >
        {/* Header */}
        <div
          style={{
            width: 1500,
            height: 140,
            backgroundImage: BLACK_GRAD,
            border: '5px solid black',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {snapshot.tournamentLogoCloudinaryId && CLOUD_NAME && (
            <div style={{ position: 'absolute', left: 20, top: 0, width: 140, height: 140 }}>
              <Image
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_140,h_140,f_webp/${snapshot.tournamentLogoCloudinaryId}`}
                alt={snapshot.tournamentName ?? ''}
                width={140}
                height={140}
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}
          {snapshot.tournamentLogoCloudinaryId && CLOUD_NAME && (
            <div style={{ position: 'absolute', right: 20, top: 0, width: 140, height: 140 }}>
              <Image
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_140,h_140,f_webp/${snapshot.tournamentLogoCloudinaryId}`}
                alt={snapshot.tournamentName ?? ''}
                width={140}
                height={140}
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 62, fontWeight: 900, lineHeight: '72px' }}>MATCH RESULT</div>
            {snapshot.tournamentName && (
              <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.8 }}>{snapshot.tournamentName}</div>
            )}
          </div>
        </div>

        {/* Winner panel */}
        <div
          style={{
            backgroundImage: BLUE_GRAD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 50,
            padding: '30px 60px',
          }}
        >
          {winner?.logoCloudinaryId && CLOUD_NAME ? (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '4px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}
            >
              <Image
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_180,h_180,f_webp/${winner.logoCloudinaryId}`}
                alt={winner.name}
                width={180}
                height={180}
                style={{ objectFit: 'cover' }}
              />
            </div>
          ) : winner ? (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                backgroundColor: winner.primaryColor,
                border: '4px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}
            />
          ) : null}

          {winner && (
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: 'white',
                letterSpacing: '0.02em',
                lineHeight: '82px',
                textAlign: 'center',
              }}
            >
              {winner.name}
            </div>
          )}
        </div>

        {/* Result text */}
        <div
          style={{
            backgroundImage: YELLOW_GRAD,
            height: 100,
            lineHeight: '100px',
            textAlign: 'center',
            fontSize: 58,
            fontWeight: 900,
            color: '#000',
            letterSpacing: '0.03em',
          }}
        >
          {resultText}
        </div>
      </motion.div>
    </div>
  )
}
