import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { joinLeague } from '@/lib/firestore'

export default function AutoJoinLeaguePage() {
  const { code } = useParams<{ code: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const attempted = useRef(false)

  useEffect(() => {
    if (!user || !code || attempted.current) return
    attempted.current = true

    joinLeague(code, user.uid)
      .then((leagueId) => {
        toast.success('Joined league')
        navigate(`/leagues/${leagueId}`, { replace: true })
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : 'Invalid invite code',
        )
        navigate('/leagues', { replace: true })
      })
  }, [user, code, navigate])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <Skeleton className="h-8 w-48" />
      <p className="text-sm text-muted-foreground">Joining league…</p>
    </div>
  )
}
