/**
 * Server-side plumbing for the REST route handlers: a tiny HttpError type,
 * zod body parsing and a central error → response mapper so every endpoint
 * returns consistent `{ error }` JSON.
 */

import { NextResponse } from 'next/server'
import type { ZodType } from 'zod'

import { AccessError } from './access'
import { getCurrentUser, type CurrentUser } from './auth'

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/** Route-handler guard: 401 unless a valid session cookie is present. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new HttpError(401, 'You need to sign in to do that.')
  return user
}

/** Validates a JSON request body against a zod schema. */
export async function parseBody<S extends ZodType>(
  schema: S,
  request: Request,
): Promise<ReturnType<S['parse']>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.')
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    const prefix = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    throw new HttpError(400, `${prefix}${issue?.message ?? 'Invalid input.'}`)
  }
  return result.data as ReturnType<S['parse']>
}

/** Maps thrown errors to consistent JSON responses. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[api] unexpected error:', error)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}
