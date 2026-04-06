import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

export const appInputClass =
  'h-11 w-full rounded-2xl border border-[#d7ddd6] bg-white px-4 text-sm text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#17b45b] focus:ring-4 focus:ring-[#17b45b]/12'

export const appTextareaClass =
  'w-full rounded-2xl border border-[#d7ddd6] bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#17b45b] focus:ring-4 focus:ring-[#17b45b]/12'

export const appLabelClass =
  'mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.24em] text-slate-500'

type AppPageProps = {
  children: ReactNode
  className?: string
}

export function AppPage({ children, className }: AppPageProps) {
  return <main className={cn('app-page', className)}>{children}</main>
}

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        'app-hero-card flex flex-col gap-5 rounded-[2rem] p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? <p className="app-kicker">{eyebrow}</p> : null}
        <div className="space-y-1.5">
          <h1 className="app-hero-title">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-slate-600 sm:text-[0.95rem]">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </section>
  )
}

type SurfaceCardProps = {
  children: ReactNode
  className?: string
}

export function SurfaceCard({ children, className }: SurfaceCardProps) {
  return <section className={cn('app-panel', className)}>{children}</section>
}

type SectionTitleProps = {
  title: string
  eyebrow?: string
  description?: string
  action?: ReactNode
  className?: string
}

export function SectionTitle({
  title,
  eyebrow,
  description,
  action,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1">
        {eyebrow ? <p className="app-kicker">{eyebrow}</p> : null}
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{title}</h2>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

type AppButtonProps = {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function AppButton({
  children,
  href,
  variant = 'primary',
  className,
  ...props
}: AppButtonProps) {
  const styles = {
    primary:
      'border-transparent bg-[#17b45b] text-white shadow-[0_14px_30px_rgba(23,180,91,0.24)] hover:bg-[#10994c]',
    secondary:
      'border-[#d7ddd6] bg-white text-slate-900 hover:bg-[#f4f7f2]',
    ghost:
      'border-transparent bg-transparent text-slate-600 hover:bg-white/80 hover:text-slate-900',
    danger:
      'border-transparent bg-[#d44d4d] text-white hover:bg-[#be3f3f]',
  } as const

  const base =
    'inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45'

  if (href) {
    return (
      <Link href={href} className={cn(base, styles[variant], className)}>
        {children}
      </Link>
    )
  }

  return (
    <button {...props} className={cn(base, styles[variant], className)}>
      {children}
    </button>
  )
}

type AppBadgeProps = {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue'
  className?: string
}

export function AppBadge({ children, tone = 'neutral', className }: AppBadgeProps) {
  const tones = {
    neutral: 'bg-[#f3f5f1] text-slate-600 border-[#dde3dc]',
    green: 'bg-[#e8f7ee] text-[#10994c] border-[#c6ead4]',
    amber: 'bg-[#fff5e7] text-[#c98010] border-[#f5ddb0]',
    red: 'bg-[#ffeceb] text-[#c54e4c] border-[#f4c3c1]',
    blue: 'bg-[#ebf5ff] text-[#2d6fb0] border-[#c7ddf5]',
  } as const

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-[#d7ddd6] bg-white/75 px-6 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
