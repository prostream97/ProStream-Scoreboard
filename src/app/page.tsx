import Link from 'next/link'
import { getTournamentListWithCounts } from '@/lib/db/queries/tournament'

const statusColors: Record<string, string> = {
  upcoming: 'bg-gray-700 text-gray-300',
  group_stage: 'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  knockout: 'bg-orange-500/20 text-orange-400 border border-orange-500/50',
  complete: 'bg-gray-700 text-gray-400',
}

export default async function Dashboard() {
  const tournaments = await getTournamentListWithCounts()

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-5xl text-primary tracking-wider">PROSTREAM</h1>
            <p className="font-stats text-gray-400 mt-1">Cricket Scoreboard</p>
          </div>
          <Link
            href="/admin/tournaments"
            className="px-5 py-2.5 bg-primary text-white font-stats font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
          >
            + New Tournament
          </Link>
        </div>

        {/* Tournament list */}
        {tournaments.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            <p className="font-display text-4xl mb-3">NO TOURNAMENTS YET</p>
            <p className="font-stats mb-6">Create your first tournament to get started.</p>
            <Link
              href="/admin/tournaments"
              className="px-6 py-3 bg-primary text-white font-stats font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
            >
              Create Tournament
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-display text-xl text-white tracking-wider">{t.name}</span>
                    <span className="font-display text-xs tracking-wider text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                      {t.shortName}
                    </span>
                    <span className="font-stats text-xs text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded font-mono">
                      TRN-{t.id.toString().padStart(3, '0')}
                    </span>
                    <span className={`font-stats text-xs px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColors[t.status] ?? statusColors.upcoming}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="font-stats text-sm text-gray-400">
                    {t.format} · {t.totalOvers} overs · {t.teamCount} {t.teamCount === 1 ? 'team' : 'teams'} · {t.matchCount} {t.matchCount === 1 ? 'match' : 'matches'}
                  </p>
                </div>
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="px-4 py-2 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
