'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot, PlayerSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const HANDSHAKE_SRC = '/overlay/standard1/handshake.svg'

const YELLOW_MAIN = '#f6ce00'
const DARK_BLUE = '#080a6a'
const BLACK_BOX = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'
const GREY_BOX = 'linear-gradient(to bottom, #e9e4e4 0%, #ffffff 25%, #e7e5e5 50%, #ece8e8 100%)'
const BLUE_BOX = 'linear-gradient(to right, #0307e3, #1416ea, #1e21f1, #272af8, #2e32ff)'

type Props = { snapshot: MatchSnapshot }

function portraitUrl(player: PlayerSummary | undefined, width: number, height: number): string | null {
  if (!player?.headshotCloudinaryId || !CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_${width},h_${height},f_webp/${player.headshotCloudinaryId}`
}

function Portrait({
  player,
  displayName,
  mirrored = false,
}: {
  player: PlayerSummary | undefined
  displayName: string
  mirrored?: boolean
}) {
  const src = portraitUrl(player, 300, 300)

  return (
    <div
      style={{
        width: 300,
        height: 300,
        position: 'relative',
        overflow: 'hidden',
        transform: mirrored ? 'scaleX(-1)' : 'none',
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={displayName}
          fill
          sizes="300px"
          style={{ objectFit: 'cover', objectPosition: 'top center' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(20,20,20,0.95), rgba(50,50,50,0.95))',
            border: '2px solid rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.18)',
              fontSize: 140,
              fontWeight: 900,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {displayName.charAt(0) || '?'}
          </span>
        </div>
      )}
    </div>
  )
}

function PlayerColumn({
  player,
  displayName,
  runs,
  balls,
  mirrored = false,
  showStar = false,
}: {
  player: PlayerSummary | undefined
  displayName: string
  runs: number
  balls: number
  mirrored?: boolean
  showStar?: boolean
}) {
  return (
    <div
      style={{
        width: 750,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Portrait player={player} displayName={displayName} mirrored={mirrored} />

      <div
        style={{
          width: 500,
          height: 100,
          marginTop: 0,
          color: '#fff',
          backgroundImage: BLACK_BOX,
          border: '5px solid #000',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: 50,
            lineHeight: '50px',
            textAlign: 'center',
            fontSize: 35,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 20px',
            boxSizing: 'border-box',
          }}
        >
          {displayName}
        </div>

        <div style={{ width: 500, display: 'inline-flex', justifyContent: 'center' }}>
          <div
            style={{
              width: 240,
              height: 40,
              lineHeight: '40px',
              textAlign: 'right',
              fontSize: 45,
              fontWeight: 1000,
            }}
          >
            {runs}
            {showStar ? '*' : ''}
          </div>
          <div
            style={{
              width: 240,
              height: 40,
              lineHeight: '40px',
              marginLeft: 10,
              textAlign: 'left',
              fontSize: 30,
              fontWeight: 1000,
            }}
          >
            {balls}
          </div>
        </div>
      </div>
    </div>
  )
}

function HandshakeIcon({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <div
      style={{
        width: 150,
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: mirrored ? 'flex-start' : 'flex-end',
      }}
    >
      <Image
        src={HANDSHAKE_SRC}
        alt=""
        width={80}
        height={50}
        style={{
          width: 80,
          height: 50,
          marginTop: 10,
          marginLeft: mirrored ? 0 : 70,
          marginRight: mirrored ? 70 : 0,
        }}
      />
    </div>
  )
}

export function Standard1PartnershipOverlay({ snapshot }: Props) {
  const { partnership, battingTeamPlayers, strikerId } = snapshot
  if (!partnership) return null

  const batter1 = battingTeamPlayers.find((player) => player.id === partnership.batter1Id)
  const batter2 = battingTeamPlayers.find((player) => player.id === partnership.batter2Id)
  const batter1Stats = snapshot.batters.find((batter) => batter.playerId === partnership.batter1Id)
  const batter2Stats = snapshot.batters.find((batter) => batter.playerId === partnership.batter2Id)

  const batter1Name = batter1?.displayName ?? batter1Stats?.displayName ?? 'Player 1'
  const batter2Name = batter2?.displayName ?? batter2Stats?.displayName ?? 'Player 2'

  return (
    <motion.div
      initial={{ opacity: 0.7, y: -320, scale: 0.7 }}
      animate={{ opacity: [0.7, 0.7, 1], y: [-320, 0, 0], scale: [0.7, 0.7, 1] }}
      exit={{ opacity: 0, y: -180, scale: 0.7 }}
      transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
      style={{
        position: 'absolute',
        top: '15%',
        left: '13%',
        width: 1450,
        padding: '50px 0',
        background: '#c2c2c266',
        borderRadius: 20,
        border: '3px solid #fff',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 600,
            height: 70,
            lineHeight: '70px',
            borderRight: `10px solid ${DARK_BLUE}`,
            borderLeft: `10px solid ${DARK_BLUE}`,
            color: '#000',
            background: YELLOW_MAIN,
            border: '5px solid yellow',
            borderRadius: 3,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <HandshakeIcon />
          <div
            style={{
              width: 300,
              textAlign: 'center',
              fontSize: 45,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Partnership
          </div>
          <HandshakeIcon mirrored />
        </div>

        <div style={{ marginTop: 150 }}>
          <div
            style={{
              width: 300,
              height: 100,
              fontWeight: 1000,
              borderRight: `10px solid ${DARK_BLUE}`,
              borderLeft: `10px solid ${DARK_BLUE}`,
              color: '#000',
              background: YELLOW_MAIN,
              border: '5px solid yellow',
              borderRadius: 3,
              display: 'inline-flex',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: 170,
                height: 100,
                lineHeight: '100px',
                fontSize: 70,
                textAlign: 'right',
              }}
            >
              {partnership.runs}
            </div>
            <div
              style={{
                width: 130,
                height: 100,
                lineHeight: '100px',
                fontSize: 50,
                marginLeft: 30,
                textAlign: 'left',
              }}
            >
              {partnership.balls}
            </div>
          </div>
        </div>

        <div
          style={{
            width: 1450,
            marginTop: -200,
            display: 'inline-flex',
            justifyContent: 'center',
            overflow: 'visible',
          }}
        >
          <PlayerColumn
            player={batter1}
            displayName={batter1Name}
            runs={batter1Stats?.runs ?? 0}
            balls={batter1Stats?.balls ?? 0}
            showStar={partnership.batter1Id === strikerId}
          />

          <PlayerColumn
            player={batter2}
            displayName={batter2Name}
            runs={batter2Stats?.runs ?? 0}
            balls={batter2Stats?.balls ?? 0}
            mirrored
            showStar={partnership.batter2Id === strikerId}
          />
        </div>

        <div
          style={{
            marginTop: 30,
            width: 750,
            height: 70,
            display: 'inline-flex',
          }}
        >
          <div
            style={{
              width: 250,
              height: 70,
              borderLeft: '10px solid #1a1a1a',
              color: '#000',
              background: GREY_BOX,
              display: 'inline-flex',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: 120,
                height: 70,
                lineHeight: '70px',
                fontSize: 50,
                fontWeight: 700,
                textAlign: 'right',
              }}
            >
              {partnership.batter1ContributionRuns}
            </div>
            <div
              style={{
                width: 120,
                height: 70,
                lineHeight: '70px',
                marginLeft: 10,
                fontSize: 35,
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              {partnership.batter1ContributionBalls}
            </div>
          </div>

          <div
            style={{
              width: 250,
              height: 70,
              lineHeight: '70px',
              fontSize: 33,
              fontWeight: 700,
              textAlign: 'center',
              color: '#fff',
              backgroundImage: BLUE_BOX,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Contribution
          </div>

          <div
            style={{
              width: 250,
              height: 70,
              borderRight: '10px solid #1a1a1a',
              color: '#000',
              background: GREY_BOX,
              display: 'inline-flex',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: 100,
                height: 70,
                lineHeight: '70px',
                fontSize: 50,
                fontWeight: 700,
                textAlign: 'right',
              }}
            >
              {partnership.batter2ContributionRuns}
            </div>
            <div
              style={{
                width: 120,
                height: 70,
                lineHeight: '70px',
                marginLeft: 10,
                fontSize: 35,
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              {partnership.batter2ContributionBalls}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
