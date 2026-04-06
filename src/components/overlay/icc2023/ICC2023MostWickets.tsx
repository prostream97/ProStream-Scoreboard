'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { TournamentMostWicketsData } from '@/lib/db/queries/match'
import { ICC } from './tokens'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = { data: TournamentMostWicketsData }

function TournamentLogo({ name, shortName, logoCloudinaryId }: { name: string; shortName: string; logoCloudinaryId: string | null }) {
  return logoCloudinaryId ? (
    <Image
      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_100,h_100,f_webp/${logoCloudinaryId}`}
      alt={name} width={100} height={100} className="object-cover"
    />
  ) : (
    <span style={{ color: ICC.purple, fontSize: 24, fontFamily: ICC.font, fontWeight: 800 }}>
      {shortName.slice(0, 2) || name.charAt(0)}
    </span>
  )
}

function OwnerBadgeContent({ displayName, photoCloudinaryId }: { displayName: string; photoCloudinaryId: string | null }) {
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')
  return photoCloudinaryId ? (
    <Image
      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_100,h_100,f_webp/${photoCloudinaryId}`}
      alt={displayName} width={100} height={100} className="object-cover"
    />
  ) : (
    <span style={{ color: ICC.purple, fontSize: 24, fontFamily: ICC.font, fontWeight: 800 }}>
      {initials || displayName.charAt(0).toUpperCase()}
    </span>
  )
}

