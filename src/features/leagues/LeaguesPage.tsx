import { Plus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeagues } from '@/hooks/useLeagues'
import { SPORT_LABELS } from '@/lib/schemas'
import type { Sport } from '@/lib/schemas'

export default function LeaguesPage() {
  const { data: leagues, isLoading } = useLeagues()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your leagues</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/leagues/join">
              <Users className="mr-2 h-4 w-4" />
              Join
            </Link>
          </Button>
          <Button asChild>
            <Link to="/leagues/create">
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !leagues || leagues.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No leagues yet</CardTitle>
            <CardDescription>
              Create your first league, or join one with an invite code.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link key={league.id} to={`/leagues/${league.id}`}>
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle>{league.name}</CardTitle>
                  <CardDescription>
                    {SPORT_LABELS[league.sport as Sport] ?? league.sport}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                    {league.inviteCode}
                  </code>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
