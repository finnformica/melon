export const K_GLOBAL = 20
export const K_LEAGUE = 32

export function calculateElo(
  winnerRating: number,
  loserRating: number,
  k: number,
): { winner: number; loser: number } {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400))
  return {
    winner: Math.round(winnerRating + k * (1 - expected)),
    loser: Math.round(loserRating + k * (0 - expected)),
  }
}
