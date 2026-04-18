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

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleGoogle() {
    setError(null)
    setSubmitting(true)
    try {
      await signInWithGoogle()
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
        <CardContent>
          <Button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Sign in with Google
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
