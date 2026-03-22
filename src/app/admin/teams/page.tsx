'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signIn } from 'next-auth/react'
import { CloudinaryUpload } from '@/components/shared/CloudinaryUpload'
import type { Team } from '@/types/player'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

export default function TeamsPage() {
  const { status } = useSession()
  const isAuthed = status === 'authenticated'
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    shortCode: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#10B981',
  })
  const [error, setError] = useState('')

  async function loadTeams() {
    const res = await fetch('/api/teams')
    if (res.ok) setTeams(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadTeams() }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'shortCode' ? value.toUpperCase().slice(0, 3) : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm({ name: '', shortCode: '', primaryColor: '#4F46E5', secondaryColor: '#10B981' })
        setShowForm(false)
        await loadTeams()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to create team')
      }
    } finally {
      setCreating(false)
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm'
  const labelCls = 'block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider'

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 font-stats text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-300">Teams</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-4xl text-primary tracking-wider">TEAMS</h1>
          {isAuthed ? (
            <button
              onClick={() => { setShowForm((v) => !v); setError('') }}
              className="px-4 py-2 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 transition-colors text-sm"
            >
              {showForm ? 'Cancel' : '+ Create Team'}
            </button>
          ) : (
            <button
              onClick={() => signIn(undefined, { callbackUrl: '/admin/teams' })}
              className="px-4 py-2 bg-gray-700 text-gray-300 font-stats font-semibold rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Sign in to manage
            </button>
          )}
        </div>

        {/* Create team form */}
        {showForm && isAuthed && (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6 space-y-4"
          >
            <h2 className="font-stats font-semibold text-gray-200">New Team</h2>

            {error && <p className="text-red-400 font-stats text-sm">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Team Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="e.g. Mumbai Indians"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Short Code (3 letters)</label>
                <input
                  name="shortCode"
                  value={form.shortCode}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="e.g. MI"
                  maxLength={3}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Primary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    name="primaryColor"
                    value={form.primaryColor}
                    onChange={handleChange}
                    className="h-10 w-12 rounded border border-gray-700 bg-gray-800 cursor-pointer"
                  />
                  <input
                    name="primaryColor"
                    value={form.primaryColor}
                    onChange={handleChange}
                    className={`${inputCls} flex-1`}
                    placeholder="#4F46E5"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Secondary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    name="secondaryColor"
                    value={form.secondaryColor}
                    onChange={handleChange}
                    className="h-10 w-12 rounded border border-gray-700 bg-gray-800 cursor-pointer"
                  />
                  <input
                    name="secondaryColor"
                    value={form.secondaryColor}
                    onChange={handleChange}
                    className={`${inputCls} flex-1`}
                    placeholder="#10B981"
                  />
                </div>
              </div>
            </div>

            {/* Color preview */}
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.primaryColor }} />
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.secondaryColor }} />
              <span className="font-display text-xl tracking-wider" style={{ color: form.primaryColor }}>
                {form.shortCode || 'XXX'}
              </span>
              <span className="font-stats text-gray-300 text-sm">{form.name || 'Team Name'}</span>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors text-sm"
            >
              {creating ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        )}

        {/* Team list */}
        {loading ? (
          <div className="text-center py-12 font-stats text-gray-500">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="font-display text-3xl mb-2">NO TEAMS YET</p>
            <p className="font-stats text-sm">Create your first team above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {/* Logo / color swatch */}
                  {team.logoCloudinaryId ? (
                    <Image
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_48,h_48,f_webp/${team.logoCloudinaryId}`}
                      alt={team.name}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex gap-1">
                      <div className="w-4 h-10 rounded" style={{ backgroundColor: team.primaryColor }} />
                      <div className="w-4 h-10 rounded" style={{ backgroundColor: team.secondaryColor }} />
                    </div>
                  )}
                  <div>
                    <p className="font-stats font-semibold text-white">{team.name}</p>
                    <p className="font-display text-lg tracking-wider" style={{ color: team.primaryColor }}>
                      {team.shortCode}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAuthed && (
                    <CloudinaryUpload
                      label="Upload Logo"
                      preset="team-logo"
                      onUploaded={async (publicId) => {
                        await fetch(`/api/teams/${team.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ logoCloudinaryId: publicId }),
                        })
                        await loadTeams()
                      }}
                    />
                  )}
                  <Link
                    href={`/admin/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}`}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Manage Players
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
