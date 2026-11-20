import {
  Database,
  GitBranch,
  MousePointer2,
  ShieldCheck,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { SiteHeader } from '@/components/site-header'
import { ButtonLink } from '@/components/ui/button'

// ── Hero preview: a CSS-only mock of a live collaborative document ──────────

const demoCursors = [
  { name: 'Negar', color: 'hsl(160 62% 45%)', top: '22%', left: '58%', drift: '10px, -6px', delay: '0s' },
  { name: 'Mara', color: 'hsl(24 70% 52%)', top: '58%', left: '34%', drift: '-8px, 8px', delay: '1.2s' },
  { name: 'Tom', color: 'hsl(268 60% 58%)', top: '78%', left: '70%', drift: '6px, -10px', delay: '2.1s' },
]

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden>
      <div className="rounded-2xl border bg-card shadow-xl">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b px-4 py-3">
          <span className="size-2.5 rounded-full bg-stone-300 dark:bg-stone-600" />
          <span className="size-2.5 rounded-full bg-stone-300 dark:bg-stone-600" />
          <span className="size-2.5 rounded-full bg-stone-300 dark:bg-stone-600" />
          <span className="ml-3 truncate text-xs font-medium text-muted-foreground">
            Product brainstorm — shared with 3 people
          </span>
        </div>
        {/* Fake document body */}
        <div className="relative space-y-3 p-6">
          <div className="h-4 w-3/5 rounded bg-foreground/70" />
          <div className="h-2.5 w-11/12 rounded bg-muted-foreground/25" />
          <div className="h-2.5 w-4/5 rounded bg-muted-foreground/25" />
          <div className="h-2.5 w-2/5 rounded bg-primary/60" />
          <div className="h-2.5 w-10/12 rounded bg-muted-foreground/25" />
          <div className="h-2.5 w-3/4 rounded bg-muted-foreground/25" />
          <div className="h-2.5 w-1/2 rounded bg-muted-foreground/25" />
          <div className="h-2.5 w-2/3 rounded bg-muted-foreground/25" />

          {/* Live cursors */}
          {demoCursors.map((cursor) => (
            <div
              key={cursor.name}
              className="animate-cursor-drift absolute"
              style={
                {
                  top: cursor.top,
                  left: cursor.left,
                  '--drift-x': cursor.drift.split(',')[0],
                  '--drift-y': cursor.drift.split(',')[1],
                  animationDelay: cursor.delay,
                } as React.CSSProperties
              }
            >
              <svg viewBox="0 0 24 24" className="size-4 drop-shadow" fill={cursor.color}>
                <path d="M5.5 3.2 20.4 13.9l-7 .9-3.6 6.2z" />
              </svg>
              <span
                className="absolute left-4 top-3 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
        Synced in ~50 ms — no merge conflicts, ever
      </div>
    </div>
  )
}

// ── Content ──────────────────────────────────────────────────────────────────

const features: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <GitBranch className="size-5" aria-hidden />,
    title: 'Conflict-free CRDT sync',
    body: 'Every keystroke is an operation merged by Yjs CRDTs. Two people can type in the same sentence at the same time and both versions survive — no locks, no lost work.',
  },
  {
    icon: <MousePointer2 className="size-5" aria-hidden />,
    title: 'Live cursors & presence',
    body: 'See exactly who is in the document and where their caret is. Presence travels over a lightweight awareness protocol alongside the document updates.',
  },
  {
    icon: <Database className="size-5" aria-hidden />,
    title: 'Automatic snapshots',
    body: 'The WebSocket server persists a binary Yjs snapshot to PostgreSQL every ten seconds per active room, so documents survive server restarts and network drops.',
  },
  {
    icon: <ShieldCheck className="size-5" aria-hidden />,
    title: 'Share with roles',
    body: 'Invite people as editors or read-only viewers. Roles are enforced in the REST API and again on every WebSocket message — viewers cannot write, period.',
  },
]

const steps: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <UserPlus className="size-5" aria-hidden />,
    title: 'Create an account',
    body: 'Register with an email and password. A deterministic color is assigned to you for cursors and avatars.',
  },
  {
    icon: <Share2 className="size-5" aria-hidden />,
    title: 'Share the document',
    body: 'Add collaborators by email with an editor or viewer role from the share dialog.',
  },
  {
    icon: <Users className="size-5" aria-hidden />,
    title: 'Write together',
    body: 'Open the same document in two windows and watch edits, cursors and titles sync in real time.',
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent)',
            }}
            aria-hidden
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                Open source · powered by Yjs CRDTs
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Write together, in real time.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                SyncScribe is a Google-Docs-style collaborative editor with live cursors, role-based
                sharing and automatic snapshots — built with Next.js, TipTap, Yjs and PostgreSQL.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink href="/register" size="md">
                  Start writing — it is free
                </ButtonLink>
                <ButtonLink href="/login" variant="outline" size="md">
                  Sign in
                </ButtonLink>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Demo account: demo@syncscribe.dev · demo1234
              </p>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Real-time collaboration is the hard part — it is done here
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Not a mock: the CRDT engine, the authenticated WebSocket server and the snapshot
              persistence are fully implemented in this repository.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Three steps to co-writing</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border bg-card p-6">
                  <span className="absolute right-5 top-5 text-4xl font-bold text-muted-foreground/20">
                    {index + 1}
                  </span>
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    {step.icon}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Ready to see it sync?</h2>
              <p className="mt-2 text-muted-foreground">
                Create a document, open it in two browser windows, and type in both.
              </p>
            </div>
            <ButtonLink href="/register" size="md">
              Get started now
            </ButtonLink>
          </div>
        </section>
      </main>

      {/* Footer — sticks to the bottom on short viewports (mt-auto + flex parent) */}
      <footer className="mt-auto border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <p>© 2025 Negar Shojaei · SyncScribe</p>
          <p>
            Built with Next.js · Yjs · TipTap · PostgreSQL ·{' '}
            <a
              href="https://github.com/negarshojaei/syncscribe"
              className="font-medium text-foreground hover:underline"
            >
              View source
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
