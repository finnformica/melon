# CLAUDE.md — ELO League Tracker

This file provides Claude Code with full context on the project architecture, conventions, and decisions made during planning. Read this before making any changes.

---

## What this project is

A SaaS web application for tracking ELO ratings across sports leagues. Users can create or join leagues, record game results, and track both a **global ELO rating** (cross-league, like Chess.com) and a **per-league ELO rating** (isolated to each league).

---

## Tech stack

| Layer         | Choice                              | Notes                                                 |
| ------------- | ----------------------------------- | ----------------------------------------------------- |
| Framework     | React 18 + Vite                     | SPA, no SSR                                           |
| Routing       | React Router v6                     | Client-side only                                      |
| Server state  | TanStack Query v5                   | Wraps Firestore `onSnapshot` listeners                |
| UI primitives | shadcn/ui                           | Components live in `src/components/ui/`               |
| Styling       | Tailwind CSS                        | Utility-first, no custom CSS files                    |
| Charts        | recharts                            | ELO history graphs, standings                         |
| Forms         | react-hook-form + zod               | Schema validation on all writes                       |
| Auth          | Firebase Auth                       | Google + GitHub social login only                     |
| Database      | Firestore                           | Real-time listeners, security rules as access control |
| Hosting       | Firebase Hosting / Vercel / Netlify | Static deploy, no backend                             |
| Utilities     | date-fns                            | Date formatting only                                  |

**There is no backend to deploy.** All business logic runs client-side. Firestore Security Rules are the access control layer.

---

## Architecture decisions

### No backend

ELO calculation is pure maths and runs entirely in `src/lib/elo.ts`. All Firestore writes happen directly from the client via the Firebase SDK. Security Rules enforce data integrity server-side.

### Dual ELO system

Every player has two ratings:

- **`globalElo`** — stored on `users/{uid}`, updated on every game regardless of league. Starting value: 1000. K-factor: 20.
- **`leagueElo`** — stored on `memberships/{id}`, scoped to a single league. Starting value: 1000. K-factor: 32.

Both are calculated and written atomically in a single Firestore `writeBatch` when a game is recorded.

### Memberships as join collection

The many-to-many between users and leagues is resolved via a `memberships` collection. This is where per-league ELO, wins, and losses live. Do not store league-specific stats on the `users` document.

### Game records are immutable audit logs

Once written, game documents are never edited. They store ELO snapshots (before/after, both global and league) for both players so rating history can be graphed without recomputation.

### Invite codes

Leagues have an `inviteCode` field. Users join by querying `leagues where inviteCode == X` client-side, then creating a membership document. No backend required.

---

## Firestore data model

### `users/{uid}`

```
displayName: string
photoURL: string
email: string
globalElo: number          // default 1000
globalWins: number         // default 0
globalLosses: number       // default 0
createdAt: Timestamp
```

### `leagues/{leagueId}`

```
name: string
sport: string
ownerId: string            // uid of creator
inviteCode: string         // short random code for joining
createdAt: Timestamp
```

### `memberships/{membershipId}`

```
userId: string
leagueId: string
leagueElo: number          // default 1000
leagueWins: number         // default 0
leagueLosses: number       // default 0
joinedAt: Timestamp
```

### `games/{gameId}`

```
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
```

---

## Project structure

```
src/
├── components/
│   ├── ui/                  # shadcn auto-generated — do not edit manually
│   └── shared/              # Navbar, ProtectedRoute, LoadingSpinner, etc.
├── features/
│   ├── auth/                # AuthProvider, useAuth, LoginPage
│   ├── leagues/             # LeagueList, CreateLeague, JoinLeague, LeagueDetail
│   ├── games/               # RecordGame form, GameHistory
│   └── standings/           # GlobalLeaderboard, LeagueStandings, EloHistoryChart
├── hooks/                   # TanStack Query wrappers: useLeague, useStandings, useGames, useUser
├── lib/
│   ├── firebase.ts          # Firebase app init — import this, never re-initialise
│   ├── firestore.ts         # Typed Firestore helpers (getLeague, getMemberships, etc.)
│   └── elo.ts               # Pure ELO calculation — no Firebase dependency
├── router.tsx               # All route definitions
├── types/                   # Shared TypeScript interfaces (User, League, Membership, Game)
└── main.tsx
```

---

## ELO calculation

The core function in `src/lib/elo.ts`:

```ts
export function calculateElo(
  winnerRating: number,
  loserRating: number,
  k: number,
) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  return {
    winner: Math.round(winnerRating + k * (1 - expected)),
    loser: Math.round(loserRating + k * (0 - expected)),
  };
}
```

K-factors:

- `K_GLOBAL = 20` — conservative, prestigious global rating
- `K_LEAGUE = 32` — more volatile, reflects league form

When recording a game, call `calculateElo` twice (once per rating type), then commit all writes in a single `writeBatch`.

---

## Coding conventions

- **TypeScript strictly** — no `any`, no `// @ts-ignore`
- **Named exports** — no default exports except route-level page components
- **Zod schemas** — validate all data before writing to Firestore
- **TanStack Query for all async state** — no `useState` + `useEffect` for data fetching
- **Firestore listeners via TanStack Query** — use `queryClient.setQueryData` inside `onSnapshot` callbacks
- **shadcn/ui for all UI primitives** — do not install other component libraries
- **date-fns for all date formatting** — no `new Date().toLocaleDateString()`
- **Firestore batch writes** — any operation that touches more than one document must use `writeBatch`
- **Security Rules are the backend** — never trust client-side checks alone for access control

---

## Environment variables

All Firebase config lives in `.env.local` (never committed):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Access via `import.meta.env.VITE_FIREBASE_*`.

---

## Firestore Security Rules principles

- Users can only read/write their own `users` document
- Any authenticated user can read leagues and memberships (for discovery)
- Only the league owner (`ownerId`) can delete a league
- Membership writes require a valid `userId` matching the authenticated user
- Game writes require both players to be members of the referenced league
- ELO fields on `users` and `memberships` may only be written as part of a game record (enforce via rules logic)

---

## Out of scope (do not implement)

- No backend / Cloud Functions / API routes
- No email/password auth — social login only
- No file uploads or avatars beyond Firebase Auth photoURL
- No payments or subscriptions
- No push notifications
- No admin panel
