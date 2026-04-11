'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { TournamentMostBoundariesData } from '@/lib/db/queries/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const BLUE = '#232882'
const RED = 'rgb(255, 30, 80)'

type Props = {
  data: TournamentMostBoundariesData
}

function TournamentLogo({
  name,
  shortName,
  logoCloudinaryId,
}: {
  name: string
  shortName: string
  logoCloudinaryId: string | null
}) {
  return logoCloudinaryId ? (
    <Image
      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_100,h_100,f_webp/${logoCloudinaryId}`}
      alt={name}
      width={100}
      height={100}
      className="object-cover"
    />
  ) : (
    <span style={{ color: '#2A0066', fontSize: 24, fontFamily: 'Inter', fontWeight: 800 }}>
      {shortName.slice(0, 2) || name.charAt(0)}
    </span>
  )
}

function OwnerBadgeContent({
  displayName,
  photoCloudinaryId,
}: {
  displayName: string
  photoCloudinaryId: string | null
}) {
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return photoCloudinaryId ? (
    <Image
      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_100,h_100,f_webp/${photoCloudinaryId}`}
      alt={displayName}
      width={100}
      height={100}
      className="object-cover"
    />
  ) : (
    <span style={{ color: '#2A0066', fontSize: 24, fontFamily: 'Inter', fontWeight: 800 }}>
      {initials || displayName.charAt(0).toUpperCase()}
    </span>
  )
}

function HeaderBadge({
  children,
  reverse,
}: {
  children: React.ReactNode
  reverse?: boolean
}) {
  return (
    <div style={{ position: 'relative', width: 200, height: 90, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 65, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50 }}>
        <div style={{ position: 'absolute', inset: 0, width: 145, background: reverse ? 'linear-gradient(90deg, #281D64 0%, rgba(40, 29, 100, 0) 100%)' : 'linear-gradient(90deg, #FF00E5 0%, rgba(255, 0, 229, 0) 100%)', borderTopLeftRadius: 50, borderBottomLeftRadius: 50 }} />
        <div style={{ position: 'absolute', inset: 0, right: 0, left: 'auto', width: 145, background: reverse ? 'linear-gradient(270deg, #FF00E5 0%, rgba(255, 0, 229, 0) 100%)' : 'linear-gradient(270deg, #281D64 0%, rgba(40, 29, 100, 0) 100%)', borderTopRightRadius: 50, borderBottomRightRadius: 50 }} />
      </div>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 106, height: 106, borderRadius: 9999, background: reverse ? 'linear-gradient(270deg, #FF00E5 0%, #281D64 100%)' : 'linear-gradient(90deg, #FF00E5 0%, #281D64 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ width: 100, height: 100, borderRadius: 9999, overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

const headCellStyle: React.CSSProperties = {
  color: '#ffffff',
  fontFamily: 'Lato, sans-serif',
  fontWeight: 700,
  fontSize: '1.15vw',
  padding: '10px 14px',
  textAlign: 'center',
  backgroundColor: 'transparent',
}

const bodyCellStyle: React.CSSProperties = {
  color: BLUE,
  fontFamily: 'Lato, sans-serif',
  fontWeight: 700,
  fontSize: '1.05vw',
  padding: '10px 14px',
  backgroundColor: '#ffffff',
  boxShadow: 'inset 20px 20px 35px -15px rgba(35, 40, 130, 0.15)',
  borderLeft: `2px solid ${RED}`,
  textAlign: 'center',
}

const bodyFirstCellStyle: React.CSSProperties = {
  ...bodyCellStyle,
  borderLeft: 'none',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const bodyFoursCellStyle: React.CSSProperties = {
  ...bodyCellStyle,
  color: '#10994c',
  backgroundColor: '#f0faf4',
}

const bodySixesCellStyle: React.CSSProperties = {
  ...bodyCellStyle,
  color: '#2d6fb0',
  backgroundColor: '#f0f6ff',
}

export function MostBoundariesOverlay({ data }: Props) {
  const { tournament, owner, rows } = data

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: '2% 4%',
          overflow: 'hidden',
          width: '74%',
          fontFamily: 'Lato, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '125%',
            height: '150%',
            backgroundImage: `linear-gradient(60deg, rgba(35, 40, 130, 0.5) 20%, rgba(255, 30, 80, 1))`,
            borderRadius: '0% 5000px 5000px 0%',
            top: '50%',
            zIndex: 1,
            transform: 'translate(-15%, -40%) rotate(-45deg)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ zIndex: 2, position: 'relative', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
          <HeaderBadge>
            <TournamentLogo name={tournament.name} shortName={tournament.shortName} logoCloudinaryId={tournament.logoCloudinaryId} />
          </HeaderBadge>
          <div style={{ width: 1207, height: 65, paddingLeft: 24, paddingRight: 24, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
            <div style={{ color: '#2A0066', fontSize: 24, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              MOST BOUNDARIES HITTER (TOP 10)
            </div>
          </div>
          <HeaderBadge reverse>
            {owner ? (
              <OwnerBadgeContent displayName={owner.displayName} photoCloudinaryId={owner.photoCloudinaryId} />
            ) : (
              <TournamentLogo name={tournament.name} shortName={tournament.shortName} logoCloudinaryId={tournament.logoCloudinaryId} />
            )}
          </HeaderBadge>
        </div>

        <div style={{ zIndex: 2, position: 'relative', borderRadius: 10, overflow: 'hidden', boxShadow: '0px 20px 60px rgba(0,0,0,0.22)' }}>
          <table
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ backgroundImage: `linear-gradient(80deg, ${RED} 20%, ${BLUE})` }}>
                <th style={{ ...headCellStyle, textAlign: 'left', width: '38%' }}>BATTER</th>
                <th style={headCellStyle}>TEAM</th>
                <th style={headCellStyle}>INNG</th>
                <th style={{ ...headCellStyle, color: '#c8f0d8' }}>4s</th>
                <th style={{ ...headCellStyle, color: '#c8dff8' }}>6s</th>
                <th style={headCellStyle}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.batterId}>
                    <td style={bodyFirstCellStyle}>{row.rank}. {row.batterName.toUpperCase()}</td>
                    <td style={bodyCellStyle}>{row.teamName.toUpperCase()}</td>
                    <td style={bodyCellStyle}>{row.innings}</td>
                    <td style={bodyFoursCellStyle}>{row.fours}</td>
                    <td style={bodySixesCellStyle}>{row.sixes}</td>
                    <td style={{ ...bodyCellStyle, fontSize: '1.3vw', fontWeight: 900 }}>{row.boundaries}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      color: `${BLUE}99`,
                      fontFamily: 'Lato, sans-serif',
                      fontWeight: 700,
                      fontSize: '1vw',
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                      letterSpacing: '0.08em',
                    }}
                  >
                    NO BOUNDARY DATA YET
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ zIndex: 2, position: 'relative' }}>
          <div
            style={{
              color: BLUE,
              fontFamily: 'Lato, sans-serif',
              fontWeight: 700,
              backgroundColor: '#ffffff',
              borderRadius: 500,
              marginBottom: 15,
              boxShadow: '0px 1px 5px rgba(0,0,0,0.5)',
              width: '102%',
              fontSize: '1.1vw',
              textAlign: 'center',
              padding: '12px 20px',
              marginTop: 12,
              marginLeft: -10,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {tournament.name}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
