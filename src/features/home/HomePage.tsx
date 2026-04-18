import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { useLeagues } from '@/hooks/useLeagues'
import { useRecentUserGame } from '@/hooks/useRecentUserGame'

import { LeagueSummaryCard } from './LeagueSummaryCard'
import { ProfileSummaryCard } from './ProfileSummaryCard'

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const { data: leagues, isLoading: leaguesLoading } = useLeagues()
  const { data: lastGame } = useRecentUserGame(user?.uid)

  if (authLoading || !user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <ProfileSummaryCard user={user} lastGame={lastGame ?? null} />

      {leaguesLoading ? (
        <>
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </>
      ) : leagues && leagues.length > 0 ? (
        leagues.map((league) => (
          <LeagueSummaryCard
            key={league.id}
            league={league}
            currentUserId={user.uid}
          />
        ))
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <CardTitle>No leagues yet</CardTitle>
            <CardDescription>
              Create a league to track ratings with your friends, or join an
              existing one with an invite code.
            </CardDescription>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button asChild>
                <Link to="/leagues/create">Create league</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/leagues/join">Join league</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
