import {
  collection,
  deleteDoc,
  deleteField,
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
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

import { K_GLOBAL, K_LEAGUE, calculateTeamElo } from '@/lib/elo'
import { db } from '@/lib/firebase'
import { normalizeGame } from '@/lib/gameSchema'
import { NPC_DISPLAY_NAME, NPC_ELO, isNpcId } from '@/lib/npc'
import type {
  CreateLeagueInput,
  RecordGameInput,
  RenameLeagueInput,
} from '@/lib/schemas'
import { generateInviteCode } from '@/lib/utils'
import type {
  Game,
  League,
  LeagueRole,
  Membership,
  MembershipRole,
  PlayerEloSnapshot,
  User,
} from '@/types'

export function membershipId(leagueId: string, userId: string): string {
  return `${leagueId}_${userId}`
}

// Returns a name that's safe to render on the public share card.
// Rejects anything that looks like an email so legacy docs (where email
// was used as a fallback displayName) don't leak PII.
function publicDisplayName(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return 'Player'
  if (value.includes('@')) return 'Player'
  return value
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
  return snap.docs.map((d) => normalizeGame({ id: d.id, ...d.data() }))
}

export async function getGame(gameId: string): Promise<Game | null> {
  const snap = await getDoc(doc(db, 'games', gameId))
  if (!snap.exists()) return null
  return normalizeGame({ id: gameId, ...snap.data() })
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
  const allIds = [...input.winnerIds, ...input.loserIds]
  if (new Set(allIds).size !== allIds.length) {
    throw new Error('A player cannot appear twice in one game')
  }

  const realIds = allIds.filter((id) => !isNpcId(id))
  if (realIds.length === 0) {
    throw new Error('At least one real player must be in the game')
  }

  // Denormalised league info for the public share card. Read outside the
  // transaction — league name / sport are rarely edited and strict atomicity
  // with the ELO update isn't required here.
  const leagueSnap = await getDoc(doc(db, 'leagues', input.leagueId))
  if (!leagueSnap.exists()) throw new Error('League not found')
  const leagueData = leagueSnap.data()
  const leagueName = (leagueData.name as string) ?? ''
  const sport = (leagueData.sport as string) ?? ''

  const gameRef = doc(collection(db, 'games'))
  const userRefs = Object.fromEntries(
    realIds.map((uid) => [uid, doc(db, 'users', uid)]),
  )
  const membershipRefs = Object.fromEntries(
    realIds.map((uid) => [uid, doc(db, 'memberships', membershipId(input.leagueId, uid))]),
  )

  return runTransaction(db, async (tx) => {
    const userSnaps = await Promise.all(
      realIds.map((uid) => tx.get(userRefs[uid])),
    )
    const membershipSnaps = await Promise.all(
      realIds.map((uid) => tx.get(membershipRefs[uid])),
    )

    const users: Record<string, Omit<User, 'uid'>> = {}
    const memberships: Record<string, Omit<Membership, 'id'>> = {}
    realIds.forEach((uid, i) => {
      const userSnap = userSnaps[i]
      const membershipSnap = membershipSnaps[i]
      if (!userSnap.exists()) {
        throw new Error(`Player ${uid} has no user document`)
      }
      if (!membershipSnap.exists()) {
        throw new Error('Every player must be a member of this league')
      }
      users[uid] = userSnap.data() as Omit<User, 'uid'>
      memberships[uid] = membershipSnap.data() as Omit<Membership, 'id'>
    })

    // NPCs always contribute NPC_ELO to their team's average rating.
    const getGlobalElo = (uid: string) =>
      isNpcId(uid) ? NPC_ELO : users[uid].globalElo
    const getLeagueElo = (uid: string) =>
      isNpcId(uid) ? NPC_ELO : memberships[uid].leagueElo

    const global = calculateTeamElo(
      input.winnerIds.map(getGlobalElo),
      input.loserIds.map(getGlobalElo),
      K_GLOBAL,
    )
    const league = calculateTeamElo(
      input.winnerIds.map(getLeagueElo),
      input.loserIds.map(getLeagueElo),
      K_LEAGUE,
    )

    const playerElo: Record<string, PlayerEloSnapshot> = {}
    const displayNames: Record<string, string> = {}

    for (const uid of input.winnerIds) {
      if (isNpcId(uid)) {
        playerElo[uid] = { globalBefore: NPC_ELO, globalAfter: NPC_ELO, leagueBefore: NPC_ELO, leagueAfter: NPC_ELO }
        displayNames[uid] = NPC_DISPLAY_NAME
      } else {
        playerElo[uid] = {
          globalBefore: users[uid].globalElo,
          globalAfter: users[uid].globalElo + global.winnerDelta,
          leagueBefore: memberships[uid].leagueElo,
          leagueAfter: memberships[uid].leagueElo + league.winnerDelta,
        }
        displayNames[uid] = publicDisplayName(users[uid].displayName)
      }
    }
    for (const uid of input.loserIds) {
      if (isNpcId(uid)) {
        playerElo[uid] = { globalBefore: NPC_ELO, globalAfter: NPC_ELO, leagueBefore: NPC_ELO, leagueAfter: NPC_ELO }
        displayNames[uid] = NPC_DISPLAY_NAME
      } else {
        playerElo[uid] = {
          globalBefore: users[uid].globalElo,
          globalAfter: users[uid].globalElo + global.loserDelta,
          leagueBefore: memberships[uid].leagueElo,
          leagueAfter: memberships[uid].leagueElo + league.loserDelta,
        }
        displayNames[uid] = publicDisplayName(users[uid].displayName)
      }
    }

    tx.set(gameRef, {
      leagueId: input.leagueId,
      gameType: input.gameType,
      winnerIds: input.winnerIds,
      loserIds: input.loserIds,
      playerElo,
      kFactorGlobal: K_GLOBAL,
      kFactorLeague: K_LEAGUE,
      playedAt: serverTimestamp(),
      leagueName,
      sport,
      displayNames,
    })

    for (const uid of input.winnerIds) {
      if (isNpcId(uid)) continue
      tx.update(userRefs[uid], {
        globalElo: playerElo[uid].globalAfter,
        globalWins: increment(1),
      })
      tx.update(membershipRefs[uid], {
        leagueElo: playerElo[uid].leagueAfter,
        leagueWins: increment(1),
      })
    }
    for (const uid of input.loserIds) {
      if (isNpcId(uid)) continue
      tx.update(userRefs[uid], {
        globalElo: playerElo[uid].globalAfter,
        globalLosses: increment(1),
      })
      tx.update(membershipRefs[uid], {
        leagueElo: playerElo[uid].leagueAfter,
        leagueLosses: increment(1),
      })
    }

    return gameRef.id
  })
}

// Patches photoUrl onto an existing game doc. Called after uploadGamePhoto so
// the path can include the newly-minted gameId.
export async function setGamePhoto(
  gameId: string,
  photoUrl: string,
): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), { photoUrl })
}

