'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trophy, Activity, Users, Plus, PlayCircle } from 'lucide-react'

type TournamentProps = {
  tournaments: any[]
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-gray-700 text-gray-300',
  group_stage: 'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  knockout: 'bg-orange-500/20 text-orange-400 border border-orange-500/50',
  complete: 'bg-gray-700 text-gray-400',
}

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVars = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120 } }
}

export function DashboardClient({ tournaments }: TournamentProps) {
  const activeCount = tournaments.filter(t => t.status !== 'complete').length

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVars}
      className="max-w-5xl mx-auto py-8"
    >
      {/* Header */}
      <motion.div variants={itemVars} className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="font-display text-4xl text-white tracking-wider">COMMAND CENTER</h1>
          <p className="font-stats text-gray-400 mt-1">Welcome back. Here is your broadcast overview.</p>
        </div>
        <Link
          href="/admin/tournaments"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary border border-primary/30 font-stats font-semibold rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          New Tournament
        </Link>
      </motion.div>

      {/* Stat Widgets */}
      <motion.div variants={itemVars} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="relative overflow-hidden bg-gray-900 border border-gray-800 rounded-2xl p-6 group hover:border-primary/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <Trophy className="w-8 h-8 text-primary" />
            <span className="font-display text-4xl text-white">{activeCount}</span>
          </div>
          <p className="font-stats text-gray-400 uppercase tracking-wider text-sm">Active Tournaments</p>
        </div>

        <div className="relative overflow-hidden bg-gray-900 border border-gray-800 rounded-2xl p-6 group hover:border-emerald-500/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <Activity className="w-8 h-8 text-emerald-500" />
            <span className="font-display text-4xl text-white">0</span>
          </div>
          <p className="font-stats text-gray-400 uppercase tracking-wider text-sm">Live Matches</p>
        </div>

        <div className="relative overflow-hidden bg-gray-900 border border-gray-800 rounded-2xl p-6 group hover:border-blue-500/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="font-display text-4xl text-white">--</span>
          </div>
          <p className="font-stats text-gray-400 uppercase tracking-wider text-sm">Total Teams</p>
        </div>
      </motion.div>

      {/* Tournament Feed */}
      <motion.div variants={itemVars} className="mb-6">
        <h2 className="font-display text-2xl text-gray-200 mb-4 tracking-wider">YOUR TOURNAMENTS</h2>
        {tournaments.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="font-display text-2xl mb-2 text-gray-400">NO TOURNAMENTS YET</p>
            <p className="font-stats text-sm text-gray-500">Create your first tournament to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/admin/tournaments/${t.id}`}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.005 }}
                  className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-800 hover:border-primary/50 shadow-lg hover:shadow-primary/10 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-display text-xl text-white tracking-wider group-hover:text-primary transition-colors">{t.name}</span>
                      <span className="font-display text-xs tracking-wider text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                        {t.shortName}
                      </span>
                      <span className={`font-stats text-xs px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColors[t.status] ?? statusColors.upcoming}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="font-stats text-sm text-gray-400">
                      {t.format} <span className="mx-1 text-gray-600">•</span> {t.totalOvers} overs <span className="mx-1 text-gray-600">•</span> {t.teamCount} teams
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                    <span className="font-stats text-sm">Manage</span>
                    <PlayCircle className="w-5 h-5" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Start Match FAB */}
      <Link href="/match/new" className="fixed bottom-8 right-8 z-50 group">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 bg-primary text-white px-6 py-4 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.4)] hover:shadow-[0_8px_40px_rgba(79,70,229,0.6)] transition-shadow"
        >
          <PlayCircle className="w-6 h-6" />
          <span className="font-display tracking-widest text-lg leading-none pt-1">START MATCH</span>
        </motion.div>
      </Link>
    </motion.div>
  )
}
