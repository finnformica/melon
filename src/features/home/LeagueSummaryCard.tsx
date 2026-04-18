import { formatDistanceToNow } from 'date-fns'
import { ChevronRight, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import EloHistoryChart from '@/features/standings/EloHistoryChart'
import type { LeagueMember } from '@/hooks/useMembers'
import { useMembers } from '@/hooks/useMembers'
import { useGames } from '@/hooks/useGames'
import { deltaColorClass, formatDelta } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/schemas'
import type { Sport } from '@/lib/schemas'
import type { Game, League } from '@/types'

function name(m: LeagueMember): string {
  return m.user?.displayName || m.user?.email || 'Unknown'
}

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatTeam(uids: string[], nameOf: (uid: string) => string): string {
  if (uids.length === 0) return '—'
  if (uids.length === 1) return nameOf(uids[0])
  if (uids.length === 2) return `${nameOf(uids[0])} & ${nameOf(uids[1])}`
  return `${nameOf(uids[0])} + ${uids.length - 1} others`
}

export function LeagueSummaryCard({
  league,
  currentUserId,
}: {
  league: League
  currentUserId: string
}) {
  const { data: members, isLoading: membersLoading } = useMembers(league.id)
  const { data: games, isLoading: gamesLoading } = useGames(league.id, {
    limit: 10,
  })

  const nameOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members ?? []) map.set(m.membership.userId, name(m))
    return (uid: string): string => map.get(uid) ?? 'Unknown'
  }, [members])

  const rank = useMemo(() => {
    if (!members) return null
    const idx = members.findIndex((m) => m.membership.userId === currentUserId)
    return idx < 0 ? null : idx + 1
  }, [members, currentUserId])

  const myMembership = useMemo(
    () => members?.find((m) => m.membership.userId === currentUserId) ?? null,
    [members, currentUserId],
  )

  const top3 = members?.slice(0, 3) ?? []
  const lastGame: Game | null = games?.[0] ?? null
  const recentForUser = useMemo(() => {
    if (!games) return []
    return games
      .filter(
        (g) =>
          g.winnerIds.includes(currentUserId) ||
          g.loserIds.includes(currentUserId),
      )
      .slice(0, 5)
  }, [games, currentUserId])

  const sportLabel = SPORT_LABELS[league.sport as Sport] ?? league.sport

  return (
    <Link
      to={`/leagues/${league.id}`}
      className="block transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-heading text-base font-semibold">
                {league.name}
              </h2>
              <Badge variant="outline" className="text-[10px] uppercase">
                {sportLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {rank !== null && myMembership ? (
                <>
                  Your rank:{' '}
                  <span className="font-medium text-foreground">#{rank}</span>
                  {' · '}
                  <span className="font-mono">
                    {myMembership.membership.leagueElo}
                  </span>{' '}
                  league ELO
                </>
              ) : membersLoading ? (
                'Loading…'
              ) : (
                'Not a member'
              )}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-md border bg-muted/20 p-1">
            <EloHistoryChart uid={currentUserId} leagueId={league.id} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              <span>Standings</span>
            </div>
            {membersLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : top3.length > 0 ? (
              top3.map((m, i) => {
                const medalClass = [
                  'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400',
                  'bg-slate-200/60 text-slate-500 dark:text-slate-400',
                  'bg-orange-400/20 text-orange-600 dark:text-orange-500',
                ][i]
                return (
                  <div key={m.membership.userId} className="flex items-center gap-2 text-sm">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${medalClass}`}>
                      {i + 1}
                    </span>
                    <Avatar size="sm">
                      <AvatarImage src={m.user?.photoURL || undefined} />
                      <AvatarFallback>{initials(name(m))}</AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium">{name(m)}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {m.membership.leagueElo}
                    </span>
                  </div>
                )
              })
            ) : (
              <span className="text-sm text-muted-foreground">No members yet</span>
            )}
          </div>

          {gamesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : lastGame ? (
            <LastGameTile game={lastGame} nameOf={nameOf} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No games recorded yet — tap + to record one.
            </p>
          )}

          {recentForUser.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Recent form:</span>
              <div className="flex gap-1">
                {recentForUser.map((g) => {
                  const won = g.winnerIds.includes(currentUserId)
                  return (
                    <span
                      key={g.id}
                      className={
                        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ' +
                        (won
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-400')
                      }
                    >
                      {won ? 'W' : 'L'}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function LastGameTile({
  game,
  nameOf,
}: {
  game: Game
  nameOf: (uid: string) => string
}) {
  const winnerSnap = game.playerElo[game.winnerIds[0]]
  const loserSnap = game.playerElo[game.loserIds[0]]
  const when = game.playedAt
    ? formatDistanceToNow(game.playedAt.toDate(), { addSuffix: true })
    : 'just now'

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last game · {when}
          </p>
          <p className="text-sm">
            <span className="font-semibold">
              {formatTeam(game.winnerIds, nameOf)}
            </span>{' '}
            <span className="text-muted-foreground">beat</span>{' '}
            <span className="font-semibold">
              {formatTeam(game.loserIds, nameOf)}
            </span>
          </p>
          <div className="flex gap-3 font-mono text-xs">
            {winnerSnap && (
              <span
                className={deltaColorClass(
                  winnerSnap.leagueBefore,
                  winnerSnap.leagueAfter,
                )}
              >
                W {formatDelta(winnerSnap.leagueBefore, winnerSnap.leagueAfter)}
              </span>
            )}
            {loserSnap && (
              <span
                className={deltaColorClass(
                  loserSnap.leagueBefore,
                  loserSnap.leagueAfter,
                )}
              >
                L {formatDelta(loserSnap.leagueBefore, loserSnap.leagueAfter)}
              </span>
            )}
          </div>
        </div>
        {game.photoUrl && (
          <img
            src={game.photoUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-md border object-cover"
          />
        )}
      </div>
    </div>
  )
}
