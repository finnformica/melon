import { useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect } from 'react'

import { db } from '@/lib/firebase'
import { getLeague } from '@/lib/firestore'
import type { League } from '@/types'

export function useLeague(leagueId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!leagueId) return
    const unsubscribe = onSnapshot(doc(db, 'leagues', leagueId), (snap) => {
      if (!snap.exists()) {
        queryClient.setQueryData(['league', leagueId], null)
        return
      }
      queryClient.setQueryData(['league', leagueId], {
        id: snap.id,
        ...snap.data(),
      } as League)
    })
    return unsubscribe
  }, [leagueId, queryClient])

  return useQuery<League | null>({
    queryKey: ['league', leagueId],
    queryFn: () => (leagueId ? getLeague(leagueId) : Promise.resolve(null)),
    enabled: !!leagueId,
    staleTime: Infinity,
  })
}
