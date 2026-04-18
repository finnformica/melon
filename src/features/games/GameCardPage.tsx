import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Link, useParams } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { ShareButton } from '@/components/shared/ShareButton'
import { getGame } from '@/lib/firestore'
import { deltaColorClass, formatDelta } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/schemas'
import type { Sport } from '@/lib/schemas'
import type { Game } from '@/types'

function initials(name: string | undefined): string {
  const source = (name ?? '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Defence-in-depth: never render something email-shaped on the public card,
// even if an old doc slipped through without passing through publicDisplayName.
function safeName(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (!value || value.includes('@')) return 'Player'
  return value
}

interface PanelPlayer {
  name: string
  globalBefore: number
  globalAfter: number
  leagueBefore: number
  leagueAfter: number
}

function TeamPanel({
  players,
  badge,
}: {
  players: PanelPlayer[]
  badge: 'Winner' | 'Loser'
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
      <div className="flex -space-x-2">
        {players.map((p, i) => (
          <Avatar key={`${p.name}-${i}`} className="h-16 w-16 border-2 border-background text-lg">
            <AvatarFallback>{initials(p.name)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="flex w-full flex-col items-center gap-1.5">
        <p className="w-full truncate text-lg font-semibold text-foreground">
          {players.length === 1
            ? players[0].name
            : players.length === 2
              ? `${players[0].name} & ${players[1].name}`
              : `Team of ${players.length}`}
        </p>
        <Badge variant={badge === 'Winner' ? 'default' : 'secondary'}>
          {badge}
        </Badge>
      </div>
      <div className="w-full space-y-1 text-sm">
        {players.map((p) => (
          <div key={p.name} className="flex flex-col items-center">
            {players.length > 1 && (
              <span className="text-xs text-muted-foreground">{p.name}</span>
            )}
            <div className="flex items-center justify-center gap-2 font-mono">
              <span className="text-muted-foreground">League</span>
              <span>{p.leagueAfter}</span>
              <span className={deltaColorClass(p.leagueBefore, p.leagueAfter)}>
                ({formatDelta(p.leagueBefore, p.leagueAfter)})
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 font-mono">
              <span className="text-muted-foreground">Global</span>
              <span>{p.globalAfter}</span>
              <span className={deltaColorClass(p.globalBefore, p.globalAfter)}>
                ({formatDelta(p.globalBefore, p.globalAfter)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function teamPanelPlayers(
  uids: string[],
  game: Game,
): PanelPlayer[] {
  return uids.map((uid) => {
    const snap = game.playerElo[uid] ?? {
      globalBefore: 0,
      globalAfter: 0,
      leagueBefore: 0,
      leagueAfter: 0,
    }
    return {
      name: safeName(game.displayNames?.[uid]),
      globalBefore: snap.globalBefore,
      globalAfter: snap.globalAfter,
      leagueBefore: snap.leagueBefore,
      leagueAfter: snap.leagueAfter,
    }
  })
}

export default function GameCardPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const { user } = useAuth()
  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => (gameId ? getGame(gameId) : Promise.resolve(null)),
    enabled: !!gameId,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Skeleton className="h-96 w-full max-w-lg" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold">Game not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This link may be broken or the game was deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const leagueName = game.leagueName || 'Melon league'
  const sportLabel = game.sport
    ? (SPORT_LABELS[game.sport as Sport] ?? game.sport)
    : ''

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6 pt-8 pb-8">
          <div className="text-center">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {sportLabel}
            </p>
            <h1 className="mt-1 text-xl font-semibold">{leagueName}</h1>
          </div>

          <div className="flex items-center gap-4">
            <TeamPanel
              players={teamPanelPlayers(game.winnerIds, game)}
              badge="Winner"
            />
            <div className="text-sm font-semibold text-muted-foreground">
              vs
            </div>
            <TeamPanel
              players={teamPanelPlayers(game.loserIds, game)}
              badge="Loser"
            />
          </div>

          {game.photoUrl && (
            <div className="flex justify-center">
              <img
                src={game.photoUrl}
                alt="Game"
                className="max-h-80 rounded-md border object-contain"
              />
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {game.playedAt
              ? format(game.playedAt.toDate(), "d MMM yyyy 'at' HH:mm")
              : ''}
          </p>

          <div className="flex flex-col items-center gap-2">
            <ShareButton
              url={window.location.href}
              label="Share"
              variant="default"
              size="default"
            />
            {user && (
              <Button asChild variant="ghost" size="sm">
                <Link to={`/leagues/${game.leagueId}`}>View league</Link>
              </Button>
            )}
            <p className="text-xs text-muted-foreground">Melon · ELO League Tracker</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
