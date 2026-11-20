'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { apiFetch } from '@/lib/api-client'
import { fieldErrors, loginSchema } from '@/lib/validation'

const DEMO_EMAIL = 'demo@syncscribe.dev'
const DEMO_PASSWORD = 'demo1234'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setFields(fieldErrors(parsed.error))
      return
    }
    setFields({})
    setFormError(null)
    setSubmitting(true)
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      })
      router.push('/docs')
      router.refresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Sign in failed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo />
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to open your documents.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="rounded-2xl border bg-card p-6 shadow-sm">
        {formError ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </div>
        ) : null}

        <div className="mb-4">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            invalid={Boolean(fields.email)}
            aria-describedby={fields.email ? 'email-error' : undefined}
          />
          <span id="email-error">
            <FieldError message={fields.email} />
          </span>
        </div>

        <div className="mb-6">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            invalid={Boolean(fields.password)}
            aria-describedby={fields.password ? 'password-error' : undefined}
          />
          <span id="password-error">
            <FieldError message={fields.password} />
          </span>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <button
          type="button"
          onClick={() => {
            setEmail(DEMO_EMAIL)
            setPassword(DEMO_PASSWORD)
            setFields({})
          }}
          className="mt-3 w-full rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          Use the demo account ({DEMO_EMAIL} · {DEMO_PASSWORD})
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
