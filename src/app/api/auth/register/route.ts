/**
 * POST /api/auth/register
 *
 * Creates an account (bcrypt-hashed password), signs a JWT session and sets
 * the httpOnly cookie. A deterministic HSL color is derived from the email
 * so presence cursors and avatars have a stable color for the account.
 */

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { errorResponse, HttpError, parseBody } from '@/lib/api-helpers'
import { attachSessionCookie } from '@/lib/auth'
import { hslColorFromSeed } from '@/lib/colors'
import { prisma } from '@/lib/db'
import { signSessionToken } from '@/lib/jwt'
import { registerSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const input = await parseBody(registerSchema, request)

    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new HttpError(409, 'An account with this email already exists. Try signing in instead.')
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        color: hslColorFromSeed(input.email),
      },
      select: { id: true, email: true, name: true, color: true },
    })

    const token = await signSessionToken({ userId: user.id, email: user.email, name: user.name })
    return attachSessionCookie(NextResponse.json({ user }, { status: 201 }), token)
  } catch (error) {
    return errorResponse(error)
  }
}
