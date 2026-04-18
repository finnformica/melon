import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/AuthProvider'
import { getLeagueRole } from '@/lib/firestore'

export function useLeagueRole(leagueId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['league-role', leagueId, user?.uid],
    queryFn: () =>
      leagueId && user ? getLeagueRole(leagueId, user.uid) : null,
    enabled: !!leagueId && !!user,
  })
}
