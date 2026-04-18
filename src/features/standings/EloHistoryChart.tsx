import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Skeleton } from '@/components/ui/skeleton'
import { db } from '@/lib/firebase'
import { normalizeGame } from '@/lib/gameSchema'
import type { Game } from '@/types'

interface Point {
  t: number
  globalElo: number
  leagueElo: number | null
}

async function fetchUserGames(uid: string): Promise<Game[]> {
  // Two queries to cover the unified schema (winnerIds / loserIds arrays).
  // Also query the legacy scalar fields so pre-migration docs still surface
  // on the chart; normalizeGame harmonises the shapes.
  const [
    wonSnap,
    lostSnap,
    wonLegacySnap,
    lostLegacySnap,
  ] = await Promise.all([
    getDocs(
      query(collection(db, 'games'), where('winnerIds', 'array-contains', uid)),
    ),
    getDocs(
      query(collection(db, 'games'), where('loserIds', 'array-contains', uid)),
    ),
    getDocs(query(collection(db, 'games'), where('winnerId', '==', uid))),
    getDocs(query(collection(db, 'games'), where('loserId', '==', uid))),
  ])

  const seen = new Set<string>()
  const games: Game[] = []
  for (const snap of [wonSnap, lostSnap, wonLegacySnap, lostLegacySnap]) {
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      games.push(normalizeGame({ id: d.id, ...d.data() }))
    }
  }

  return games.sort(
    (a, b) => (a.playedAt?.toMillis() ?? 0) - (b.playedAt?.toMillis() ?? 0),
  )
}

function buildPoints(uid: string, games: Game[], leagueId?: string): Point[] {
  const points: Point[] = []
  for (const game of games) {
    const snap = game.playerElo[uid]
    if (!snap) continue
    const t = game.playedAt?.toMillis() ?? Date.now()
    const globalElo = snap.globalAfter
    const leagueElo =
      leagueId && game.leagueId === leagueId ? snap.leagueAfter : null
    points.push({ t, globalElo, leagueElo })
  }
  return points
}

export default function EloHistoryChart({
  uid,
  leagueId,
}: {
  uid: string
  leagueId?: string
}) {
  const { data: games, isLoading } = useQuery({
    queryKey: ['user-games', uid],
    queryFn: () => fetchUserGames(uid),
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!games || games.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No games yet — record one to see your rating over time.
      </div>
    )
  }

  const points = buildPoints(uid, games, leagueId)

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="t"
            tickFormatter={(t) => new Date(t).toLocaleDateString()}
            stroke="currentColor"
            fontSize={12}
          />
          <YAxis stroke="currentColor" fontSize={12} domain={['auto', 'auto']} />
          <Tooltip
            labelFormatter={(t) => new Date(t as number).toLocaleString()}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              color: 'var(--popover-foreground)',
              borderRadius: 6,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="globalElo"
            name="Global"
            stroke="oklch(0.78 0.14 85)"
            dot={false}
            strokeWidth={2}
          />
          {leagueId && (
            <Line
              type="monotone"
              dataKey="leagueElo"
              name="League"
              stroke="oklch(0.62 0.14 155)"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
