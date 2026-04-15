'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { PlayerSummary, TeamSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// Exact gradients from Team Squad.html CSS
const GREY_COLOR = 'linear-gradient(to bottom, #e9e4e4 0%, #ffffff 25%, #e7e5e5 50%, #ece8e8 100%)'
const GRAY_COLOR = 'linear-gradient(to right, #808080, #8a8a8a, #949394, #9e9d9e, #a8a7a8)'
const DARK_BEAM_BG = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'

type Props = {
  team: TeamSummary
  players: PlayerSummary[]
}

function logoUrl(id: string | null, size: number) {
  if (!id || !CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${id}`
}

function TeamLogo({ id, name }: { id: string | null; name: string }) {
  const src = logoUrl(id, 150)
  return (
    <div
      style={{
        width: 150,
        height: 150,
        borderRadius: 10,
        border: '4px solid white',
        background: 'white',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'rgba(0,0,0,0.56) 0 22px 70px 4px',
      }}
    >
      {src ? (
        <Image src={src} alt={name} width={150} height={150} style={{ objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 56, fontWeight: 900, color: '#080a6a' }}>
          {name.charAt(0)}
        </span>
      )}
    </div>
  )
}

export function Standard1TeamSquadOverlay({ team, players }: Props) {
  return (
    <>
      <style jsx>{`
        .s1-squad-beam-hz {
          position: absolute;
          inset: -50% auto auto -50%;
          width: 100%;
          height: 200%;
          background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%);
          animation: s1-squad-beam-hz 5s linear infinite;
          pointer-events: none;
        }
        @keyframes s1-squad-beam-hz {
          50% { transform: translate(-50%, 0%); }
          100% { transform: translate(0%, -50%); }
        }
        .s1-squad-beam-vt {
          position: absolute;
          top: -50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%);
          transform: translate(-50%, 0%);
          animation: s1-squad-beam-vt 5s linear infinite;
          pointer-events: none;
        }
        @keyframes s1-squad-beam-vt {
          0% { transform: translate(-50%, -100%); }
          100% { transform: translate(-50%, 200%); }
        }
      `}</style>

      {/* Outer div handles centering — Framer Motion can't own transform when we need translate(-50%,-50%) */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          fontFamily: '"Rajdhani", "Arial Narrow", Arial, sans-serif',
          letterSpacing: 1,
        }}
      >
      <motion.div
        initial={{ opacity: 0, y: -60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -60 }}
        transition={{ type: 'spring', stiffness: 100, damping: 18 }}
      >
        {/* Outer wrapper — 1300px matches .teamSquadHeader width */}
        <div style={{ width: 1300 }}>

          {/* Yellow header — teamSquadHeader yellowMainColor */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: 1300,
              height: 70,
              lineHeight: '70px',
              fontSize: 40,
              fontWeight: 1000,
              textAlign: 'center',
              color: '#000',
              background: '#f6ce00',
              border: '5px solid yellow',
              borderRadius: 3,
            }}
          >
            <div className="s1-squad-beam-hz" />
            {/* teamSquadHeadertxt */}
            <div style={{ width: 1300, textAlign: 'center', fontSize: 44, fontWeight: 1000 }}>
              <span>TEAM SQUAD</span>
            </div>

            {/* Team logo left — teamSquadTeamLogo1: margin-top -50px, margin-left -70px */}
            <div
              style={{
                position: 'absolute',
                top: -50,
                left: -70,
                width: 150,
                height: 150,
                zIndex: 1,
              }}
            >
              <TeamLogo id={team.logoCloudinaryId} name={team.name} />
            </div>

            {/* Team logo right — teamSquadTeamLogo2: margin-top -50px, margin-left 1220px */}
            <div
              style={{
                position: 'absolute',
                top: -50,
                left: 1220,
                width: 150,
                height: 150,
                zIndex: 1,
              }}
            >
              <TeamLogo id={team.logoCloudinaryId} name={team.name} />
            </div>
          </div>

          {/* Content row — centered single team column */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div>
              {/* Team name bar — teamSquadTeamName inline-flex */}
              <div style={{ display: 'inline-flex' }}>
                {/* Left dark beam — beam-container_vt */}
                <div
                  style={{
                    position: 'relative',
                    width: 15,
                    height: 60,
                    backgroundImage: DARK_BEAM_BG,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <div className="s1-squad-beam-vt" />
                </div>

                {/* Team name — teamSquadTeamName1 grayColor */}
                <div
                  style={{
                    width: 610,
                    height: 60,
                    lineHeight: '60px',
                    fontSize: 30,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#000',
                    backgroundImage: GRAY_COLOR,
                  }}
                >
                  <span>{team.name}</span>
                </div>

                {/* Right dark beam — beam-container_vt */}
                <div
                  style={{
                    position: 'relative',
                    width: 15,
                    height: 60,
                    backgroundImage: DARK_BEAM_BG,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <div className="s1-squad-beam-vt" />
                </div>
              </div>

              {/* Player rows — Asquad_div teamSquadPlayerName */}
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 'bold',
                  lineHeight: '60px',
                }}
              >
                {players.map((player) => (
                  <div
                    key={player.id}
                    style={{
                      width: 550,
                      height: 60,
                      lineHeight: '60px',
                      paddingLeft: 20,
                      borderRight: '10px solid #080a6a',
                      borderLeft: '10px solid #080a6a',
                      color: '#000',
                      background: GREY_COLOR,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {player.displayName}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </motion.div>
      </div>
    </>
  )
}
