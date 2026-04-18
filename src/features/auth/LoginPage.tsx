import { Mail } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.3-.52-1.5.11-3.13 0 0 .97-.31 3.18 1.18a11.03 11.03 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.63.23 2.83.11 3.13.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.77 1.06.77 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  )
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithGithub } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handle(provider: 'google' | 'github') {
    setError(null)
    setSubmitting(true)
    try {
      if (provider === 'google') await signInWithGoogle()
      else await signInWithGithub()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ELO League Tracker</CardTitle>
          <CardDescription>
            Track ELO ratings across your sports leagues.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={() => handle('google')}
            disabled={submitting}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
          <Button
            onClick={() => handle('github')}
            disabled={submitting}
            variant="outline"
            className="w-full"
          >
            <GithubIcon className="mr-2 h-4 w-4" />
            Sign in with GitHub
          </Button>
        </CardContent>
        {error && (
          <CardFooter>
            <p className="w-full text-center text-sm text-destructive">
              {error}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
