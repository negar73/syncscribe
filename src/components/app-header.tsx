'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api-client'
import type { UserDTO } from '@/types'

/** App shell header for the /docs area (dashboard + editor). */
export function AppHeader({ user }: { user: UserDTO }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Sign out failed. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo href="/docs" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 rounded-full border py-1 pl-1 pr-3 sm:flex">
            <UserAvatar name={user.name} color={user.color} size="xs" />
            <span className="text-sm font-medium">{user.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut aria-hidden />
          </Button>
        </div>
      </div>
    </header>
  )
}
