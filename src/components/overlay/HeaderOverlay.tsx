'use client'

import type { MatchSnapshot } from '@/types/match'
import { motion } from 'framer-motion'
import Image from 'next/image'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = {
  snapshot: MatchSnapshot
  tournamentName?: string
}

export function HeaderOverlay({ snapshot, tournamentName = '' }: Props) {
  const inn = snapshot.currentInningsState
  const homeTeam = snapshot.homeTeam
  const awayTeam = snapshot.awayTeam

  const leftTeam = inn?.battingTeamId === homeTeam.id ? homeTeam : awayTeam
  const rightTeam = inn?.battingTeamId === homeTeam.id ? awayTeam : homeTeam

  function Logo({ team }: { team: typeof homeTeam }) {
    return team.logoCloudinaryId ? (
      <Image
        src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_100,h_100,f_webp/${team.logoCloudinaryId}`}
        alt={team.name}
        width={100}
        height={100}
        className="object-cover"
      />
    ) : (
      <span style={{ color: '#2A0066', fontSize: 28, fontFamily: 'Inter', fontWeight: 800 }}>
        {team.shortCode.charAt(0)}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ y: 150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 150, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="absolute bottom-[60px] left-0 w-full flex justify-center"
    >
      <div style={{ paddingLeft: 100, paddingRight: 100, paddingTop: 13, paddingBottom: 13, justifyContent: 'flex-start', alignItems: 'center', gap: 13, display: 'inline-flex' }}>

        {/* Left: pill with badge centered on top */}
        <div style={{ position: 'relative', width: 200, height: 90, display: 'flex', alignItems: 'center' }}>
          {/* Pill */}
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 65, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50 }}>
            {/* Pink fade from left */}
            <div style={{ position: 'absolute', inset: 0, width: 145, background: 'linear-gradient(90deg, #FF00E5 0%, rgba(255, 0, 229, 0) 100%)', borderTopLeftRadius: 50, borderBottomLeftRadius: 50 }} />
            {/* Dark blue fade from right */}
            <div style={{ position: 'absolute', inset: 0, right: 0, left: 'auto', width: 145, background: 'linear-gradient(270deg, #281D64 0%, rgba(40, 29, 100, 0) 100%)', borderTopRightRadius: 50, borderBottomRightRadius: 50 }} />
          </div>
          {/* Badge centered on pill — gradient border via wrapper */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 106, height: 106, borderRadius: 9999, background: 'linear-gradient(90deg, #FF00E5 0%, #281D64 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ width: 100, height: 100, borderRadius: 9999, overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Logo team={leftTeam} />
            </div>
          </div>
        </div>

        {/* Center tournament name bar */}
        <div style={{ width: 1207, height: 65, paddingLeft: 24, paddingRight: 24, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
          <div style={{ color: '#2A0066', fontSize: 28, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 13.16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tournamentName}
          </div>
        </div>

        {/* Right: pill with badge centered on top (mirrored gradients) */}
        <div style={{ position: 'relative', width: 200, height: 90, display: 'flex', alignItems: 'center' }}>
          {/* Pill */}
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 65, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50 }}>
            {/* Dark blue fade from left */}
            <div style={{ position: 'absolute', inset: 0, width: 145, background: 'linear-gradient(90deg, #281D64 0%, rgba(40, 29, 100, 0) 100%)', borderTopLeftRadius: 50, borderBottomLeftRadius: 50 }} />
            {/* Pink fade from right */}
            <div style={{ position: 'absolute', inset: 0, right: 0, left: 'auto', width: 145, background: 'linear-gradient(270deg, #FF00E5 0%, rgba(255, 0, 229, 0) 100%)', borderTopRightRadius: 50, borderBottomRightRadius: 50 }} />
          </div>
          {/* Badge centered on pill — gradient border via wrapper (mirrored) */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 106, height: 106, borderRadius: 9999, background: 'linear-gradient(270deg, #FF00E5 0%, #281D64 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ width: 100, height: 100, borderRadius: 9999, overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Logo team={rightTeam} />
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  )
}
