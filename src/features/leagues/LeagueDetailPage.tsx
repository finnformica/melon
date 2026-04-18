import { Plus, Settings } from 'lucide-react'
import { useMatch, useNavigate, useParams } from 'react-router-dom'

import { useLeagueRole } from '@/hooks/useLeagueRole'

import LeagueStandingsTable from '@/features/standings/LeagueStandingsTable'
import GameHistoryList from '@/features/games/GameHistoryList'
import MembersList from '@/features/leagues/MembersList'
import { ShareButton } from '@/components/shared/ShareButton'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLeague } from '@/hooks/useLeague'
import { SPORT_LABELS } from '@/lib/schemas'
import type { Sport } from '@/lib/schemas'

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const navigate = useNavigate()
  const { data: league, isLoading } = useLeague(leagueId)
  const { data: role } = useLeagueRole(leagueId)
  const canManage = role === 'owner' || role === 'admin'

  const gamesMatch = useMatch('/leagues/:leagueId/games')
  const membersMatch = useMatch('/leagues/:leagueId/members')
  const tab = gamesMatch ? 'games' : membersMatch ? 'members' : 'standings'

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (!league) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>League not found</CardTitle>
          <CardDescription>
            This league doesn't exist, or you don't have access.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{league.name}</h1>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => navigate(`/leagues/${league.id}/settings`)}
                title="League settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {SPORT_LABELS[league.sport as Sport] ?? league.sport}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            url={`${window.location.origin}/join/${league.inviteCode}`}
            label={league.inviteCode}
          />
          <Button
            size="sm"
            onClick={() => navigate(`/leagues/${league.id}/record`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Record game
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const base = `/leagues/${league.id}`
          if (value === 'games') navigate(`${base}/games`)
          else if (value === 'members') navigate(`${base}/members`)
          else navigate(base)
        }}
      >
        <TabsList>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="standings" className="mt-4">
          <LeagueStandingsTable leagueId={league.id} />
        </TabsContent>
        <TabsContent value="games" className="mt-4">
          <GameHistoryList leagueId={league.id} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MembersList leagueId={league.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
