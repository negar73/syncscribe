import type { Metadata } from 'next'

import { EditorWorkspace } from '@/components/editor/editor-workspace'

export const metadata: Metadata = { title: 'Editor' }

export default async function DocumentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditorWorkspace documentId={id} />
}
