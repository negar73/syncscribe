/**
 * GET /api/auth/token — hands the caller its own session JWT so the browser
 * can attach it to the WebSocket upgrade request (`?token=`).
 *
 * Why this exists: the session lives in an httpOnly cookie (invisible to
 * JavaScript by design), but the WebSocket server runs as a separate
 * process/port, so the handshake needs the token as an explicit query
 * parameter. This endpoint is authenticated — only the legitimate session
 * holder can read the token back.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { errorResponse, HttpError, requireUser } from '@/lib/api-helpers'
import { SESSION_COOKIE } from '@/lib/auth'

export async function GET() {
  try {
    await requireUser()
    const token = (await cookies()).get(SESSION_COOKIE)?.value
    if (!token) throw new HttpError(401, 'Not signed in.')
    return NextResponse.json({ token })
  } catch (error) {
    return errorResponse(error)
  }
}
