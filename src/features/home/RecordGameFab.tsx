import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLeagues } from '@/hooks/useLeagues'
import { SPORT_LABELS } from '@/lib/schemas'
import type { Sport } from '@/lib/schemas'

export function RecordGameFab() {
  const navigate = useNavigate()
  const { data: leagues } = useLeagues()
  const [pickerOpen, setPickerOpen] = useState(false)

  function handleTap() {
    const count = leagues?.length ?? 0
    if (count === 0) {
      navigate('/leagues/create')
      return
    }
    if (count === 1) {
      navigate(`/leagues/${leagues![0].id}/record`)
      return
    }
    setPickerOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        aria-label="Record a game"
        className="flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-sidebar transition-transform active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record a game in…</DialogTitle>
            <DialogDescription>
              Choose which league the game was played in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            {leagues?.map((league) => (
              <button
                key={league.id}
                onClick={() => {
                  setPickerOpen(false)
                  navigate(`/leagues/${league.id}/record`)
                }}
                className="flex items-center justify-between rounded-md border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-muted"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{league.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {SPORT_LABELS[league.sport as Sport] ?? league.sport}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