// --- League admin helpers (Phase 9) ----------------------------------------

export async function getLeagueRole(
  leagueId: string,
  uid: string,
): Promise<LeagueRole | null> {
  const [leagueSnap, membershipSnap] = await Promise.all([
    getDoc(doc(db, 'leagues', leagueId)),
    getDoc(doc(db, 'memberships', membershipId(leagueId, uid))),
  ])
  if (!leagueSnap.exists() || !membershipSnap.exists()) return null
  const ownerId = leagueSnap.data().ownerId as string
  if (ownerId === uid) return 'owner'
  const role = (membershipSnap.data().role as MembershipRole | undefined) ??
    'member'
  return role
}

export async function renameLeague(
  leagueId: string,
  input: RenameLeagueInput,
): Promise<void> {
  await updateDoc(doc(db, 'leagues', leagueId), {
    name: input.name.trim(),
    sport: input.sport,
  })
}

export async function rotateInviteCode(leagueId: string): Promise<string> {
  const code = generateInviteCode()
  await updateDoc(doc(db, 'leagues', leagueId), { inviteCode: code })
  return code
}

export async function resetLeagueElos(leagueId: string): Promise<void> {
  const memberships = await getMembershipsByLeague(leagueId)
  const batch = writeBatch(db)
  for (const m of memberships) {
    batch.update(doc(db, 'memberships', m.id), {
      leagueElo: 1000,
      leagueWins: 0,
      leagueLosses: 0,
    })
  }
  await batch.commit()
}

export async function setMemberRole(
  leagueId: string,
  uid: string,
  role: MembershipRole,
): Promise<void> {
  const ref = doc(db, 'memberships', membershipId(leagueId, uid))
  // 'member' is the absence of the field; delete rather than write literal.
  await updateDoc(ref, {
    role: role === 'admin' ? 'admin' : deleteField(),
  })
}

