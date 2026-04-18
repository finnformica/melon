import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import EloHistoryChart from '@/features/standings/EloHistoryChart'
import { getLeague, getMembershipsByUser, getUser } from '@/lib/firestore'
import { formatRecord } from '@/lib/format'
import type { League, Membership, User } from '@/types'

interface ProfileData {
  user: User
  entries: { membership: Membership; league: League | null }[]
}

async function fetchProfile(uid: string): Promise<ProfileData | null> {
  const [user, memberships] = await Promise.all([
    getUser(uid),
    getMembershipsByUser(uid),
  ])
  if (!user) return null
  const leagues = await Promise.all(memberships.map((m) => getLeague(m.leagueId)))
  const entries = memberships
    .map((membership, i) => ({ membership, league: leagues[i] }))
    .sort((a, b) => b.membership.leagueElo - a.membership.leagueElo)
  return { user, entries }
}

export default function PlayerProfilePage() {
  const { uid } = useParams<{ uid: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['profile', uid],
    queryFn: () => (uid ? fetchProfile(uid) : Promise.resolve(null)),
    enabled: !!uid,
  })

  if (isLoading || !uid) return <Skeleton className="h-96 w-full" />

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player not found</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const { user, entries } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {user.displayName || user.email || 'Unknown player'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Global ELO {user.globalElo} ·{' '}
          {formatRecord(user.globalWins, user.globalLosses)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rating over time</CardTitle>
          <CardDescription>Global ELO from recorded games.</CardDescription>
        </CardHeader>
        <CardContent>
          <EloHistoryChart uid={user.uid} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>League ratings</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leagues joined.</p>
          ) : (
            <ul className="divide-y">
              {entries.map(({ membership, league }) => (
                <li
                  key={membership.id}
                  className="flex items-center justify-between py-3"
                >
                  <Link
                    to={`/leagues/${membership.leagueId}`}
                    className="hover:underline"
                  >
                    {league?.name ?? membership.leagueId}
                  </Link>
                  <div className="flex gap-4 text-sm">
                    <span className="font-mono">{membership.leagueElo}</span>
                    <span className="text-muted-foreground">
                      {formatRecord(
                        membership.leagueWins,
                        membership.leagueLosses,
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
