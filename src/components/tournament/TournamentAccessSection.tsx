'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { TournamentUserSummary } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type AccessPayload = {
  owner: TournamentUserSummary | null
  operators: TournamentUserSummary[]
  availableOperators: TournamentUserSummary[]
}

type Props = {
  tournamentId: number
  initialOwner: TournamentUserSummary | null
  initialOperators: TournamentUserSummary[]
  canManage: boolean
}

function UserAvatar({ user }: { user: TournamentUserSummary }) {
  const initials = user.displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700 flex items-center justify-center">
      {user.photoCloudinaryId && CLOUD_NAME ? (
        <img
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_72,h_72,f_webp/${user.photoCloudinaryId}`}
          alt={user.displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-stats text-xs font-bold text-primary">
          {initials || user.displayName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

export function TournamentAccessSection({
  tournamentId,
  initialOwner,
  initialOperators,
  canManage,
}: Props) {
  const [owner, setOwner] = useState<TournamentUserSummary | null>(initialOwner)
  const [operators, setOperators] = useState<TournamentUserSummary[]>(initialOperators)
  const [availableOperators, setAvailableOperators] = useState<TournamentUserSummary[]>([])
  const [selectedOperatorId, setSelectedOperatorId] = useState<number | ''>('')
  const [granting, setGranting] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)

  useEffect(() => {
    if (!canManage) return

    fetch(`/api/tournaments/${tournamentId}/access`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load tournament access')
        return res.json() as Promise<AccessPayload>
      })
      .then((data) => {
        setOwner(data.owner)
        setOperators(data.operators)
        setAvailableOperators(data.availableOperators)
      })
      .catch(() => {})
  }, [canManage, tournamentId])

  async function handleGrant() {
    if (!selectedOperatorId) return
    setGranting(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedOperatorId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to grant access')
        return
      }

      const granted = availableOperators.find((operator) => operator.id === selectedOperatorId)
      if (granted) {
        setOperators((prev) => [...prev, granted].sort((a, b) => a.displayName.localeCompare(b.displayName)))
        setAvailableOperators((prev) => prev.filter((operator) => operator.id !== selectedOperatorId))
      }
      setSelectedOperatorId('')
      toast.success('Operator access granted')
    } catch {
      toast.error('Network error')
    } finally {
      setGranting(false)
    }
  }

  async function handleRevoke(userId: number) {
    setRevokingId(userId)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/access/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to revoke access')
        return
      }

      const revoked = operators.find((operator) => operator.id === userId)
      if (revoked) {
        setOperators((prev) => prev.filter((operator) => operator.id !== userId))
        setAvailableOperators((prev) => [...prev, revoked].sort((a, b) => a.displayName.localeCompare(b.displayName)))
      }
      toast.success('Operator access revoked')
    } catch {
      toast.error('Network error')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-5">
      <div>
        <h2 className="font-stats font-semibold text-gray-300 text-sm uppercase tracking-wider">
          Tournament Access
        </h2>
        <p className="font-stats text-xs text-gray-500 mt-1">
          The creator is the owner and provides tournament branding. Additional granted users act as tournament operators.
        </p>
      </div>

      {owner && (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserAvatar user={owner} />
            <div>
              <p className="font-stats text-sm text-white font-medium">{owner.displayName}</p>
              <p className="font-stats text-xs text-gray-500">@{owner.username}</p>
            </div>
          </div>
          <span className="font-stats text-xs uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
            Owner
          </span>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-stats text-xs uppercase tracking-wider text-gray-500">Operators</p>
        {operators.length === 0 ? (
          <p className="font-stats text-xs text-gray-600">No additional operators granted yet.</p>
        ) : (
          operators.map((operator) => (
            <div key={operator.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-gray-700">
              <div className="flex items-center gap-3">
                <UserAvatar user={operator} />
                <div>
                  <p className="font-stats text-sm text-white font-medium">{operator.displayName}</p>
                  <p className="font-stats text-xs text-gray-500">@{operator.username}</p>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => handleRevoke(operator.id)}
                  disabled={revokingId === operator.id}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-300 font-stats text-xs rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  {revokingId === operator.id ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canManage && (
        <div className="pt-2 border-t border-gray-800 space-y-3">
          <p className="font-stats text-xs uppercase tracking-wider text-gray-500">Grant Operator Access</p>
          {availableOperators.length === 0 ? (
            <p className="font-stats text-xs text-gray-600">All operator accounts already have access to this tournament.</p>
          ) : (
            <div className="flex items-center gap-3">
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white font-stats text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select operator…</option>
                {availableOperators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.displayName} (@{operator.username})
                  </option>
                ))}
              </select>
              <button
                onClick={handleGrant}
                disabled={granting || !selectedOperatorId}
                className="px-4 py-2.5 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-40"
              >
                {granting ? 'Granting…' : 'Grant'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
