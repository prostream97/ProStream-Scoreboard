'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

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
      className="bg-gray-900 rounded-xl p-8 space-y-6 border border-gray-800"
    >
      <h2 className="font-stats text-lg text-gray-300 font-semibold">Operator Login</h2>

      {error && (
        <p className="text-red-400 text-sm font-stats">{error}</p>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-stats text-gray-400">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary"
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
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary"
          autoComplete="current-password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-indigo-600 disabled:opacity-50 text-white font-stats font-semibold py-3 rounded-lg transition-colors"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-5xl text-primary text-center tracking-wider mb-8">
          PROSTREAM
        </h1>
        <Suspense fallback={<div className="h-64 bg-gray-900 rounded-xl border border-gray-800" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
