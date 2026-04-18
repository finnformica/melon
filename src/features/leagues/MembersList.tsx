import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import MemberRow from '@/features/leagues/MemberRow'
import { useLeague } from '@/hooks/useLeague'
import { useLeagueRole } from '@/hooks/useLeagueRole'
import { useMembers } from '@/hooks/useMembers'

export default function MembersList({ leagueId }: { leagueId: string }) {
  const { data: members, isLoading } = useMembers(leagueId)
  const { data: league } = useLeague(leagueId)
  const { data: viewerRole } = useLeagueRole(leagueId)

  if (isLoading) return <Skeleton className="h-40 w-full" />

  if (!members || members.length === 0 || !league) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No members</CardTitle>
          <CardDescription>Share the invite code above.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(({ membership, user }) => (
              <MemberRow
                key={membership.id}
                leagueId={leagueId}
                ownerId={league.ownerId}
                viewerRole={viewerRole ?? null}
                membership={membership}
                user={user}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
