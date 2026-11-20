/**
 * JWT session tokens (jose, HS256).
 *
 * One token type serves both transports:
 *   - the Next.js httpOnly session cookie (REST requests), and
 *   - the `?token=` query parameter the browser attaches to the WebSocket
 *     handshake, because the browser cannot read its own httpOnly cookie
 *     from JavaScript to forward it to the ws server.
 *
 * This module is intentionally framework-free (no `next/*` imports) so it can
 * be shared between Next.js route handlers and server/ws-server.ts.
 */

import { SignJWT, jwtVerify } from 'jose'

const JWT_ISSUER = 'syncscribe'
const JWT_AUDIENCE = 'syncscribe-app'
const TOKEN_TTL = '7d'

const DEV_FALLBACK_SECRET = 'syncscribe-dev-secret-do-not-use-in-production'

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[auth] JWT_SECRET is not set — falling back to an insecure development secret. Set JWT_SECRET before deploying!',
      )
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET)
  }
  return new TextEncoder().encode(secret)
}

export interface SessionClaims {
  userId: string
  email: string
  name: string
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    if (!payload.sub) return null
    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
    }
  } catch {
    return null
  }
}
