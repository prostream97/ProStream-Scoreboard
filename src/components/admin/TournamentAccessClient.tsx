'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, Plus, X, ChevronDown } from 'lucide-react'
import { AdminNav } from './AdminNav'
import {
  AppButton,
  AppPage,
  EmptyState,
  PageHeader,
  SurfaceCard,
  appInputClass,
  appLabelClass,
} from '@/components/shared/AppPrimitives'

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

  return (
    <AppPage className="max-w-6xl">
      <PageHeader
        eyebrow="Admin panel"
        title="Tournament operator access"
        description="Grant or revoke tournament-level access for operators while keeping ownership and auth logic untouched."
      />

      <AdminNav active="access" />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#2d6fb0]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Select tournament</h2>
            <p className="mt-1 text-sm text-slate-500">Permissions below update the existing access matrix only.</p>
          </div>

          <div className="relative">
            <label className={appLabelClass}>Tournament</label>
            <select
              value={selectedTournamentId ?? ''}
              onChange={(e) => {
                setSelectedTournamentId(Number(e.target.value) || null)
                setSelectedUserId('')
              }}
              className={appInputClass}
            >
              {tournaments.length === 0 ? <option value="">No tournaments</option> : null}
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-[2.55rem] h-4 w-4 text-slate-400" />
          </div>

          {selectedTournament ? (
            <div className="rounded-[1.5rem] border border-[#dde3dc] bg-[#f8faf7] p-4">
              <p className="text-sm font-semibold text-slate-900">{selectedTournament.name}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedTournament.shortName}</p>
            </div>
          ) : null}
        </SurfaceCard>

        {selectedTournament ? (
          <div className="space-y-4">
            <SurfaceCard className="space-y-4">
              <div>
                <p className="app-kicker">Authorized operators</p>
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Users with access</h3>
              </div>

              {usersWithAccess.length === 0 ? (
                <EmptyState
                  title="No operators assigned"
                  description="No operator has access to this tournament yet."
                />
              ) : (
                <div className="space-y-3">
                  {usersWithAccess.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-[1.35rem] border border-[#e1e7df] bg-[#f8faf7] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f7ee] text-sm font-semibold text-[#10994c]">
                          {(u.displayName || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.displayName}</p>
                          <p className="text-sm text-slate-500">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(u.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1f0] text-[#c54e4c] transition hover:bg-[#ffe5e3]"
                        title="Revoke access"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard className="space-y-4">
              <div>
                <p className="app-kicker">Grant access</p>
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Add operator</h3>
              </div>

              {availableToAdd.length === 0 ? (
                <EmptyState
                  title="All operators already assigned"
                  description="Every operator already has access to this tournament."
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <label className={appLabelClass}>Operator</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                      className={appInputClass}
                    >
                      <option value="">Select operator</option>
                      {availableToAdd.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} (@{u.username})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-[2.55rem] h-4 w-4 text-slate-400" />
                  </div>
                  <div className="pt-[1.85rem]">
                    <AppButton onClick={handleGrant} disabled={granting || !selectedUserId}>
                      <Plus className="h-4 w-4" />
                      {granting ? 'Granting...' : 'Grant access'}
                    </AppButton>
                  </div>
                </div>
              )}
            </SurfaceCard>
          </div>
        ) : null}
      </div>
    </AppPage>
  )
}
