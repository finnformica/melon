import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/shared/AppLayout'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import LeaguesPage from '@/features/leagues/LeaguesPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [{ index: true, element: <LeaguesPage /> }],
      },
    ],
  },
])
