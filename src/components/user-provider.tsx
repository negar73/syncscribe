'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

import type { UserDTO } from '@/types'

const UserContext = createContext<UserDTO | null>(null)

/**
 * Carries the authenticated user (resolved server-side by the /docs layout
 * guard) into client components — editor presence, headers, share modal.
 */
export function UserProvider({ user, children }: { user: UserDTO; children: ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser(): UserDTO {
  const user = useContext(UserContext)
  if (!user) throw new Error('useUser must be used inside a <UserProvider>.')
  return user
}
