'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// Exact CSS from Tournament name.html
const YELLOW_MAIN = '#f6ce00'
const BLUE_GRAD = 'linear-gradient(to right, #0307e3, #1416ea, #1e21f1, #272af8, #2e32ff)'
const BLACK_GRAD = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'

type Props = { snapshot: MatchSnapshot }

export function Standard1TournamentNameOverlay({ snapshot }: Props) {
  const totalSixes = snapshot.batters.reduce((sum, b) => sum + b.sixes, 0)
  const totalFours = snapshot.batters.reduce((sum, b) => sum + b.fours, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      style={{
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 510,
        background: 'black',
        fontFamily: 'Arial, sans-serif',
        zIndex: 20,
      }}
    >
      {/* Tournament logo + name in black gradient box */}
      <div style={{
        backgroundImage: BLACK_GRAD,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '10px 16px',
        borderTop: '5px solid #121112',
        borderBottom: '3px solid #121112',
      }}>
        {snapshot.tournamentLogoCloudinaryId && (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            overflow: 'hidden',
            background: 'white',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Image
              src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_40,h_40,f_webp/${snapshot.tournamentLogoCloudinaryId}`}
              alt={snapshot.tournamentName ?? ''}
              width={40}
              height={40}
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}
        <span style={{
          fontSize: 22,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {snapshot.tournamentName ?? 'TOURNAMENT'}
        </span>
      </div>

      {/* Sixes + Fours counter */}
      <div style={{ background: 'black' }}>
        {/* Header row */}
        <div style={{
          height: 80,
          fontSize: 30,
          fontWeight: 700,
          borderTop: '5px solid #121112',
          borderBottom: '3px solid #121112',
          display: 'inline-flex',
          width: '100%',
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: BLUE_GRAD,
            color: 'white',
          }}>
            SIXES
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: BLUE_GRAD,
            color: 'white',
            borderLeft: '2px solid #0000aa',
          }}>
            FOURS
          </div>
        </div>

        {/* Values row */}
        <div style={{
          display: 'inline-flex',
          width: '100%',
          background: YELLOW_MAIN,
        }}>
          <div style={{
            flex: 1,
            height: 70,
            lineHeight: '70px',
            textAlign: 'center',
            fontSize: 48,
            fontWeight: 900,
            color: '#000',
          }}>
            {totalSixes}
          </div>
          <div style={{
            flex: 1,
            height: 70,
            lineHeight: '70px',
            textAlign: 'center',
            fontSize: 48,
            fontWeight: 900,
            color: '#000',
            borderLeft: '2px solid rgba(0,0,0,0.15)',
          }}>
            {totalFours}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