export async function removeMember(
  leagueId: string,
  uid: string,
): Promise<void> {
  await deleteDoc(doc(db, 'memberships', membershipId(leagueId, uid)))
}

// Recomputes every game in the league from scratch after removing the target
// game, rewrites each game's per-player league-ELO snapshots, and writes final
// standings back to all current memberships. Global ELO is corrected by
// reversing the current-game deltas on each participant (no cross-league recompute).
export async function deleteGame(gameId: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId)
  const gameSnap = await getDoc(gameRef)
  if (!gameSnap.exists()) throw new Error('Game not found')
  const game = normalizeGame({ id: gameId, ...gameSnap.data() })

  // Reuse the existing (leagueId, playedAt DESC) composite index and
  // reverse client-side to walk chronologically — avoids needing a second
  // ASC-direction index.
  const [allGamesSnap, membershipsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'games'),
        where('leagueId', '==', game.leagueId),
        orderBy('playedAt', 'desc'),
      ),
    ),
    getDocs(
      query(
        collection(db, 'memberships'),
        where('leagueId', '==', game.leagueId),
      ),
    ),
  ])

  const otherGames: Game[] = allGamesSnap.docs
    .map((d) => normalizeGame({ id: d.id, ...d.data() }))
    .filter((g) => g.id !== gameId)
    .reverse()

  if (otherGames.length > 200) {
    throw new Error(
      'This league has too many games to recompute in one pass. Contact an admin.',
    )
  }

  const currentMemberUids = new Set(
    membershipsSnap.docs.map((d) => (d.data() as Membership).userId),
  )

  const elo = new Map<string, number>()
  const wins = new Map<string, number>()
  const losses = new Map<string, number>()

  for (const uid of currentMemberUids) {
    elo.set(uid, 1000)
    wins.set(uid, 0)
    losses.set(uid, 0)
  }

  // For each recomputed game, rebuild its full playerElo map — preserving
  // original global ELO snapshots (deleteGame does not recompute global),
  // overwriting only league ELOs.
  const snapshotUpdates: Array<{ id: string; playerElo: Record<string, PlayerEloSnapshot> }> = []

  for (const g of otherGames) {
    // NPCs always contribute NPC_ELO; they're not in the elo map.
    const winnerBefore = g.winnerIds.map((uid) => isNpcId(uid) ? NPC_ELO : (elo.get(uid) ?? 1000))
    const loserBefore = g.loserIds.map((uid) => isNpcId(uid) ? NPC_ELO : (elo.get(uid) ?? 1000))
    const { winnerDelta, loserDelta } = calculateTeamElo(
      winnerBefore,
      loserBefore,
      K_LEAGUE,
    )

    const newPlayerElo: Record<string, PlayerEloSnapshot> = {}
    for (const uid of g.winnerIds) {
      if (isNpcId(uid)) {
        newPlayerElo[uid] = { globalBefore: NPC_ELO, globalAfter: NPC_ELO, leagueBefore: NPC_ELO, leagueAfter: NPC_ELO }
        continue
      }
      const before = elo.get(uid) ?? 1000
      const after = before + winnerDelta
      const existingGlobal = g.playerElo[uid]
      newPlayerElo[uid] = {
        globalBefore: existingGlobal?.globalBefore ?? 0,
        globalAfter: existingGlobal?.globalAfter ?? 0,
        leagueBefore: before,
        leagueAfter: after,
      }
      elo.set(uid, after)
      wins.set(uid, (wins.get(uid) ?? 0) + 1)
    }
    for (const uid of g.loserIds) {
      if (isNpcId(uid)) {
        newPlayerElo[uid] = { globalBefore: NPC_ELO, globalAfter: NPC_ELO, leagueBefore: NPC_ELO, leagueAfter: NPC_ELO }
        continue
      }
      const before = elo.get(uid) ?? 1000
      const after = before + loserDelta
      const existingGlobal = g.playerElo[uid]
      newPlayerElo[uid] = {
        globalBefore: existingGlobal?.globalBefore ?? 0,
        globalAfter: existingGlobal?.globalAfter ?? 0,
        leagueBefore: before,
        leagueAfter: after,
      }
      elo.set(uid, after)
      losses.set(uid, (losses.get(uid) ?? 0) + 1)
    }

    snapshotUpdates.push({ id: g.id, playerElo: newPlayerElo })
  }

  const batch = writeBatch(db)

  for (const uid of currentMemberUids) {
    batch.update(doc(db, 'memberships', membershipId(game.leagueId, uid)), {
      leagueElo: elo.get(uid) ?? 1000,
      leagueWins: wins.get(uid) ?? 0,
      leagueLosses: losses.get(uid) ?? 0,
    })
  }

  for (const upd of snapshotUpdates) {
    batch.update(doc(db, 'games', upd.id), { playerElo: upd.playerElo })
  }

  // Reverse global ELO deltas and W/L for every real participant of the deleted game.
  for (const uid of game.winnerIds) {
    if (isNpcId(uid)) continue
    const snap = game.playerElo[uid]
    const delta = snap ? snap.globalAfter - snap.globalBefore : 0
    batch.update(doc(db, 'users', uid), {
      globalElo: increment(-delta),
      globalWins: increment(-1),
    })
  }
  for (const uid of game.loserIds) {
    if (isNpcId(uid)) continue
    const snap = game.playerElo[uid]
    const delta = snap ? snap.globalAfter - snap.globalBefore : 0
    batch.update(doc(db, 'users', uid), {
      globalElo: increment(-delta),
      globalLosses: increment(-1),
    })
  }

  batch.delete(gameRef)

  await batch.commit()
}

