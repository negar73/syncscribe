import Link from 'next/link'
import { PenLine } from 'lucide-react'

import { cx } from '@/lib/utils'

/** Wordmark used in headers, landing page and auth screens. */
export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        'inline-flex items-center gap-2 rounded-lg font-semibold tracking-tight text-foreground',
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <PenLine className="size-4" aria-hidden />
      </span>
      SyncScribe
    </Link>
  )
}
