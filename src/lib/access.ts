/**
 * Document access control.
 *
 * A single query on the @@unique([documentId, userId]) index resolves the
 * caller's role. Routes treat "no row" as 404 to avoid leaking the existence
 * of documents the caller cannot see.
 */

import { prisma } from './db'
import type { Role } from '@prisma/client'

export type { Role }

export async function getDocumentRole(documentId: string, userId: string): Promise<Role | null> {
  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId, userId } },
    select: { role: true },
  })
  return collaborator?.role ?? null
}

export class AccessError extends Error {
  constructor(
    public readonly status: 403 | 404,
    message: string,
  ) {
    super(message)
    this.name = 'AccessError'
  }
}

/**
 * Resolves the caller's role or throws. `required` is an allow-list of roles;
 * `OwnershipError`-style messaging distinguishes "not visible" (404) from
 * "visible but not allowed" (403).
 */
export async function requireDocumentRole(
  documentId: string,
  userId: string,
  required: Array<Role>,
): Promise<Role> {
  const role = await getDocumentRole(documentId, userId)
  if (!role) {
    throw new AccessError(404, 'Document not found, or you do not have access to it.')
  }
  if (!required.includes(role)) {
    throw new AccessError(403, 'You do not have permission to do that.')
  }
  return role
}
