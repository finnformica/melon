import { MoreHorizontal, Shield, ShieldOff, UserMinus } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableCell, TableRow } from '@/components/ui/table'
import { removeMember, setMemberRole } from '@/lib/firestore'
import { formatRecord } from '@/lib/format'
import type { LeagueRole, Membership, User } from '@/types'

type PendingAction = 'promote' | 'demote' | 'remove' | null

interface Props {
  leagueId: string
  ownerId: string
  viewerRole: LeagueRole | null
  membership: Membership
  user: User | null
}

export default function MemberRow({
  leagueId,
  ownerId,
  viewerRole,
  membership,
  user,
}: Props) {
  const [pending, setPending] = useState<PendingAction>(null)
  const [busy, setBusy] = useState(false)

  const isTargetOwner = membership.userId === ownerId
  const isTargetAdmin = membership.role === 'admin'
  const targetRoleLabel: LeagueRole = isTargetOwner
    ? 'owner'
    : isTargetAdmin
      ? 'admin'
      : 'member'

  const viewerIsOwner = viewerRole === 'owner'
  const viewerIsAdminOrOwner =
    viewerRole === 'owner' || viewerRole === 'admin'

  // Owner can promote/demote others (not themselves); admin+owner can remove (non-owners)
  const canPromote = viewerIsOwner && !isTargetOwner && !isTargetAdmin
  const canDemote = viewerIsOwner && !isTargetOwner && isTargetAdmin
  const canRemove = viewerIsAdminOrOwner && !isTargetOwner
  const showMenu = canPromote || canDemote || canRemove

  async function runAction() {
    setBusy(true)
    try {
      if (pending === 'promote') {
        await setMemberRole(leagueId, membership.userId, 'admin')
        toast.success('Promoted to admin')
      } else if (pending === 'demote') {
        await setMemberRole(leagueId, membership.userId, 'member')
        toast.success('Demoted to member')
      } else if (pending === 'remove') {
        await removeMember(leagueId, membership.userId)
        toast.success('Member removed')
      }
      setPending(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const confirmCopy: Record<Exclude<PendingAction, null>, { title: string; body: string }> = {
    promote: {
      title: 'Promote to admin?',
      body: 'Admins can edit the league, rotate the invite code, reset ELOs, and remove members.',
    },
    demote: {
      title: 'Demote to member?',
      body: 'They will lose league-management access.',
    },
    remove: {
      title: 'Remove from league?',
      body: "They lose access immediately. Their games stay in the history as recorded.",
    },
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <span>
              {user?.displayName || user?.email || 'Unknown player'}
            </span>
            {targetRoleLabel === 'owner' && (
              <Badge variant="secondary">Owner</Badge>
            )}
            {targetRoleLabel === 'admin' && (
              <Badge variant="outline">Admin</Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatRecord(membership.leagueWins, membership.leagueLosses)}
        </TableCell>
        <TableCell className="w-10 text-right">
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canPromote && (
                  <DropdownMenuItem onSelect={() => setPending('promote')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Promote to admin
                  </DropdownMenuItem>
                )}
                {canDemote && (
                  <DropdownMenuItem onSelect={() => setPending('demote')}>
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Demote to member
                  </DropdownMenuItem>
                )}
                {canRemove && (canPromote || canDemote) && (
                  <DropdownMenuSeparator />
                )}
                {canRemove && (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setPending('remove')}
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove from league
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        {pending && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmCopy[pending].title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmCopy[pending].body}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault()
                  void runAction()
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}
