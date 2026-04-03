'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, Plus, X, ChevronDown } from 'lucide-react'
import { AdminNav } from './AdminNav'

type TournamentOption = { id: number; name: string; shortName: string; status: string }
type UserOption = { id: number; username: string; displayName: string; role: string }
type AccessRow = { userId: number; tournamentId: number }

interface Props {
  tournaments: TournamentOption[]
  users: UserOption[]
  access: AccessRow[]
}

export function TournamentAccessClient({ tournaments, users, access: initialAccess }: Props) {
  const [access, setAccess] = useState<AccessRow[]>(initialAccess)
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(
    tournaments[0]?.id ?? null,
  )
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [granting, setGranting] = useState(false)

  const operators = users.filter((u) => u.role === 'operator')

  const grantedUserIds = access
    .filter((a) => a.tournamentId === selectedTournamentId)
    .map((a) => a.userId)

  const usersWithAccess = operators.filter((u) => grantedUserIds.includes(u.id))
  const availableToAdd = operators.filter((u) => !grantedUserIds.includes(u.id))

  async function handleGrant() {
    if (!selectedTournamentId || !selectedUserId) return
    setGranting(true)
    try {
      const res = await fetch('/api/admin/tournament-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, tournamentId: selectedTournamentId }),
      })
      if (res.ok) {
        setAccess((prev) => [...prev, { userId: selectedUserId as number, tournamentId: selectedTournamentId }])
        setSelectedUserId('')
        toast.success('Access granted')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to grant access')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setGranting(false)
    }
  }

  async function handleRevoke(userId: number) {
    if (!selectedTournamentId) return
    try {
      const res = await fetch(`/api/admin/tournament-access/${userId}/${selectedTournamentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setAccess((prev) =>
          prev.filter((a) => !(a.userId === userId && a.tournamentId === selectedTournamentId)),
        )
        toast.success('Access revoked')
      } else {
        toast.error('Failed to revoke access')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId)

  const selectCls =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white font-stats text-sm focus:outline-none focus:border-primary appearance-none'

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl text-primary tracking-wider">Admin Panel</h1>
            <p className="font-stats text-sm text-gray-500">Manage users, access, and pricing</p>
          </div>
        </div>

        <AdminNav active="access" />

        {/* Tournament picker */}
        <div className="relative">
          <label className="block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider">
            Tournament
          </label>
          <div className="relative">
            <select
              value={selectedTournamentId ?? ''}
              onChange={(e) => {
                setSelectedTournamentId(Number(e.target.value) || null)
                setSelectedUserId('')
              }}
              className={selectCls}
            >
              {tournaments.length === 0 && (
                <option value="">No tournaments</option>
              )}
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {selectedTournament && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {/* Users with access */}
            <div className="p-5 border-b border-gray-800">
              <h2 className="font-stats text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Users with access
              </h2>

              {usersWithAccess.length === 0 ? (
                <p className="font-stats text-sm text-gray-600 italic">No operators have access to this tournament yet.</p>
              ) : (
                <ul className="space-y-2">
                  {usersWithAccess.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                          <span className="font-stats text-xs font-bold text-primary">
                            {(u.displayName || u.username).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-stats text-sm text-white font-medium">{u.displayName}</p>
                          <p className="font-stats text-xs text-gray-500">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(u.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Revoke access"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add access */}
            <div className="p-5">
              <h2 className="font-stats text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Grant access
              </h2>
              {availableToAdd.length === 0 ? (
                <p className="font-stats text-sm text-gray-600 italic">All operators already have access.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                      className={selectCls}
                    >
                      <option value="">Select operator…</option>
                      {availableToAdd.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} (@{u.username})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={handleGrant}
                    disabled={granting || !selectedUserId}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-40 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {granting ? 'Granting…' : 'Grant'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
