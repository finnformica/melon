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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
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
    return game.winnerIds.includes(user.uid) || game.loserIds.includes(user.uid)
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
        <CardContent className="px-6 pt-2 pb-3">
          <ul className="divide-y">
            {games.map((game) => (
              <li
                key={game.id}
                onClick={() => setSelectedGame(game)}
                className="flex cursor-pointer flex-col gap-2 py-2 transition-colors hover:opacity-80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm">
                    <span className="font-medium">
                      {formatTeam(game.winnerIds, displayName)}
                    </span>{' '}
                    <span className="text-muted-foreground">defeated</span>{' '}
                    <span className="font-medium">
                      {formatTeam(game.loserIds, displayName)}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {game.playedAt
                      ? formatDistanceToNow(game.playedAt.toDate(), {
                          addSuffix: true,
                        })
                      : 'just now'}
                  </span>
                  {game.photoUrl && (
                    <img
                      src={game.photoUrl}
                      alt="Game photo"
                      className="h-12 w-12 rounded border object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <TeamDeltaPill uids={game.winnerIds} game={game} />
                  <TeamDeltaPill uids={game.loserIds} game={game} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
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
                {formatTeam(pendingDelete.winnerIds, displayName)} defeated{' '}
                {formatTeam(pendingDelete.loserIds, displayName)}. All
                subsequent games in this league will be recalculated to keep
                standings consistent. This cannot be undone.
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

      <Dialog
        open={selectedGame !== null}
        onOpenChange={(o) => !o && setSelectedGame(null)}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selectedGame && (
            <>
              {selectedGame.photoUrl && (
                <img
                  src={selectedGame.photoUrl}
                  alt="Game photo"
                  className="w-full object-contain max-h-72"
                />
              )}
              <div className="px-6 pt-4 pb-6 space-y-4">
                <DialogHeader>
                  <DialogTitle>
                    {formatTeam(selectedGame.winnerIds, displayName)} defeated{' '}
                    {formatTeam(selectedGame.loserIds, displayName)}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedGame.playedAt
                      ? formatDistanceToNow(selectedGame.playedAt.toDate(), {
                          addSuffix: true,
                        })
                      : 'just now'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  {[...selectedGame.winnerIds, ...selectedGame.loserIds].map((uid) => {
                    const snap = selectedGame.playerElo[uid]
                    const isWinner = selectedGame.winnerIds.includes(uid)
                    if (!snap) return null
                    return (
                      <div key={uid} className="flex items-center justify-between gap-2">
                        <span className={`truncate text-xs font-medium${isWinner ? '' : ' text-muted-foreground'}`}>
                          {displayName(uid)}
                        </span>
                        <div className="flex gap-3 font-mono text-xs">
                          <span className={deltaColorClass(snap.globalBefore, snap.globalAfter)}>
                            G {formatDelta(snap.globalBefore, snap.globalAfter)}
                          </span>
                          <span className={deltaColorClass(snap.leagueBefore, snap.leagueAfter)}>
                            L {formatDelta(snap.leagueBefore, snap.leagueAfter)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatTeam(uids: string[], name: (uid: string) => string): string {
  if (uids.length === 0) return '—'
  if (uids.length === 1) return name(uids[0])
  if (uids.length === 2) return `${name(uids[0])} & ${name(uids[1])}`
  return `${name(uids[0])} + ${uids.length - 1} others`
}

function TeamDeltaPill({ uids, game }: { uids: string[]; game: Game }) {
  // All teammates share the same league delta, so read any one entry.
  const snap = uids.map((u) => game.playerElo[u]).find(Boolean)
  if (!snap) return null
  return (
    <span className={deltaColorClass(snap.leagueBefore, snap.leagueAfter)}>
      L {formatDelta(snap.leagueBefore, snap.leagueAfter)}
    </span>
  )
}
