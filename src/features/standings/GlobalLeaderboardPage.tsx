import { useQuery } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
} from 'firebase/firestore'
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
import { db } from '@/lib/firebase'
import { formatRecord } from '@/lib/format'
import type { User } from '@/types'

async function fetchLeaderboard(): Promise<User[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('globalElo', 'desc'), fsLimit(100)),
  )
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as User)
}

export default function GlobalLeaderboardPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['global-leaderboard'],
    queryFn: fetchLeaderboard,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Global leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Cross-league ELO ranking across all players.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !users || users.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No players yet</CardTitle>
            <CardDescription>
              Play a game to appear on the leaderboard.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Global ELO</TableHead>
                  <TableHead className="text-right">Record</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, idx) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="max-w-[140px] sm:max-w-[240px]">
                      <Link
                        to={`/players/${user.uid}`}
                        className="block truncate hover:underline"
                      >
                        {user.displayName || user.email || 'Unknown'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {user.globalElo}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatRecord(user.globalWins, user.globalLosses)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
