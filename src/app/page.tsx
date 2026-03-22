import Link from 'next/link'
import { getMatchList } from '@/lib/db/queries/match'

export default async function Dashboard() {
  const matchList = await getMatchList()

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-5xl text-primary tracking-wider">PROSTREAM</h1>
            <p className="font-stats text-gray-400 mt-1">Cricket Scoreboard</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/teams"
              className="px-4 py-2.5 bg-gray-800 text-gray-300 font-stats font-semibold rounded-xl hover:bg-gray-700 transition-colors"
            >
              Manage Teams
            </Link>
            <Link
              href="/match/new"
              className="px-5 py-2.5 bg-primary text-white font-stats font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
            >
              + New Match
            </Link>
          </div>
        </div>

        {/* Match list */}
        {matchList.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            <p className="font-display text-4xl mb-3">NO MATCHES YET</p>
            <p className="font-stats">Create your first match to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matchList.map((match) => (
              <div
                key={match.id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-stats font-semibold text-white text-lg">
                      {match.homeTeam.shortCode} vs {match.awayTeam.shortCode}
                    </span>
                    <StatusBadge status={match.status} />
                  </div>
                  <p className="font-stats text-sm text-gray-400">
                    {match.format} · {match.venue ?? 'Venue TBD'} ·{' '}
                    {new Date(match.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/viewer/${match.id}`}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    View
                  </Link>
                  <Link
                    href={`/match/${match.id}/operator`}
                    className="px-3 py-1.5 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Score
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    setup: 'bg-gray-700 text-gray-300',
    active: 'bg-secondary/20 text-secondary border border-secondary/50',
    paused: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
    complete: 'bg-gray-700 text-gray-400',
    break: 'bg-orange-500/20 text-orange-400',
  }
  return (
    <span className={`font-stats text-xs px-2 py-0.5 rounded-full uppercase tracking-wider ${colors[status] ?? colors.setup}`}>
      {status}
    </span>
  )
}
