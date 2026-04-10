'use client'

import type { MatchSnapshot, BatterStats, BowlerStats } from '@/types/match'
import { motion } from 'framer-motion'
import Image from 'next/image'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = { snapshot: MatchSnapshot }

export function StandardScorebug({ snapshot }: Props) {
  const inn = snapshot.currentInningsState
  const batting = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowling = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.awayTeam : snapshot.homeTeam

  // Active batters — resolve striker and non-striker independently so a new
  // batter (0 balls, not yet in snapshot.batters) is shown immediately.
  const activeBatters = snapshot.batters.filter(b => !b.isOut)
  type BatterDisplay = Pick<BatterStats, 'displayName' | 'runs' | 'balls' | 'isStriker'>

  // Helper: returns true if a playerId is already recorded as dismissed.
  // Used to guard strikerId/nonStrikerId fallbacks — after a wicket delivery
  // data.strikerId still points to the dismissed batter, making snapshot.strikerId stale.
  const isDismissed = (id: number | null) =>
    id !== null && snapshot.batters.some(b => b.playerId === id && b.isOut)

  // Striker: prefer the one flagged isStriker in the live array; fall back to strikerId squad
  // lookup only if that player is not already dismissed.
  let batter1: BatterDisplay | undefined = activeBatters.find(b => b.isStriker)
  if (!batter1 && snapshot.strikerId && !isDismissed(snapshot.strikerId)) {
    const p = snapshot.battingTeamPlayers.find(pl => pl.id === snapshot.strikerId)
    if (p) batter1 = { displayName: p.displayName, runs: 0, balls: 0, isStriker: true }
  }

  // Non-striker: must be a different player from the striker and not dismissed.
  const strikerPlayerId = activeBatters.find(b => b.isStriker)?.playerId ?? snapshot.strikerId
  let batter2: BatterDisplay | undefined = activeBatters.find(b => b.playerId !== strikerPlayerId)
  if (!batter2 && snapshot.nonStrikerId && snapshot.nonStrikerId !== strikerPlayerId && !isDismissed(snapshot.nonStrikerId)) {
    const p = snapshot.battingTeamPlayers.find(pl => pl.id === snapshot.nonStrikerId)
    if (p) batter2 = { displayName: p.displayName, runs: 0, balls: 0, isStriker: false }
  }

  // Current bowler — fall back to currentBowlerId if no deliveries yet
  let currentBowler: Pick<BowlerStats, 'displayName' | 'wickets' | 'runs' | 'overs' | 'balls'> | undefined = snapshot.bowlers.find(b => b.isCurrent)
  if (!currentBowler && snapshot.currentBowlerId) {
    const p = snapshot.bowlingTeamPlayers.find(pl => pl.id === snapshot.currentBowlerId)
    if (p) currentBowler = { displayName: p.displayName, wickets: 0, runs: 0, overs: 0, balls: 0 }
  }

  // Current over balls for visualizer
  const overBalls = snapshot.currentOverBalls ?? []

  return (
    <motion.div
      initial={{ y: 150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 150, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      // the scorebug should sit 5px above the OBS frame with a near full-width layout
      className="absolute bottom-[5px] left-[5px] right-[5px]"
    >
      <div data-layer="ScoreBug" className="Scorebug" style={{ width: '100%', paddingLeft: 14, paddingRight: 14, paddingTop: 13, paddingBottom: 0, justifyContent: 'space-between', alignItems: 'flex-end', gap: 0, display: 'flex', boxSizing: 'border-box' }}>

        {/* Batting Team Flag */}
        <div data-layer="Flag Left Wrapper" style={{ width: 220, height: 90, position: 'relative', display: 'inline-flex', alignItems: 'flex-end' }}>
          {/* Pill */}
          <div data-layer="Flag Left" className="FlagLeft" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 65, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, display: 'flex', alignItems: 'center', paddingLeft: 92, paddingRight: 16 }}>
            <div data-layer="Gradient" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 50, background: `linear-gradient(270deg, ${batting.primaryColor}55 0%, transparent 100%)` }} />
            <div data-layer="TeamName" style={{ maxWidth: 110, color: '#666666', fontSize: 13, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.50, lineHeight: 1.25, wordBreak: 'break-word', zIndex: 1 }}>{batting.name}</div>
          </div>
          {/* Floating logo */}
          <div data-layer="Avatar" style={{ position: 'absolute', left: -14, bottom: 0, width: 78, height: 78, borderRadius: 9999, overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.20)', background: 'white', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {batting.logoCloudinaryId ? (
              <Image src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_78,h_78,f_webp/${batting.logoCloudinaryId}`} alt={batting.name} width={78} height={78} className="object-cover" />
            ) : (
              <span className="text-gray-400 font-bold font-display tracking-widest text-lg">{batting.shortCode.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Batters */}
        <div data-layer="Batters" className="Batters" style={{ width: 450, height: 65, paddingLeft: 24, paddingRight: 24, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 3, display: 'inline-flex' }}>
          {batter1 ? (
            <div data-layer="Container" className="Container" style={{ width: 175, justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }}>
              <div data-layer="Container" className="Container" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 5, display: 'flex' }}>
                <div data-layer="Container" className="Container" style={{ width: 8, height: 11, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'inline-flex', opacity: batter1.isStriker ? 1 : 0 }}>
                  <div data-layer="▶" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#FF00E5', fontSize: 8, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word' }}>▶</div>
                </div>
                <div data-layer="BatterName" className="BatterName" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#2A0066', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{batter1.displayName}</div>
              </div>
              <div data-layer="Paragraph" className="Paragraph" style={{ justifyContent: 'flex-start', alignItems: 'flex-end', gap: 3, display: 'flex' }}>
                <div data-layer="Runs" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#FF00E5', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>{batter1.runs} </div>
                <div data-layer="Balls" className="Balls" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#888888', fontSize: 11.50, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>({batter1.balls})</div>
              </div>
            </div>
          ) : (
            <div data-layer="Container" className="Container" style={{ width: 175, justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }} />
          )}

          {batter2 ? (
            <div data-layer="HorizontalBorder" className="Horizontalborder" style={{ width: 175, paddingTop: 3, borderTop: '1px #EEEEEE solid', justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }}>
              <div data-layer="Container" className="Container" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 5, display: 'flex' }}>
                <div data-layer="Container" className="Container" style={{ width: 8, height: 11, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'inline-flex', opacity: batter2.isStriker ? 1 : 0 }}>
                  <div data-layer="▶" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#FF00E5', fontSize: 8, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word' }}>▶</div>
                </div>
                <div data-layer="BatterName" className="BatterName" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#2A0066', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{batter2.displayName}</div>
              </div>
              <div data-layer="Paragraph" className="Paragraph" style={{ justifyContent: 'flex-start', alignItems: 'flex-end', gap: 3, display: 'flex' }}>
                <div data-layer="Runs" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#FF00E5', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>{batter2.runs} </div>
                <div data-layer="Balls" className="Balls" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#888888', fontSize: 11.50, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>({batter2.balls})</div>
              </div>
            </div>
          ) : (
            <div data-layer="HorizontalBorder" className="Horizontalborder" style={{ width: 175, paddingTop: 3, borderTop: '1px #EEEEEE solid', justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex' }} />
          )}
        </div>

        {/* Center Score */}
        <div data-layer="Center Score" className="CenterScore" style={{ width: 350, height: 70, background: 'linear-gradient(169deg, #2A0066 0%, #4B0082 100%)', boxShadow: '0px 0px 20px rgba(255, 0, 229, 0.30)', overflow: 'hidden', borderRadius: 50, outline: '2px #FF00E5 solid', outlineOffset: '-2px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          {/* Score row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ color: 'white', fontSize: 15, fontFamily: 'Inter', fontWeight: '600' }}>
              {snapshot.currentInnings === 1 ? '1st Inn' : '2nd Inn'}
            </div>
            <div data-layer="Background" className="Background" style={{ paddingLeft: 14, paddingRight: 14, paddingTop: 1, paddingBottom: 1, background: '#FF00E5', borderRadius: 20, display: 'inline-flex', alignItems: 'center' }}>
              <div data-layer="Score" className="Score" style={{ color: 'white', fontSize: 24, fontFamily: 'Inter', fontWeight: '900' }}>
                {inn?.totalRuns ?? 0}-{inn?.wickets ?? 0}
              </div>
            </div>
            <div data-layer="OVERS" className="Overs" style={{ color: 'white', fontSize: 15, fontFamily: 'Inter', fontWeight: '600' }}>
              OVERS {snapshot.currentOver ?? 0}.{snapshot.currentBalls ?? 0}
            </div>
          </div>
          {/* Run rate row */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, opacity: 0.85 }}>
            <div data-layer="RUN RATE" className="RunRate" style={{ color: 'white', fontSize: 9.90, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.50 }}>
              RUN RATE {snapshot.currentRunRate.toFixed(2)}
            </div>
            {snapshot.currentInnings === 2 && snapshot.requiredRunRate !== null && (
              <div data-layer="REQUIRED RATE" className="RequiredRate" style={{ color: 'white', fontSize: 9.90, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.50 }}>
                REQ RATE {snapshot.requiredRunRate.toFixed(2)}
              </div>
            )}
            {snapshot.currentInnings === 2 && inn?.target !== null && (
              <div data-layer="TARGET" className="Target" style={{ color: 'white', fontSize: 9.90, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.50 }}>
                TARGET {inn?.target}
              </div>
            )}
          </div>
        </div>

        {/* Bowler */}
        <div data-layer="Bowler" className="Bowler" style={{ width: 450, height: 65, paddingLeft: 22, paddingRight: 22, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, justifyContent: 'space-between', alignItems: 'center', display: 'flex' }}>
          {currentBowler ? (
            <>
              <div data-layer="Container" className="Container" style={{ flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 1, display: 'inline-flex' }}>
                <div data-layer="Container" className="Container" style={{ alignSelf: 'stretch', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex' }}>
                  <div data-layer="BowlerName" className="BowlerName" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#2A0066', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{currentBowler.displayName}</div>
                </div>
                <div data-layer="Paragraph" className="Paragraph" style={{ alignSelf: 'stretch', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 3, display: 'inline-flex' }}>
                  <div data-layer="WicketsRuns" className="WicketsRuns" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#2A0066', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>{currentBowler.wickets}-{currentBowler.runs}  </div>
                  <div data-layer="Overs" className="Overs" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#888888', fontSize: 11.50, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word' }}>{currentBowler.overs}.{currentBowler.balls} ov</div>
                </div>
              </div>
              <div data-layer="Container" className="Container" style={{ justifyContent: 'flex-end', alignItems: 'center', gap: 4, display: 'flex' }}>
                {overBalls.map((ball, i) => {
                  let bg = '#DDDDDD'
                  let label = '·'
                  if (ball.isWicket) { bg = '#FF2222'; label = 'W' }
                  else if (!ball.isLegal && ball.extraType === 'wide') { bg = '#3B82F6'; label = 'Wd' }
                  else if (!ball.isLegal && ball.extraType === 'noball') { bg = '#F97316'; label = 'Nb' }
                  else if (ball.runs === 6) { bg = '#FF00E5'; label = '6' }
                  else if (ball.runs === 4) { bg = '#10B981'; label = '4' }
                  else if (ball.runs > 0) { bg = '#2A0066'; label = String(ball.runs) }
                  return (
                    <div key={i} style={{ width: 22, height: 22, borderRadius: 9999, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: 'white', fontFamily: 'Inter' }}>
                      {label}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="w-full text-center text-gray-400 font-stats uppercase text-xs">Waiting for bowler</div>
          )}
        </div>

        {/* Bowling Team Flag */}
        <div data-layer="Flag Right Wrapper" style={{ width: 220, height: 90, position: 'relative', display: 'inline-flex', alignItems: 'flex-end' }}>
          {/* Pill */}
          <div data-layer="Flag Right" className="FlagRight" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 65, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 92, justifyContent: 'flex-end' }}>
            <div data-layer="Gradient" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 50, background: `linear-gradient(90deg, ${bowling.primaryColor}55 0%, transparent 100%)` }} />
            <div data-layer="TeamName" style={{ maxWidth: 110, textAlign: 'right', color: '#666666', fontSize: 13, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.50, lineHeight: 1.25, wordBreak: 'break-word', zIndex: 1 }}>{bowling.name}</div>
          </div>
          {/* Floating logo */}
          <div data-layer="Avatar" style={{ position: 'absolute', right: -14, bottom: 0, width: 78, height: 78, borderRadius: 9999, overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.20)', background: 'white', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {bowling.logoCloudinaryId ? (
              <Image src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_78,h_78,f_webp/${bowling.logoCloudinaryId}`} alt={bowling.name} width={78} height={78} className="object-cover" />
            ) : (
              <span className="text-gray-400 font-bold font-display tracking-widest text-lg">{bowling.shortCode.charAt(0)}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
