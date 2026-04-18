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
    gameType: z.enum(['1v1', 'team']),
    winnerIds: z
      .array(z.string().min(1))
      .min(1, 'Winning team needs at least one player'),
    loserIds: z
      .array(z.string().min(1))
      .min(1, 'Losing team needs at least one player'),
  })
  .refine((d) => !d.winnerIds.some((id) => d.loserIds.includes(id)), {
    message: 'A player cannot be on both teams',
    path: ['loserIds'],
  })
  .refine(
    (d) =>
      d.gameType !== '1v1' ||
      (d.winnerIds.length === 1 && d.loserIds.length === 1),
    {
      message: '1v1 games must have exactly one player per side',
      path: ['gameType'],
    },
  )

export type RecordGameInput = z.infer<typeof recordGameInputSchema>

export const renameLeagueInputSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(60, 'Name too long'),
  sport: z.enum(SPORTS),
})

export type RenameLeagueInput = z.infer<typeof renameLeagueInputSchema>

export const membershipRoleSchema = z.enum(['admin', 'member'])
