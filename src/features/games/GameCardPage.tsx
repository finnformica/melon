import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { doc, getDoc } from 'firebase/firestore'
import { Share2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { db } from '@/lib/firebase'
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

async function fetchGame(id: string): Promise<Game | null> {
  const snap = await getDoc(doc(db, 'games', id))
  if (!snap.exists()) return null
  return { id, ...snap.data() } as Game
}

function PlayerPanel({
  name,
  eloBefore,
  eloAfter,
  leagueEloBefore,
  leagueEloAfter,
  badge,
}: {
  name: string
  eloBefore: number
  eloAfter: number
  leagueEloBefore: number
  leagueEloAfter: number
  badge: 'Winner' | 'Loser'
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-3 text-center">
      <Avatar className="h-20 w-20 text-xl">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-lg font-semibold">{name}</p>
        <Badge
          variant={badge === 'Winner' ? 'default' : 'secondary'}
          className="mt-1"
        >
          {badge}
        </Badge>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-center gap-2 font-mono">
          <span className="text-muted-foreground">League</span>
          <span>{leagueEloAfter}</span>
          <span className={deltaColorClass(leagueEloBefore, leagueEloAfter)}>
            ({formatDelta(leagueEloBefore, leagueEloAfter)})
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 font-mono">
          <span className="text-muted-foreground">Global</span>
          <span>{eloAfter}</span>
          <span className={deltaColorClass(eloBefore, eloAfter)}>
            ({formatDelta(eloBefore, eloAfter)})
          </span>
        </div>
      </div>
    </div>
  )
}

export default function GameCardPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const { user } = useAuth()
  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => (gameId ? fetchGame(gameId) : Promise.resolve(null)),
    enabled: !!gameId,
  })

  async function share() {
    if (typeof window === 'undefined') return
    const url = window.location.href
    const winnerName = game?.winnerDisplayName ?? 'Player'
    const loserName = game?.loserDisplayName ?? 'Player'
    const text = `${winnerName} defeated ${loserName}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Melon game result', text, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      }
    } catch {
      // user cancelled
    }
  }

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

  const winnerName = game.winnerDisplayName || 'Player'
  const loserName = game.loserDisplayName || 'Player'
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
            <PlayerPanel
              name={winnerName}
              eloBefore={game.winnerGlobalEloBefore}
              eloAfter={game.winnerGlobalEloAfter}
              leagueEloBefore={game.winnerLeagueEloBefore}
              leagueEloAfter={game.winnerLeagueEloAfter}
              badge="Winner"
            />
            <div className="text-sm font-semibold text-muted-foreground">
              vs
            </div>
            <PlayerPanel
              name={loserName}
              eloBefore={game.loserGlobalEloBefore}
              eloAfter={game.loserGlobalEloAfter}
              leagueEloBefore={game.loserLeagueEloBefore}
              leagueEloAfter={game.loserLeagueEloAfter}
              badge="Loser"
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {game.playedAt
              ? format(game.playedAt.toDate(), "d MMM yyyy 'at' HH:mm")
              : ''}
          </p>

          <div className="flex flex-col items-center gap-2">
            <Button onClick={() => void share()} className="w-full">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
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
