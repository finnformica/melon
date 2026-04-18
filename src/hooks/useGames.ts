import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { useEffect } from 'react'

import { db } from '@/lib/firebase'
import { getGamesByLeague } from '@/lib/firestore'
import { normalizeGame } from '@/lib/gameSchema'
import type { Game } from '@/types'

export function useGames(
  leagueId: string | undefined,
  options: { limit?: number } = {},
) {
  const queryClient = useQueryClient()
  const { limit } = options

  useEffect(() => {
    if (!leagueId) return
    const constraints = [
      where('leagueId', '==', leagueId),
      orderBy('playedAt', 'desc'),
    ]
    const q = limit
      ? query(collection(db, 'games'), ...constraints, fsLimit(limit))
      : query(collection(db, 'games'), ...constraints)
    const unsubscribe = onSnapshot(q, (snap) => {
      const games = snap.docs.map((d) =>
        normalizeGame({ id: d.id, ...d.data() }),
      )
      queryClient.setQueryData(['games', leagueId, limit ?? null], games)
    })
    return unsubscribe
  }, [leagueId, limit, queryClient])

  return useQuery<Game[]>({
    queryKey: ['games', leagueId, limit ?? null],
    queryFn: () =>
      leagueId ? getGamesByLeague(leagueId, { limit }) : Promise.resolve([]),
    enabled: !!leagueId,
    staleTime: Infinity,
  })
}
