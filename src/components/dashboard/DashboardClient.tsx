'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trophy, Activity, Users, Plus, PlayCircle } from 'lucide-react'
import {
  AppBadge,
  AppButton,
  EmptyState,
  PageHeader,
  SectionTitle,
  SurfaceCard,
} from '@/components/shared/AppPrimitives'

type TournamentProps = {
  tournaments: any[]
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-[#f3f5f1] text-slate-600 border border-[#dde3dc]',
  group_stage: 'bg-[#ebf5ff] text-[#2d6fb0] border border-[#c7ddf5]',
  knockout: 'bg-[#fff5e7] text-[#c98010] border border-[#f5ddb0]',
  complete: 'bg-[#eef1ec] text-slate-400 border border-[#e1e7df]',
}

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVars = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120 } },
}

export function DashboardClient({ tournaments }: TournamentProps) {
  const activeCount = tournaments.filter((t) => t.status !== 'complete').length

  return (
    <motion.div initial="hidden" animate="show" variants={containerVars} className="app-page">
      <motion.div variants={itemVars}>
        <PageHeader
          eyebrow="Control Center"
          title="Broadcast operations"
          description="Tournament setup, live scoring, overlays, and viewer output"
          actions={
            <AppButton href="/admin/tournaments" variant="secondary">
              <Plus className="h-4 w-4" />
              New Tournament
            </AppButton>
          }
        />
      </motion.div>

      <motion.div variants={itemVars} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            title: 'Active tournaments',
            value: activeCount,
            icon: Trophy,
            accent: 'bg-[#e8f7ee] text-[#10994c]',
          },
          {
            title: 'Live matches',
            value: 0,
            icon: Activity,
            accent: 'bg-[#ebf5ff] text-[#2d6fb0]',
          },
          {
            title: 'Total teams',
            value: '--',
            icon: Users,
            accent: 'bg-[#fff5e7] text-[#c98010]',
          },
        ].map(({ title, value, icon: Icon, accent }) => (
          <SurfaceCard key={title} className="overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
                <Icon className="h-6 w-6" />
              </div>
              <AppBadge tone="neutral">Today</AppBadge>
            </div>
            <div className="mt-8">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
              <p className="mt-2 text-5xl font-semibold tracking-[-0.05em] text-slate-950">{value}</p>
            </div>
          </SurfaceCard>
        ))}
      </motion.div>

      <motion.div variants={itemVars} className="space-y-4">
        <SectionTitle
          eyebrow="Live overview"
          title="Your tournaments"
          description="Card-based tournament access keeps the lighter app language while preserving the current management flows."
          action={<AppButton href="/admin/tournaments" variant="ghost">See all</AppButton>}
        />
        {tournaments.length === 0 ? (
          <EmptyState
            title="No tournaments yet"
            description="Create your first tournament to start scheduling fixtures, generating overlays, and running live score operations."
            action={<AppButton href="/admin/tournaments">Create tournament</AppButton>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/admin/tournaments/${t.id}`}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.005 }}
                  className="app-card flex h-full items-start justify-between gap-4 transition-all hover:border-[#b8d7c0] hover:shadow-[0_18px_38px_rgba(26,36,32,0.08)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xl font-semibold tracking-[-0.03em] text-slate-950 transition-colors group-hover:text-[#10994c]">
                        {t.name}
                      </span>
                      <AppBadge tone="neutral">{t.shortName}</AppBadge>
                      <span className={`rounded-full px-2.5 py-1 font-stats text-[0.7rem] uppercase tracking-[0.18em] ${statusColors[t.status] ?? statusColors.upcoming}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {t.format} <span className="mx-1 text-slate-300">.</span> {t.totalOvers} overs
                      <span className="mx-1 text-slate-300">.</span> {t.teamCount} teams
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#f4f7f2] px-3 py-2 text-sm font-semibold text-[#10994c]">
                    <span>Manage</span>
                    <PlayCircle className="h-4 w-4" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

    </motion.div>
  )
}
