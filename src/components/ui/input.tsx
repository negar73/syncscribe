import type { InputHTMLAttributes, ReactNode } from 'react'

import { cx } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cx(
        'flex h-10 w-full rounded-lg border bg-card px-3 py-2 text-sm shadow-sm transition-colors',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid ? 'border-destructive' : 'border-input',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export interface LabelProps {
  htmlFor?: string
  children: ReactNode
  className?: string
}

export function Label({ htmlFor, children, className }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cx('mb-1.5 block text-sm font-medium text-foreground', className)}
    >
      {children}
    </label>
  )
}

export interface FieldErrorProps {
  message?: string
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
      {message}
    </p>
  )
}
