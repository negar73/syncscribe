'use client'

import { useEffect, useState } from 'react'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { ButtonLink } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/avatar'
import { apiFetch } from '@/lib/api-client'
import type { UserDTO } from '@/types'

/**
 * Landing page header. Shows dashboard-aware actions once the session probe
 * (/api/auth/me) resolves; stays neutral while loading to avoid flicker.
 */
export function SiteHeader() {
  // undefined = still checking, null = anonymous, UserDTO = signed in.
  const [user, setUser] = useState<UserDTO | null | undefined>(undefined)

  useEffect(() => {
    apiFetch<{ user: UserDTO }>('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user === undefined ? (
            <div className="h-10 w-40" aria-hidden />
          ) : user ? (
            <>
              <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                <UserAvatar name={user.name} color={user.color} size="xs" />
                {user.name}
              </span>
              <ButtonLink href="/docs" size="sm">
                Open documents
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Get started
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
