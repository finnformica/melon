# TODOS.md — ELO League Tracker

Work breakdown in implementation order. Tick items off as they are completed. Do not skip phases — each phase builds on the last.

---

## Phase 1 — Project scaffolding

- [ ] Initialise Vite + React + TypeScript project
- [ ] Install and configure Tailwind CSS
- [ ] Install and initialise shadcn/ui
- [ ] Install dependencies: `react-router-dom`, `@tanstack/react-query`, `firebase`, `react-hook-form`, `zod`, `recharts`, `date-fns`
- [ ] Create `.env.local` with Firebase config env vars (template only, no real values)
- [ ] Create `src/lib/firebase.ts` — initialise Firebase app, export `auth` and `db`
- [ ] Set up `src/router.tsx` with placeholder routes
- [ ] Wrap `main.tsx` with `QueryClientProvider`, `AuthProvider`, and `RouterProvider`
- [ ] Create shared TypeScript interfaces in `src/types/index.ts`: `User`, `League`, `Membership`, `Game`

---

## Phase 2 — Authentication

- [ ] Create `src/features/auth/AuthProvider.tsx` — wraps app with Firebase Auth state, exposes `useAuth` hook
- [ ] Implement `useAuth` hook — returns `{ user, loading, signInWithGoogle, signInWithGithub, signOut }`
- [ ] Create `src/features/auth/LoginPage.tsx` — Google and GitHub sign-in buttons using shadcn `Button`
- [ ] Create `src/components/shared/ProtectedRoute.tsx` — redirects unauthenticated users to `/login`
- [ ] On first sign-in, create `users/{uid}` document in Firestore with default `globalElo: 1000`
- [ ] Handle auth loading state globally (full-screen spinner before route renders)

---

## Phase 3 — Core library

- [ ] Create `src/lib/elo.ts` — pure `calculateElo(winner, loser, k)` function with exported K-factor constants (`K_GLOBAL = 20`, `K_LEAGUE = 32`)
- [ ] Create `src/lib/firestore.ts` — typed helpers:
  - `getUser(uid)`
  - `getLeague(leagueId)`
  - `getLeaguesByOwner(uid)`
  - `getMembershipsByUser(uid)`
  - `getMembershipsByLeague(leagueId)`
  - `getGamesByLeague(leagueId)`
  - `createLeague(data)`
  - `joinLeague(inviteCode, uid)`
  - `recordGame(data)` — uses `writeBatch`, updates both ELO tracks atomically

---

## Phase 4 — Firestore Security Rules

- [ ] Write `firestore.rules`:
  - `users/{uid}` — read: authenticated; write: own document only
  - `leagues/{leagueId}` — read: authenticated; create: authenticated; delete: owner only
  - `memberships/{id}` — read: authenticated; create: `userId == request.auth.uid`; delete: own membership or league owner
  - `games/{id}` — read: league members; create: both players are league members; no update or delete
- [ ] Deploy rules to Firebase project
- [ ] Test rules using Firebase Emulator Suite

---

## Phase 5 — Leagues

- [ ] Create `src/hooks/useLeagues.ts` — TanStack Query hook, real-time `onSnapshot` listener for user's leagues
- [ ] Create `src/features/leagues/LeagueListPage.tsx` — lists joined leagues, links to create/join
- [ ] Create `src/features/leagues/CreateLeaguePage.tsx` — form (name, sport), generates `inviteCode`, writes to Firestore
- [ ] Create `src/features/leagues/JoinLeaguePage.tsx` — input for invite code, queries league, creates membership doc
- [ ] Create `src/features/leagues/LeagueDetailPage.tsx` — shell page with tabs: Standings, Games, Members
- [ ] Generate short random invite codes (6 chars, alphanumeric) in `src/lib/utils.ts`

---

## Phase 6 — Recording games

- [ ] Create `src/hooks/useMembers.ts` — fetches memberships + user display names for a league
- [ ] Create `src/features/games/RecordGamePage.tsx`:
  - Select winner from league member list (shadcn `Select` or `Combobox`)
  - Select loser from league member list
  - Prevent selecting same player twice
  - On submit: fetch both memberships, calculate ELO (global + league), write batch
  - Show ELO delta preview before confirming (`+18`, `-18`)
- [ ] Create `src/features/games/GameHistoryList.tsx` — paginated list of recent games in a league, shows ELO deltas

---

## Phase 7 — Standings & leaderboards

- [ ] Create `src/features/standings/LeagueStandingsTable.tsx` — ordered by `leagueElo` desc, shows rank, name, ELO, W/L record
- [ ] Create `src/features/standings/GlobalLeaderboardPage.tsx` — ordered by `globalElo` desc, all users
- [ ] Create `src/features/standings/EloHistoryChart.tsx` — recharts `LineChart` plotting ELO over time from game history (both global and league lines on same chart)
- [ ] Create `src/features/standings/PlayerProfilePage.tsx` — shows global ELO, list of league ELOs, recent games, ELO history chart

---

## Phase 8 — Navigation & layout

- [ ] Create `src/components/shared/Navbar.tsx` — logo, league switcher, global leaderboard link, user avatar + sign out
- [ ] Create `src/components/shared/AppLayout.tsx` — wraps authenticated pages with Navbar and page container
- [ ] Wire up all routes in `src/router.tsx`:
  - `/` → redirect to `/leagues` if authenticated, else `/login`
  - `/login`
  - `/leagues`
  - `/leagues/create`
  - `/leagues/join`
  - `/leagues/:leagueId` → standings tab
  - `/leagues/:leagueId/games`
  - `/leagues/:leagueId/record`
  - `/leaderboard`
  - `/players/:uid`
- [ ] Add 404 page

---

## Phase 9 — Polish & UX

- [ ] Add loading skeletons (shadcn `Skeleton`) to all data-fetching views
- [ ] Add empty states for: no leagues joined, no games recorded, no members
- [ ] Add toast notifications (shadcn `Sonner`) for: game recorded, league created, joined league, errors
- [ ] Add confirmation dialog before recording a game (shadcn `AlertDialog`)
- [ ] Make ELO delta display colour-coded (green gain, red loss) across all views
- [ ] Responsive layout — all pages usable on mobile

---

## Phase 10 — Deploy

- [ ] Configure Firebase Hosting (or Vercel/Netlify)
- [ ] Set production environment variables in hosting provider
- [ ] Deploy Firestore Security Rules to production
- [ ] Create Firestore indexes for: `memberships` by `leagueId`, `games` by `leagueId + playedAt`, `users` by `globalElo`
- [ ] Smoke test: create league, invite second user, record game, verify both ELO tracks updated correctly

---

## Backlog (post-MVP)

- [ ] Provisional K-factor for new players (higher K for first 30 games)
- [ ] League admin: remove members, reset league ELOs
- [ ] Multiple sports per user with separate global ELO tracks
- [ ] Public league discovery page
- [ ] Share game result card (screenshot-friendly)
- [ ] PWA / installable on mobile
