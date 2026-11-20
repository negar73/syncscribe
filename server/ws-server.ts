/**
 * SyncScribe WebSocket collaboration server.
 *
 * A standalone process (`npm run ws`) that speaks the y-websocket wire
 * protocol on top of `ws` + `y-protocols`:
 *
 *   message type 0 → y-protocols/sync       (state vector exchange + live updates)
 *   message type 1 → y-protocols/awareness  (presence: cursors, names, colors)
 *
 * Security model
 *   - The upgrade request must carry `?token=<JWT>` and `?docId=<id>`.
 *   - The JWT is verified with jose (same secret/issuer/audience as the REST
 *     session), then the caller's role is loaded from Postgres.
 *   - Connections without a valid token or without a collaborator row are
 *     rejected with HTTP 401 *before* the WebSocket handshake completes.
 *   - VIEWER connections are read-only: their sync-step-2 / update messages
 *     are dropped, so they physically cannot mutate the shared document even
 *     if they tamper with the client.
 *
 * Persistence
 *   - When the first user opens a room it is hydrated from the newest
 *     DocumentSnapshot, so documents survive server restarts.
 *   - Every 10 seconds per active room the full state (Y.encodeStateAsUpdate)
 *     is written back to Postgres — plus one final save when the last
 *     participant leaves and on SIGINT/SIGTERM.
 */

import 'dotenv/config'

import http from 'node:http'

import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as Y from 'yjs'
import { WebSocketServer, type RawData, WebSocket } from 'ws'

import { prisma } from '../src/lib/db'
import { verifySessionToken } from '../src/lib/jwt'

const PORT = Number(process.env.WS_PORT ?? 1234)

/** Wire protocol message types — must match the y-websocket client. */
const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

/** How often dirty rooms are persisted to Postgres. */
const SNAPSHOT_INTERVAL_MS = 10_000
/** Ping clients periodically; terminate those that miss a pong. */
const HEARTBEAT_INTERVAL_MS = 30_000

interface ConnectionContext {
  userId: string
  documentId: string
  readOnly: boolean
}

type HeartbeatSocket = WebSocket & { isAlive: boolean }

// ── Rooms ────────────────────────────────────────────────────────────────────

/**
 * A Yjs document shared by every connection in a room, plus awareness state
 * (live cursors/presence) and connection bookkeeping.
 */
class CollaborationRoom extends Y.Doc {
  readonly documentId: string
  readonly awareness: awarenessProtocol.Awareness
  /** conn → set of awareness client IDs advertised through that conn. */
  readonly conns = new Map<WebSocket, Set<number>>()
  /** Version number of the last persisted snapshot. */
  version = 0
  isDirty = false

  private snapshotTimer: NodeJS.Timeout | null = null

  constructor(documentId: string) {
    super({ gc: true })
    this.documentId = documentId

    this.awareness = new awarenessProtocol.Awareness(this)
    // The server itself has no presence state — only connected users do.
    this.awareness.setLocalState(null)

    // Broadcast awareness changes (cursor moves, joins, leaves) to everyone.
    this.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        // Remember which client IDs ride on which connection so we can clean
        // up presence when the connection drops.
        const conn = origin as WebSocket
        const controlled = this.conns.get(conn)
        if (controlled) {
          for (const clientID of added) controlled.add(clientID)
        }

        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, [...added, ...updated, ...removed]),
        )
        const message = encoding.toUint8Array(encoder)
        for (const client of this.conns.keys()) {
          send(this, client, message)
        }
      },
    )

    // Broadcast document updates to every connected client and mark dirty.
    this.on('update', (update: Uint8Array) => {
      this.isDirty = true
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      encoding.writeVarUint(encoder, syncProtocol.messageYjsUpdate)
      encoding.writeVarUint8Array(encoder, update)
      const message = encoding.toUint8Array(encoder)
      for (const client of this.conns.keys()) {
        send(this, client, message)
      }
    })
  }

  startSnapshotTimer(): void {
    this.snapshotTimer = setInterval(() => {
      void this.persistSnapshot()
    }, SNAPSHOT_INTERVAL_MS)
    this.snapshotTimer.unref?.()
  }

  stopSnapshotTimer(): void {
    if (this.snapshotTimer) clearInterval(this.snapshotTimer)
    this.snapshotTimer = null
  }

  /**
   * Writes the full document state as a new DocumentSnapshot.
   * Without `force`, only dirty rooms with live membership are saved.
   */
  async persistSnapshot(force = false): Promise<void> {
    if (!force && (!this.isDirty || rooms.get(this.documentId) !== this)) return
    try {
      const state = Y.encodeStateAsUpdate(this)
      this.version += 1
      await prisma.documentSnapshot.create({
        data: {
          documentId: this.documentId,
          state: Buffer.from(state),
          version: this.version,
        },
      })
      this.isDirty = false
    } catch (error) {
      console.error(`[ws] failed to persist snapshot for room ${this.documentId}:`, error)
    }
  }
}

