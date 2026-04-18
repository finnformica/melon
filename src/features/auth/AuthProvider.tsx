import { Timestamp } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'elo-tracker-dev-session'

interface StoredSession {
  uid: string
  displayName: string
  email: string
  photoURL: string
  createdAtMs: number
  provider: 'google' | 'github'
}

function sessionToUser(session: StoredSession): User {
  return {
    uid: session.uid,
    displayName: session.displayName,
    email: session.email,
    photoURL: session.photoURL,
    globalElo: 1000,
    globalWins: 0,
    globalLosses: 0,
    createdAt: Timestamp.fromMillis(session.createdAtMs),
  }
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

function writeSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

function createDevSession(provider: 'google' | 'github'): StoredSession {
  return {
    uid: `dev-${crypto.randomUUID()}`,
    displayName: provider === 'google' ? 'Dev Google User' : 'Dev GitHub User',
    email: `${provider}@example.com`,
    photoURL: '',
    createdAtMs: Date.now(),
    provider,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = readSession()
    setUser(session ? sessionToUser(session) : null)
    setLoading(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signInWithGoogle() {
        const session = createDevSession('google')
        writeSession(session)
        setUser(sessionToUser(session))
      },
      async signInWithGithub() {
        const session = createDevSession('github')
        writeSession(session)
        setUser(sessionToUser(session))
      },
      async signOut() {
        clearSession()
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
