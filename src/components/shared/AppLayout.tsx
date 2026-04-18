import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'

import { MobileBottomNav } from '@/components/shared/MobileBottomNav'
import { Sidebar } from '@/components/shared/Sidebar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar className="hidden md:flex" />
      <div className="flex flex-1 flex-col md:ml-14 lg:ml-56">
        <main className="flex-1 p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <Toaster richColors position="top-right" />
    </div>
  )
}
