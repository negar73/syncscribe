/**
 * Session helpers for Next.js route handlers and server components.
 *
 * The session is a JWT (src/lib/jwt.ts) stored in an httpOnly, SameSite=Lax
 * cookie. `getCurrentUser()` verifies the token and re-reads the user from
 * Postgres, so revoked or deleted accounts stop working immediately even
 * while their token is still unexpired.
 */

import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

import { prisma } from './db'
import { verifySessionToken } from './jwt'

export const SESSION_COOKIE = 'syncscribe_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export interface CurrentUser {
  id: string
  email: string
  name: string
  color: string
  createdAt: Date
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  color: true,
  createdAt: true,
} as const

/** Resolves the signed-in user, or null for anonymous visitors. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const claims = await verifySessionToken(token)
  if (!claims) return null

  return prisma.user.findUnique({
    where: { id: claims.userId },
    select: userSelect,
  })
}

/**
 * Cookie options used by the auth route handlers. Kept here so login,
 * register and logout stay perfectly symmetric.
 */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

/** Convenience wrapper: set the session cookie on a fresh response. */
export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return response
}

/** Convenience wrapper: clear the session cookie on a fresh response. */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}
