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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/AuthProvider'
import { createLeague } from '@/lib/firestore'
import {
  SPORTS,
  SPORT_LABELS,
  createLeagueInputSchema,
} from '@/lib/schemas'
import type { CreateLeagueInput } from '@/lib/schemas'

export default function CreateLeaguePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateLeagueInput>({
    resolver: zodResolver(createLeagueInputSchema),
    defaultValues: { name: '', sport: 'football' },
  })

  const sport = watch('sport')

  async function onSubmit(data: CreateLeagueInput) {
    if (!user) return
    setSubmitting(true)
    try {
      const leagueId = await createLeague(data, user.uid)
      toast.success('League created')
      navigate(`/leagues/${leagueId}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not create league',
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Create a league</CardTitle>
          <CardDescription>
            Set up a new league and invite players with the generated code.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">League name</Label>
              <Input
                id="name"
                placeholder="Friday night football"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sport">Sport</Label>
              <Select
                value={sport}
                onValueChange={(v) => setValue('sport', v as typeof sport)}
              >
                <SelectTrigger id="sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPORTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SPORT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Create
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
