'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Shield, X, Wallet, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { AdminNav } from './AdminNav'
import {
  AppBadge,
  AppButton,
  AppPage,
  EmptyState,
  PageHeader,
  SurfaceCard,
  appInputClass,
  appLabelClass,
} from '@/components/shared/AppPrimitives'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type UserRow = {
  id: number
  username: string
  displayName: string
  role: 'admin' | 'operator'
  phone: string | null
  photoCloudinaryId: string | null
  createdAt: string
  updatedAt: string
}

type FormState = {
  username: string
  displayName: string
  role: 'admin' | 'operator'
  password: string
  phone: string
  photoCloudinaryId: string
}

const emptyForm: FormState = {
  username: '',
  displayName: '',
  role: 'operator',
  password: '',
  phone: '',
  photoCloudinaryId: '',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function UsersPageClient() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [walletBalances, setWalletBalances] = useState<Record<number, number>>({})
  const [topupUser, setTopupUser] = useState<UserRow | null>(null)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupDesc, setTopupDesc] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)

  async function loadUsers() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users', { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Failed to load users')
      }

      const rows = await res.json() as UserRow[]
      setUsers(rows)

      const wRes = await fetch('/api/admin/wallets', { cache: 'no-store' })
      if (wRes.ok) {
        const wRows = await wRes.json() as { userId: number; balance: number }[]
        setWalletBalances(Object.fromEntries(wRows.map((w) => [w.userId, w.balance])))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault()
    if (!topupUser) return
    setTopupLoading(true)
    try {
      const res = await fetch('/api/admin/wallets/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: topupUser.id, amount: parseInt(topupAmount, 10), description: topupDesc || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setWalletBalances((prev) => ({ ...prev, [topupUser.id]: data.newBalance }))
        toast.success(`Added ${topupAmount} LKR to ${topupUser.displayName}'s wallet`)
        setTopupUser(null)
        setTopupAmount('')
        setTopupDesc('')
      } else {
        toast.error(data.error ?? 'Failed to add credits')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setTopupLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  function handleCreateChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setCreateForm((current) => ({ ...current, [name]: value }))
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setEditForm((current) => ({ ...current, [name]: value }))
  }

  function openEdit(user: UserRow) {
    setEditingUser(user)
    setEditError('')
    setEditForm({
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      password: '',
      phone: user.phone ?? '',
      photoCloudinaryId: user.photoCloudinaryId ?? '',
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setCreateError(data?.error ?? 'Failed to create user')
        return
      }

      setCreateForm(emptyForm)
      setShowCreate(false)
      await loadUsers()
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingUser) return
    setSaving(true)
    setEditError('')

    try {
      const payload: Record<string, string | null> = {
        username: editForm.username,
        displayName: editForm.displayName,
        role: editForm.role,
        phone: editForm.phone || null,
        photoCloudinaryId: editForm.photoCloudinaryId || null,
      }

      if (editForm.password) {
        payload.password = editForm.password
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setEditError(data?.error ?? 'Failed to update user')
        return
      }

      setEditingUser(null)
      await loadUsers()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingUser) return
    setDeleting(true)
    setDeleteError('')

    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setDeleteError(data?.error ?? 'Failed to delete user')
        return
      }

      setDeletingUser(null)
      await loadUsers()
    } finally {
      setDeleting(false)
    }
  }

  const currentUserId = session?.user?.id ?? ''
  const adminCount = users.filter((user) => user.role === 'admin').length

  return (
    <AppPage className="max-w-7xl">
      <PageHeader
        eyebrow="Admin panel"
        title="User accounts, roles, and wallet balances"
        description="Manage database-backed users and top up operator credit balances without changing the existing auth or wallet flows."
        actions={<AppButton onClick={() => { setShowCreate(true); setCreateError('') }}>Create User</AppButton>}
      />

      <AdminNav active="users" />

      {error ? (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <SurfaceCard>
          <p className="py-12 text-center text-sm text-slate-500">Loading users...</p>
        </SurfaceCard>
      ) : users.length === 0 ? (
        <EmptyState
          title="No users yet"
          description="Create the first account to enable multi-user login and operator wallet management."
          action={<AppButton onClick={() => setShowCreate(true)}>Create User</AppButton>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <SurfaceCard className="overflow-hidden p-0">
            <div className="app-table-wrap rounded-none border-0 shadow-none">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Display Name</th>
                    <th>Role</th>
                    <th>Balance</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = currentUserId === String(user.id)
                    const isLastAdmin = user.role === 'admin' && adminCount === 1

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#f4f7f2]">
                              {user.photoCloudinaryId && CLOUD_NAME ? (
                                <img
                                  src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_80,h_80,f_webp/${user.photoCloudinaryId}`}
                                  alt={user.displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-slate-500">{user.displayName.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{user.username}</p>
                              {user.phone ? <p className="text-xs text-slate-500">{user.phone}</p> : null}
                              {isSelf ? <p className="text-xs font-medium text-[#10994c]">You</p> : null}
                            </div>
                          </div>
                        </td>
                        <td>{user.displayName}</td>
                        <td>
                          <AppBadge tone={user.role === 'admin' ? 'blue' : 'green'}>
                            {user.role === 'admin' ? <Shield className="h-3 w-3" /> : null}
                            {user.role}
                          </AppBadge>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{walletBalances[user.id] ?? 0} LKR</span>
                            <button
                              onClick={() => { setTopupUser(user); setTopupAmount(''); setTopupDesc('') }}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f7ee] text-[#10994c] transition hover:bg-[#dff0e4]"
                              title="Add credits"
                            >
                              <PlusCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <AppButton variant="secondary" className="h-9 px-3 text-xs" onClick={() => openEdit(user)}>
                              Edit
                            </AppButton>
                            <AppButton
                              variant="danger"
                              className="h-9 px-3 text-xs"
                              onClick={() => { setDeletingUser(user); setDeleteError('') }}
                              disabled={isSelf || isLastAdmin}
                            >
                              Delete
                            </AppButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#2d6fb0]">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Quick summary</h3>
              <p className="mt-1 text-sm text-slate-500">Admin and operator management at a glance.</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-[1.4rem] border border-[#dde3dc] bg-[#f8faf7] p-4">
                <p className="text-sm text-slate-500">Total users</p>
                <p className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{users.length}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[#dde3dc] bg-[#f8faf7] p-4">
                <p className="text-sm text-slate-500">Operators</p>
                <p className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
                  {users.filter((user) => user.role === 'operator').length}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[#dde3dc] bg-[#f8faf7] p-4">
                <p className="text-sm text-slate-500">Admins</p>
                <p className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{adminCount}</p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      )}

      <AnimatePresence>
        {showCreate ? (
          <SidePanel
            title="New user"
            onClose={() => setShowCreate(false)}
            footer={
              <AppButton form="create-user-form" type="submit" disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create User'}
              </AppButton>
            }
          >
            <form id="create-user-form" onSubmit={handleCreate} className="space-y-5">
              {createError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{createError}</p> : null}
              <div className="flex justify-center">
                <ImageUpload
                  folder="user-profiles"
                  value={createForm.photoCloudinaryId || null}
                  onChange={(id) => setCreateForm((f) => ({ ...f, photoCloudinaryId: id }))}
                  previewShape="circle"
                  label="Profile Photo"
                />
              </div>
              <Field label="Username"><input name="username" value={createForm.username} onChange={handleCreateChange} className={appInputClass} autoComplete="username" required /></Field>
              <Field label="Display Name"><input name="displayName" value={createForm.displayName} onChange={handleCreateChange} className={appInputClass} required /></Field>
              <Field label="WhatsApp / Phone"><input name="phone" type="tel" value={createForm.phone} onChange={handleCreateChange} className={appInputClass} placeholder="+94 77 123 4567" /></Field>
              <Field label="Role">
                <select name="role" value={createForm.role} onChange={handleCreateChange} className={appInputClass}>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Password"><input name="password" type="password" value={createForm.password} onChange={handleCreateChange} className={appInputClass} autoComplete="new-password" required /></Field>
            </form>
          </SidePanel>
        ) : null}
      </AnimatePresence>

      {editingUser ? (
        <ModalCard title="Edit user" onClose={() => setEditingUser(null)}>
          {editError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{editError}</p> : null}
          <div className="flex justify-center py-2">
            <ImageUpload
              folder="user-profiles"
              value={editForm.photoCloudinaryId || null}
              onChange={(id) => setEditForm((f) => ({ ...f, photoCloudinaryId: id }))}
              previewShape="circle"
              label="Profile Photo"
            />
          </div>
          <Field label="Username"><input name="username" value={editForm.username} onChange={handleEditChange} className={appInputClass} autoComplete="username" /></Field>
          <Field label="Display Name"><input name="displayName" value={editForm.displayName} onChange={handleEditChange} className={appInputClass} /></Field>
          <Field label="WhatsApp / Phone"><input name="phone" type="tel" value={editForm.phone} onChange={handleEditChange} className={appInputClass} placeholder="+94 77 123 4567" /></Field>
          <Field label="Role">
            <select
              name="role"
              value={editForm.role}
              onChange={handleEditChange}
              className={appInputClass}
              disabled={editingUser.role === 'admin' && adminCount === 1}
            >
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="New Password"><input name="password" type="password" value={editForm.password} onChange={handleEditChange} className={appInputClass} autoComplete="new-password" placeholder="Leave blank to keep current password" /></Field>
          <div className="flex gap-3 pt-2">
            <AppButton variant="secondary" className="flex-1" onClick={() => setEditingUser(null)}>Cancel</AppButton>
            <AppButton className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</AppButton>
          </div>
        </ModalCard>
      ) : null}

      {deletingUser ? (
        <ModalCard title="Delete user" onClose={() => setDeletingUser(null)}>
          <p className="text-sm text-slate-600">
            Delete <span className="font-semibold text-slate-950">{deletingUser.username}</span>? This cannot be undone.
          </p>
          {deleteError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{deleteError}</p> : null}
          <div className="flex gap-3 pt-2">
            <AppButton variant="secondary" className="flex-1" onClick={() => setDeletingUser(null)}>Cancel</AppButton>
            <AppButton variant="danger" className="flex-1" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete User'}</AppButton>
          </div>
        </ModalCard>
      ) : null}

      {topupUser ? (
        <ModalCard title="Add credits" onClose={() => setTopupUser(null)}>
          <p className="text-sm text-slate-600">
            Adding credits to <span className="font-semibold text-slate-950">{topupUser.displayName}</span>
            <span className="ml-1 text-slate-500">({walletBalances[topupUser.id] ?? 0} LKR current)</span>
          </p>
          <form onSubmit={handleTopup} className="space-y-4">
            <Field label="Amount (LKR)"><input type="number" min={1} value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className={appInputClass} placeholder="e.g. 500" required /></Field>
            <Field label="Note (optional)"><input type="text" value={topupDesc} onChange={(e) => setTopupDesc(e.target.value)} className={appInputClass} placeholder="Reason or reference" /></Field>
            <div className="flex gap-3 pt-1">
              <AppButton variant="secondary" className="flex-1" type="button" onClick={() => setTopupUser(null)}>Cancel</AppButton>
              <AppButton className="flex-1" type="submit" disabled={topupLoading || !topupAmount}>{topupLoading ? 'Adding...' : 'Add Credits'}</AppButton>
            </div>
          </form>
        </ModalCard>
      ) : null}
    </AppPage>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={appLabelClass}>{label}</label>
      {children}
    </div>
  )
}

function SidePanel({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="relative flex h-full w-full max-w-lg flex-col border-l border-[#d7ddd6] bg-[#f8faf7] shadow-[0_24px_70px_rgba(10,14,18,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-[#dfe6df] px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 transition hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <div className="border-t border-[#dfe6df] px-6 py-5">{footer}</div> : null}
      </motion.div>
    </div>
  )
}

function ModalCard({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm" onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div className="w-full max-w-lg rounded-[2rem] border border-[#d7ddd6] bg-white p-6 shadow-[0_32px_80px_rgba(10,14,18,0.18)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f7f2] text-slate-500 transition hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}
