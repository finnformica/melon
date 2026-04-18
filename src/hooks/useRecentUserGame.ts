import { useQuery } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { normalizeGame } from '@/lib/gameSchema'
import type { Game } from '@/types'

// Most recent game the user participated in, across every league.
// Runs 4 small queries (new winnerIds/loserIds + legacy winnerId/loserId) and
// picks the latest; normalizeGame harmonises the shapes.
async function fetchMostRecentUserGame(uid: string): Promise<Game | null> {
  const [winNew, loseNew, winOld, loseOld] = await Promise.all([
    getDocs(
      query(
        collection(db, 'games'),
        where('winnerIds', 'array-contains', uid),
        orderBy('playedAt', 'desc'),
        fsLimit(1),
      ),
    ),
    getDocs(
      query(
        collection(db, 'games'),
        where('loserIds', 'array-contains', uid),
        orderBy('playedAt', 'desc'),
        fsLimit(1),
      ),
    ),
    getDocs(
      query(
        collection(db, 'games'),
        where('winnerId', '==', uid),
        orderBy('playedAt', 'desc'),
        fsLimit(1),
      ),
    ),
    getDocs(
      query(
        collection(db, 'games'),
        where('loserId', '==', uid),
        orderBy('playedAt', 'desc'),
        fsLimit(1),
      ),
    ),
  ])

  const candidates: Game[] = []
  for (const snap of [winNew, loseNew, winOld, loseOld]) {
    for (const d of snap.docs) {
      candidates.push(normalizeGame({ id: d.id, ...d.data() }))
    }
  }
  if (candidates.length === 0) return null
  candidates.sort(
    (a, b) => (b.playedAt?.toMillis() ?? 0) - (a.playedAt?.toMillis() ?? 0),
  )
  return candidates[0]
}

export function useRecentUserGame(uid: string | undefined) {
  return useQuery<Game | null>({
    queryKey: ['recent-user-game', uid],
    queryFn: () =>
      uid ? fetchMostRecentUserGame(uid) : Promise.resolve(null),
    enabled: !!uid,
  })
}
