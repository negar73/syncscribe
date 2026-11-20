'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

/**
 * Minimal accessible modal: backdrop click + Escape to close, dialog roles,
 * no portal needed (fixed positioning + z-index).
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3 top-3 text-muted-foreground"
        >
          <X aria-hidden />
        </Button>
        <h2 className="pr-8 text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
