import { Mail } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'

function useRedirectTarget(): string {
  const location = useLocation()
  const stateFrom = (location.state as { from?: Location } | null)?.from
  if (stateFrom?.pathname && stateFrom.pathname !== '/login') {
    return stateFrom.pathname + (stateFrom.search ?? '')
  }
  const queryRedirect = new URLSearchParams(location.search).get('redirect')
  if (queryRedirect) return queryRedirect
  return '/'
}

function parseFirebaseError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Invalid email or password'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters'
    case 'auth/invalid-email':
      return 'Invalid email address'
    default:
      return err instanceof Error ? err.message : 'Sign-in failed'
  }
}

export default function LoginPage() {
  const {
    user,
    loading,
    magicLinkNeedsEmail,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    sendMagicLink,
    confirmMagicLinkEmail,
  } = useAuth()
  const redirectTo = useRedirectTarget()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [passwordMode, setPasswordMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />
  }

  function switchMode(next: 'signin' | 'signup') {
    setPasswordMode(next)
    setPassword('')
    setConfirmPassword('')
    setError(null)
  }

  async function handleGoogle() {
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(parseFirebaseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (passwordMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      if (passwordMode === 'signin') {
        await signInWithPassword(email, password)
      } else {
        await signUpWithPassword(email, password)
      }
    } catch (err) {
      setError(parseFirebaseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMagicLink() {
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await sendMagicLink(email, redirectTo !== '/' ? redirectTo : undefined)
      setInfo(
        `Sign-in link sent to ${email}. If it doesn't arrive in a few seconds, check your spam folder.`,
      )
    } catch (err) {
      setError(parseFirebaseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmEmail() {
    setError(null)
    setSubmitting(true)
    try {
      await confirmMagicLinkEmail(confirmEmail)
    } catch (err) {
      setError(parseFirebaseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (magicLinkNeedsEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Confirm your email</CardTitle>
            <CardDescription>
              Enter the email you used to request the sign-in link.
            </CardDescription>
          </CardHeader>
          <form onSubmit={(e) => { e.preventDefault(); void handleConfirmEmail() }}>
            <CardContent className="flex flex-col gap-3">
              <Label htmlFor="confirm-email">Email</Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={submitting} className="w-full">
                Finish sign-in
              </Button>
            </CardContent>
          </form>
          {error && (
            <CardFooter>
              <p className="w-full text-center text-sm text-destructive">{error}</p>
            </CardFooter>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ELO League Tracker</CardTitle>
          <CardDescription>Track ELO ratings across your sports leagues.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleGoogle} disabled={submitting} className="w-full">
            <Mail className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>

          <Divider label="or" />

          <form onSubmit={(e) => void handlePasswordAuth(e)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={passwordMode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </div>
            {passwordMode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full"
            >
              {passwordMode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {passwordMode === 'signin' ? (
                <>
                  No account?{' '}
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => switchMode('signup')}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => switchMode('signin')}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>

          <Divider label="or sign in with a link" />

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleMagicLink()}
            disabled={submitting || !email}
            className="w-full"
          >
            Send sign-in link
          </Button>
        </CardContent>
        {(error || info) && (
          <CardFooter>
            <p
              className={`w-full text-center text-sm ${
                error ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {error ?? info}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
