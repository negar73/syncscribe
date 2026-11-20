import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppHeader } from '@/components/app-header'
import { UserProvider } from '@/components/user-provider'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Documents' }

/**
 * Server-side auth guard for the whole /docs area. Anonymous visitors are
 * redirected to /login before any client JS runs; everyone else gets the
 * user injected through context (used by the editor for presence).
 */
export default async function DocsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <UserProvider user={{ id: user.id, email: user.email, name: user.name, color: user.color }}>
      <div className="flex min-h-screen flex-col">
        <AppHeader user={{ id: user.id, email: user.email, name: user.name, color: user.color }} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </UserProvider>
  )
}
