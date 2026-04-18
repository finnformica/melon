import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit as fsLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

import { K_GLOBAL, K_LEAGUE, calculateElo } from '@/lib/elo'
import { db } from '@/lib/firebase'
import type { CreateLeagueInput, RecordGameInput } from '@/lib/schemas'
import { generateInviteCode } from '@/lib/utils'
import type { Game, League, Membership, User } from '@/types'

export function membershipId(leagueId: string, userId: string): string {
  return `${leagueId}_${userId}`
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as User
}

export async function getLeague(leagueId: string): Promise<League | null> {
  const snap = await getDoc(doc(db, 'leagues', leagueId))
  if (!snap.exists()) return null
  return { id: leagueId, ...snap.data() } as League
}

export async function getLeagueByInviteCode(
  code: string,
): Promise<League | null> {
  const normalised = code.trim().toUpperCase()
  const snap = await getDocs(
    query(
      collection(db, 'leagues'),
      where('inviteCode', '==', normalised),
      fsLimit(1),
    ),
  )
  if (snap.empty) return null
  const [first] = snap.docs
  return { id: first.id, ...first.data() } as League
}

export async function getMembershipsByUser(
  uid: string,
): Promise<Membership[]> {
  const snap = await getDocs(
    query(collection(db, 'memberships'), where('userId', '==', uid)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Membership)
}

export async function getMembershipsByLeague(
  leagueId: string,
): Promise<Membership[]> {
  const snap = await getDocs(
    query(
      collection(db, 'memberships'),
      where('leagueId', '==', leagueId),
      orderBy('leagueElo', 'desc'),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Membership)
}

export async function getLeaguesByUser(uid: string): Promise<League[]> {
  const memberships = await getMembershipsByUser(uid)
  const leagues = await Promise.all(
    memberships.map((m) => getLeague(m.leagueId)),
  )
  return leagues.filter((l): l is League => l != null)
}

export async function getGamesByLeague(
  leagueId: string,
  options: { limit?: number } = {},
): Promise<Game[]> {
  const base = [
    where('leagueId', '==', leagueId),
    orderBy('playedAt', 'desc'),
  ]
  const constraints = options.limit
    ? [...base, fsLimit(options.limit)]
    : base
  const snap = await getDocs(query(collection(db, 'games'), ...constraints))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Game)
}

export async function createLeague(
  input: CreateLeagueInput,
  ownerUid: string,
): Promise<string> {
  const leagueRef = doc(collection(db, 'leagues'))
  const leagueId = leagueRef.id
  const ownerMembershipRef = doc(
    db,
    'memberships',
    membershipId(leagueId, ownerUid),
  )

  const batch = writeBatch(db)
  batch.set(leagueRef, {
    name: input.name.trim(),
    sport: input.sport,
    ownerId: ownerUid,
    inviteCode: generateInviteCode(),
    createdAt: serverTimestamp(),
  })
  batch.set(ownerMembershipRef, {
    userId: ownerUid,
    leagueId,
    leagueElo: 1000,
    leagueWins: 0,
    leagueLosses: 0,
    joinedAt: serverTimestamp(),
  })
  await batch.commit()
  return leagueId
}

export async function joinLeague(
  inviteCode: string,
  uid: string,
): Promise<string> {
  const league = await getLeagueByInviteCode(inviteCode)
  if (!league) throw new Error('Invalid invite code')

  const ref = doc(db, 'memberships', membershipId(league.id, uid))
  const existing = await getDoc(ref)
  if (existing.exists()) return league.id

  await setDoc(ref, {
    userId: uid,
    leagueId: league.id,
    leagueElo: 1000,
    leagueWins: 0,
    leagueLosses: 0,
    joinedAt: serverTimestamp(),
  })
  return league.id
}

export async function recordGame(input: RecordGameInput): Promise<string> {
  if (input.winnerId === input.loserId) {
    throw new Error('Winner and loser must be different players')
  }

  const winnerUserRef = doc(db, 'users', input.winnerId)
  const loserUserRef = doc(db, 'users', input.loserId)
  const winnerMembershipRef = doc(
    db,
    'memberships',
    membershipId(input.leagueId, input.winnerId),
  )
  const loserMembershipRef = doc(
    db,
    'memberships',
    membershipId(input.leagueId, input.loserId),
  )
  const gameRef = doc(collection(db, 'games'))

  return runTransaction(db, async (tx) => {
    const winnerUserSnap = await tx.get(winnerUserRef)
    const loserUserSnap = await tx.get(loserUserRef)
    const winnerMembershipSnap = await tx.get(winnerMembershipRef)
    const loserMembershipSnap = await tx.get(loserMembershipRef)

    if (!winnerUserSnap.exists() || !loserUserSnap.exists()) {
      throw new Error('Player user document missing')
    }
    if (!winnerMembershipSnap.exists() || !loserMembershipSnap.exists()) {
      throw new Error('Both players must be members of this league')
    }

    const winnerUser = winnerUserSnap.data() as Omit<User, 'uid'>
    const loserUser = loserUserSnap.data() as Omit<User, 'uid'>
    const winnerMembership = winnerMembershipSnap.data() as Omit<Membership, 'id'>
    const loserMembership = loserMembershipSnap.data() as Omit<Membership, 'id'>

    const globalResult = calculateElo(
      winnerUser.globalElo,
      loserUser.globalElo,
      K_GLOBAL,
    )
    const leagueResult = calculateElo(
      winnerMembership.leagueElo,
      loserMembership.leagueElo,
      K_LEAGUE,
    )

    tx.set(gameRef, {
      leagueId: input.leagueId,
      winnerId: input.winnerId,
      loserId: input.loserId,
      winnerGlobalEloBefore: winnerUser.globalElo,
      winnerGlobalEloAfter: globalResult.winner,
      loserGlobalEloBefore: loserUser.globalElo,
      loserGlobalEloAfter: globalResult.loser,
      winnerLeagueEloBefore: winnerMembership.leagueElo,
      winnerLeagueEloAfter: leagueResult.winner,
      loserLeagueEloBefore: loserMembership.leagueElo,
      loserLeagueEloAfter: leagueResult.loser,
      kFactorGlobal: K_GLOBAL,
      kFactorLeague: K_LEAGUE,
      playedAt: serverTimestamp(),
    })

    tx.update(winnerUserRef, {
      globalElo: globalResult.winner,
      globalWins: increment(1),
    })
    tx.update(loserUserRef, {
      globalElo: globalResult.loser,
      globalLosses: increment(1),
    })
    tx.update(winnerMembershipRef, {
      leagueElo: leagueResult.winner,
      leagueWins: increment(1),
    })
    tx.update(loserMembershipRef, {
      leagueElo: leagueResult.loser,
      leagueLosses: increment(1),
    })

    return gameRef.id
  })
}
