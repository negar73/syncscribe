# SyncScribe

**Real-time collaborative documents — Google-Docs-style multi-user editing with live presence, powered by Yjs CRDTs.**

SyncScribe is a full-stack collaborative writing app: multiple users edit the same document at the same time, watch each other's cursors move live, and share documents with fine-grained OWNER / EDITOR / VIEWER roles — all backed by conflict-free CRDT merging and snapshot persistence in PostgreSQL.

[![CI](https://github.com/negar73/syncscribe/actions/workflows/ci.yml/badge.svg)](https://github.com/negar73/syncscribe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## Features

- **Real-time collaborative editing** — concurrent edits are merged with [Yjs](https://yjs.dev) CRDTs, so no central lock is needed and nobody can ever overwrite anybody. Every keystroke propagates to all connected clients in milliseconds.
- **Live presence** — colored remote cursors, name labels and avatar stacks driven by the Yjs *awareness* protocol. Each user gets a deterministic color derived from their email at registration.
- **Role-based sharing** — invite people by email as `EDITOR` or read-only `VIEWER`, inspect the roster, change and remove access. Permissions are enforced twice: in the REST API and again at the WebSocket layer, where viewer update messages are silently dropped server-side.
- **JWT authentication** — register/login with bcrypt-hashed passwords; sessions are `jose`-signed HS256 tokens (7-day TTL) stored in an httpOnly, SameSite=Lax cookie. The same token authenticates the WebSocket handshake, and each request re-checks the user against the database so revoked accounts stop working immediately.
- **Document snapshot persistence** — a standalone WebSocket server writes a binary Yjs snapshot to PostgreSQL every 10 seconds per active room, plus one final flush when the last participant leaves and on shutdown. Rooms are hydrated from the newest snapshot on first join, so documents survive server restarts.
- **Rich-text editor** — TipTap (ProseMirror) with bold, italic, strikethrough, headings, ordered/bullet lists, blockquotes and inline code, a sticky formatting toolbar with active-state highlighting, and CRDT-aware undo/redo (Yjs owns history instead of ProseMirror's built-in stack).
- **Connection health** — a live status pill (Connecting / Live / Reconnecting) reflects the underlying socket state, backed by server-side ping/pong heartbeats that reap dead connections.
- **Document dashboard** — list documents you own or collaborate on with owner info, collaborator counts and your role on each; create, rename and delete documents (deletes cascade to collaborators and snapshots).
- **Dark mode** — class-based light/dark toggle persisted in localStorage, applied by an inline script before hydration so there is no flash on load.
- **Type-safe end to end** — Zod request validation, typed Prisma queries, typed API client, and strict TypeScript with `tsc --noEmit` + ESLint in CI.

## Architecture

```text
┌───────────────────────────── Browser ──────────────────────────────┐
│                                                                    │
│   Next.js App Router (React 19)                                    │
│   ┌──────────────────────────┐      ┌────────────────────────┐     │
│   │  TipTap editor           │      │  Presence avatars,     │     │
│   │  (ProseMirror)           │      │  remote cursors,       │     │
│   │        ⇅                 │      │  status pill           │     │
│   │  Y.Doc (Yjs CRDT)        │──────└────────────────────────┘     │
│   └──────────┬───────────────┘                                     │
└──────────────┼─────────────────────────────────────────┬───────────┘
               │  y-websocket (binary sync + awareness,  │  REST (JSON)
               │  ?token=<JWT>&docId=<id> on upgrade)    │
               ▼                                         ▼
┌──────────────────────────────┐          ┌──────────────────────────────────┐
│  WebSocket server            │          │  Next.js Route Handlers          │
│  server/ws-server.ts         │          │  (Node runtime, port 3000)       │
│  (npm run ws, port 1234)     │          │                                  │
│                              │          │  POST /api/auth/register         │
│  • Verifies the JWT with     │          │  POST /api/auth/login            │
│    jose on every upgrade and │          │  POST /api/auth/logout           │
│    loads the caller's role   │          │  GET  /api/auth/me               │
│    from Postgres — rejects   │          │  GET  /api/auth/token            │
│    non-collaborators with    │          │  GET/POST     /api/documents     │
│    401 before the handshake  │          │  GET/PATCH/   /api/documents/[id]│
│    completes                 │          │       DELETE                     │
│  • VIEWER sync updates are   │          │  GET/POST/PATCH/DELETE           │
│    dropped (read-only even   │          │    /api/documents/[id]/          │
│    if the client is tampered)│          │       collaborators              │
│  • Broadcasts sync +         │          │                                  │
│    awareness to room peers   │          │  Zod-validated, JWT-protected,   │
│  • Snapshots dirty rooms     │          │  role-checked via the            │
│    every 10 s (+ on last     │          │  (documentId, userId) unique     │
│    leave and on SIGINT/TERM) │          │  index                           │
└──────────────┬───────────────┘          └────────────────┬─────────────────┘
               │                                           │
               └───────────────────┬───────────────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │  PostgreSQL 16 (Prisma ORM)   │
                   │                               │
                   │  User / Document /            │
                   │  DocumentCollaborator /       │
                   │  DocumentSnapshot (binary     │
                   │  Yjs state, versioned)        │
                   └───────────────────────────────┘
```

The session cookie is httpOnly, so the browser fetches its own JWT from `GET /api/auth/token` and passes it as `?token=` on the WebSocket upgrade — the only way to hand the separate ws process the same credentials. The WebSocket server and the Next.js API share one JWT module (`src/lib/jwt.ts`, issuer `syncscribe`, audience `syncscribe-app`) and one Prisma client.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, Node.js ≥ 20 |
| Language | TypeScript 5 (strict), ESLint 9 |
| Styling | Tailwind CSS 4, lucide-react icons |
| Editor | TipTap 2 (`StarterKit`, `Collaboration`, `CollaborationCursor`, `Placeholder`) on ProseMirror |
| Real-time | Yjs CRDTs, `y-websocket` client, `y-protocols` sync + awareness, `ws` server, `lib0` encoding |
| State | Zustand (UI stores, e.g. toasts) |
| Auth | `jose` (HS256 JWT), `bcryptjs` password hashing, httpOnly session cookie |
| Database | PostgreSQL 16 via Prisma ORM 6, Zod request validation |
| Infra / DX | Docker Compose (Postgres), multi-stage `Dockerfile` (standalone output), GitHub Actions CI, tsx for scripts |

## Getting started

Prerequisites: **Node.js ≥ 20**, **Docker** (for Postgres), and npm.

```bash
# 1. Start PostgreSQL 16 in the background
docker compose up -d

# 2. Install dependencies (Prisma client is generated in a postinstall hook)
npm install

# 3. Create your env file
cp .env.example .env
#   → set JWT_SECRET to a long random string, e.g. openssl rand -base64 48

# 4. Create the schema, then seed demo accounts + a welcome document
npm run db:push
npm run db:seed
```

Now run the two processes **in two terminals** — the Next.js app and the WebSocket collaboration server are separate processes:

```bash
# Terminal 1 — web app on http://localhost:3000
npm run dev

# Terminal 2 — WebSocket collaboration server on ws://localhost:1234
npm run ws
```

Open <http://localhost:3000>, sign in, and open the **Welcome to SyncScribe** document. To watch live collaboration, **open a second browser window side-by-side and sign in as the second demo user** — type in one window and see edits, cursors and presence avatars sync instantly in both.

**Demo credentials** (created by the seed script):

| Account | Email | Password |
| --- | --- | --- |
| Demo User (owns the welcome document) | `demo@syncscribe.dev` | `demo1234` |
| Mara Tanaka (second collaborator) | `mara@syncscribe.dev` | `demo1234` |

Other useful scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`, `npm run db:generate`. The seed script is idempotent, so re-running it is safe. A multi-stage `Dockerfile` builds a production image of the Next.js app (`docker build -t syncscribe .`).

## Environment variables

Copied from `.env.example` — all of them live in `.env` (never committed).

| Variable | Example | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://syncscribe:syncscribe@localhost:5432/syncscribe` | PostgreSQL connection string used by Prisma. Matches the credentials in `docker-compose.yml`. |
| `JWT_SECRET` | `replace-me-with-a-long-random-string` | Secret signing the JWT session cookie **and** WebSocket upgrade tokens. Generate one with `openssl rand -base64 48`. Falls back to an insecure dev secret with a warning if unset. |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:1234` | URL the browser uses to reach the y-websocket server. `NEXT_PUBLIC_*` vars are inlined into the client bundle at build time. |
| `WS_PORT` | `1234` | Port the standalone WebSocket server binds to (`server/ws-server.ts`, `npm run ws`). |

## Project structure

```text
syncscribe/
├── .github/
│   └── workflows/
│       └── ci.yml                  # install → prisma generate → next typegen → typecheck → lint
├── prisma/
│   ├── schema.prisma               # User, Document, DocumentCollaborator, DocumentSnapshot + Role enum
│   └── seed.ts                     # idempotent seed: demo users + welcome doc as a real Yjs snapshot
├── server/
│   └── ws-server.ts                # standalone y-websocket server: auth-on-upgrade, roles, snapshots
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/               # register / login / logout / me / token route handlers
│   │   │   └── documents/          # documents CRUD + [id]/collaborators sharing API
│   │   ├── docs/                   # dashboard + document editor pages (layouts, [id])
│   │   ├── login/ · register/      # auth pages
│   │   ├── layout.tsx              # root layout (theme script, header, providers)
│   │   └── globals.css             # Tailwind v4 theme tokens (light/dark)
│   ├── components/
│   │   ├── auth/                   # login & register forms
│   │   ├── docs/                   # dashboard, document cards, create/delete modals
│   │   ├── editor/
│   │   │   ├── collaborative-editor.tsx   # TipTap ⇄ Y.Doc ⇄ WebsocketProvider
│   │   │   ├── presence-avatars.tsx       # live awareness avatar stack
│   │   │   └── share-modal.tsx            # invite / roles / roster / copy link
│   │   ├── ui/                     # buttons, modals, toasts, badges, avatars, …
│   │   ├── theme-toggle.tsx        # light/dark toggle
│   │   └── …                       # app header, user provider, logo
│   ├── lib/
│   │   ├── auth.ts                 # session cookie helpers, getCurrentUser
│   │   ├── jwt.ts                  # jose sign/verify (shared with the ws server)
│   │   ├── access.ts               # role resolution + 403/404 semantics
│   │   ├── api-helpers.ts          # requireUser, Zod body parsing, error mapping
│   │   ├── db.ts · validation.ts · colors.ts · api-client.ts · utils.ts
│   └── types/                      # shared DTOs (DocumentListItem, CollaboratorDTO, …)
├── docker-compose.yml              # Postgres 16 + healthcheck + named volume
├── Dockerfile                      # multi-stage standalone build of the Next.js app
├── .env.example
├── LICENSE                         # MIT
└── package.json
```

## Roadmap

Ordered roughly from beginner-friendly to advanced — these are the next features planned:

1. **Playwright e2e test** — a two-browser sync test that types in one window and asserts the text, cursors and presence appear in the other *(great first issue)*.
2. **Deploy guide** — step-by-step Fly.io / Railway deployment for the app, the WebSocket server and Postgres, including `NEXT_PUBLIC_WS_URL` build-time configuration.
3. **Offline mode** — `y-indexeddb` provider so drafts survive reloads and reconnects, with a background sync on reconnect.
4. **Rate limiting** — per-IP limits on auth routes and per-user limits on document creation.
5. **Version history viewer** — the `DocumentSnapshot` table already stores every 10-second version; surface a UI to browse and restore previous versions.
6. **Comments / threads** — inline anchored discussions on document ranges, with mention notifications.
7. **Email invites** — send share invitations by email (magic links or notification digests) instead of only inviting registered users by address.

Contributions welcome — pick a roadmap item and open a PR!

## License

Released under the [MIT License](./LICENSE) — © 2025 Negar Shojaei.
