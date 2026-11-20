/**
 * /api/documents/[id]
 *
 * GET    — document metadata (any collaborator role).
 * PATCH  — rename (OWNER or EDITOR; viewers are read-only by design).
 * DELETE — permanently delete the document (OWNER only; collaborators and
 *          snapshots cascade in Postgres).
 */

import { NextResponse } from 'next/server'

import { requireDocumentRole } from '@/lib/access'
import { errorResponse, HttpError, parseBody, requireUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { updateDocumentSchema } from '@/lib/validation'
import type { DocumentDetail } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await requireUser()
    const role = await requireDocumentRole(id, user.id, ['OWNER', 'EDITOR', 'VIEWER'])

    const document = await prisma.document.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, color: true } } },
    })
    if (!document) throw new HttpError(404, 'Document not found.')

    const detail: DocumentDetail = {
      id: document.id,
      title: document.title,
      ownerId: document.ownerId,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      owner: document.owner,
      myRole: role,
    }
    return NextResponse.json({ document: detail })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await requireUser()
    await requireDocumentRole(id, user.id, ['OWNER', 'EDITOR'])

    const { title } = await parseBody(updateDocumentSchema, request)
    const document = await prisma.document.update({
      where: { id },
      data: { title },
      select: { id: true, title: true, updatedAt: true },
    })
    return NextResponse.json({
      document: { ...document, updatedAt: document.updatedAt.toISOString() },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await requireUser()
    await requireDocumentRole(id, user.id, ['OWNER'])

    await prisma.document.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
