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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMembers } from '@/hooks/useMembers'
import { formatRecord } from '@/lib/format'

export default function MembersList({ leagueId }: { leagueId: string }) {
  const { data: members, isLoading } = useMembers(leagueId)

  if (isLoading) return <Skeleton className="h-40 w-full" />

  if (!members || members.length === 0) {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(({ membership, user }) => (
              <TableRow key={membership.id}>
                <TableCell>
                  {user?.displayName || user?.email || 'Unknown player'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRecord(membership.leagueWins, membership.leagueLosses)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
