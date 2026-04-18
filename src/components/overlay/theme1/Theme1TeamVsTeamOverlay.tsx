'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

function cloudinaryUrl(id: string | null, size: number) {
  if (!id || !CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${id}`
}

type Props = { snapshot: MatchSnapshot }

function TeamLogo({ logoId, alt }: { logoId: string | null; alt: string }) {
  const src = cloudinaryUrl(logoId, 180)

  if (!src) {
    return (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          fontWeight: 700,
          color: '#fff',
          overflow: 'hidden',
        }}
      >
        {alt.charAt(0)}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: 180,
        height: 180,
        borderRadius: '50%',
        overflow: 'hidden',
      }}
    >
      <Image src={src} alt={alt} fill sizes="180px" style={{ objectFit: 'cover' }} />
    </div>
  )
}

export function Theme1TeamVsTeamOverlay({ snapshot }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      style={{
        width: 1090,
        fontFamily: '"Source Sans Pro", sans-serif',
      }}
    >
      {/* Header gradient bar */}
      <div
        style={{
          background: 'linear-gradient(280deg, rgb(0,67,222) 0%, rgba(0,0,0,0.8) 50%, rgb(249,204,1) 100%)',
          color: '#fff',
          fontSize: 35,
          lineHeight: '40px',
          fontWeight: 700,
          textTransform: 'uppercase',
          paddingTop: 15,
          paddingBottom: 15,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <span>{snapshot.homeTeam.name}</span>
        <b style={{ margin: '0 10px' }}>VS</b>
        <span>{snapshot.awayTeam.name}</span>
      </div>

      {/* Body with decorative side strips */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Left decorative strip */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 60,
            height: '100%',
            background: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.03), rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 20px)',
            zIndex: 1,
          }}
        />
        {/* Right decorative strip */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: 60,
            height: '100%',
            background: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.03), rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 20px)',
            zIndex: 1,
          }}
        />

        {/* Inner content */}
        <div style={{ padding: '0 60px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: 40 }}>
            {/* Teams row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
              }}
            >
              {/* Home team */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                <TeamLogo logoId={snapshot.homeTeam.logoCloudinaryId} alt={snapshot.homeTeam.name} />
                <p style={{ margin: 0, padding: 8, fontSize: 25 }}>{snapshot.homeTeam.name}</p>
              </div>

              {/* VS circle */}
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0043de, #000)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 35,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                VS
              </div>

              {/* Away team */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                <TeamLogo logoId={snapshot.awayTeam.logoCloudinaryId} alt={snapshot.awayTeam.name} />
                <p style={{ margin: 0, padding: 8, fontSize: 25 }}>{snapshot.awayTeam.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    </div>
  )
}
