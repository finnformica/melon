import { ChevronDown, LogOut, Trophy } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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

function initials(name: string | undefined, email: string | undefined): string {
  const source = name || email || '?'
  const parts = source.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Navbar() {
  const { user, signOut } = useAuth()
  const { data: leagues } = useLeagues()
  const navigate = useNavigate()

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" className="text-lg font-semibold">
          Melon
        </Link>

        <nav className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                Leagues
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Your leagues</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {leagues && leagues.length > 0 ? (
                leagues.map((league) => (
                  <DropdownMenuItem
                    key={league.id}
                    onSelect={() => navigate(`/leagues/${league.id}`)}
                  >
                    {league.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No leagues yet</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/leagues')}>
                All leagues
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/leagues/create')}>
                Create league
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/leagues/join')}>
                Join league
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild variant="ghost" size="sm">
            <Link to="/leaderboard">
              <Trophy className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Global</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback>
                    {initials(user?.displayName, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm">
                    {user?.displayName || 'Signed in'}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user && (
                <DropdownMenuItem
                  onSelect={() => navigate(`/players/${user.uid}`)}
                >
                  Your profile
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  )
}
