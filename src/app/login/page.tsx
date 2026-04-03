'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

const LOGO_URL = 'https://res.cloudinary.com/diitsd6nz/image/upload/v1760794476/ProSteam_logo_h9pb8b.png'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid username or password')
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-gray-800 bg-gray-900/90 p-8 space-y-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      <div className="space-y-1">
        <h2 className="font-stats text-lg font-semibold text-gray-200">Operator Login</h2>
        <p className="font-stats text-xs uppercase tracking-[0.2em] text-gray-500">Admin and operator access</p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-stats text-red-300">{error}</p>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-stats text-gray-400">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white font-body focus:outline-none focus:border-primary"
          autoComplete="username"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-stats text-gray-400">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white font-body focus:outline-none focus:border-primary"
          autoComplete="current-password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary py-3 text-white font-stats font-semibold transition-colors hover:bg-indigo-600 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.22),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_32%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
            <img
              src={LOGO_URL}
              alt="ProStream"
              className="relative z-10 h-20 w-20 object-contain"
            />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="font-display text-5xl leading-none tracking-tight">
              <span className="text-primary">Pro</span>
              <span className="text-secondary">Stream</span>
            </h1>
            <span className="mt-2 font-stats text-[0.72rem] font-bold uppercase tracking-[0.35em] text-gray-500">
              Scoreboard
            </span>
          </div>
        </div>
        <Suspense fallback={<div className="h-64 bg-gray-900 rounded-xl border border-gray-800" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
