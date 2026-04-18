import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLeague } from '@/hooks/useLeague'
import type { LeagueMember } from '@/hooks/useMembers'
import { useMembers } from '@/hooks/useMembers'
import { K_GLOBAL, K_LEAGUE, calculateTeamElo } from '@/lib/elo'
import { deltaColorClass, formatDelta } from '@/lib/format'
import { recordGame, setGamePhoto } from '@/lib/firestore'
import { recordGameInputSchema } from '@/lib/schemas'
import type { RecordGameInput } from '@/lib/schemas'
import { MAX_INPUT_BYTES, fileToCompressedDataUrl } from '@/lib/image'

type GameType = '1v1' | 'team'

function memberName(m: LeagueMember): string {
  return m.user?.displayName || m.user?.email || 'Unknown'
}

interface TeamDelta {
  uid: string
  name: string
  globalBefore: number
  globalAfter: number
  leagueBefore: number
  leagueAfter: number
}

export default function RecordGamePage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const navigate = useNavigate()
  const { data: league, isLoading: loadingLeague } = useLeague(leagueId)
  const { data: members, isLoading: loadingMembers } = useMembers(leagueId)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<RecordGameInput>({
    resolver: zodResolver(recordGameInputSchema),
    defaultValues: {
      leagueId: leagueId ?? '',
      gameType: '1v1',
      winnerIds: [],
      loserIds: [],
    },
    mode: 'onChange',
  })

  const gameType = watch('gameType')
  const rawWinnerIds = watch('winnerIds')
  const rawLoserIds = watch('loserIds')
  const winnerIds = useMemo(() => rawWinnerIds ?? [], [rawWinnerIds])
  const loserIds = useMemo(() => rawLoserIds ?? [], [rawLoserIds])

  useEffect(() => {
    if (leagueId) {
      setValue('leagueId', leagueId)
    }
  }, [leagueId, setValue])

  const memberByUid = useMemo(() => {
    const map = new Map<string, LeagueMember>()
    for (const m of members ?? []) map.set(m.membership.userId, m)
    return map
  }, [members])

  const availableForWinner = useMemo(
    () => (members ?? []).filter((m) => !loserIds.includes(m.membership.userId)),
    [members, loserIds],
  )
  const availableForLoser = useMemo(
    () =>
      (members ?? []).filter((m) => !winnerIds.includes(m.membership.userId)),
    [members, winnerIds],
  )

  function switchMode(next: GameType) {
    // When switching to 1v1, keep at most one uid per side. When switching to
    // Team, keep as-is.
    if (next === '1v1') {
      setValue('winnerIds', winnerIds.slice(0, 1), { shouldValidate: true })
      setValue('loserIds', loserIds.slice(0, 1), { shouldValidate: true })
    }
    setValue('gameType', next, { shouldValidate: true })
  }

  function addPlayer(side: 'winnerIds' | 'loserIds', uid: string) {
    if (!uid) return
    const current = side === 'winnerIds' ? winnerIds : loserIds
    if (current.includes(uid)) return
    if (gameType === '1v1') {
      setValue(side, [uid], { shouldValidate: true })
    } else {
      setValue(side, [...current, uid], { shouldValidate: true })
    }
  }

  function removePlayer(side: 'winnerIds' | 'loserIds', uid: string) {
    const current = side === 'winnerIds' ? winnerIds : loserIds
    setValue(
      side,
      current.filter((id) => id !== uid),
      { shouldValidate: true },
    )
  }

  const deltas = useMemo(() => {
    if (!members) return null
    if (winnerIds.length === 0 || loserIds.length === 0) return null
    const winners = winnerIds
      .map((uid) => memberByUid.get(uid))
      .filter((m): m is LeagueMember => Boolean(m?.user))
    const losers = loserIds
      .map((uid) => memberByUid.get(uid))
      .filter((m): m is LeagueMember => Boolean(m?.user))
    if (winners.length !== winnerIds.length || losers.length !== loserIds.length) {
      return null
    }

    const wGlobal = winners.map((m) => m.user!.globalElo)
    const lGlobal = losers.map((m) => m.user!.globalElo)
    const wLeague = winners.map((m) => m.membership.leagueElo)
    const lLeague = losers.map((m) => m.membership.leagueElo)

    const globalRes = calculateTeamElo(wGlobal, lGlobal, K_GLOBAL)
    const leagueRes = calculateTeamElo(wLeague, lLeague, K_LEAGUE)

    const winnersOut: TeamDelta[] = winners.map((m) => ({
      uid: m.membership.userId,
      name: memberName(m),
      globalBefore: m.user!.globalElo,
      globalAfter: m.user!.globalElo + globalRes.winnerDelta,
      leagueBefore: m.membership.leagueElo,
      leagueAfter: m.membership.leagueElo + leagueRes.winnerDelta,
    }))
    const losersOut: TeamDelta[] = losers.map((m) => ({
      uid: m.membership.userId,
      name: memberName(m),
      globalBefore: m.user!.globalElo,
      globalAfter: m.user!.globalElo + globalRes.loserDelta,
      leagueBefore: m.membership.leagueElo,
      leagueAfter: m.membership.leagueElo + leagueRes.loserDelta,
    }))

    return { winners: winnersOut, losers: losersOut }
  }, [members, memberByUid, winnerIds, loserIds])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (file.size > MAX_INPUT_BYTES) {
      toast.error('Photo is too large (max 15 MB)')
      e.target.value = ''
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      e.target.value = ''
      return
    }
    setPhotoFile(file)
  }

  function clearPhoto() {
    setPhotoFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onConfirmedSubmit(data: RecordGameInput) {
    setSubmitting(true)
    try {
      let photoDataUrl: string | null = null
      if (photoFile) {
        try {
          photoDataUrl = await fileToCompressedDataUrl(photoFile)
        } catch (err) {
          toast.error(
            err instanceof Error
              ? `Photo rejected: ${err.message}`
              : 'Could not process photo',
          )
          setSubmitting(false)
          setConfirmOpen(false)
          return
        }
      }
      const gameId = await recordGame(data)
      if (photoDataUrl) {
        try {
          await setGamePhoto(gameId, photoDataUrl)
        } catch (err) {
          toast.error(
            err instanceof Error
              ? `Game recorded, but photo save failed: ${err.message}`
              : 'Game recorded, but photo save failed',
          )
        }
      }
      toast.success('Game recorded')
      reset()
      setPhotoFile(null)
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
            Pick a format, assign players to each side, and optionally attach a
            photo. ELO updates atomically on both global and league tracks.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={handleSubmit(() => {
            setConfirmOpen(true)
          })}
        >
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Format</Label>
              <Tabs
                value={gameType}
                onValueChange={(v) => switchMode(v as GameType)}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="1v1">1v1</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <TeamPicker
              label={gameType === '1v1' ? 'Winner' : 'Winning team'}
              side="winnerIds"
              selectedIds={winnerIds}
              options={availableForWinner}
              onAdd={(uid) => addPlayer('winnerIds', uid)}
              onRemove={(uid) => removePlayer('winnerIds', uid)}
              allowMultiple={gameType === 'team'}
              memberByUid={memberByUid}
            />

            <TeamPicker
              label={gameType === '1v1' ? 'Loser' : 'Losing team'}
              side="loserIds"
              selectedIds={loserIds}
              options={availableForLoser}
              onAdd={(uid) => addPlayer('loserIds', uid)}
              onRemove={(uid) => removePlayer('loserIds', uid)}
              allowMultiple={gameType === 'team'}
              memberByUid={memberByUid}
            />

            {errors.loserIds && (
              <p className="text-sm text-destructive">
                {errors.loserIds.message}
              </p>
            )}
            {errors.winnerIds && (
              <p className="text-sm text-destructive">
                {errors.winnerIds.message}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label>Photo (optional)</Label>
              {photoPreview ? (
                <div className="relative w-fit">
                  <img
                    src={photoPreview}
                    alt="Game photo preview"
                    className="max-h-40 rounded-md border object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6"
                    onClick={clearPhoto}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-fit"
                >
                  <ImagePlus className="mr-2 h-4 w-4" /> Attach photo
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG or WEBP. Auto-resized and compressed before saving.
              </p>
            </div>

            {deltas && (
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="font-medium">Rating changes</p>
                <div className="flex flex-col gap-3 text-xs">
                  <TeamDeltaBlock title="Winners" rows={deltas.winners} />
                  <TeamDeltaBlock title="Losers" rows={deltas.losers} />
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
                `${summarise(deltas.winners)} beat ${summarise(deltas.losers)}. Games are immutable — this cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={() => void handleSubmit(onConfirmedSubmit)()}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function summarise(rows: TeamDelta[]): string {
  if (rows.length === 1) return rows[0].name
  if (rows.length === 2) return `${rows[0].name} & ${rows[1].name}`
  return `Team of ${rows.length}`
}

function TeamPicker({
  label,
  side,
  selectedIds,
  options,
  onAdd,
  onRemove,
  allowMultiple,
  memberByUid,
}: {
  label: string
  side: 'winnerIds' | 'loserIds'
  selectedIds: string[]
  options: LeagueMember[]
  onAdd: (uid: string) => void
  onRemove: (uid: string) => void
  allowMultiple: boolean
  memberByUid: Map<string, LeagueMember>
}) {
  const selectable = options.filter(
    (m) => !selectedIds.includes(m.membership.userId),
  )
  const showPicker = allowMultiple || selectedIds.length === 0
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${side}-select`}>{label}</Label>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((uid) => {
            const m = memberByUid.get(uid)
            return (
              <Badge
                key={uid}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {m ? memberName(m) : uid}
                <button
                  type="button"
                  onClick={() => onRemove(uid)}
                  className="rounded-full p-0.5 transition-colors hover:bg-background/40"
                  aria-label={`Remove ${m ? memberName(m) : uid}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
      {showPicker && (
        <Select
          key={selectedIds.join(',')}
          value=""
          onValueChange={(v) => onAdd(v)}
        >
          <SelectTrigger id={`${side}-select`}>
            <SelectValue
              placeholder={allowMultiple ? 'Add player…' : 'Pick player'}
            />
          </SelectTrigger>
          <SelectContent>
            {selectable.map(({ membership, user }) => (
              <SelectItem
                key={membership.userId}
                value={membership.userId}
              >
                {user?.displayName || user?.email || 'Unknown'}
              </SelectItem>
            ))}
            {selectable.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No available players
              </div>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

function TeamDeltaBlock({ title, rows }: { title: string; rows: TeamDelta[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 font-mono">
        {rows.map((r) => (
          <RatingRow key={r.uid} row={r} />
        ))}
      </div>
    </div>
  )
}

function RatingRow({ row }: { row: TeamDelta }) {
  return (
    <>
      <span className="truncate text-muted-foreground">{row.name}</span>
      <span className={deltaColorClass(row.globalBefore, row.globalAfter)}>
        G {row.globalBefore}→{row.globalAfter} ({formatDelta(row.globalBefore, row.globalAfter)})
      </span>
      <span className={deltaColorClass(row.leagueBefore, row.leagueAfter)}>
        L {row.leagueBefore}→{row.leagueAfter} ({formatDelta(row.leagueBefore, row.leagueAfter)})
      </span>
    </>
  )
}
