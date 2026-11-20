'use client'

import { useCallback, useEffect, useState } from 'react'
import { FilePlus2, RefreshCw } from 'lucide-react'

import { CreateDocumentModal } from '@/components/docs/create-document-modal'
import { DocumentCard } from '@/components/docs/document-card'
import { DeleteDocumentModal } from '@/components/docs/delete-document-modal'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { apiFetch, ApiError } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import type { DocumentListItem } from '@/types'

/**
 * Dashboard: lists every document the user owns or collaborates on, with
 * creation and (owner-only) deletion. Data is fetched client-side from
 * /api/documents so the list always reflects live permission changes.
 */
export function DocumentsDashboard() {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentListItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<DocumentListItem | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const data = await apiFetch<{ documents: DocumentListItem[] }>('/api/documents')
      setDocuments(data.documents)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace('/login')
        return
      }
      setLoadError(error instanceof Error ? error.message : 'Failed to load documents.')
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  const ownedCount = documents?.filter((doc) => doc.myRole === 'OWNER').length ?? 0

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {documents === null
              ? 'Loading your workspace…'
              : documents.length === 0
                ? 'Nothing here yet — create your first document.'
                : `${documents.length} document${documents.length === 1 ? '' : 's'} · ${ownedCount} owned by you`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh list" title="Refresh">
            <RefreshCw aria-hidden />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <FilePlus2 aria-hidden />
            New document
          </Button>
        </div>
      </div>

      {/* Content states */}
      {documents === null && loadError === null ? (
        <PageSpinner label="Loading documents…" />
      ) : loadError ? (
        <div
          role="alert"
          className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center"
        >
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : documents === null || documents.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed p-12 text-center">
          <FilePlus2 className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
          <h2 className="mt-4 font-semibold">No documents yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Create a document and invite people by email — edits, cursors and titles stay in sync
            for everyone instantly.
          </p>
          <Button className="mt-5" onClick={() => setCreateOpen(true)}>
            <FilePlus2 aria-hidden />
            Create your first document
          </Button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} onDelete={() => setPendingDelete(document)} />
          ))}
        </ul>
      )}

      {/* Modals */}
      <CreateDocumentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => router.push(`/docs/${created.id}`)}
      />
      <DeleteDocumentModal
        document={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={(id) => setDocuments((current) => current?.filter((doc) => doc.id !== id) ?? null)}
      />
    </div>
  )
}
