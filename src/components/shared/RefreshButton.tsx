import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RefreshButton({ className }: { className?: string }) {
  const [spinning, setSpinning] = useState(false)

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Refresh"
      title="Refresh"
      onClick={() => {
        setSpinning(true)
        window.location.reload()
      }}
      className={className}
    >
      <RefreshCw className={cn('h-3.5 w-3.5', spinning && 'animate-spin')} />
    </Button>
  )
}
