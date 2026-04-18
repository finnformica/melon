import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { joinLeague } from '@/lib/firestore'
import { joinLeagueInputSchema } from '@/lib/schemas'
import type { JoinLeagueInput } from '@/lib/schemas'

export default function JoinLeaguePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinLeagueInput>({
    resolver: zodResolver(joinLeagueInputSchema),
    defaultValues: { inviteCode: '' },
  })

  async function onSubmit(data: JoinLeagueInput) {
    if (!user) return
    setSubmitting(true)
    try {
      const leagueId = await joinLeague(data.inviteCode, user.uid)
      toast.success('Joined league')
      navigate(`/leagues/${leagueId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join league')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Join a league</CardTitle>
          <CardDescription>
            Enter the 6-character invite code you were given.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inviteCode">Invite code</Label>
              <Input
                id="inviteCode"
                placeholder="ABC234"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono uppercase"
                {...register('inviteCode')}
              />
              {errors.inviteCode && (
                <p className="text-sm text-destructive">
                  {errors.inviteCode.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/leagues')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Join
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
