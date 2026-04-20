'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppButton, appInputClass } from '@/components/shared/AppPrimitives'

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
      className="rounded-[2rem] border border-[#d7ddd6] bg-white/95 p-8 shadow-[0_24px_80px_rgba(26,36,32,0.14)] backdrop-blur-xl"
    >
      <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950">Login</h2>

      {error ? (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="mt-6 space-y-2">
        <label className="block text-sm font-medium text-slate-600">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={appInputClass}
          autoComplete="username"
          required
        />
      </div>

      <div className="mt-4 space-y-2">
        <label className="block text-sm font-medium text-slate-600">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={appInputClass}
          autoComplete="current-password"
          required
        />
      </div>

      <AppButton type="submit" disabled={loading} className="mt-6 w-full">
        {loading ? 'Signing in...' : 'Sign In'}
      </AppButton>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(23,180,91,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(47,111,223,0.12),transparent_25%)]" />
      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.85fr]">
        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <img
                src={LOGO_URL}
                alt="ProStream"
                className="h-24 w-24 object-contain"
              />
            </div>
            <div className="flex flex-col items-center">
              <h1 className="mt-2 text-5xl font-semibold leading-none tracking-[-0.06em]">
                <span style={{ color: '#4F46E5' }}>Pro</span>
                <span style={{ color: '#10B981' }}>Stream</span>
                <span className="text-black"> Scoreboard</span>
              </h1>
              <span className="mt-3 text-sm text-slate-500">
                Sign in to manage tournaments, live scoring, overlays, and operator workflows.
              </span>
            </div>
          </div>

          <Suspense fallback={<div className="h-64 rounded-[2rem] border border-[#d7ddd6] bg-white/90" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
