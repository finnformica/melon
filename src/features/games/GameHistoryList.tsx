import { formatDistanceToNow } from 'date-fns'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGames } from '@/hooks/useGames'
import { useMembers } from '@/hooks/useMembers'
import { deltaColorClass, formatDelta } from '@/lib/format'

export default function GameHistoryList({ leagueId }: { leagueId: string }) {
  const { data: games, isLoading } = useGames(leagueId, { limit: 50 })
  const { data: members } = useMembers(leagueId)

  const displayName = (uid: string): string => {
    const member = members?.find((m) => m.membership.userId === uid)
    return (
      member?.user?.displayName || member?.user?.email || 'Unknown player'
    )
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />

  if (!games || games.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No games yet</CardTitle>
          <CardDescription>
            Record your first game to populate the history.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <ul className="divide-y">
          {games.map((game) => (
            <li
              key={game.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col">
                <span className="text-sm">
                  <span className="font-medium">
                    {displayName(game.winnerId)}
                  </span>{' '}
                  <span className="text-muted-foreground">defeated</span>{' '}
                  <span className="font-medium">
                    {displayName(game.loserId)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {game.playedAt
                    ? formatDistanceToNow(game.playedAt.toDate(), {
                        addSuffix: true,
                      })
                    : 'just now'}
                </span>
              </div>
              <div className="flex gap-3 font-mono text-xs">
                <span
                  className={deltaColorClass(
                    game.winnerLeagueEloBefore,
                    game.winnerLeagueEloAfter,
                  )}
                >
                  L{' '}
                  {formatDelta(
                    game.winnerLeagueEloBefore,
                    game.winnerLeagueEloAfter,
                  )}
                </span>
                <span
                  className={deltaColorClass(
                    game.loserLeagueEloBefore,
                    game.loserLeagueEloAfter,
                  )}
                >
                  L{' '}
                  {formatDelta(
                    game.loserLeagueEloBefore,
                    game.loserLeagueEloAfter,
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
