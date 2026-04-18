export function formatRecord(wins: number, losses: number): string {
  return `${wins}W – ${losses}L`
}

export function formatDelta(before: number, after: number): string {
  const delta = after - before
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}`
}

export function deltaColorClass(before: number, after: number): string {
  if (after > before) return 'text-emerald-600 dark:text-emerald-400'
  if (after < before) return 'text-rose-600 dark:text-rose-400'
  return 'text-muted-foreground'
}
