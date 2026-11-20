'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api-client'
import { createDocumentSchema, fieldErrors } from '@/lib/validation'

export interface CreateDocumentModalProps {
  open: boolean
  onClose: () => void
  /** Receives the freshly created document (caller usually navigates to it). */
  onCreated: (document: { id: string; title: string }) => void
}

export function CreateDocumentModal({ open, onClose, onCreated }: CreateDocumentModalProps) {
  const [title, setTitle] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = createDocumentSchema.safeParse({ title })
    if (!parsed.success) {
      setFieldError(fieldErrors(parsed.error).title ?? 'Invalid title')
      return
    }
    setFieldError(null)
    setSubmitting(true)
    try {
      const data = await apiFetch<{ document: { id: string; title: string } }>('/api/documents', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      })
      toast.success('Document created', `“${data.document.title}” is ready.`)
      setTitle('')
      onClose()
      onCreated(data.document)
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'Could not create the document.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New document"
      description="You become the owner and can invite collaborators afterwards."
    >
      <form onSubmit={onSubmit} noValidate>
        <Label htmlFor="document-title">Title</Label>
        <Input
          id="document-title"
          placeholder="Untitled document"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          invalid={Boolean(fieldError)}
          autoFocus
          maxLength={120}
        />
        <FieldError message={fieldError ?? undefined} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            {submitting ? 'Creating…' : 'Create document'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
