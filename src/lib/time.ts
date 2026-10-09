export function resetsIn(resetAt: number): string {
  const ms = Math.max(0, resetAt - Date.now())
  const h = Math.floor(ms / 36e5)
  const m = Math.floor((ms % 36e5) / 6e4)
  return h > 0 ? `resets in ${h}h ${m}m` : `resets in ${m}m`
}
