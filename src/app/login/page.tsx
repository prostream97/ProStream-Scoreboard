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
      <div className="space-y-1">
        <p className="app-kicker">Secure access</p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Operator login</h2>
        <p className="text-sm text-slate-500">Admin and operator access for scoring, overlays, and tournament control.</p>
      </div>

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
        <section className="hidden rounded-[2.25rem] border border-white/70 bg-white/72 p-10 shadow-[0_28px_80px_rgba(26,36,32,0.12)] backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <p className="app-kicker">Figma-informed redesign</p>
            <div className="space-y-3">
              <h1 className="text-6xl font-semibold leading-[0.95] tracking-[-0.06em] text-slate-950">
                Live scoring and streaming control in one responsive workspace.
              </h1>
              <p className="max-w-xl text-base text-slate-600">
                The new shell borrows the mobile cricket app language: dark navigation, bright green actions, lighter data cards, and clearer mobile-first hierarchy.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Score', 'Operator-friendly control room'],
              ['Overlay', 'Fast link generation for broadcast'],
              ['Viewer', 'Cleaner live scorecard on mobile'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[1.5rem] border border-[#d7ddd6] bg-[#f8faf7] p-4">
                <p className="text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-[#17b45b]/20 blur-2xl" />
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_18px_45px_rgba(26,36,32,0.12)]">
                <img
                  src={LOGO_URL}
                  alt="ProStream"
                  className="relative z-10 h-14 w-14 object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="app-kicker">Broadcast scoreboard</p>
              <h1 className="mt-2 text-5xl font-semibold leading-none tracking-[-0.06em] text-slate-950">
                ProStream
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