// Replaces an NPC slot in an existing game with a real league member.
// The original ELO snapshot (recorded at 900) is preserved and attributed
// to the real player — no ELO recompute is performed.
export async function replaceNpcWithPlayer(
  gameId: string,
  npcId: string,
  realPlayerId: string,
): Promise<void> {
  if (!isNpcId(npcId)) throw new Error('Not an NPC slot')

  const gameSnap = await getDoc(doc(db, 'games', gameId))
  if (!gameSnap.exists()) throw new Error('Game not found')
  const game = normalizeGame({ id: gameId, ...gameSnap.data() })

  const [memberSnap, userSnap] = await Promise.all([
    getDoc(doc(db, 'memberships', membershipId(game.leagueId, realPlayerId))),
    getDoc(doc(db, 'users', realPlayerId)),
  ])

  if (!memberSnap.exists()) {
    throw new Error('Player must be a member of this league')
  }

  if (!game.winnerIds.includes(npcId) && !game.loserIds.includes(npcId)) {
    throw new Error('NPC slot not found in this game')
  }
  const allRealIds = [...game.winnerIds, ...game.loserIds].filter((id) => !isNpcId(id))
  if (allRealIds.includes(realPlayerId)) {
    throw new Error('Player is already in this game')
  }

  const realDisplayName = userSnap.exists()
    ? publicDisplayName((userSnap.data() as User).displayName)
    : 'Player'

  const newWinnerIds = game.winnerIds.map((id) => (id === npcId ? realPlayerId : id))
  const newLoserIds = game.loserIds.map((id) => (id === npcId ? realPlayerId : id))

  const newPlayerElo: Record<string, PlayerEloSnapshot> = { ...game.playerElo }
  newPlayerElo[realPlayerId] = newPlayerElo[npcId]
  delete newPlayerElo[npcId]

  const newDisplayNames: Record<string, string> = { ...(game.displayNames ?? {}) }
  newDisplayNames[realPlayerId] = realDisplayName
  delete newDisplayNames[npcId]

  await updateDoc(doc(db, 'games', gameId), {
    winnerIds: newWinnerIds,
    loserIds: newLoserIds,
    playerElo: newPlayerElo,
    displayNames: newDisplayNames,
  })
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const [gamesSnap, membershipsSnap] = await Promise.all([
    getDocs(query(collection(db, 'games'), where('leagueId', '==', leagueId))),
    getDocs(
      query(
        collection(db, 'memberships'),
        where('leagueId', '==', leagueId),
      ),
    ),
  ])

  const refs = [
    ...gamesSnap.docs.map((d) => d.ref),
    ...membershipsSnap.docs.map((d) => d.ref),
  ]

  const CHUNK = 450
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + CHUNK)) {
      batch.delete(ref)
    }
    await batch.commit()
  }

  await deleteDoc(doc(db, 'leagues', leagueId))
}
