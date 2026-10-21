// Exact "x ago" text used across the admin, restaurant, delivery and store panels:
// minutes while under an hour, then hours and minutes ("1 h 1 min ago"), then days
// and hours. Nothing is rounded down to a whole hour.
export function formatAgo(from: string | number | Date, now: number = Date.now()): string {
  const t = new Date(from).getTime()
  if (Number.isNaN(t)) return ''
  const mins = Math.max(0, Math.floor((now - t) / 60000))
  if (mins < 1) return 'just now'
  return `${formatDuration(mins)} ago`
}

// A length of time in whole minutes: "45 min", "1 h 1 min", "2 h", "1 d 3 h".
export function formatDuration(totalMins: number): string {
  const mins = Math.max(0, Math.floor(totalMins))
  if (mins < 60) return `${mins} min`
  if (mins < 1440) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m === 0 ? `${h} h` : `${h} h ${m} min`
  }
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  return h === 0 ? `${d} d` : `${d} d ${h} h`
}
