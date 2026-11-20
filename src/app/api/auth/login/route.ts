/**
 * POST /api/auth/login — verifies credentials and sets the session cookie.
 */

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { errorResponse, HttpError, parseBody } from '@/lib/api-helpers'
import { attachSessionCookie } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { signSessionToken } from '@/lib/jwt'
import { loginSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const input = await parseBody(loginSchema, request)

    const user = await prisma.user.findUnique({ where: { email: input.email } })
    // Same generic message for unknown email and wrong password, so the
    // endpoint cannot be used to enumerate registered addresses.
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, 'Incorrect email or password.')
    }

    const token = await signSessionToken({ userId: user.id, email: user.email, name: user.name })
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, color: user.color },
    })
    return attachSessionCookie(response, token)
  } catch (error) {
    return errorResponse(error)
  }
}
