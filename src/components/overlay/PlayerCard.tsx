'use client'

import Image from 'next/image'
import type { BatterStats, BowlerStats, PlayerSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type BatterCardProps = {
  batter: BatterStats
  player: PlayerSummary | undefined
  isStriker: boolean
  primaryColor: string
}

export function BatterCard({ batter, player, isStriker, primaryColor }: BatterCardProps) {
  return (
    // Lower-third: 480×120 — place in OBS at bottom-left
    <div
      className="flex items-center w-[480px] h-[120px] font-stats overflow-hidden rounded-r-2xl"
      style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 100%)' }}
    >
      {/* Accent stripe */}
      <div className="w-1.5 h-full" style={{ backgroundColor: primaryColor }} />

      {/* Headshot */}
      <div className="w-20 h-20 mx-4 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
        {player?.headshotCloudinaryId ? (
          <Image
            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_80,h_80,f_webp/${player.headshotCloudinaryId}`}
            alt={batter.displayName}
            width={80}
            height={80}
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-display text-3xl"
            style={{ color: primaryColor }}
          >
            {batter.displayName.charAt(0)}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex-1 pr-4">
        <div className="flex items-baseline gap-1.5 mb-1">
          {isStriker && <span style={{ color: primaryColor }} className="text-xs font-bold">*</span>}
          <p className="font-display text-xl tracking-wider text-white leading-none">
            {batter.displayName.toUpperCase()}
          </p>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-display text-4xl text-white leading-none">{batter.runs}</span>
          <span className="text-gray-400 text-lg">({batter.balls})</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>{batter.fours} × 4</span>
          <span>{batter.sixes} × 6</span>
          <span className="text-gray-300">SR {batter.strikeRate.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

type BowlerCardProps = {
  bowler: BowlerStats
  player: PlayerSummary | undefined
  primaryColor: string
}

export function BowlerCard({ bowler, player, primaryColor }: BowlerCardProps) {
  return (
    <div
      className="flex items-center w-[480px] h-[120px] font-stats overflow-hidden rounded-r-2xl"
      style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 100%)' }}
    >
      <div className="w-1.5 h-full" style={{ backgroundColor: primaryColor }} />

      <div className="w-20 h-20 mx-4 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
        {player?.headshotCloudinaryId ? (
          <Image
            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_80,h_80,f_webp/${player.headshotCloudinaryId}`}
            alt={bowler.displayName}
            width={80}
            height={80}
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-display text-3xl"
            style={{ color: primaryColor }}
          >
            {bowler.displayName.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex-1 pr-4">
        <p className="font-display text-xl tracking-wider text-white leading-none mb-1">
          {bowler.displayName.toUpperCase()}
        </p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-display text-4xl text-white leading-none">
            {bowler.overs}.{bowler.balls}
          </span>
          <span className="text-gray-400">overs</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>{bowler.runs} runs</span>
          <span className="text-white font-bold">{bowler.wickets} wkts</span>
          <span>Econ {bowler.economy.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}
