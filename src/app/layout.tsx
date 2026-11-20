import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/toast'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'SyncScribe — Real-time collaborative documents',
    template: '%s · SyncScribe',
  },
  description:
    'Google-Docs-style collaborative editing with live cursors and conflict-free CRDT sync. Built with Next.js, Yjs, TipTap and PostgreSQL.',
}

/**
 * Runs before hydration to apply the persisted theme (or the OS preference on
 * first visit) and avoid a light-mode flash in dark mode.
 */
const themeInitScript = `(function(){try{var stored=localStorage.getItem("syncscribe-theme");var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(dark)document.documentElement.classList.add("dark")}catch(e){}})()`

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
