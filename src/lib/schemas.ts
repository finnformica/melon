import { z } from 'zod'

export const SPORTS = [
  'football',
  'tennis',
  'pool',
  'chess',
  'badminton',
  'squash',
  'table-tennis',
  'other',
] as const

export type Sport = (typeof SPORTS)[number]

export const SPORT_LABELS: Record<Sport, string> = {
  football: 'Football',
  tennis: 'Tennis',
  pool: 'Pool',
  chess: 'Chess',
  badminton: 'Badminton',
  squash: 'Squash',
  'table-tennis': 'Table Tennis',
  other: 'Other',
}

export const createLeagueInputSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(60, 'Name too long'),
  sport: z.enum(SPORTS),
})

export type CreateLeagueInput = z.infer<typeof createLeagueInputSchema>

export const joinLeagueInputSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(6, 'Invite code must be 6 characters')
    .regex(/^[A-HJ-NP-Z2-9]+$/, 'Invalid invite code'),
})

export type JoinLeagueInput = z.infer<typeof joinLeagueInputSchema>

export const recordGameInputSchema = z
  .object({
    leagueId: z.string().min(1),
    winnerId: z.string().min(1),
    loserId: z.string().min(1),
  })
  .refine((d) => d.winnerId !== d.loserId, {
    message: 'Winner and loser must be different players',
    path: ['loserId'],
  })

export type RecordGameInput = z.infer<typeof recordGameInputSchema>
