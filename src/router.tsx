import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/shared/AppLayout'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import GameCardPage from '@/features/games/GameCardPage'
import RecordGamePage from '@/features/games/RecordGamePage'
import CreateLeaguePage from '@/features/leagues/CreateLeaguePage'
import AutoJoinLeaguePage from '@/features/leagues/AutoJoinLeaguePage'
import JoinLeaguePage from '@/features/leagues/JoinLeaguePage'
import LeagueDetailPage from '@/features/leagues/LeagueDetailPage'
import LeagueSettingsPage from '@/features/leagues/LeagueSettingsPage'
import LeaguesPage from '@/features/leagues/LeaguesPage'
import NotFoundPage from '@/features/leagues/NotFoundPage'
import GlobalLeaderboardPage from '@/features/standings/GlobalLeaderboardPage'
import PlayerProfilePage from '@/features/standings/PlayerProfilePage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // Public share card — no ProtectedRoute wrapper.
    path: '/g/:gameId',
    element: <GameCardPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/leagues" replace /> },
          { path: 'leagues', element: <LeaguesPage /> },
          { path: 'leagues/create', element: <CreateLeaguePage /> },
          { path: 'leagues/join', element: <JoinLeaguePage /> },
          { path: 'join/:code', element: <AutoJoinLeaguePage /> },
          { path: 'leagues/:leagueId', element: <LeagueDetailPage /> },
          { path: 'leagues/:leagueId/games', element: <LeagueDetailPage /> },
          { path: 'leagues/:leagueId/members', element: <LeagueDetailPage /> },
          { path: 'leagues/:leagueId/record', element: <RecordGamePage /> },
          { path: 'leagues/:leagueId/settings', element: <LeagueSettingsPage /> },
          { path: 'leaderboard', element: <GlobalLeaderboardPage /> },
          { path: 'players/:uid', element: <PlayerProfilePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
