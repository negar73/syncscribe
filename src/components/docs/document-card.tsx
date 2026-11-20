'use client'

import Link from 'next/link'
import { Trash2, Users } from 'lucide-react'

import { UserAvatar } from '@/components/ui/avatar'
import { Badge, RoleBadge } from '@/components/ui/badge'
import { timeAgo } from '@/lib/format'
import type { DocumentListItem } from '@/types'

export interface DocumentCardProps {
  document: DocumentListItem
  /** Only rendered when the caller knows the user owns the document. */
  onDelete?: () => void
}

/**
 * One document tile on the dashboard. The whole card is a link to the
 * editor; the delete control sits above the link layer and is only shown
 * for owned documents.
 */
export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  return (
    <li className="group relative rounded-2xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md">
      {onDelete && document.myRole === 'OWNER' ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${document.title}`}
          title="Delete document"
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : null}

      <Link href={`/docs/${document.id}`} className="focus-visible:outline-none">
        <h2 className="truncate pr-6 font-semibold tracking-tight group-hover:text-primary">
          {document.title}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Updated {timeAgo(document.updatedAt)}</p>
      </Link>

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <UserAvatar name={document.owner.name} color={document.owner.color} size="xs" />
          <span className="truncate">{document.owner.name}</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={`${document.collaboratorCount} collaborator${document.collaboratorCount === 1 ? '' : 's'}`}
          >
            <Users className="size-3.5" aria-hidden />
            {document.collaboratorCount}
          </span>
          <RoleBadge role={document.myRole} />
        </span>
      </div>

      {document.myRole === 'VIEWER' ? (
        <Badge variant="viewer" className="mt-3">
          Read-only
        </Badge>
      ) : null}
    </li>
  )
}
