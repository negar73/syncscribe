import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

import { cx } from '@/lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Visual variants are identical; `invalid` tints the border red. */
  invalid?: boolean
}

/** Styled native select — dependable, accessible, keyboard-friendly. */
export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cx(
          'flex h-10 w-full appearance-none rounded-lg border bg-card px-3 pr-9 text-sm shadow-sm transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
          'disabled:cursor-not-allowed disabled:opacity-60',
          invalid ? 'border-destructive' : 'border-input',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}
