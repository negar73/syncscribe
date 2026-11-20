'use client'

/**
 * The core of SyncScribe: a TipTap editor bound to a Y.Doc that syncs over
 * an authenticated WebSocket.
 *
 *   TipTap (ProseMirror) ⇄ Yjs CRDT (Y.Doc) ⇄ WebsocketProvider ⇄ ws-server
 *
 * - The session JWT travels as `?token=` and the room is `?docId=`; the
 *   server verifies both on upgrade and enforces the caller's role.
 * - Presence (name + deterministic color) is advertised through the
 *   awareness channel used by the collaboration-cursor extension.
 * - VIEWER connections get a read-only editor client-side, and the server
 *   additionally drops their update messages.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Share2,
  Strikethrough,
  TextQuote,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

import { PresenceAvatars } from '@/components/editor/presence-avatars'
import { ShareModal } from '@/components/editor/share-modal'
import { RoleBadge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api-client'
import { cx } from '@/lib/utils'
import type { DocumentDetail, UserDTO } from '@/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

const DEFAULT_WS_URL = 'ws://localhost:1234'

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Tracks the underlying socket state so the UI can show sync health. */
function useConnectionStatus(provider: WebsocketProvider): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  useEffect(() => {
    const onStatus = (event: { status: string }) => {
      if (event.status === 'connected') setStatus('connected')
      else if (event.status === 'connecting') setStatus('connecting')
      else setStatus('disconnected')
    }
    provider.on('status', onStatus)
    return () => {
      provider.off('status', onStatus)
    }
  }, [provider])
  return status
}

interface ToolbarState {
  bold: boolean
  italic: boolean
  strike: boolean
  heading2: boolean
  heading3: boolean
  bulletList: boolean
  orderedList: boolean
  blockquote: boolean
  code: boolean
}

