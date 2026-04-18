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

// Team ELO: treat each team as a single player with rating = mean of members.
// Run standard ELO on the two means, then apply the same delta to every member
// of each team. A 1v1 game is the degenerate case and returns identical deltas
// to calculateElo.
export function calculateTeamElo(
  winnerRatings: number[],
  loserRatings: number[],
  k: number,
): { winnerDelta: number; loserDelta: number } {
  if (winnerRatings.length === 0 || loserRatings.length === 0) {
    throw new Error('Each team must have at least one player')
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const winAvg = mean(winnerRatings)
  const loseAvg = mean(loserRatings)
  const { winner: newWinAvg, loser: newLoseAvg } = calculateElo(
    winAvg,
    loseAvg,
    k,
  )
  return {
    winnerDelta: newWinAvg - Math.round(winAvg),
    loserDelta: newLoseAvg - Math.round(loseAvg),
  }
}
