import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { useGames } from '@/hooks/useGames'
import { useLeagueRole } from '@/hooks/useLeagueRole'
import { useMembers } from '@/hooks/useMembers'
import { deleteGame } from '@/lib/firestore'
import { deltaColorClass, formatDelta } from '@/lib/format'
import type { Game } from '@/types'

export default function GameHistoryList({ leagueId }: { leagueId: string }) {
  const { data: games, isLoading } = useGames(leagueId, { limit: 50 })
  const { data: members } = useMembers(leagueId)
  const { data: role } = useLeagueRole(leagueId)
  const { user } = useAuth()

  const [pendingDelete, setPendingDelete] = useState<Game | null>(null)
  const [busy, setBusy] = useState(false)

  const displayName = (uid: string): string => {
    const member = members?.find((m) => m.membership.userId === uid)
    return (
      member?.user?.displayName || member?.user?.email || 'Unknown player'
    )
  }

  const canDelete = (game: Game): boolean => {
    if (!user) return false
    if (role === 'owner' || role === 'admin') return true
    return game.winnerId === user.uid || game.loserId === user.uid
  }

  async function share(game: Game) {
    const url = `${window.location.origin}/g/${game.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  async function runDelete() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteGame(pendingDelete.id)
      toast.success('Game deleted')
      setPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
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
    <>
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
                <div className="flex items-center gap-3 font-mono text-xs">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => void share(game)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      {canDelete(game) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setPendingDelete(game)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete game
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        {pendingDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this game?</AlertDialogTitle>
              <AlertDialogDescription>
                {displayName(pendingDelete.winnerId)} defeated{' '}
                {displayName(pendingDelete.loserId)}. All subsequent games in
                this league will be recalculated to keep standings consistent.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault()
                  void runDelete()
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}
