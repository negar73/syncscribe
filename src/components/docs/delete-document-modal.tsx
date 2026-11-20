'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api-client'
import type { DocumentListItem } from '@/types'

export interface DeleteDocumentModalProps {
  /** Document pending deletion, or null when the modal is closed. */
  document: DocumentListItem | null
  onClose: () => void
  onDeleted: (id: string) => void
}

/** Owner-only destructive confirmation for permanent document deletion. */
export function DeleteDocumentModal({ document, onClose, onDeleted }: DeleteDocumentModalProps) {
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    if (!document) return
    setDeleting(true)
    try {
      await apiFetch(`/api/documents/${document.id}`, { method: 'DELETE' })
      toast.success('Document deleted', `“${document.title}” is gone for good.`)
      onDeleted(document.id)
      onClose()
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : undefined)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={document !== null}
      onClose={onClose}
      title="Delete document?"
      description="This permanently removes the document, its snapshots and everyone's access. It cannot be undone."
    >
      <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">{document?.title}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onDelete} disabled={deleting}>
          {deleting ? <Spinner /> : null}
          {deleting ? 'Deleting…' : 'Delete permanently'}
        </Button>
      </div>
    </Modal>
  )
}
