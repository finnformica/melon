import { LayoutGrid, Trophy, User } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-sidebar-border bg-sidebar md:hidden">
      <Link
        to="/leagues"
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
          isActive('/leagues') ? 'text-primary' : 'text-sidebar-foreground',
        )}
      >
        <LayoutGrid className="h-5 w-5" />
        <span>Leagues</span>
      </Link>

      <Link
        to="/leaderboard"
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
          isActive('/leaderboard') ? 'text-primary' : 'text-sidebar-foreground',
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
            isActive('/players') ? 'text-primary' : 'text-sidebar-foreground',
          )}
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </button>
      )}
    </nav>
  )
}
