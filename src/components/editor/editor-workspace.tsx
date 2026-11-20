'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileWarning } from 'lucide-react'

import { CollaborativeEditor } from '@/components/editor/collaborative-editor'
import { useUser } from '@/components/user-provider'
import { ButtonLink } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { ApiError, apiFetch } from '@/lib/api-client'
import type { DocumentDetail } from '@/types'

/**
 * Client bootstrap for the editor page:
 *  1. loads the document metadata (title + caller's role), and
 *  2. exchanges the httpOnly session cookie for the raw JWT that the
 *     WebSocket upgrade needs (?token= — see /api/auth/token).
 * Only when both succeed does the collaborative editor (and its socket)
 * mount.
 */
export function EditorWorkspace({ documentId }: { documentId: string }) {
  const user = useUser()
  const router = useRouter()
  const [detail, setDetail] = useState<DocumentDetail | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        const [documentData, tokenData] = await Promise.all([
          apiFetch<{ document: DocumentDetail }>(`/api/documents/${documentId}`),
          apiFetch<{ token: string }>('/api/auth/token'),
        ])
        if (cancelled) return
        setDetail(documentData.document)
        setToken(tokenData.token)
      } catch (bootstrapError) {
        if (cancelled) return
        if (bootstrapError instanceof ApiError && bootstrapError.status === 401) {
          router.replace('/login')
          return
        }
        setError(
          bootstrapError instanceof Error
            ? bootstrapError.message
            : 'This document does not exist, or you do not have access to it.',
        )
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [documentId, router])

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
          <FileWarning className="mx-auto size-8 text-muted-foreground/70" aria-hidden />
          <h1 className="mt-4 font-semibold">Cannot open this document</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <ButtonLink href="/docs" variant="outline" size="sm" className="mt-5">
            Back to documents
          </ButtonLink>
        </div>
      </main>
    )
  }

  if (!detail || !token) {
    return <PageSpinner label="Opening document…" />
  }

  return <CollaborativeEditor key={detail.id} document={detail} token={token} user={user} />
}
