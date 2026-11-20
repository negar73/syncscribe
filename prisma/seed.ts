/**
 * Database seed.
 *
 * Creates the demo accounts and one sample document ("Welcome to
 * SyncScribe") whose initial content is a real Yjs snapshot — so the editor
 * opens with something to play with immediately.
 *
 * Idempotent: safe to run multiple times.
 *
 *   npm run db:seed
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as Y from 'yjs'

import { hslColorFromSeed } from '../src/lib/colors'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'demo1234'

const DEMO_USERS = [
  { email: 'demo@syncscribe.dev', name: 'Demo User' },
  { email: 'mara@syncscribe.dev', name: 'Mara Tanaka' },
]

// ── Yjs helpers (ProseMirror-shaped XML nodes) ──────────────────────────────

function xmlText(content: string, marks: Record<string, Record<string, unknown>> = {}): Y.XmlText {
  const t = new Y.XmlText()
  t.insert(0, content, marks)
  return t
}

function paragraph(children: Array<Y.XmlText>): Y.XmlElement {
  const p = new Y.XmlElement('paragraph')
  p.insert(0, children)
  return p
}

function heading(level: 1 | 2, content: string): Y.XmlElement {
  const h = new Y.XmlElement('heading')
  h.setAttribute('level', String(level))
  h.insert(0, [xmlText(content)])
  return h
}

function bulletList(items: Array<string>): Y.XmlElement {
  const ul = new Y.XmlElement('bulletList')
  for (const item of items) {
    const li = new Y.XmlElement('listItem')
    li.insert(0, [paragraph([xmlText(item)])])
    ul.insert(ul.length, [li])
  }
  return ul
}

/**
 * Builds the initial document content as a binary Yjs update, exactly like
 * the WebSocket server persists it. The TipTap Collaboration extension binds
 * to the `default` XmlFragment of the Y.Doc.
 */
function buildWelcomeSnapshot(): Buffer {
  const ydoc = new Y.Doc()
  const fragment = ydoc.getXmlFragment('default')

  fragment.insert(fragment.length, [
    heading(1, 'Welcome to SyncScribe'),
    paragraph([
      xmlText('This document is '),
      xmlText('live', { bold: {} }),
      xmlText(
        '. Open it in a second browser window, sign in as mara@syncscribe.dev (password: demo1234), and watch edits and cursors sync instantly in both windows.',
      ),
    ]),
    heading(2, 'Try it'),
    bulletList([
      'Type anywhere in the document — every keystroke is merged on all connected clients.',
      'Click the Share button to invite someone as an editor or a read-only viewer.',
      'Move your mouse around: colored cursors and name labels are live presence, not animation.',
    ]),
    heading(2, 'Under the hood'),
    bulletList([
      'Yjs CRDTs merge concurrent edits with no central lock, so nobody can ever overwrite anybody.',
      'A dedicated WebSocket server authenticates every connection with a JWT and enforces document roles.',
      'Every ten seconds the server persists a binary snapshot to PostgreSQL, so your work survives restarts.',
    ]),
    paragraph([xmlText('Happy writing!')]),
  ])

  return Buffer.from(Y.encodeStateAsUpdate(ydoc))
}

async function seedUsers(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        color: hslColorFromSeed(user.email),
      },
    })
  }
  console.log(`Seeded ${DEMO_USERS.length} demo users (password: ${DEMO_PASSWORD})`)
}

async function seedWelcomeDocument(demoUserId: string): Promise<void> {
  const existing = await prisma.document.findFirst({
    where: { ownerId: demoUserId, title: 'Welcome to SyncScribe' },
  })
  if (existing) {
    console.log('Welcome document already exists — skipping')
    return
  }

  const document = await prisma.document.create({
    data: { title: 'Welcome to SyncScribe', ownerId: demoUserId },
  })
  await prisma.documentCollaborator.create({
    data: { documentId: document.id, userId: demoUserId, role: 'OWNER' },
  })
  await prisma.documentSnapshot.create({
    data: { documentId: document.id, state: new Uint8Array(buildWelcomeSnapshot()), version: 1 },
  })
  console.log(`Seeded document "Welcome to SyncScribe" (${document.id})`)
}

async function main(): Promise<void> {
  await seedUsers()
  const demo = await prisma.user.findUniqueOrThrow({ where: { email: 'demo@syncscribe.dev' } })
  await seedWelcomeDocument(demo.id)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
