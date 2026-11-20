/**
 * /api/documents/[id]/collaborators
 *
 * GET    — list collaborators (any collaborator can see who has access).
 * POST   — add a collaborator by email + role (OWNER only).
 * PATCH  — change a collaborator's role (OWNER only; OWNER itself is not an
 *          assignable role — ownership transfer is on the roadmap).
 * DELETE — remove a collaborator via ?userId= (OWNER only; the owner row is
 *          protected because it backs the permission model).
 */

import { NextResponse } from 'next/server'

import { requireDocumentRole } from '@/lib/access'
import { errorResponse, HttpError, parseBody, requireUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { addCollaboratorSchema, updateCollaboratorSchema } from '@/lib/validation'
import type { CollaboratorDTO } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }

const roleWeight: Record<string, number> = { OWNER: 0, EDITOR: 1, VIEWER: 2 }

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await requireUser()
    await requireDocumentRole(id, user.id, ['OWNER', 'EDITOR', 'VIEWER'])

    const rows = await prisma.documentCollaborator.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, name: true, email: true, color: true } } },
    })

    const collaborators: CollaboratorDTO[] = rows
      .map((row) => ({
        userId: row.user.id,
        name: row.user.name,
        email: row.user.email,
        color: row.user.color,
        role: row.role,
        joinedAt: row.createdAt.toISOString(),
      }))
      .sort(
        (a, b) =>
          roleWeight[a.role] - roleWeight[b.role] || a.joinedAt.localeCompare(b.joinedAt),
      )

    return NextResponse.json({ collaborators })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await requireUser()
    await requireDocumentRole(id, user.id, ['OWNER'])

    const input = await parseBody(addCollaboratorSchema, request)

    const target = await prisma.user.findUnique({ where: { email: input.email } })
    if (!target) {
      throw new HttpError(404, 'No SyncScribe account uses that email yet. Ask them to sign up first.')
    }

    const document = await prisma.document.findUnique({
      where: { id },
      select: { ownerId: true },
    })
    if (!document) throw new HttpError(404, 'Document not found.')
    if (target.id === document.ownerId) {
      throw new HttpError(400, `${target.name} already owns this document.`)
    }

    const existing = await prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId: id, userId: target.id } },
    })
    if (existing) {
      throw new HttpError(409, `${target.name} already has access to this document.`)
    }

    await prisma.documentCollaborator.create({
      data: { documentId: id, userId: target.id, role: input.role },
    })

    const collaborator: CollaboratorDTO = {
      userId: target.id,
      name: target.name,
      email: target.email,
      color: target.color,
      role: input.role,
      joinedAt: new Date().toISOString(),
    }
    return NextResponse.json({ collaborator }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await requireUser()
    await requireDocumentRole(id, user.id, ['OWNER'])

    const input = await parseBody(updateCollaboratorSchema, request)

    const existing = await prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId: id, userId: input.userId } },
      include: { user: { select: { name: true } } },
    })
    if (!existing) throw new HttpError(404, 'That user is not a collaborator on this document.')

    const updated = await prisma.documentCollaborator.update({
      where: { documentId_userId: { documentId: id, userId: input.userId } },
      data: { role: input.role },
      include: { user: { select: { id: true, name: true, email: true, color: true } } },
    })

    const collaborator: CollaboratorDTO = {
      userId: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      color: updated.user.color,
      role: updated.role,
      joinedAt: updated.createdAt.toISOString(),
    }
    return NextResponse.json({ collaborator })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await requireUser()
    await requireDocumentRole(id, user.id, ['OWNER'])

    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) throw new HttpError(400, 'Missing ?userId= query parameter.')

    const document = await prisma.document.findUnique({
      where: { id },
      select: { ownerId: true },
    })
    if (!document) throw new HttpError(404, 'Document not found.')
    if (userId === document.ownerId) {
      throw new HttpError(400, 'The document owner cannot be removed. Delete the document instead.')
    }

    const existing = await prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId: id, userId } },
    })
    if (!existing) throw new HttpError(404, 'That user is not a collaborator on this document.')

    await prisma.documentCollaborator.delete({
      where: { documentId_userId: { documentId: id, userId } },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
