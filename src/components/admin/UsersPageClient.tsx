'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Shield, X, Wallet, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { AdminNav } from './AdminNav'

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

  // Wallet / topup
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

      // Fetch wallet balances in parallel
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

  function handleCreateChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setCreateForm((current) => ({ ...current, [name]: value }))
  }

  function handleEditChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
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
  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm'
  const labelCls = 'block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider'

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="w-full">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-3xl text-primary tracking-wider">Admin Panel</h1>
                <p className="font-stats text-sm text-gray-500">Manage users, access, and pricing</p>
              </div>
            </div>
            <AdminNav active="users" />
          </div>

          <button
            onClick={() => {
              setShowCreate(true)
              setCreateError('')
            }}
            className="rounded-xl bg-primary px-5 py-2.5 font-stats text-sm font-semibold text-white transition-all duration-300 hover:bg-indigo-600 hover:shadow-[0_4px_20px_rgba(79,70,229,0.4)]"
          >
            Create User
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-stats text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="py-16 text-center font-stats text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 px-8 py-16 text-center text-gray-500">
            <p className="font-display text-3xl text-white">NO USERS YET</p>
            <p className="mt-2 font-stats text-sm">Create the first database-backed account to enable multi-user login.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/90">
                  <th className="px-4 py-3 text-left font-stats text-xs uppercase tracking-wider text-gray-400">Username</th>
                  <th className="px-4 py-3 text-left font-stats text-xs uppercase tracking-wider text-gray-400">Display Name</th>
                  <th className="px-4 py-3 text-left font-stats text-xs uppercase tracking-wider text-gray-400">Role</th>
                  <th className="px-4 py-3 text-left font-stats text-xs uppercase tracking-wider text-gray-400">Balance</th>
                  <th className="px-4 py-3 text-left font-stats text-xs uppercase tracking-wider text-gray-400">Created</th>
                  <th className="px-4 py-3 text-right font-stats text-xs uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = currentUserId === String(user.id)
                  const isLastAdmin = user.role === 'admin' && adminCount === 1

                  return (
                    <tr key={user.id} className="border-t border-gray-800 transition-colors hover:bg-gray-800/40">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700 flex items-center justify-center">
                            {user.photoCloudinaryId && CLOUD_NAME ? (
                              <img
                                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_80,h_80,f_webp/${user.photoCloudinaryId}`}
                                alt={user.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-stats text-sm font-bold text-gray-400">
                                {user.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-stats text-sm font-semibold text-white">{user.username}</p>
                            {user.phone && (
                              <p className="font-stats text-xs text-gray-500">{user.phone}</p>
                            )}
                            {isSelf && <p className="font-stats text-xs text-primary">You</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-stats text-sm text-gray-300">{user.displayName}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-stats text-[0.7rem] uppercase tracking-[0.2em] ${
                            user.role === 'admin'
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          {user.role === 'admin' && <Shield className="h-3.5 w-3.5" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-stats text-sm text-gray-300">
                            {walletBalances[user.id] ?? 0} LKR
                          </span>
                          <button
                            onClick={() => { setTopupUser(user); setTopupAmount(''); setTopupDesc('') }}
                            className="p-1 rounded text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Add credits"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-stats text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 font-stats text-sm text-gray-300 transition-colors hover:bg-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeletingUser(user)
                              setDeleteError('')
                            }}
                            disabled={isSelf || isLastAdmin}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-stats text-sm text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="relative flex h-full w-full max-w-md flex-col border-l border-gray-800 bg-gray-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 p-6">
                <h2 className="font-display text-2xl tracking-widest text-white">NEW USER</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 transition-colors hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="create-user-form" onSubmit={handleCreate} className="space-y-5">
                  {createError && (
                    <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 font-stats text-sm text-red-300">
                      {createError}
                    </p>
                  )}

                  <div className="flex justify-center">
                    <ImageUpload
                      folder="user-profiles"
                      value={createForm.photoCloudinaryId || null}
                      onChange={(id) => setCreateForm((f) => ({ ...f, photoCloudinaryId: id }))}
                      previewShape="circle"
                      label="Profile Photo"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Username</label>
                    <input name="username" value={createForm.username} onChange={handleCreateChange} className={inputCls} autoComplete="username" required />
                  </div>
                  <div>
                    <label className={labelCls}>Display Name</label>
                    <input name="displayName" value={createForm.displayName} onChange={handleCreateChange} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>WhatsApp / Phone</label>
                    <input name="phone" type="tel" value={createForm.phone} onChange={handleCreateChange} className={inputCls} placeholder="+94 77 123 4567" />
                  </div>
                  <div>
                    <label className={labelCls}>Role</label>
                    <select name="role" value={createForm.role} onChange={handleCreateChange} className={inputCls}>
                      <option value="operator">Operator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <input name="password" type="password" value={createForm.password} onChange={handleCreateChange} className={inputCls} autoComplete="new-password" required />
                  </div>
                </form>
              </div>

              <div className="border-t border-gray-800 bg-gray-900/70 p-6">
                <button
                  form="create-user-form"
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-xl bg-primary py-3 font-stats text-sm font-semibold text-white transition-all hover:bg-indigo-600 disabled:opacity-50"
                >
                  {creating ? 'CREATING...' : 'CREATE USER'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingUser(null)
          }}
        >
          <div className="mx-4 w-full max-w-md space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-stats text-lg font-semibold text-white">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="text-xl leading-none text-gray-400 transition-colors hover:text-white">×</button>
            </div>

            {editError && <p className="font-stats text-sm text-red-300">{editError}</p>}

            <div className="flex justify-center py-2">
              <ImageUpload
                folder="user-profiles"
                value={editForm.photoCloudinaryId || null}
                onChange={(id) => setEditForm((f) => ({ ...f, photoCloudinaryId: id }))}
                previewShape="circle"
                label="Profile Photo"
              />
            </div>
            <div>
              <label className={labelCls}>Username</label>
              <input name="username" value={editForm.username} onChange={handleEditChange} className={inputCls} autoComplete="username" />
            </div>
            <div>
              <label className={labelCls}>Display Name</label>
              <input name="displayName" value={editForm.displayName} onChange={handleEditChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp / Phone</label>
              <input name="phone" type="tel" value={editForm.phone} onChange={handleEditChange} className={inputCls} placeholder="+94 77 123 4567" />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select
                name="role"
                value={editForm.role}
                onChange={handleEditChange}
                className={inputCls}
                disabled={editingUser.role === 'admin' && adminCount === 1}
              >
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <input name="password" type="password" value={editForm.password} onChange={handleEditChange} className={inputCls} autoComplete="new-password" placeholder="Leave blank to keep current password" />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-stats text-sm text-gray-300 transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 rounded-lg bg-primary px-4 py-2 font-stats text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingUser(null)
          }}
        >
          <div className="mx-4 w-full max-w-md space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div>
              <h2 className="font-stats text-lg font-semibold text-white">Delete User</h2>
              <p className="mt-2 font-stats text-sm text-gray-400">
                Delete <span className="font-semibold text-white">{deletingUser.username}</span>? This cannot be undone.
              </p>
            </div>

            {deleteError && <p className="font-stats text-sm text-red-300">{deleteError}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-stats text-sm text-gray-300 transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-stats text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Credits Modal */}
      {topupUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => { if (e.target === e.currentTarget) setTopupUser(null) }}
        >
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h2 className="font-stats text-lg font-semibold text-white">Add Credits</h2>
              </div>
              <button onClick={() => setTopupUser(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="font-stats text-sm text-gray-400">
              Adding credits to <span className="text-white font-semibold">{topupUser.displayName}</span>
              <span className="text-gray-500 ml-1">({walletBalances[topupUser.id] ?? 0} LKR current)</span>
            </p>
            <form onSubmit={handleTopup} className="space-y-4">
              <div>
                <label className={labelCls}>Amount (LKR)</label>
                <input
                  type="number"
                  min={1}
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 500"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Note (optional)</label>
                <input
                  type="text"
                  value={topupDesc}
                  onChange={(e) => setTopupDesc(e.target.value)}
                  className={inputCls}
                  placeholder="Reason or reference"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTopupUser(null)}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-stats text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topupLoading || !topupAmount}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 font-stats text-sm font-semibold text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                  {topupLoading ? 'Adding…' : 'Add Credits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
