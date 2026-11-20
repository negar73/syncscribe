import type { ReactNode } from 'react'

import { cx } from '@/lib/utils'

export type BadgeVariant = 'neutral' | 'owner' | 'editor' | 'viewer' | 'success'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-secondary text-secondary-foreground',
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  editor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  viewer: 'bg-stone-100 text-stone-700 dark:bg-stone-400/15 dark:text-stone-300',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
}

export function Badge({
  variant = 'neutral',
  className,
  children,
}: {
  variant?: BadgeVariant
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function RoleBadge({ role }: { role: 'OWNER' | 'EDITOR' | 'VIEWER' }) {
  return <Badge variant={role.toLowerCase() as 'owner' | 'editor' | 'viewer'}>{role}</Badge>
}
