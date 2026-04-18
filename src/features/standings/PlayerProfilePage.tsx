import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { RefreshButton } from '@/components/shared/RefreshButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import EloHistoryChart from '@/features/standings/EloHistoryChart'
import { getLeague, getMembershipsByUser, getUser } from '@/lib/firestore'
import { formatRecord } from '@/lib/format'
import { fileToCompressedDataUrl, MAX_INPUT_BYTES } from '@/lib/image'
import type { League, Membership, User } from '@/types'

function isPwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function initials(name: string | undefined, email: string | undefined): string {
  const source = (name || email || '?').trim()
  const parts = source.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface ProfileData {
  user: User
  entries: { membership: Membership; league: League | null }[]
}

async function fetchProfile(uid: string): Promise<ProfileData | null> {
  const [user, memberships] = await Promise.all([
    getUser(uid),
    getMembershipsByUser(uid),
  ])
  if (!user) return null
  const leagues = await Promise.all(memberships.map((m) => getLeague(m.leagueId)))
  const entries = memberships
    .map((membership, i) => ({ membership, league: leagues[i] }))
    .sort((a, b) => b.membership.leagueElo - a.membership.leagueElo)
  return { user, entries }
}

export default function PlayerProfilePage() {
  const { uid } = useParams<{ uid: string }>()
  const { user: currentUser, updateUserProfile } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['profile', uid],
    queryFn: () => (uid ? fetchProfile(uid) : Promise.resolve(null)),
    enabled: !!uid,
  })

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editPhotoFile) { setEditPhotoPreview(null); return }
    const url = URL.createObjectURL(editPhotoFile)
    setEditPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [editPhotoFile])

  if (isLoading || !uid) return <Skeleton className="h-96 w-full" />

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player not found</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const { user, entries } = data
  const isOwnProfile = currentUser?.uid === uid
  const showRefresh = isOwnProfile && isPwa()

  function startEdit() {
    setEditName(user.displayName || '')
    setEditPhotoFile(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditPhotoFile(null)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (file.size > MAX_INPUT_BYTES) { toast.error('Photo too large (max 15 MB)'); return }
    if (!file.type.startsWith('image/')) { toast.error('Only image files are allowed'); return }
    setEditPhotoFile(file)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updates: { displayName?: string; photoURL?: string } = {}
      const trimmed = editName.trim()
      if (trimmed !== user.displayName) updates.displayName = trimmed
      if (editPhotoFile) {
        updates.photoURL = await fileToCompressedDataUrl(editPhotoFile, 400)
      }
      if (Object.keys(updates).length > 0) {
        await updateUserProfile(updates)
        queryClient.setQueryData(['profile', uid], (old: ProfileData | null) =>
          old ? { ...old, user: { ...old.user, ...updates } } : old,
        )
      }
      toast.success('Profile updated')
      setEditing(false)
      setEditPhotoFile(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {editing ? (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src={editPhotoPreview || user.photoURL || undefined} />
              <AvatarFallback className="text-lg">
                {initials(user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100"
              aria-label="Change photo"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Display name"
              className="max-w-xs"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="text-base">
                {initials(user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold">
                {user.displayName || user.email || 'Unknown player'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Global ELO {user.globalElo} ·{' '}
                {formatRecord(user.globalWins, user.globalLosses)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isOwnProfile && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={startEdit}
                aria-label="Edit profile"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {showRefresh && <RefreshButton />}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rating over time</CardTitle>
          <CardDescription>Global ELO from recorded games.</CardDescription>
        </CardHeader>
        <CardContent>
          <EloHistoryChart uid={user.uid} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>League ratings</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leagues joined.</p>
          ) : (
            <ul className="divide-y">
              {entries.map(({ membership, league }) => (
                <li
                  key={membership.id}
                  className="flex items-center justify-between py-3"
                >
                  <Link
                    to={`/leagues/${membership.leagueId}`}
                    className="hover:underline"
                  >
                    {league?.name ?? membership.leagueId}
                  </Link>
                  <div className="flex gap-4 text-sm">
                    <span className="font-mono">{membership.leagueElo}</span>
                    <span className="text-muted-foreground">
                      {formatRecord(membership.leagueWins, membership.leagueLosses)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
