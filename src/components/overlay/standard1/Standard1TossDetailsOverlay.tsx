'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// Exact CSS from Toss details.html
const YELLOW_MAIN = '#f6ce00'
const BLUE_GRAD = 'linear-gradient(to right, #0307e3, #1416ea, #1e21f1, #272af8, #2e32ff)'
const BLACK_GRAD = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'
const GRAY_GRAD = 'linear-gradient(to right, #808080, #8a8a8a, #949394, #9e9d9e, #a8a7a8)'
const PINK_GRAD = 'linear-gradient(to bottom, #ed00dc 2%, #ed00dc 25%, #ed00dc 50%, #d600c7 100%)'

type Props = { snapshot: MatchSnapshot }

function TeamSide({ id, name, fallback, background }: {
  id: string | null
  name: string
  fallback: string
  background: string
}) {
  return (
    <div style={{
      width: 200,
      height: 145,
      backgroundImage: background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 9999,
        overflow: 'hidden',
        background: 'white',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {id
          ? <Image src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_80,h_80,f_webp/${id}`} alt={name} width={80} height={80} style={{ objectFit: 'cover' }} />
          : <span style={{ fontWeight: 900, fontSize: 28, color: '#333' }}>{fallback}</span>}
      </div>
      <span style={{
        fontSize: 16,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: background === GRAY_GRAD ? '#000' : '#fff',
        textAlign: 'center',
        maxWidth: 180,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 8px',
      }}>
        {name}
      </span>
    </div>
  )
}

export function Standard1TossDetailsOverlay({ snapshot }: Props) {
  if (!snapshot.tossWinnerId || !snapshot.tossDecision) return null

  const winningTeam = snapshot.tossWinnerId === snapshot.homeTeam.id
    ? snapshot.homeTeam
    : snapshot.awayTeam

  const decisionText = snapshot.tossDecision === 'bat' ? 'ELECTED TO BAT' : 'ELECTED TO BOWL'

  return (
    <>
      <style jsx>{`
        .s1-toss-shine-wrap {
          position: relative;
          overflow: hidden;
        }
        .s1-toss-shine {
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            100deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.03) 35%,
            rgba(255, 255, 255, 0.22) 50%,
            rgba(255, 255, 255, 0.03) 65%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: s1-toss-shine 4.4s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }
        @keyframes s1-toss-shine {
          0% { transform: translateX(-35%); }
          100% { transform: translateX(35%); }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 20,
          fontFamily: 'Arial, sans-serif',
        }}
      >
      <div style={{
        width: 1600,
        height: 145,
        display: 'inline-flex',
      }}>
        {/* Left: home team strip (gray) */}
        <motion.div
          initial={{ x: -80 }}
          animate={{ x: 0 }}
          exit={{ x: -80 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          {/* Black accent bar */}
          <div className="s1-toss-shine-wrap" style={{ width: 50, height: 145, backgroundImage: BLACK_GRAD }}>
            <div className="s1-toss-shine" />
          </div>
          {/* Gray team box */}
          <TeamSide
            id={snapshot.homeTeam.logoCloudinaryId}
            name={snapshot.homeTeam.name}
            fallback={snapshot.homeTeam.shortCode}
            background={GRAY_GRAD}
          />
        </motion.div>

        {/* Center: toss info */}
        <div className="s1-toss-shine-wrap" style={{
          flex: 1,
          backgroundImage: BLACK_GRAD,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '0 20px',
        }}>
          <div className="s1-toss-shine" />
          {/* Toss winner name in yellow */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: YELLOW_MAIN,
              color: '#000',
              border: '5px solid yellow',
              borderRadius: 3,
              padding: '4px 20px',
              fontSize: 24,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 2,
              textAlign: 'center',
            }}
          >
            {winningTeam.name}
          </motion.div>

          <span style={{ position: 'relative', zIndex: 2, color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: 600 }}>
            won the toss and
          </span>

          <span style={{ position: 'relative', zIndex: 2, color: '#fff', fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            {decisionText}
          </span>

          {/* Tournament + match info in blue */}
          {snapshot.tournamentName && (
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ delay: 0.15 }}
              style={{
                display: 'inline-flex',
                backgroundImage: BLUE_GRAD,
                color: 'white',
                padding: '4px 14px',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                gap: 10,
                marginTop: 4,
              }}
            >
              <span>{snapshot.tournamentName}</span>
            </motion.div>
          )}
        </div>

        {/* Right: away team strip (pink) */}
        <motion.div
          initial={{ x: 80 }}
          animate={{ x: 0 }}
          exit={{ x: 80 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          {/* Pink team box */}
          <TeamSide
            id={snapshot.awayTeam.logoCloudinaryId}
            name={snapshot.awayTeam.name}
            fallback={snapshot.awayTeam.shortCode}
            background={PINK_GRAD}
          />
          {/* Black accent bar */}
          <div className="s1-toss-shine-wrap" style={{ width: 50, height: 145, backgroundImage: BLACK_GRAD }}>
            <div className="s1-toss-shine" />
          </div>
        </motion.div>
      </div>
      </motion.div>
    </>
  )
}
