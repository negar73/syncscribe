'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Trash2, UserPlus } from 'lucide-react'

import { UserAvatar } from '@/components/ui/avatar'
import { Badge, RoleBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api-client'
import type { CollaboratorDTO, Role } from '@/types'

/**
 * Share dialog: invite people by email (owner), inspect who has access and
 * change/remove roles (owner). Read-only viewers can open the dialog to copy
 * the link and see the roster.
 */
export function ShareModal({
  open,
  onClose,
  documentId,
  myRole,
}: {
  open: boolean
  onClose: () => void
  documentId: string
  myRole: Role
}) {
  const canManage = myRole === 'OWNER'

  const [collaborators, setCollaborators] = useState<CollaboratorDTO[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!open) return
    setLoadError(null)
    try {
      const data = await apiFetch<{ collaborators: CollaboratorDTO[] }>(
        `/api/documents/${documentId}/collaborators`,
      )
      setCollaborators(data.collaborators)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load collaborators.')
    }
  }, [documentId, open])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (open) setShareUrl(window.location.href)
    else setCopied(false)
  }, [open])

  async function addCollaborator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const data = await apiFetch<{ collaborator: CollaboratorDTO }>(
        `/api/documents/${documentId}/collaborators`,
        { method: 'POST', body: JSON.stringify({ email, role }) },
      )
      setCollaborators((current) =>
        current
          ? [...current, data.collaborator].sort(
              (a, b) => roleWeight(a.role) - roleWeight(b.role),
            )
          : [data.collaborator],
      )
      setEmail('')
      toast.success('Invitation added', `${data.collaborator.name} can now open this document.`)
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Could not add this person.')
    } finally {
      setAdding(false)
    }
  }

  async function changeRole(userId: string, nextRole: Role) {
    try {
      const data = await apiFetch<{ collaborator: CollaboratorDTO }>(
        `/api/documents/${documentId}/collaborators`,
        { method: 'PATCH', body: JSON.stringify({ userId, role: nextRole }) },
      )
      setCollaborators((current) =>
        current?.map((person) => (person.userId === userId ? data.collaborator : person)) ?? null,
      )
      toast.success('Role updated')
    } catch (error) {
      toast.error('Role change failed', error instanceof Error ? error.message : undefined)
      void load()
    }
  }

  async function removeCollaborator(person: CollaboratorDTO) {
    try {
      await apiFetch(`/api/documents/${documentId}/collaborators?userId=${person.userId}`, {
        method: 'DELETE',
      })
      setCollaborators((current) => current?.filter((row) => row.userId !== person.userId) ?? null)
      toast.success('Access removed', `${person.name} can no longer open this document.`)
    } catch (error) {
      toast.error('Removal failed', error instanceof Error ? error.message : undefined)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed', 'Select the link and copy it manually.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share this document"
      description="Everyone with access sees edits and cursors in real time."
    >
      {/* Copy link */}
      <div className="flex items-center gap-2">
        <Input value={shareUrl} readOnly aria-label="Share link" className="text-xs" />
        <Button variant="outline" size="md" onClick={copyLink} className="shrink-0">
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {/* Add collaborator (owner only) */}
      {canManage ? (
        <form onSubmit={addCollaborator} noValidate className="mt-5 rounded-xl border p-4">
          <Label htmlFor="share-email" className="mb-2">
            Add people by email
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="share-email"
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              invalid={Boolean(addError)}
              className="flex-1"
            />
            <Select
              aria-label="Role for the new collaborator"
              value={role}
              onChange={(event) => setRole(event.target.value as 'EDITOR' | 'VIEWER')}
              className="sm:w-36"
            >
              <option value="EDITOR">Can edit</option>
              <option value="VIEWER">Can view</option>
            </Select>
            <Button type="submit" disabled={adding} className="shrink-0">
              {adding ? <Spinner /> : <UserPlus aria-hidden />}
              Add
            </Button>
          </div>
          <FieldError message={addError ?? undefined} />
          <p className="mt-2 text-xs text-muted-foreground">
            They need a SyncScribe account — use mara@syncscribe.dev in the demo.
          </p>
        </form>
      ) : null}

      {/* Roster */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">People with access</p>
        {collaborators === null && !loadError ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Spinner /> Loading…
          </div>
        ) : loadError ? (
          <p role="alert" className="py-2 text-sm text-destructive">
            {loadError}
          </p>
        ) : (
          <ul className="max-h-64 divide-y overflow-y-auto rounded-xl border">
            {collaborators?.map((person) => (
              <li key={person.userId} className="flex items-center gap-3 px-3 py-2.5">
                <UserAvatar name={person.name} color={person.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {person.name}
                    {person.role === 'OWNER' ? (
                      <Badge variant="owner" className="ml-2">
                        Owner
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                </div>
                {canManage && person.role !== 'OWNER' ? (
                  <>
                    <Select
                      aria-label={`Role for ${person.name}`}
                      value={person.role}
                      onChange={(event) => void changeRole(person.userId, event.target.value as Role)}
                      className="h-9 w-32 text-xs"
                    >
                      <option value="EDITOR">Can edit</option>
                      <option value="VIEWER">Can view</option>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void removeCollaborator(person)}
                      aria-label={`Remove ${person.name}`}
                      title={`Remove ${person.name}`}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </>
                ) : (
                  <RoleBadge role={person.role} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function roleWeight(role: Role): number {
  return role === 'OWNER' ? 0 : role === 'EDITOR' ? 1 : 2
}
