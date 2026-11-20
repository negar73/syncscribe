/**
 * Zod schemas for every API input — shared between the route handlers
 * (server-side validation) and the client forms (inline field errors), so
 * the two can never drift apart.
 */

import { z } from 'zod'

// ── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  email: z.email('Enter a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
})

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
})

// ── Documents ────────────────────────────────────────────────────────────────

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(120, 'Title is too long'),
})

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(120, 'Title is too long'),
})

// ── Collaborators ────────────────────────────────────────────────────────────

/** When adding or changing a collaborator, OWNER is never a valid input —
 *  ownership is fixed at creation (transfer is on the roadmap). */
export const addCollaboratorSchema = z.object({
  email: z.email('Enter a valid email address').toLowerCase(),
  role: z.enum(['EDITOR', 'VIEWER']),
})

export const updateCollaboratorSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['EDITOR', 'VIEWER']),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>

/**
 * Flattens a ZodError into `{ fieldName: firstMessage }` for inline form
 * errors.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!result[key]) result[key] = issue.message
  }
  return result
}