/** Re-renders the toolbar when the selection/formatting changes. */
function useToolbarState(editor: Editor | null): ToolbarState {
  const [state, setState] = useState<ToolbarState>({
    bold: false,
    italic: false,
    strike: false,
    heading2: false,
    heading3: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    code: false,
  })

  useEffect(() => {
    if (!editor) return
    const update = () => {
      setState({
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        strike: editor.isActive('strike'),
        heading2: editor.isActive('heading', { level: 2 }),
        heading3: editor.isActive('heading', { level: 3 }),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        blockquote: editor.isActive('blockquote'),
        code: editor.isActive('code'),
      })
    }
    update()
    editor.on('transaction', update)
    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  return state
}

// ── Presentational pieces ────────────────────────────────────────────────────

const statusMeta: Record<ConnectionStatus, { label: string; dot: string }> = {
  connected: { label: 'Live', dot: 'bg-emerald-500' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-500 animate-pulse' },
  disconnected: { label: 'Reconnecting…', dot: 'bg-red-500 animate-pulse' },
}

function StatusPill({ status }: { status: ConnectionStatus }) {
  const meta = statusMeta[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
      title={`WebSocket connection: ${meta.label}`}
    >
      <span className={cx('size-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  )
}

interface ToolbarAction {
  icon: LucideIcon
  label: string
  active: boolean
  run: () => void
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useToolbarState(editor)
  if (!editor) return null

  const actions: ToolbarAction[] = [
    { icon: Bold, label: 'Bold', active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: 'Italic', active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    {
      icon: Strikethrough,
      label: 'Strikethrough',
      active: state.strike,
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      active: state.heading2,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      active: state.heading3,
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: List,
      label: 'Bullet list',
      active: state.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: 'Numbered list',
      active: state.orderedList,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: TextQuote,
      label: 'Quote',
      active: state.blockquote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    { icon: Code, label: 'Inline code', active: state.code, run: () => editor.chain().focus().toggleCode().run() },
  ]

  return (
    <div className="border-b bg-muted/30">
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-1 px-4 py-2 sm:px-6"
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            // Prevent the editor from losing focus when a tool is clicked.
            onMouseDown={(event) => event.preventDefault()}
            onClick={action.run}
            aria-label={action.label}
            aria-pressed={action.active}
            title={action.label}
            className={cx(
              'grid size-8 place-items-center rounded-md transition-colors hover:bg-accent',
              action.active && 'bg-primary/10 text-primary hover:bg-primary/15',
            )}
          >
            <action.icon className="size-4" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  )
}

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse space-y-3 px-6 py-10" aria-hidden>
      <div className="h-7 w-1/2 rounded bg-muted" />
      <div className="h-3 w-11/12 rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export interface CollaborativeEditorProps {
  document: DocumentDetail
  /** Raw session JWT for the WebSocket upgrade request. */
  token: string
  user: UserDTO
}

export function CollaborativeEditor({ document: doc, token, user }: CollaborativeEditorProps) {
  const canEdit = doc.myRole !== 'VIEWER'
  const [session, setSession] = useState<{ ydoc: Y.Doc; provider: WebsocketProvider } | null>(null)
  const [title, setTitle] = useState(doc.title)
  const [savedTitle, setSavedTitle] = useState(doc.title)
  const [shareOpen, setShareOpen] = useState(false)

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL

  // Create the CRDT document + socket once per document page visit.
  useEffect(() => {
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider(wsUrl, doc.id, ydoc, {
      params: { token, docId: doc.id },
    })
    setSession({ ydoc, provider })
    return () => {
      provider.destroy()
      ydoc.destroy()
    }
  }, [doc.id, token, wsUrl])

  /** Persist a renamed title on blur / Enter. */
  const commitTitle = useCallback(async () => {
    const trimmed = title.trim()
    if (trimmed.length === 0) {
      setTitle(savedTitle)
      return
    }
    if (!canEdit || trimmed === savedTitle) return
    try {
      await apiFetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: trimmed }),
      })
      setSavedTitle(trimmed)
      toast.success('Title updated')
    } catch (error) {
      setTitle(savedTitle)
      toast.error('Could not rename the document', error instanceof Error ? error.message : undefined)
    }
  }, [canEdit, doc.id, savedTitle, title])

  if (!session) {
    return (
      <main className="flex flex-1 flex-col">
        <EditorSkeleton />
      </main>
    )
  }

  return <EditorSurface session={session} doc={doc} user={user} canEdit={canEdit} title={title} setTitle={setTitle} commitTitle={commitTitle} shareOpen={shareOpen} setShareOpen={setShareOpen} />
}

interface EditorSurfaceProps {
  session: { ydoc: Y.Doc; provider: WebsocketProvider }
  doc: DocumentDetail
  user: UserDTO
  canEdit: boolean
  title: string
  setTitle: (title: string) => void
  commitTitle: () => Promise<void>
  shareOpen: boolean
  setShareOpen: (open: boolean) => void
}

function EditorSurface({
  session,
  doc,
  user,
  canEdit,
  title,
  setTitle,
  commitTitle,
  shareOpen,
  setShareOpen,
}: EditorSurfaceProps) {
  const { ydoc, provider } = session
  const status = useConnectionStatus(provider)

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: canEdit,
      editorProps: {
        attributes: {
          class: 'syncscribe-editor',
          'aria-label': 'Document content',
        },
      },
      extensions: [
        // Yjs owns undo/redo across users — the built-in history would
        // conflict with remote changes and must be disabled.
        StarterKit.configure({ history: false }),
        Placeholder.configure({ placeholder: 'Start writing…' }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({
          provider,
          user: { name: user.name, color: user.color },
        }),
      ],
    },
    [ydoc, provider],
  )

  return (
    <main className="flex flex-1 flex-col">
      {/* Document bar */}
      <div className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link
            href="/docs"
            aria-label="Back to documents"
            title="Back to documents"
            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
          >
            <ArrowLeft aria-hidden />
          </Link>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void commitTitle()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                ;(event.target as HTMLInputElement).blur()
              }
            }}
            readOnly={!canEdit}
            maxLength={120}
            aria-label="Document title"
            className={cx(
              'min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-lg font-semibold tracking-tight outline-none transition-colors',
              canEdit
                ? 'hover:border-input focus:border-input focus:bg-card'
                : 'cursor-default text-muted-foreground',
            )}
          />
          <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <StatusPill status={status} />
            <PresenceAvatars
              provider={provider}
              selfUser={{ name: user.name, color: user.color }}
            />
            <RoleBadge role={doc.myRole} />
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 aria-hidden />
              Share
            </Button>
          </span>
        </div>
      </div>

      {canEdit ? <Toolbar editor={editor} /> : null}

      {/* Paper */}
      <div className="flex-1 overflow-y-auto">
        <article className="mx-auto my-6 w-full max-w-3xl rounded-2xl border bg-card px-6 py-10 shadow-sm sm:px-12">
          {editor ? <EditorContent editor={editor} /> : <EditorSkeleton />}
        </article>
        {!canEdit ? (
          <p className="pb-6 text-center text-xs text-muted-foreground">
            You have read-only access to this document.
          </p>
        ) : null}
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={doc.id}
        myRole={doc.myRole}
      />
    </main>
  )
}