const rooms = new Map<string, CollaborationRoom>()
const pendingRooms = new Map<string, Promise<CollaborationRoom>>()

/**
 * Returns the shared room for a document, creating + hydrating it on first
 * access. The pending map collapses concurrent first joins into one load.
 */
function getRoom(documentId: string): Promise<CollaborationRoom> {
  const existing = rooms.get(documentId)
  if (existing) return Promise.resolve(existing)

  const pending = pendingRooms.get(documentId)
  if (pending) return pending

  const created = createRoom(documentId).finally(() => pendingRooms.delete(documentId))
  pendingRooms.set(documentId, created)
  return created
}

async function createRoom(documentId: string): Promise<CollaborationRoom> {
  const room = new CollaborationRoom(documentId)
  rooms.set(documentId, room)

  // Hydrate from the newest snapshot so the document survives restarts.
  try {
    const latest = await prisma.documentSnapshot.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
    })
    if (latest) {
      Y.applyUpdate(room, new Uint8Array(latest.state))
      room.version = latest.version
      console.log(`[ws] room ${documentId} hydrated from snapshot v${latest.version}`)
    }
  } catch (error) {
    console.error(`[ws] failed to hydrate room ${documentId}:`, error)
  }

  room.startSnapshotTimer()
  return room
}

/** Last participant left: stop the timer and flush one final snapshot. */
async function closeRoom(room: CollaborationRoom): Promise<void> {
  room.stopSnapshotTimer()
  if (rooms.get(room.documentId) === room) rooms.delete(room.documentId)
  await room.persistSnapshot(true)
}

// ── Wire protocol ────────────────────────────────────────────────────────────

function send(room: CollaborationRoom, conn: WebSocket, message: Uint8Array): void {
  if (room.conns.has(conn) && conn.readyState === WebSocket.OPEN) {
    conn.send(message, () => {})
  }
}

function toUint8Array(data: RawData): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (Array.isArray(data)) return new Uint8Array(Buffer.concat(data))
  return new Uint8Array(data)
}

function messageListener(conn: WebSocket, room: CollaborationRoom, message: Uint8Array, readOnly: boolean): void {
  try {
    const decoder = decoding.createDecoder(message)
    switch (decoding.readVarUint(decoder)) {
      case MESSAGE_SYNC: {
        const syncType = decoding.readVarUint(decoder)
        if (syncType === syncProtocol.messageYjsSyncStep1) {
          // "Give me everything I'm missing" — a read, allowed for all roles.
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, MESSAGE_SYNC)
          syncProtocol.readSyncStep1(decoder, encoder, room)
          send(room, conn, encoding.toUint8Array(encoder))
        } else if (
          syncType === syncProtocol.messageYjsSyncStep2 ||
          syncType === syncProtocol.messageYjsUpdate
        ) {
          // "Here is new content" — a write. VIEWERs are dropped silently:
          // they simply have nothing to say about the document.
          if (readOnly) return
          syncProtocol.readUpdate(decoder, room, conn)
        }
        return
      }
      case MESSAGE_AWARENESS: {
        // Presence (cursor position, name, color) — everyone may share this.
        awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), conn)
        return
      }
    }
  } catch (error) {
    console.error('[ws] failed to process client message:', error)
  }
}