// ICC-styled header badge (pink/purple gradient ring)
function HeaderBadge({ children, reverse }: { children: React.ReactNode; reverse?: boolean }) {
  return (
    <div style={{ position: 'relative', width: 200, height: 90, display: 'flex', alignItems: 'center' }}>
      <div style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        left: 0, right: 0, height: 65, background: ICC.white,
        boxShadow: ICC.imgShadow, overflow: 'hidden', borderRadius: 50,
      }}>
        <div style={{
          position: 'absolute', inset: 0, width: 145,
          background: reverse
            ? `linear-gradient(90deg, ${ICC.purple} 0%, transparent 100%)`
            : `linear-gradient(90deg, ${ICC.pink} 0%, transparent 100%)`,
          borderTopLeftRadius: 50, borderBottomLeftRadius: 50,
        }} />
        <div style={{
          position: 'absolute', inset: 0, right: 0, left: 'auto', width: 145,
          background: reverse
            ? `linear-gradient(270deg, ${ICC.pink} 0%, transparent 100%)`
            : `linear-gradient(270deg, ${ICC.purple} 0%, transparent 100%)`,
          borderTopRightRadius: 50, borderBottomRightRadius: 50,
        }} />
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 106, height: 106, borderRadius: 9999,
        background: reverse
          ? `linear-gradient(270deg, ${ICC.pink} 0%, ${ICC.purple} 100%)`
          : `linear-gradient(90deg, ${ICC.pink} 0%, ${ICC.purple} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: 9999, overflow: 'hidden',
          background: ICC.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function ICC2023MostWickets({ data }: Props) {
  const { tournament, owner, rows } = data

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        padding: '2% 4%', overflow: 'hidden', width: '74%',
        fontFamily: ICC.font,
      }}>
        {/* Background blob */}
        <div style={{
          position: 'absolute', width: '125%', height: '150%',
          backgroundImage: `linear-gradient(60deg, rgba(50, 0, 117, 0.5) 20%, rgba(253,2,163,1))`,
          borderRadius: '0% 5000px 5000px 0%',
          top: '50%', zIndex: 1,
          transform: 'translate(-15%, -40%) rotate(-45deg)',
          pointerEvents: 'none',
        }} />

        {/* Header row */}
        <div style={{ zIndex: 2, position: 'relative', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
          <HeaderBadge>
            <TournamentLogo name={tournament.name} shortName={tournament.shortName} logoCloudinaryId={tournament.logoCloudinaryId} />
          </HeaderBadge>

          <div style={{
            flex: 1, height: 65, paddingLeft: 24, paddingRight: 24,
            background: ICC.white, boxShadow: ICC.imgShadow, overflow: 'hidden', borderRadius: 50,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}>
            <div style={{
              color: ICC.purple, fontSize: 24, fontFamily: ICC.font, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 2.6,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              MOST WICKETS TAKER (TOP 10)
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

        {/* Table */}
        <div style={{ zIndex: 2, position: 'relative', borderRadius: 10, overflow: 'hidden', boxShadow: '0px 20px 60px rgba(0,0,0,0.22)' }}>
          <table style={{ width: '100%', backgroundColor: ICC.white, borderCollapse: 'collapse' }}>
            <thead>
              {/* ICC design: header row is pink (#FD02A3) */}
              <tr style={{ background: ICC.pink }}>
                <th style={{ color: ICC.white, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.15vw', padding: '10px 14px', textAlign: 'left', width: '42%' }}>BOWLER</th>
                <th style={{ color: ICC.white, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.15vw', padding: '10px 14px', textAlign: 'center' }}>TEAM</th>
                <th style={{ color: ICC.white, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.15vw', padding: '10px 14px', textAlign: 'center' }}>INNG</th>
                <th style={{ color: ICC.white, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.15vw', padding: '10px 14px', textAlign: 'center' }}>BALLS</th>
                <th style={{ color: ICC.white, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.15vw', padding: '10px 14px', textAlign: 'center' }}>WKTS</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((row, idx) => {
                // Row 1 (rank 1/index 0) = pink background per Figma; rest = white
                const isTopRow = idx === 0
                const rowBg = isTopRow ? ICC.pink : ICC.white
                const textColor = isTopRow ? ICC.white : ICC.purple
                const dividerColor = isTopRow ? `${ICC.white}55` : ICC.pink

                return (
                  <tr key={row.bowlerId} style={{ background: rowBg }}>
                    {/* Rank column: blue background (ICC.blue) */}
                    <td style={{
                      padding: '10px 14px', borderLeft: 'none', textAlign: 'left',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: ICC.blue, color: ICC.white,
                        fontFamily: ICC.font, fontWeight: 700, fontSize: '1.05vw',
                        minWidth: 32, height: 32, borderRadius: 4,
                        marginRight: 10, padding: '0 8px',
                      }}>
                        {row.rank}
                      </span>
                      <span style={{ color: textColor, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.05vw' }}>
                        {row.bowlerName.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: textColor, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.05vw', padding: '10px 14px', textAlign: 'center', borderLeft: `2px solid ${dividerColor}` }}>
                      {row.teamName.toUpperCase()}
                    </td>
                    <td style={{ color: textColor, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.05vw', padding: '10px 14px', textAlign: 'center', borderLeft: `2px solid ${dividerColor}` }}>
                      {row.innings}
                    </td>
                    <td style={{ color: textColor, fontFamily: ICC.font, fontWeight: 700, fontSize: '1.05vw', padding: '10px 14px', textAlign: 'center', borderLeft: `2px solid ${dividerColor}` }}>
                      {row.balls}
                    </td>
                    <td style={{ color: textColor, fontFamily: ICC.font, fontWeight: 900, fontSize: '1.3vw', padding: '10px 14px', textAlign: 'center', borderLeft: `2px solid ${dividerColor}` }}>
                      {row.wickets}
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} style={{
                    color: `${ICC.purple}99`, fontFamily: ICC.font, fontWeight: 700,
                    fontSize: '1vw', padding: '24px 16px', textAlign: 'center',
                    backgroundColor: ICC.white, letterSpacing: '0.08em',
                  }}>
                    NO WICKET DATA YET
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pill */}
        <div style={{ zIndex: 2, position: 'relative' }}>
          <div style={{
            color: ICC.purple, fontFamily: ICC.font, fontWeight: 700,
            backgroundColor: ICC.white, borderRadius: 500,
            marginBottom: 15, boxShadow: ICC.imgShadow,
            width: '102%', fontSize: '1.1vw', textAlign: 'center',
            padding: '12px 20px', marginTop: 12, marginLeft: -10,
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {tournament.name}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
