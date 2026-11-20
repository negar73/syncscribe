/**
 * /api/documents
 *
 * GET  — list documents the caller owns or collaborates on, with owner info,
 *        collaborator count and the caller's own role on each.
 * POST — create a document. An OWNER collaborator row is created atomically,
 *        which is the invariant all permission checks rely on.
 */

import { NextResponse } from 'next/server'

import { errorResponse, parseBody, requireUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { createDocumentSchema } from '@/lib/validation'
import type { DocumentListItem, Role } from '@/types'

const documentInclude = {
  owner: { select: { id: true, name: true, color: true } },
  _count: { select: { collaborators: true } },
} as const

interface DocumentWithMeta {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  owner: { id: string; name: string; color: string }
  _count: { collaborators: number }
}

function toListItem(document: DocumentWithMeta, myRole: Role): DocumentListItem {
  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    owner: document.owner,
    collaboratorCount: document._count.collaborators,
    myRole,
  }
}

export async function GET() {
  try {
    const user = await requireUser()

    const [owned, shared] = await Promise.all([
      prisma.document.findMany({
        where: { collaborators: { some: { userId: user.id, role: 'OWNER' } } },
        include: documentInclude,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.documentCollaborator.findMany({
        where: { userId: user.id, role: { not: 'OWNER' } },
        include: { document: { include: documentInclude } },
      }),
    ])

    const documents: DocumentListItem[] = [
      ...owned.map((document) => toListItem(document, 'OWNER')),
      ...shared.map((collaboration) => toListItem(collaboration.document, collaboration.role)),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return NextResponse.json({ documents })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const { title } = await parseBody(createDocumentSchema, request)

    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: { title, ownerId: user.id },
      })
      await tx.documentCollaborator.create({
        data: { documentId: created.id, userId: user.id, role: 'OWNER' },
      })
      return created
    })

    return NextResponse.json(
      { document: { id: document.id, title: document.title } },
      { status: 201 },
    )
  } catch (error) {
    return errorResponse(error)
  }
}


