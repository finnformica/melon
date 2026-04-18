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

export interface Membership {
  id: string
  userId: string
  leagueId: string
  leagueElo: number
  leagueWins: number
  leagueLosses: number
  joinedAt: Timestamp
}

export interface Game {
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
}
