import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold tracking-tight text-muted-foreground/30">404</p>
      <h1 className="text-xl font-semibold">This page does not exist</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are looking for may have been deleted, or the link is incorrect.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to the home page
      </Link>
    </main>
  )
}
