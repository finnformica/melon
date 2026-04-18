import { zodResolver } from '@hookform/resolvers/zod'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
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
import { Input } from '@/components/ui/input'
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
import { useLeagueRole } from '@/hooks/useLeagueRole'
import {
  deleteLeague,
  renameLeague,
  resetLeagueElos,
  rotateInviteCode,
} from '@/lib/firestore'
import {
  SPORTS,
  SPORT_LABELS,
  renameLeagueInputSchema,
} from '@/lib/schemas'
import type { RenameLeagueInput, Sport } from '@/lib/schemas'

type Dialog = 'reset' | 'delete' | null

export default function LeagueSettingsPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const navigate = useNavigate()
  const { data: league, isLoading: loadingLeague } = useLeague(leagueId)
  const { data: role, isLoading: loadingRole } = useLeagueRole(leagueId)

  const [dialog, setDialog] = useState<Dialog>(null)
  const [busy, setBusy] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<RenameLeagueInput>({
    resolver: zodResolver(renameLeagueInputSchema),
    defaultValues: { name: '', sport: 'football' },
  })

  useEffect(() => {
    if (league) {
      reset({
        name: league.name,
        sport: (SPORTS as readonly string[]).includes(league.sport)
          ? (league.sport as Sport)
          : 'other',
      })
    }
  }, [league, reset])

  const sport = watch('sport')

  if (loadingLeague || loadingRole) {
    return <Skeleton className="h-64 w-full" />
  }

  if (!league || !leagueId) {
    return <Navigate to="/leagues" replace />
  }

  if (role !== 'owner' && role !== 'admin') {
    return <Navigate to={`/leagues/${leagueId}`} replace />
  }

  const isOwner = role === 'owner'

  async function onRename(data: RenameLeagueInput) {
    if (!leagueId) return
    try {
      await renameLeague(leagueId, data)
      toast.success('League updated')
      reset(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function rotate() {
    if (!leagueId) return
    setBusy(true)
    try {
      const code = await rotateInviteCode(leagueId)
      toast.success(`New invite code: ${code}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rotate code')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDialog() {
    if (!leagueId) return
    setBusy(true)
    try {
      if (dialog === 'reset') {
        await resetLeagueElos(leagueId)
        toast.success('League ELOs reset')
      } else if (dialog === 'delete') {
        await deleteLeague(leagueId)
        toast.success('League deleted')
        navigate('/leagues', { replace: true })
        return
      }
      setDialog(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">League settings</h1>
        <p className="text-sm text-muted-foreground">{league.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Name and sport shown across the app.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onRename)}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sport">Sport</Label>
              <Select
                value={sport}
                onValueChange={(v) =>
                  setValue('sport', v as Sport, { shouldDirty: true })
                }
              >
                <SelectTrigger id="sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPORTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SPORT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite code</CardTitle>
          <CardDescription>
            Current code:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              {league.inviteCode}
            </code>
            . Rotating it invalidates existing invite links.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={() => void rotate()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rotate code
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset ELOs</CardTitle>
          <CardDescription>
            Sets every member's league ELO back to 1000 and clears their W/L
            record. Game history is kept.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={() => setDialog('reset')}>
            Reset league ELOs
          </Button>
        </CardFooter>
      </Card>

      {isOwner && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Deletes the league, all memberships, and all game history.
              Cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setDialog('delete')}
            >
              Delete league
            </Button>
          </CardFooter>
        </Card>
      )}

      <AlertDialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {dialog === 'reset' ? 'Reset all ELOs?' : 'Delete this league?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {dialog === 'reset'
                  ? 'Every member returns to 1000 ELO and 0-0 record. Game history stays.'
                  : 'All memberships and games will be permanently deleted. This cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault()
                  void confirmDialog()
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  )
}
