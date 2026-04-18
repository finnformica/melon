import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { auth, db } from '@/lib/firebase'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  magicLinkNeedsEmail: boolean
  signInWithGoogle: () => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  confirmMagicLinkEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const EMAIL_STORAGE_KEY = 'elo-tracker-email-for-link'

async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<User> {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const snapshot = await getDoc(userRef)

  if (snapshot.exists()) {
    return { uid: firebaseUser.uid, ...snapshot.data() } as User
  }

  const newUser = {
    displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
    photoURL: firebaseUser.photoURL ?? '',
    email: firebaseUser.email ?? '',
    globalElo: 1000,
    globalWins: 0,
    globalLosses: 0,
    createdAt: serverTimestamp(),
  }

  await setDoc(userRef, newUser)
  const created = await getDoc(userRef)
  return { uid: firebaseUser.uid, ...created.data() } as User
}

async function completeMagicLink(email: string) {
  await signInWithEmailLink(auth, email, window.location.href)
  window.localStorage.removeItem(EMAIL_STORAGE_KEY)
  window.history.replaceState({}, '', window.location.pathname)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [magicLinkNeedsEmail, setMagicLinkNeedsEmail] = useState(false)

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const stored = window.localStorage.getItem(EMAIL_STORAGE_KEY)
      if (stored) {
        completeMagicLink(stored).catch((err) => {
          console.error('Magic link completion failed', err)
          setMagicLinkNeedsEmail(true)
        })
      } else {
        setMagicLinkNeedsEmail(true)
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const appUser = await ensureUserDocument(fbUser)
          setUser(appUser)
        } catch (err) {
          console.error('Failed to load user document', err)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      magicLinkNeedsEmail,
      async signInWithGoogle() {
        await signInWithPopup(auth, new GoogleAuthProvider())
      },
      async sendMagicLink(email: string) {
        await sendSignInLinkToEmail(auth, email, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: true,
        })
        window.localStorage.setItem(EMAIL_STORAGE_KEY, email)
      },
      async confirmMagicLinkEmail(email: string) {
        await completeMagicLink(email)
        setMagicLinkNeedsEmail(false)
      },
      async signOut() {
        await firebaseSignOut(auth)
      },
    }),
    [user, firebaseUser, loading, magicLinkNeedsEmail],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
