export type DailyRevenue = { date: string; label: string; revenue: number }

type OrderLike = { status: string; total: number; placed_at: string }

// One bucket per actual calendar date in the range (inclusive), not per day
// of the week — a 30-day range produces 30 points, so trends and spikes on
// specific dates are visible instead of being smeared across "every Monday."
// Dates are bucketed in the browser's local time zone, matching how
// DateRangeFilter's from/to are already interpreted everywhere else
// (new Date(from + 'T00:00:00')).
export function getDailyRevenue(orders: OrderLike[], range: { from: string; to: string }): DailyRevenue[] {
  const byDate = new Map<string, number>()
  for (const o of orders) {
    if (o.status !== 'delivered') continue
    const key = dateKey(new Date(o.placed_at))
    byDate.set(key, (byDate.get(key) ?? 0) + o.total)
  }

  const result: DailyRevenue[] = []
  const cur = new Date(range.from + 'T00:00:00')
  const end = new Date(range.to + 'T00:00:00')
  while (cur <= end) {
    const key = dateKey(cur)
    result.push({
      date: key,
      label: cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: byDate.get(key) ?? 0,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayKey(): string {
  return dateKey(new Date())
}
