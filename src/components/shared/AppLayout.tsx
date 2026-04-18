import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'

import { Navbar } from '@/components/shared/Navbar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
