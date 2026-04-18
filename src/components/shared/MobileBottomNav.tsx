import { Home, LayoutGrid, Trophy, User } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'
import { RecordGameFab } from '@/features/home/RecordGameFab'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isHome = location.pathname === '/'
  const isLeagues = location.pathname.startsWith('/leagues')
  const isLeaderboard = location.pathname.startsWith('/leaderboard')
  const isProfile = location.pathname.startsWith('/players')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-sidebar-border bg-sidebar md:hidden">
      <Link
        to="/"
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
          isHome ? 'text-primary' : 'text-sidebar-foreground',
        )}
      >
        <Home className="h-5 w-5" />
        <span>Home</span>
      </Link>

      <Link
        to="/leagues"
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
          isLeagues ? 'text-primary' : 'text-sidebar-foreground',
        )}
      >
        <LayoutGrid className="h-5 w-5" />
        <span>Leagues</span>
      </Link>

      <div className="flex flex-1 items-center justify-center">
        <RecordGameFab />
      </div>

      <Link
        to="/leaderboard"
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
          isLeaderboard ? 'text-primary' : 'text-sidebar-foreground',
        )}
      >
        <Trophy className="h-5 w-5" />
        <span>Global</span>
      </Link>

      {user && (
        <button
          onClick={() => navigate(`/players/${user.uid}`)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
            isProfile ? 'text-primary' : 'text-sidebar-foreground',
          )}
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </button>
      )}
    </nav>
  )
}
