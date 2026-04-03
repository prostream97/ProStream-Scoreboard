'use client'

import React from 'react'
import type { MatchSnapshot } from '@/types/match'
import { motion } from 'framer-motion'
import Image from 'next/image'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = { snapshot: MatchSnapshot }

export function StandardScorebug({ snapshot }: Props) {
  const inn = snapshot.currentInningsState
  const batting = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowling = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.awayTeam : snapshot.homeTeam

  // Get active batters.
  const activeBatters = snapshot.batters.filter(b => !b.isOut).slice(0, 2)
  const batter1 = activeBatters[0]
  const batter2 = activeBatters[1]

  const currentBowler = snapshot.bowlers.find(b => b.isCurrent)

  return (
    <motion.div
      initial={{ y: 150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 150, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      // the container has absolute bottom positioning for standard OBS use
      className="absolute bottom-[60px] left-0 w-full flex justify-center"
    >
      <div data-layer="ScoreBug" className="Scorebug" style={{paddingLeft: 100, paddingRight: 100, paddingTop: 13, paddingBottom: 13, justifyContent: 'flex-start', alignItems: 'center', gap: 13, display: 'inline-flex'}}>
        
        {/* Batting Team Flag */}
        <div data-layer="Flag Left" className="FlagLeft" style={{width: 200, height: 65, position: 'relative', background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, justifyContent: 'center', alignItems: 'center', gap: 30, display: 'flex'}}>
          <div data-layer="Gradient" className="Gradient" style={{width: 31, height: 65, left: 200, top: 65, position: 'absolute', transform: 'rotate(180deg)', transformOrigin: 'top left', background: `linear-gradient(90deg, ${batting.primaryColor} 0%, rgba(255, 0, 229, 0) 100%)`, borderTopLeftRadius: 50, borderBottomLeftRadius: 50}} />
          <div data-layer="Avatar" data-shape="Circle" data-size="Large" data-type="Image" className="Avatar" style={{width: 42, height: 42, position: 'relative', overflow: 'hidden', borderRadius: 9999, outline: '1px #666666 solid', outlineOffset: '-1px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {batting.logoCloudinaryId ? (
                <Image src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_42,h_42,f_webp/${batting.logoCloudinaryId}`} alt={batting.name} width={42} height={42} className="object-cover" />
            ) : (
                <span className="text-gray-400 font-bold font-display tracking-widest">{batting.shortCode.charAt(0)}</span>
            )}
          </div>
          <div data-layer="TeamName" className="TeamName" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#666666', fontSize: 15, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.58, wordWrap: 'break-word', zIndex: 10}}>{batting.name.slice(0, 10)}</div>
        </div>

        {/* Batters */}
        <div data-layer="Batters" className="Batters" style={{width: 450, height: 65, paddingLeft: 24, paddingRight: 24, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 3, display: 'inline-flex'}}>
          {batter1 ? (
              <div data-layer="Container" className="Container" style={{width: 175, justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex'}}>
                <div data-layer="Container" className="Container" style={{justifyContent: 'flex-start', alignItems: 'center', gap: 5, display: 'flex'}}>
                  <div data-layer="Container" className="Container" style={{width: 8, height: 11, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'inline-flex', opacity: batter1.isStriker ? 1 : 0}}>
                    <div data-layer="▶" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#FF00E5', fontSize: 8, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word'}}>▶</div>
                  </div>
                  <div data-layer="BatterName" className="BatterName" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#2A0066', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word'}}>{batter1.displayName}</div>
                </div>
                <div data-layer="Paragraph" className="Paragraph" style={{justifyContent: 'flex-start', alignItems: 'flex-end', gap: 3, display: 'flex'}}>
                  <div data-layer="Runs" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#FF00E5', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word'}}>{batter1.runs} </div>
                  <div data-layer="Balls" className="Balls" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#888888', fontSize: 11.50, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word'}}>({batter1.balls})</div>
                </div>
              </div>
          ) : (
            <div data-layer="Container" className="Container" style={{width: 175, justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex'}} />
          )}

          {batter2 ? (
              <div data-layer="HorizontalBorder" className="Horizontalborder" style={{width: 175, paddingTop: 3, borderTop: '1px #EEEEEE solid', justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex'}}>
                <div data-layer="Container" className="Container" style={{justifyContent: 'flex-start', alignItems: 'center', gap: 5, display: 'flex'}}>
                  <div data-layer="Container" className="Container" style={{width: 8, height: 11, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'inline-flex', opacity: batter2.isStriker ? 1 : 0}}>
                    <div data-layer="▶" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#FF00E5', fontSize: 8, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word'}}>▶</div>
                  </div>
                  <div data-layer="BatterName" className="BatterName" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#2A0066', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word'}}>{batter2.displayName}</div>
                </div>
                <div data-layer="Paragraph" className="Paragraph" style={{justifyContent: 'flex-start', alignItems: 'flex-end', gap: 3, display: 'flex'}}>
                  <div data-layer="Runs" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#FF00E5', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word'}}>{batter2.runs} </div>
                  <div data-layer="Balls" className="Balls" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#888888', fontSize: 11.50, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word'}}>({batter2.balls})</div>
                </div>
              </div>
          ) : (
            <div data-layer="HorizontalBorder" className="Horizontalborder" style={{width: 175, paddingTop: 3, borderTop: '1px #EEEEEE solid', justifyContent: 'space-between', alignItems: 'center', display: 'inline-flex'}} />
          )}
        </div>

        {/* Center Score */}
        <div data-layer="Center Score" className="CenterScore" style={{width: 350, height: 70, position: 'relative', background: 'linear-gradient(169deg, #2A0066 0%, #4B0082 100%)', boxShadow: '0px 0px 20px rgba(255, 0, 229, 0.30)', overflow: 'hidden', borderRadius: 50, outline: '2px #FF00E5 solid', outlineOffset: '-2px'}}>
          <div data-layer="Container" className="Container" style={{width: 250, height: 42, left: 50, top: 6, position: 'absolute', justifyContent: 'center', alignItems: 'center', gap: 10, display: 'inline-flex'}}>
            <div data-layer="Background" className="Background" style={{paddingLeft: 14, paddingRight: 14, paddingTop: 1, paddingBottom: 1, background: '#FF00E5', borderRadius: 20, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'inline-flex'}}>
              <div data-layer="Score" className="Score" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: 'white', fontSize: 24, fontFamily: 'Inter', fontWeight: '900', wordWrap: 'break-word'}}>
                 {inn?.totalRuns ?? 0}-{inn?.wickets ?? 0}
              </div>
            </div>
            <div data-layer="Container" className="Container" style={{flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'inline-flex'}}>
              <div data-layer="OVERS" className="Overs" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: 'white', fontSize: 14.10, fontFamily: 'Inter', fontWeight: '600', wordWrap: 'break-word'}}>
                OVERS {inn?.overs ?? 0}.{inn?.balls ?? 0}
              </div>
            </div>
          </div>
          <div data-layer="Container" className="Container" style={{left: 0, right: 0, top: 48, position: 'absolute', opacity: 0.85, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, display: 'flex'}}>
            <div data-layer="RUN RATE" className="RunRate" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: 'white', fontSize: 9.90, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.50, wordWrap: 'break-word'}}>
              RUN RATE {snapshot.currentRunRate.toFixed(2)}
            </div>
            {snapshot.currentInnings === 2 && snapshot.requiredRunRate !== null && (
              <div data-layer="REQUIRED RATE" className="RequiredRate" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: 'white', fontSize: 9.90, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.50, wordWrap: 'break-word'}}>
                  REQ RATE {snapshot.requiredRunRate.toFixed(2)}
              </div>
            )}
            {snapshot.currentInnings === 2 && inn?.target !== null && (
               <div data-layer="TARGET" className="Target" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: 'white', fontSize: 9.90, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.50, wordWrap: 'break-word'}}>
                  TARGET {inn?.target}
              </div>
            )}
          </div>
        </div>

        {/* Bowler */}
        <div data-layer="Bowler" className="Bowler" style={{width: 450, height: 65, paddingLeft: 22, paddingRight: 22, background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, justifyContent: 'space-between', alignItems: 'center', display: 'flex'}}>
          {currentBowler ? (
            <>
              <div data-layer="Container" className="Container" style={{flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 1, display: 'inline-flex'}}>
                <div data-layer="Container" className="Container" style={{alignSelf: 'stretch', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex'}}>
                  <div data-layer="BowlerName" className="BowlerName" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#2A0066', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', wordWrap: 'break-word'}}>{currentBowler.displayName}</div>
                </div>
                <div data-layer="Paragraph" className="Paragraph" style={{alignSelf: 'stretch', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 3, display: 'inline-flex'}}>
                  <div data-layer="WicketsRuns" className="WicketsRuns" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#2A0066', fontSize: 13.30, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word'}}>{currentBowler.wickets}-{currentBowler.runs}  </div>
                  <div data-layer="Overs" className="Overs" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#888888', fontSize: 11.50, fontFamily: 'Inter', fontWeight: '700', wordWrap: 'break-word'}}>{currentBowler.overs}.{currentBowler.balls} ov</div>
                </div>
              </div>
              <div data-layer="Container" className="Container" style={{justifyContent: 'flex-end', alignItems: 'center', gap: 5, display: 'flex'}}>
                 {/* Empty space filler for bowling balls since recent bowls are not explicitly in MatchSnapshot */}
              </div>
            </>
          ) : (
            <div className="w-full text-center text-gray-400 font-stats uppercase text-xs">Waiting for bowler</div>
          )}
        </div>

        {/* Bowling Team Flag */}
        <div data-layer="Flag Right" className="FlagRight" style={{width: 200, height: 65, position: 'relative', background: 'white', boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)', overflow: 'hidden', borderRadius: 50, justifyContent: 'center', alignItems: 'center', gap: 30, display: 'flex'}}>
          <div data-layer="TeamName" className="TeamName" style={{justifyContent: 'center', display: 'flex', flexDirection: 'column', color: '#666666', fontSize: 15, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.58, wordWrap: 'break-word', zIndex: 10}}>{bowling.name.slice(0, 10)}</div>
          <div data-layer="Gradient" className="Gradient" style={{width: 28, height: 65, left: 0, top: 0, position: 'absolute', background: `linear-gradient(90deg, ${bowling.primaryColor} 0%, rgba(255, 0, 229, 0) 100%)`, borderTopLeftRadius: 50, borderBottomLeftRadius: 50}} />
          <div data-layer="Avatar" data-shape="Circle" data-size="Large" data-type="Image" className="Avatar" style={{width: 40, height: 40, position: 'relative', overflow: 'hidden', borderRadius: 9999, outline: '1px #666666 solid', outlineOffset: '-1px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
             {bowling.logoCloudinaryId ? (
                <Image src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_40,h_40,f_webp/${bowling.logoCloudinaryId}`} alt={bowling.name} width={40} height={40} className="object-cover" />
            ) : (
                <span className="text-gray-400 font-bold font-display tracking-widest">{bowling.shortCode.charAt(0)}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
