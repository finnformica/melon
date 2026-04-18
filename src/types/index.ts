import type { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string
  displayName: string
  photoURL: string
  email: string
  globalElo: number
  globalWins: number
  globalLosses: number
  createdAt: Timestamp
}

export interface League {
  id: string
  name: string
  sport: string
  ownerId: string
  inviteCode: string
  createdAt: Timestamp
}

export type MembershipRole = 'admin' | 'member'

export interface Membership {
  id: string
  userId: string
  leagueId: string
  leagueElo: number
  leagueWins: number
  leagueLosses: number
  joinedAt: Timestamp
  // Optional. Absent or 'member' means regular member.
  // 'admin' grants league-management powers. Owner (league.ownerId) is implicit and does not use this field.
  role?: MembershipRole
}

export type LeagueRole = 'owner' | 'admin' | 'member'

export type GameType = '1v1' | 'team'

export interface PlayerEloSnapshot {
  globalBefore: number
  globalAfter: number
  leagueBefore: number
  leagueAfter: number
}

// Unified game schema. A 1v1 game is just a team game with single-member
// sides; the `gameType` field records user intent for display.
// Legacy docs with scalar winnerId/loserId are read through normalizeGame
// (src/lib/gameSchema.ts); they never leak into consumer code.
export interface Game {
  id: string
  leagueId: string
  gameType: GameType
  winnerIds: string[]
  loserIds: string[]
  playerElo: Record<string, PlayerEloSnapshot>
  kFactorGlobal: number
  kFactorLeague: number
  photoUrl?: string
  playedAt: Timestamp
  // Denormalised display info for the public share card.
  leagueName?: string
  sport?: string
  displayNames?: Record<string, string>
}

export interface LegacyGame {
  id: string
  leagueId: string
  winnerId: string
  loserId: string
  winnerGlobalEloBefore: number
  winnerGlobalEloAfter: number
  loserGlobalEloBefore: number
  loserGlobalEloAfter: number
  winnerLeagueEloBefore: number
  winnerLeagueEloAfter: number
  loserLeagueEloBefore: number
  loserLeagueEloAfter: number
  kFactorGlobal: number
  kFactorLeague: number
  playedAt: Timestamp
  leagueName?: string
  sport?: string
  winnerDisplayName?: string
  loserDisplayName?: string
}
