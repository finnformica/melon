import { Link } from 'react-router-dom'

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

export default function LeagueStandingsTable({
  leagueId,
}: {
  leagueId: string
}) {
  const { data: members, isLoading } = useMembers(leagueId)

  if (isLoading) return <Skeleton className="h-40 w-full" />

  if (!members || members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No members</CardTitle>
          <CardDescription>
            Share the invite code to get players in.
          </CardDescription>
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
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">League ELO</TableHead>
              <TableHead className="text-right">Record</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(({ membership, user }, idx) => (
              <TableRow key={membership.id}>
                <TableCell className="font-mono text-muted-foreground">
                  {idx + 1}
                </TableCell>
                <TableCell>
                  {user ? (
                    <Link
                      to={`/players/${user.uid}`}
                      className="hover:underline"
                    >
                      {user.displayName || user.email || 'Unknown'}
                    </Link>
                  ) : (
                    'Unknown'
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {membership.leagueElo}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
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
