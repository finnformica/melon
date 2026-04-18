import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useMemo } from 'react'
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
import { useGames } from '@/hooks/useGames'
import { useMembers } from '@/hooks/useMembers'
import { db } from '@/lib/firebase'
import { normalizeGame } from '@/lib/gameSchema'
import { isNpcId } from '@/lib/npc'
import type { Game } from '@/types'

const PLAYER_PALETTE = [
  'oklch(0.78 0.14 85)',
  'oklch(0.62 0.14 155)',
  'oklch(0.65 0.18 25)',
  'oklch(0.70 0.15 250)',
  'oklch(0.65 0.20 320)',
  'oklch(0.78 0.13 50)',
  'oklch(0.70 0.13 195)',
  'oklch(0.68 0.18 0)',
]

export default function EloHistoryChart({
  uid,
  leagueId,
}: {
  uid: string
  leagueId?: string
}) {
  if (leagueId) return <LeagueChart leagueId={leagueId} />
  return <UserGlobalChart uid={uid} />
}

// ---------- League mode: every player's league ELO over time ----------

interface LeagueRow {
  t: number
  [uid: string]: number
}

function LeagueChart({ leagueId }: { leagueId: string }) {
  const { data: games, isLoading } = useGames(leagueId)
  const { data: members } = useMembers(leagueId)

  const { rows, players } = useMemo(() => {
    if (!games || games.length === 0) {
      return { rows: [] as LeagueRow[], players: [] as string[] }
    }
    const sorted = [...games].sort(
      (a, b) => (a.playedAt?.toMillis() ?? 0) - (b.playedAt?.toMillis() ?? 0),
    )

    const everPlayed = new Set<string>()
    for (const g of sorted) {
      for (const u of g.winnerIds) if (!isNpcId(u)) everPlayed.add(u)
      for (const u of g.loserIds) if (!isNpcId(u)) everPlayed.add(u)
    }
    const players = [...everPlayed]

    const current = new Map<string, number>(players.map((u) => [u, 1000]))
    const t0 = (sorted[0].playedAt?.toMillis() ?? Date.now()) - 1
    const rows: LeagueRow[] = [{ t: t0, ...Object.fromEntries(current) }]

    for (const g of sorted) {
      for (const u of [...g.winnerIds, ...g.loserIds]) {
        const snap = g.playerElo[u]
        if (snap) current.set(u, snap.leagueAfter)
      }
      const t = g.playedAt?.toMillis() ?? Date.now()
      rows.push({ t, ...Object.fromEntries(current) })
    }

    return { rows, players }
  }, [games])

  const nameOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members ?? []) {
      const n = m.user?.displayName || m.user?.email
      if (n) map.set(m.membership.userId, n)
    }
    for (const g of games ?? []) {
      if (!g.displayNames) continue
      for (const [u, n] of Object.entries(g.displayNames)) {
        if (!map.has(u)) map.set(u, n)
      }
    }
    return (u: string): string => map.get(u) ?? u.slice(0, 6)
  }, [members, games])

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (rows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No games yet — record one to see ratings over time.
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={rows}>
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
          {players.map((u, i) => (
            <Line
              key={u}
              type="monotone"
              dataKey={u}
              name={nameOf(u)}
              stroke={PLAYER_PALETTE[i % PLAYER_PALETTE.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- Player profile mode: single user's global ELO over time ----------

interface UserPoint {
  t: number
  globalElo: number
}

async function fetchUserGames(uid: string): Promise<Game[]> {
  const [wonSnap, lostSnap, wonLegacySnap, lostLegacySnap] = await Promise.all([
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

function UserGlobalChart({ uid }: { uid: string }) {
  const { data: games, isLoading } = useQuery({
    queryKey: ['user-games', uid],
    queryFn: () => fetchUserGames(uid),
  })

  const points = useMemo<UserPoint[]>(() => {
    if (!games || games.length === 0) return []
    const out: UserPoint[] = []
    const t0 = (games[0].playedAt?.toMillis() ?? Date.now()) - 1
    out.push({ t: t0, globalElo: 1000 })
    for (const g of games) {
      const snap = g.playerElo[uid]
      if (!snap) continue
      const t = g.playedAt?.toMillis() ?? Date.now()
      out.push({ t, globalElo: snap.globalAfter })
    }
    return out
  }, [games, uid])

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No games yet — record one to see your rating over time.
      </div>
    )
  }

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
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
