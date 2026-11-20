import { Loader2 } from 'lucide-react'

import { cx } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('size-4 animate-spin', className)} aria-hidden />
}

export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
      <Spinner className="size-5" />
      <span className="text-sm">{label}</span>
      <span className="sr-only">{label}</span>
    </div>
  )
}
