/**
 * GET /api/auth/me — returns the signed-in user, or 401 for anonymous
 * visitors. Used by the app shell and client-side route guards.
 */

import { NextResponse } from 'next/server'

import { errorResponse, HttpError } from '@/lib/api-helpers'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new HttpError(401, 'Not signed in.')
    return NextResponse.json({ user })
  } catch (error) {
    return errorResponse(error)
  }
}
