import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { useEffect } from 'react'

import { useAuth } from '@/features/auth/AuthProvider'
import { db } from '@/lib/firebase'
import { getLeague, getLeaguesByUser } from '@/lib/firestore'
import type { League, Membership } from '@/types'

export function useLeagues() {
  const { user } = useAuth()
  const uid = user?.uid
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, 'memberships'), where('userId', '==', uid))
    const unsubscribe = onSnapshot(q, async (snap) => {
      const memberships = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Membership,
      )
      const leagues = (
        await Promise.all(memberships.map((m) => getLeague(m.leagueId)))
      ).filter((l): l is League => l != null)
      queryClient.setQueryData(['leagues', uid], leagues)
    })
    return unsubscribe
  }, [uid, queryClient])

  return useQuery<League[]>({
    queryKey: ['leagues', uid],
    queryFn: () => (uid ? getLeaguesByUser(uid) : Promise.resolve([])),
    enabled: !!uid,
    staleTime: Infinity,
  })
}
