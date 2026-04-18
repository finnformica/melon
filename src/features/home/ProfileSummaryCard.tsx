import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Game, User } from '@/types'

function initials(name: string | undefined, email: string | undefined): string {
  const source = (name || email || '?').trim()
  const parts = source.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ProfileSummaryCard({
  user,
  lastGame,
  loading,
}: {
  user: User | null
  lastGame: Game | null
  loading?: boolean
}) {
  if (loading || !user) {
    return <Skeleton className="h-24 w-full" />
  }

  const snap = lastGame?.playerElo[user.uid] ?? null
  const delta = snap ? snap.globalAfter - snap.globalBefore : null
  const hasGames = user.globalWins + user.globalLosses > 0

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar size="lg">
          <AvatarImage src={user.photoURL || undefined} />
          <AvatarFallback>{initials(user.displayName, user.email)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium">
            {user.displayName || user.email}
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-mono text-lg font-semibold">
              {user.globalElo}
            </span>
            <DeltaIndicator delta={delta} hasGames={hasGames} />
            <span className="text-muted-foreground">
              {user.globalWins}W – {user.globalLosses}L
            </span>
          </div>
          {!hasGames && (
            <p className="text-xs text-muted-foreground">
              No games played yet — tap + to record your first.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DeltaIndicator({
  delta,
  hasGames,
}: {
  delta: number | null
  hasGames: boolean
}) {
  if (!hasGames || delta === null) {
    return null
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <ArrowUp className="h-3 w-3" />+{delta}
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
        <ArrowDown className="h-3 w-3" />
        {delta}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />0
    </span>
  )
}
