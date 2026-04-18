import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { useEffect } from 'react'

import { db } from '@/lib/firebase'
import { getMembershipsByLeague, getUser } from '@/lib/firestore'
import type { Membership, User } from '@/types'

export interface LeagueMember {
  membership: Membership
  user: User | null
}

async function fetchMembers(leagueId: string): Promise<LeagueMember[]> {
  const memberships = await getMembershipsByLeague(leagueId)
  const users = await Promise.all(memberships.map((m) => getUser(m.userId)))
  return memberships.map((membership, i) => ({
    membership,
    user: users[i],
  }))
}

export function useMembers(leagueId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!leagueId) return
    const q = query(
      collection(db, 'memberships'),
      where('leagueId', '==', leagueId),
      orderBy('leagueElo', 'desc'),
    )
    const unsubscribe = onSnapshot(q, async (snap) => {
      const memberships = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Membership,
      )
      const users = await Promise.all(
        memberships.map((m) => getUser(m.userId)),
      )
      const members: LeagueMember[] = memberships.map((membership, i) => ({
        membership,
        user: users[i],
      }))
      queryClient.setQueryData(['members', leagueId], members)
    })
    return unsubscribe
  }, [leagueId, queryClient])

  return useQuery<LeagueMember[]>({
    queryKey: ['members', leagueId],
    queryFn: () => (leagueId ? fetchMembers(leagueId) : Promise.resolve([])),
    enabled: !!leagueId,
    staleTime: Infinity,
  })
}
