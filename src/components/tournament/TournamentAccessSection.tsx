'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { TournamentUserSummary } from '@/types/tournament'
import { AppBadge, AppButton, SurfaceCard, appInputClass, appLabelClass } from '@/components/shared/AppPrimitives'

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
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#f4f7f2]">
      {user.photoCloudinaryId && CLOUD_NAME ? (
        <img
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_72,h_72,f_webp/${user.photoCloudinaryId}`}
          alt={user.displayName}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold text-[#10994c]">
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
      .catch((err) => {
        console.error('[TournamentAccess] Failed to load access data:', err)
      })
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
    <SurfaceCard className="space-y-5">
      <div>
        <p className="app-kicker">Tournament access</p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Owner and operators</h2>
        <p className="mt-1 text-sm text-slate-500">
          The creator is the owner and provides tournament branding. Additional granted users act as tournament operators.
        </p>
      </div>

      {owner ? (
        <div className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-[#dfe6df] bg-[#f8faf7] px-4 py-3">
          <div className="flex items-center gap-3">
            <UserAvatar user={owner} />
            <div>
              <p className="font-medium text-slate-950">{owner.displayName}</p>
              <p className="text-sm text-slate-500">@{owner.username}</p>
            </div>
          </div>
          <AppBadge tone="blue">Owner</AppBadge>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="app-kicker !text-slate-400">Operators</p>
        {operators.length === 0 ? (
          <p className="text-sm text-slate-500">No additional operators granted yet.</p>
        ) : (
          operators.map((operator) => (
            <div key={operator.id} className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-[#dfe6df] bg-[#f8faf7] px-4 py-3">
              <div className="flex items-center gap-3">
                <UserAvatar user={operator} />
                <div>
                  <p className="font-medium text-slate-950">{operator.displayName}</p>
                  <p className="text-sm text-slate-500">@{operator.username}</p>
                </div>
              </div>
              {canManage ? (
                <AppButton
                  variant="danger"
                  className="h-9 px-3 text-xs"
                  onClick={() => handleRevoke(operator.id)}
                  disabled={revokingId === operator.id}
                >
                  {revokingId === operator.id ? 'Removing...' : 'Remove'}
                </AppButton>
              ) : null}
            </div>
          ))
        )}
      </div>

      {canManage ? (
        <div className="space-y-3 border-t border-[#e2e8e1] pt-4">
          <p className="app-kicker !text-slate-400">Grant operator access</p>
          {availableOperators.length === 0 ? (
            <p className="text-sm text-slate-500">All operator accounts already have access to this tournament.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className={appLabelClass}>Operator</label>
                <select
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value ? Number(e.target.value) : '')}
                  className={appInputClass}
                >
                  <option value="">Select operator</option>
                  {availableOperators.map((operator) => (
                    <option key={operator.id} value={operator.id}>
                      {operator.displayName} (@{operator.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-[1.85rem]">
                <AppButton onClick={handleGrant} disabled={granting || !selectedOperatorId}>
                  {granting ? 'Granting...' : 'Grant'}
                </AppButton>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
