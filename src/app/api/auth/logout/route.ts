/**
 * POST /api/auth/logout — clears the session cookie.
 */

import { NextResponse } from 'next/server'

import { errorResponse } from '@/lib/api-helpers'
import { clearSessionCookie } from '@/lib/auth'

export async function POST() {
  try {
    return clearSessionCookie(NextResponse.json({ ok: true }))
  } catch (error) {
    return errorResponse(error)
  }
}