function setupConnection(conn: WebSocket, room: CollaborationRoom, readOnly: boolean): void {
  conn.binaryType = 'arraybuffer'
  const socket = conn as HeartbeatSocket
  socket.isAlive = true
  conn.on('pong', () => {
    socket.isAlive = true
  })

  room.conns.set(conn, new Set())

  conn.on('message', (data: RawData) => {
    messageListener(conn, room, toUint8Array(data), readOnly)
  })

  conn.once('close', () => {
    const controlled = room.conns.get(conn)
    // Remove the cursor/presence this connection advertised.
    if (controlled && controlled.size > 0) {
      awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlled), null)
    }
    room.conns.delete(conn)
    if (room.conns.size === 0) {
      void closeRoom(room).catch((error) =>
        console.error(`[ws] error while closing room ${room.documentId}:`, error),
      )
    }
  })

  // Kick off bidirectional sync: ask the client for its state vector, and
  // share the presence of everyone already in the room.
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, MESSAGE_SYNC)
  syncProtocol.writeSyncStep1(encoder, room)
  send(room, conn, encoding.toUint8Array(encoder))

  const knownClients = Array.from(room.awareness.getStates().keys())
  if (knownClients.length > 0) {
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, knownClients),
    )
    send(room, conn, encoding.toUint8Array(awarenessEncoder))
  }
}

// ── HTTP + WebSocket server with upgrade-time authentication ─────────────────

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('SyncScribe WebSocket collaboration server is running.\n')
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', async (request, socket, head) => {
  let context: ConnectionContext | null = null
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const token = url.searchParams.get('token')
    const documentId = url.searchParams.get('docId')
    if (!token || !documentId) throw new Error('missing token or docId query parameter')

    const claims = await verifySessionToken(token)
    if (!claims) throw new Error('invalid or expired session token')

    const collaborator = await prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId, userId: claims.userId } },
      select: { role: true },
    })
    if (!collaborator) {
      throw new Error(`user ${claims.userId} has no access to document ${documentId}`)
    }

    context = {
      userId: claims.userId,
      documentId,
      readOnly: collaborator.role === 'VIEWER',
    }
  } catch (error) {
    console.warn('[ws] rejected connection:', error instanceof Error ? error.message : error)
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
    socket.destroy()
    return
  }

  wss.handleUpgrade(request, socket, head, (conn) => {
    wss.emit('connection', conn, request, context)
  })
})

wss.on('connection', async (conn: WebSocket, _request: http.IncomingMessage, context: ConnectionContext) => {
  try {
    const room = await getRoom(context.documentId)
    if (conn.readyState !== WebSocket.OPEN) return
    setupConnection(conn, room, context.readOnly)
    console.log(
      `[ws] ${context.readOnly ? 'viewer' : 'editor'} joined room ${context.documentId} (${room.conns.size} connected)`,
    )
  } catch (error) {
    console.error('[ws] failed to attach connection to room:', error)
    conn.close(1011, 'internal server error')
  }
})

/** Terminate connections that missed a heartbeat pong. */
const heartbeat = setInterval(() => {
  for (const conn of wss.clients) {
    const socket = conn as HeartbeatSocket
    if (!socket.isAlive) {
      conn.terminate()
      continue
    }
    socket.isAlive = false
    conn.ping()
  }
}, HEARTBEAT_INTERVAL_MS)
heartbeat.unref()

// ── Graceful shutdown: flush every dirty room before exiting ─────────────────

async function shutdown(): Promise<void> {
  console.log('[ws] shutting down — flushing snapshots…')
  clearInterval(heartbeat)
  await Promise.all(
    Array.from(rooms.values()).map((room) =>
      room.persistSnapshot(true).catch((error) =>
        console.error(`[ws] final snapshot for ${room.documentId} failed:`, error),
      ),
    ),
  )
  for (const conn of wss.clients) conn.close(1001, 'server shutting down')
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

server.listen(PORT, () => {
  console.log(`[ws] SyncScribe collaboration server listening on port ${PORT}`)
})
