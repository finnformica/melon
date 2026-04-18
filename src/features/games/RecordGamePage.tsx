import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeague } from '@/hooks/useLeague'
import { useMembers } from '@/hooks/useMembers'
import { K_GLOBAL, K_LEAGUE, calculateElo } from '@/lib/elo'
import { recordGame } from '@/lib/firestore'
import { recordGameInputSchema } from '@/lib/schemas'
import type { RecordGameInput } from '@/lib/schemas'
import { deltaColorClass, formatDelta } from '@/lib/format'

export default function RecordGamePage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const navigate = useNavigate()
  const { data: league, isLoading: loadingLeague } = useLeague(leagueId)
  const { data: members, isLoading: loadingMembers } = useMembers(leagueId)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<RecordGameInput>({
    resolver: zodResolver(recordGameInputSchema),
    defaultValues: { leagueId: leagueId ?? '', winnerId: '', loserId: '' },
    mode: 'onChange',
  })

  const winnerId = watch('winnerId')
  const loserId = watch('loserId')

  const deltas = useMemo(() => {
    if (!winnerId || !loserId || winnerId === loserId || !members) return null
    const winner = members.find((m) => m.membership.userId === winnerId)
    const loser = members.find((m) => m.membership.userId === loserId)
    if (!winner?.user || !loser?.user) return null

    const global = calculateElo(
      winner.user.globalElo,
      loser.user.globalElo,
      K_GLOBAL,
    )
    const league = calculateElo(
      winner.membership.leagueElo,
      loser.membership.leagueElo,
      K_LEAGUE,
    )

    return {
      winnerName:
        winner.user.displayName || winner.user.email || 'Winner',
      loserName: loser.user.displayName || loser.user.email || 'Loser',
      winnerGlobal: {
        before: winner.user.globalElo,
        after: global.winner,
      },
      loserGlobal: {
        before: loser.user.globalElo,
        after: global.loser,
      },
      winnerLeague: {
        before: winner.membership.leagueElo,
        after: league.winner,
      },
      loserLeague: {
        before: loser.membership.leagueElo,
        after: league.loser,
      },
    }
  }, [winnerId, loserId, members])

  async function onConfirmedSubmit(data: RecordGameInput) {
    setSubmitting(true)
    try {
      await recordGame(data)
      toast.success('Game recorded')
      navigate(`/leagues/${data.leagueId}/games`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not record game',
      )
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  if (loadingLeague || loadingMembers) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!league) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>League not found</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!members || members.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not enough members</CardTitle>
          <CardDescription>
            You need at least two players in this league to record a game.
            Share the invite code from the league page.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Record a game — {league.name}</CardTitle>
          <CardDescription>
            Select the winner and loser. ELO is updated atomically on both
            tracks.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={handleSubmit(() => {
            setConfirmOpen(true)
          })}
        >
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="winner">Winner</Label>
              <Select
                value={winnerId}
                onValueChange={(v) =>
                  setValue('winnerId', v, { shouldValidate: true })
                }
              >
                <SelectTrigger id="winner">
                  <SelectValue placeholder="Pick winner" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(({ membership, user }) => (
                    <SelectItem
                      key={membership.userId}
                      value={membership.userId}
                    >
                      {user?.displayName || user?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loser">Loser</Label>
              <Select
                value={loserId}
                onValueChange={(v) =>
                  setValue('loserId', v, { shouldValidate: true })
                }
              >
                <SelectTrigger id="loser">
                  <SelectValue placeholder="Pick loser" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m) => m.membership.userId !== winnerId)
                    .map(({ membership, user }) => (
                      <SelectItem
                        key={membership.userId}
                        value={membership.userId}
                      >
                        {user?.displayName || user?.email || 'Unknown'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.loserId && (
                <p className="text-sm text-destructive">
                  {errors.loserId.message}
                </p>
              )}
            </div>

            {deltas && (
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="font-medium">Rating changes</p>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <span className="text-muted-foreground">
                    {deltas.winnerName} · global
                  </span>
                  <span
                    className={`text-right font-mono ${deltaColorClass(
                      deltas.winnerGlobal.before,
                      deltas.winnerGlobal.after,
                    )}`}
                  >
                    {deltas.winnerGlobal.before} → {deltas.winnerGlobal.after} (
                    {formatDelta(
                      deltas.winnerGlobal.before,
                      deltas.winnerGlobal.after,
                    )}
                    )
                  </span>
                  <span className="text-muted-foreground">
                    {deltas.winnerName} · league
                  </span>
                  <span
                    className={`text-right font-mono ${deltaColorClass(
                      deltas.winnerLeague.before,
                      deltas.winnerLeague.after,
                    )}`}
                  >
                    {deltas.winnerLeague.before} → {deltas.winnerLeague.after} (
                    {formatDelta(
                      deltas.winnerLeague.before,
                      deltas.winnerLeague.after,
                    )}
                    )
                  </span>
                  <span className="text-muted-foreground">
                    {deltas.loserName} · global
                  </span>
                  <span
                    className={`text-right font-mono ${deltaColorClass(
                      deltas.loserGlobal.before,
                      deltas.loserGlobal.after,
                    )}`}
                  >
                    {deltas.loserGlobal.before} → {deltas.loserGlobal.after} (
                    {formatDelta(
                      deltas.loserGlobal.before,
                      deltas.loserGlobal.after,
                    )}
                    )
                  </span>
                  <span className="text-muted-foreground">
                    {deltas.loserName} · league
                  </span>
                  <span
                    className={`text-right font-mono ${deltaColorClass(
                      deltas.loserLeague.before,
                      deltas.loserLeague.after,
                    )}`}
                  >
                    {deltas.loserLeague.before} → {deltas.loserLeague.after} (
                    {formatDelta(
                      deltas.loserLeague.before,
                      deltas.loserLeague.after,
                    )}
                    )
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/leagues/${league.id}`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              Record game
            </Button>
          </CardFooter>
        </form>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm game result</AlertDialogTitle>
            <AlertDialogDescription>
              {deltas &&
                `${deltas.winnerName} defeats ${deltas.loserName}. Games are immutable — this cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={() =>
                void handleSubmit(onConfirmedSubmit)()
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
