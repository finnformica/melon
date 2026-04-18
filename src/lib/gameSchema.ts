import type { Game, LegacyGame } from '@/types'

// Detects a legacy-shape game doc (scalar winnerId/loserId + flat ELO fields)
// and rewrites it into the unified Game shape in memory. All read paths go
// through this so consumer components never branch on schema version.
// Writes always use the unified shape — nothing in this codebase should ever
// persist a legacy doc again.
export function normalizeGame(raw: Record<string, unknown> & { id: string }): Game {
  if (isLegacy(raw)) {
    const g = raw as unknown as LegacyGame
    return {
      id: g.id,
      leagueId: g.leagueId,
      gameType: '1v1',
      winnerIds: [g.winnerId],
      loserIds: [g.loserId],
      playerElo: {
        [g.winnerId]: {
          globalBefore: g.winnerGlobalEloBefore,
          globalAfter: g.winnerGlobalEloAfter,
          leagueBefore: g.winnerLeagueEloBefore,
          leagueAfter: g.winnerLeagueEloAfter,
        },
        [g.loserId]: {
          globalBefore: g.loserGlobalEloBefore,
          globalAfter: g.loserGlobalEloAfter,
          leagueBefore: g.loserLeagueEloBefore,
          leagueAfter: g.loserLeagueEloAfter,
        },
      },
      kFactorGlobal: g.kFactorGlobal,
      kFactorLeague: g.kFactorLeague,
      playedAt: g.playedAt,
      leagueName: g.leagueName,
      sport: g.sport,
      displayNames:
        g.winnerDisplayName || g.loserDisplayName
          ? {
              ...(g.winnerDisplayName
                ? { [g.winnerId]: g.winnerDisplayName }
                : {}),
              ...(g.loserDisplayName
                ? { [g.loserId]: g.loserDisplayName }
                : {}),
            }
          : undefined,
    }
  }
  return raw as unknown as Game
}

function isLegacy(raw: Record<string, unknown>): boolean {
  return typeof raw.winnerId === 'string' && typeof raw.loserId === 'string'
}
