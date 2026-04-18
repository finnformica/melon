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
import type { Game } from '@/types'

interface Point {
  t: number
  globalElo: number
  leagueElo: number | null
}

async function fetchUserGames(uid: string): Promise<Game[]> {
  const [wonSnap, lostSnap] = await Promise.all([
    getDocs(query(collection(db, 'games'), where('winnerId', '==', uid))),
    getDocs(query(collection(db, 'games'), where('loserId', '==', uid))),
  ])
  const games = [
    ...wonSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Game),
    ...lostSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Game),
  ]
  return games.sort(
    (a, b) => (a.playedAt?.toMillis() ?? 0) - (b.playedAt?.toMillis() ?? 0),
  )
}

function buildPoints(uid: string, games: Game[], leagueId?: string): Point[] {
  const points: Point[] = []
  for (const game of games) {
    const t = game.playedAt?.toMillis() ?? Date.now()
    const isWinner = game.winnerId === uid
    const globalElo = isWinner
      ? game.winnerGlobalEloAfter
      : game.loserGlobalEloAfter
    let leagueElo: number | null = null
    if (leagueId && game.leagueId === leagueId) {
      leagueElo = isWinner
        ? game.winnerLeagueEloAfter
        : game.loserLeagueEloAfter
    }
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
            stroke="oklch(0.556 0 0)"
            dot={false}
            strokeWidth={2}
          />
          {leagueId && (
            <Line
              type="monotone"
              dataKey="leagueElo"
              name="League"
              stroke="oklch(0.371 0 0)"
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
