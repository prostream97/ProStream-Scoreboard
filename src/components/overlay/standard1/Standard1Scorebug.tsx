'use client'

import { motion } from 'framer-motion'
import type { MatchSnapshot, BatterStats, BowlerStats } from '@/types/match'

// Exact CSS from Scorebug.html
const DARK_GRAD = 'linear-gradient(to right, #000000, #212122, #39393a, #39393a, #4f4c4c)'
const GRAY_GRAD = 'linear-gradient(to right, #808080, #8a8a8a, #949394, #9e9d9e, #a8a7a8)'
const YELLOW = '#f6ce00'
const BAT_ICON_URL = 'https://res.cloudinary.com/dcv4wu1b6/image/upload/f_png/prostream/overlay-icons/bat'
const BALL_ICON_URL = 'https://res.cloudinary.com/dcv4wu1b6/image/upload/f_png/prostream/overlay-icons/ball'

type Props = { snapshot: MatchSnapshot }
const isDarkHexColor = (hexColor: string) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor)
  if (!match) return true
  const [, rHex, gHex, bHex] = match
  const r = Number.parseInt(rHex, 16)
  const g = Number.parseInt(gHex, 16)
  const b = Number.parseInt(bHex, 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance < 0.55
}

export function Standard1Scorebug({ snapshot }: Props) {
  const inn = snapshot.currentInningsState
  const batting = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const battingPanelColor = batting.primaryColor || '#1f2937'
  const isDarkBattingColor = isDarkHexColor(battingPanelColor)
  const bowling = inn?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowlingPanelColor = bowling.primaryColor || '#1f2937'
  const isDarkBowlingColor = isDarkHexColor(bowlingPanelColor)

  const activeBatters = snapshot.batters.filter(b => !b.isOut)
  type BatterDisplay = Pick<BatterStats, 'displayName' | 'runs' | 'balls' | 'isStriker'>

  const isDismissed = (id: number | null) =>
    id !== null && snapshot.batters.some(b => b.playerId === id && b.isOut)

  let batter1: BatterDisplay | undefined = activeBatters.find(b => b.isStriker)
  if (!batter1 && snapshot.strikerId && !isDismissed(snapshot.strikerId)) {
    const p = snapshot.battingTeamPlayers.find(pl => pl.id === snapshot.strikerId)
    if (p) batter1 = { displayName: p.displayName, runs: 0, balls: 0, isStriker: true }
  }

  const strikerPlayerId = activeBatters.find(b => b.isStriker)?.playerId ?? snapshot.strikerId
  let batter2: BatterDisplay | undefined = activeBatters.find(b => b.playerId !== strikerPlayerId)
  if (!batter2 && snapshot.nonStrikerId && snapshot.nonStrikerId !== strikerPlayerId && !isDismissed(snapshot.nonStrikerId)) {
    const p = snapshot.battingTeamPlayers.find(pl => pl.id === snapshot.nonStrikerId)
    if (p) batter2 = { displayName: p.displayName, runs: 0, balls: 0, isStriker: false }
  }

  let currentBowler: Pick<BowlerStats, 'displayName' | 'wickets' | 'runs' | 'overs' | 'balls'> | undefined =
    snapshot.bowlers.find(b => b.isCurrent)
  if (!currentBowler && snapshot.currentBowlerId) {
    const p = snapshot.bowlingTeamPlayers.find(pl => pl.id === snapshot.currentBowlerId)
    if (p) currentBowler = { displayName: p.displayName, wickets: 0, runs: 0, overs: 0, balls: 0 }
  }

  const overBalls = snapshot.currentOverBalls ?? []
  const crr = snapshot.currentRunRate.toFixed(2)

  return (
    <motion.div
      initial={{ y: 130, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 130, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      style={{
        // .LowerScoreboard: position:absolute; bottom:5px; left:0; right:0; margin:auto; width:100%; height:120px
        position: 'absolute',
        bottom: 5,
        left: 0,
        right: 0,
        margin: 'auto',
        width: '100%',
        height: 120,
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
        zIndex: 20,
      }}
    >
      {/* Vertical shine sweep */}
      <motion.div
        aria-hidden
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 140, opacity: [0, 0.55, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', repeatDelay: 0.35 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 55,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.45), rgba(255,255,255,0))',
          pointerEvents: 'none',
          zIndex: 50,
          mixBlendMode: 'screen',
        }}
      />
      {/* .bgLowerScoreboard: width:1920px; height:120px; display:inline-flex */}
      <div style={{ width: 1920, height: 120, display: 'inline-flex' }}>

        {/* === LEFT DARK BOX (.lowerScoreBox): 670×120, dark gradient === */}
        <div style={{
          width: 670,
          height: 120,
          border: '5px solid #222222',
          backgroundImage: DARK_GRAD,
          color: 'white',
          boxShadow: 'rgba(0,0,0,0.35) 0px 5px 15px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Top row (.lowerScoreBoxTop): team name + score + overs */}
          <div style={{ width: 670, display: 'inline-flex' }}>
            {/* .lowerScoreBoardBoxTeamName.displayFlex: width:320px, font-size:29px, font-weight:1000, margin-left:5px, centered */}
            <div style={{
              width: 320,
              fontSize: 29,
              fontWeight: 1000 as number,
              marginLeft: 5,
              height: 60,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              textTransform: 'uppercase',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}>
              {batting.shortCode}
            </div>

            {/* .lowerScoreBoardBox.grayColor: margin-left:10px, height:60px, line-height:60px, margin-top:5px */}
            <div style={{
              marginLeft: -5,
              height: 60,
              lineHeight: '60px',
              marginTop: 5,
              backgroundImage: GRAY_GRAD,
              color: 'black',
              display: 'inline-flex',
            }}>
              {/* .lowerScoreBoardBoxScore: width:190px, height:60px, line-height:60px, font-size:55px, font-weight:1000 */}
              <div style={{
                width: 190,
                height: 60,
                lineHeight: '60px',
                fontSize: 40,
                fontWeight: 1000 as number,
                display: 'inline-flex',
                alignItems: 'flex-end',
              }}>
                {/* .lowerScoreBoardBoxScoreRun: width:90px, text-align:right */}
                <div style={{ width: 90, textAlign: 'right' }}>{inn?.totalRuns ?? 0}</div>
                {/* .lowerScoreBoardBoxScoreDashed: width:40px, text-align:center */}
                <div style={{ width: 40, textAlign: 'center' }}>-</div>
                {/* .lowerScoreBoardBoxScoreWickets: width:60px, text-align:left */}
                <div style={{ width: 60, textAlign: 'left' }}>{inn?.wickets ?? 0}</div>
              </div>
            </div>

            {/* .lowerScoreBoxOver: width:130px, font-size:40px, font-weight:bold, height:60px, line-height:60px, margin-top:5px */}
            <div style={{
              width: 130,
              fontSize: 36,
              fontWeight: 'bold',
              height: 60,
              lineHeight: '60px',
              marginTop: 5,
              display: 'inline-flex',
            }}>
              {/* .lowerScoreBoxOver2: width:100px, text-align:right, font-weight:1000 */}
              <div style={{ width: 100, textAlign: 'right', fontWeight: 1000 as number }}>
                {snapshot.currentOver}.{snapshot.currentBalls}
              </div>
              {/* .lowerScoreBoxOver3: width:60px, text-align:left, margin-left:10px, font-weight:1000, font-size:36px */}
              <div style={{ width: 60, textAlign: 'left', marginLeft: 10, fontWeight: 1000 as number, fontSize: 36 }}>
                ({snapshot.totalOvers})
              </div>
            </div>
          </div>

          {/* Bottom row (.lowerScoreBoxBottom): width:670px, text-align:center, font-size:27px, height:60px, line-height:65px, font-weight:bold */}
          <div style={{
            width: 670,
            textAlign: 'center',
            fontSize: 27,
            height: 60,
            lineHeight: '65px',
            fontWeight: 'bold',
          }}>
            Batting : {batting.name}
          </div>
        </div>

        {/* === BATSMEN BOX (.lowerScoreBoxBatsmen): 475×120, gray gradient rows, margin-left:-5px === */}
        <div style={{
          width: 475,
          height: 120,
          boxShadow: 'rgba(0,0,0,0.35) 15px 0px 0px',
          border: '5px solid #222222',
          marginLeft: -5,
          background: battingPanelColor,
          color: isDarkBattingColor ? 'white' : 'black',
          boxSizing: 'border-box',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {[batter1, batter2].map((b, i) => (
            <div key={i} style={{
              // .lowerScoreBoxBatsmen1: height:60px
              height: 60,
              display: 'inline-flex',
              marginTop: i === 0 ? -1 : 0,
              width: '100%',
            }}>
              {b ? (
                // inner div.grayColor: display:inline-flex, gray gradient bg, color:black
                <div style={{
                  background: battingPanelColor,
                  color: isDarkBattingColor ? 'white' : 'black',
                  display: 'inline-flex',
                  width: '100%',
                  height: 60,
                }}>
                  {/* .batsmenStrikeImg: width:50px, height:50px — striker arrow */}
                  <div style={{
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {b.isStriker && (
                      <img
                        src={BAT_ICON_URL}
                        alt="Striker bat"
                        width={22}
                        height={32}
                        style={{
                          display: 'block',
                          objectFit: 'contain',
                          mixBlendMode: 'screen',
                        }}
                      />
                    )}
                  </div>
                  {/* .lowerScoreBoxBatsmen1Name: width:270px, height:60px, line-height:60px, font-weight:bold, overflow:hidden */}
                  <div style={{
                    width: 270,
                    height: 60,
                    lineHeight: '60px',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    fontSize: 18,
                  }}>
                    {b.displayName}
                  </div>
                  {/* .lowerScoreBoxBatsmen1Score: width:150px, height:60px, display:inline-flex */}
                  <div style={{ width: 150, height: 60, display: 'inline-flex' }}>
                    {/* .lowerScoreBoxBatsmen1ScoreRun: width:90px, text-align:right, font-size:48px, font-weight:1000 */}
                    <div style={{ width: 90, textAlign: 'right', fontSize: 32, fontWeight: 1000 as number }}>
                      {b.runs}
                    </div>
                    {/* .lowerScoreBoxBatsmen1ScoreBalls: width:60px, height:60px, line-height:70px, text-align:center, font-size:35px, font-weight:1000 */}
                    <div style={{ width: 60, height: 60, lineHeight: '70px', textAlign: 'center', fontSize: 30, fontWeight: 1000 as number }}>
                      {b.balls}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ height: 60, width: '100%', background: battingPanelColor }} />
              )}
            </div>
          ))}
        </div>

        {/* === YELLOW BOX (.yellowBox): 150×120, CRR, border:5px solid black, margin-left:-10px === */}
        <div style={{
          width: 150,
          height: 120,
          background: YELLOW,
          border: '5px solid black',
          marginLeft: -10,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}>
          {/* .scobo_extraDiv1 (header): width:100%, font-size:33px, text-align:center, height:60px, line-height:60px */}
          <div style={{
            width: '100%',
            fontSize: 33,
            textAlign: 'center',
            height: 60,
            lineHeight: '60px',
            fontWeight: 700,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}>
            {snapshot.currentInnings === 2 && snapshot.requiredRunRate !== null ? 'RRR' : 'CRR'}
          </div>
          {/* .scobo_extraDiv2 (value): width:100%, font-size:44px, text-align:center, height:60px, line-height:60px */}
          <div style={{
            width: '100%',
            fontSize: 44,
            textAlign: 'center',
            height: 60,
            lineHeight: '60px',
            fontWeight: 900,
          }}>
            {snapshot.currentInnings === 2 && snapshot.requiredRunRate !== null
              ? snapshot.requiredRunRate.toFixed(2)
              : crr}
          </div>
        </div>

        {/* === RIGHT PINK BOX (.lowerScoreBoxRight.pinkColor): 651×120, margin-left:-9px === */}
        <div style={{
          width: 651,
          height: 120,
          border: '5px solid #222222',
          marginLeft: -9,
          background: bowlingPanelColor,
          color: isDarkBowlingColor ? 'white' : 'black',
          boxSizing: 'border-box',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {currentBowler ? (
            <>
              {/* Bowler row (.lowerScoreBoxBowler): width:651px, height:60px, display:inline-flex */}
              <div style={{ width: 651, height: 60, display: 'inline-flex' }}>
                {/* .lowerScoreBoxBowler1Name: width:300px, height:60px, line-height:60px, font-weight:bold, overflow:hidden */}
                <div style={{
                  width: 300,
                  height: 60,
                  lineHeight: '60px',
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  fontSize: 20,
                  paddingLeft: 8,
                  boxSizing: 'border-box',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <img
                    src={BALL_ICON_URL}
                    alt="Bowler ball"
                    width={22}
                    height={22}
                    style={{ display: 'block', objectFit: 'contain', flexShrink: 0, mixBlendMode: 'screen' }}
                  />
                  {currentBowler.displayName}
                </div>
                {/* .lowerScoreBoxBowler1Score: width:230px, height:60px, display:inline-flex */}
                <div style={{ width: 230, height: 60, display: 'inline-flex' }}>
                  {/* .lowerScoreBoxBowler1ScoreRuns: width:150px, height:60px, line-height:60px, font-size:44px, font-weight:1000 */}
                  <div style={{
                    width: 150,
                    height: 60,
                    lineHeight: '60px',
                    fontSize: 32,
                    fontWeight: 1000 as number,
                    display: 'inline-flex',
                  }}>
                    {/* .lowerScoreBoxBowler1ScoreRuns1 (wkts): width:70px, text-align:center */}
                    <div style={{ width: 70, textAlign: 'center' }}>{currentBowler.wickets}</div>
                    {/* .lowerScoreBoxBowler1ScoreDashed1: width:20px, text-align:center */}
                    <div style={{ width: 20, textAlign: 'center' }}>-</div>
                    {/* .lowerScoreBoxBowler1ScoreWicket1 (runs): width:60px, text-align:center */}
                    <div style={{ width: 60, textAlign: 'center' }}>{currentBowler.runs}</div>
                  </div>
                  {/* .lowerScoreBoxBowler1ScoreOvers: width:80px, text-align:center, font-size:30px, height:60px, font-weight:bold, line-height:65px */}
                  <div style={{
                    width: 80,
                    textAlign: 'center',
                    fontSize: 30,
                    height: 60,
                    fontWeight: 'bold',
                    lineHeight: '65px',
                  }}>
                    {currentBowler.overs}.{currentBowler.balls}
                  </div>
                </div>
              </div>

              {/* Over balls row — second 60px row of the pink box */}
              <div style={{ width: 651, display: 'flex', flexWrap: 'wrap', paddingLeft: 0 }}>
                {overBalls.map((ball, i) => {
                  let bg = 'rgba(255,255,255,0.25)'
                  let label = '0'
                  let color = '#fff'
                  let fontSize = 25

                  if (ball.isWicket) {
                    // .this_wicket: background:#000, color:#fff
                    bg = '#000000'; label = 'W'; color = '#fff'
                  } else if (!ball.isLegal && ball.extraType === 'wide') {
                    bg = 'rgba(255,255,255,0.35)'
                    label = ball.extraRuns > 1 ? `${ball.extraRuns}Wd` : 'Wd'
                    color = '#fff'; fontSize = 18
                  } else if (!ball.isLegal && ball.extraType === 'noball') {
                    bg = 'rgba(255,255,255,0.35)'
                    label = ball.runs > 0 ? `${ball.runs}nb` : 'Nb'
                    color = '#fff'; fontSize = 18
                  } else {
                    // .this_runs: background:#f6ce00, color:#000, font-size:25px
                    bg = YELLOW; label = String(ball.runs); color = '#000'
                  }

                  return (
                    // .thisOverRuns: padding:0 10px, height:40px, line-height:40px, text-align:center,
                    //                font-weight:bold, margin-top:8px, margin-left:5px, border:1px solid #9d9d9d
                    <div key={i} style={{
                      padding: '0 10px',
                      height: 40,
                      lineHeight: '40px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      marginTop: 8,
                      marginLeft: 5,
                      border: '1px solid #9d9d9d',
                      background: bg,
                      color,
                      fontSize,
                      minWidth: 40,
                      boxSizing: 'border-box',
                    }}>
                      {label}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{
              height: 120,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 16,
              fontSize: 18,
              color: 'rgba(255,255,255,0.6)',
            }}>
              Waiting for bowler...
            </div>
          )}
        </div>

      </div>
    </motion.div>
  )
}
