import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  LayoutGrid,
  LogOut,
  Plus,
  Trophy,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/AuthProvider'
import { useLeagues } from '@/hooks/useLeagues'
import { cn } from '@/lib/utils'

function initials(name: string | undefined, email: string | undefined): string {
  const source = name || email || '?'
  const parts = source.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Sidebar({ className }: { className?: string }) {
  const { user, signOut } = useAuth()
  const { data: leagues } = useLeagues()
  const location = useLocation()
  const navigate = useNavigate()
  const [leaguesOpen, setLeaguesOpen] = useState(true)

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-full w-14 flex-col border-r border-sidebar-border bg-sidebar lg:w-56',
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-3">
        <Link to="/" className="flex items-center gap-2.5">
          <CircleDot className="h-7 w-7 shrink-0 text-primary" />
          <span className="hidden font-heading text-lg font-bold uppercase tracking-[0.12em] text-primary lg:block">
            Melon
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        <button
          onClick={() => setLeaguesOpen(!leaguesOpen)}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            isActive('/leagues') && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
          )}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          <span className="hidden flex-1 text-left lg:block">Leagues</span>
          {leaguesOpen ? (
            <ChevronDown className="hidden h-3 w-3 lg:block" />
          ) : (
            <ChevronRight className="hidden h-3 w-3 lg:block" />
          )}
        </button>

        {leaguesOpen && (
          <div className="hidden lg:flex lg:flex-col lg:gap-0.5 lg:pl-6">
            {leagues?.map((league) => (
              <Link
                key={league.id}
                to={`/leagues/${league.id}`}
                className={cn(
                  'truncate rounded-md px-2 py-1.5 text-xs transition-colors',
                  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  location.pathname === `/leagues/${league.id}` &&
                    'bg-sidebar-accent font-medium',
                )}
              >
                {league.name}
              </Link>
            ))}
            <Link
              to="/leagues/create"
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-sidebar-foreground"
            >
              <Plus className="h-3 w-3" /> New league
            </Link>
            <Link
              to="/leagues/join"
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-sidebar-foreground"
            >
              <Users className="h-3 w-3" /> Join league
            </Link>
          </div>
        )}

        <Link
          to="/leaderboard"
          className={cn(
            'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            isActive('/leaderboard') &&
              'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
          )}
        >
          <Trophy className="h-4 w-4 shrink-0" />
          <span className="hidden lg:block">Leaderboard</span>
        </Link>
      </nav>

      {/* User area */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback className="text-xs">
                  {initials(user?.displayName, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 flex-1 text-left lg:block">
                <p className="truncate text-xs font-medium text-sidebar-foreground">
                  {user?.displayName || user?.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.displayName || 'Signed in'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user && (
              <DropdownMenuItem onSelect={() => navigate(`/players/${user.uid}`)}>
                Your profile
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
