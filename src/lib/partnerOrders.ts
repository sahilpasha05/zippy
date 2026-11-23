import type { SupabaseClient } from '@supabase/supabase-js'

// Orders for a grocery partner's panel and analytics. An order reaches a partner two ways:
//   - an admin assigned the whole order to them (orders.grocery_partner_id): they see every line;
//   - some of its lines were routed to them (order_items.grocery_partner_id, set when the order is
//     placed): they see only those lines, and `total` becomes the value of just those lines.
// An order with lines for two partners therefore appears in both panels, each with its own part.
type Row = { id: string; total: number; placed_at: string; order_items: { price: number; quantity: number }[] }

export async function fetchPartnerOrders<T extends Row>(
  supabase: SupabaseClient,
  partnerId: string,
  cols: string,
  itemCols: string,
  opts: { limit?: number; fromISO?: string; toISO?: string } = {},
): Promise<(T & { partial: boolean })[]> {
  const limit = opts.limit ?? 500
  const range = <Q extends { gte: (c: string, v: string) => Q; lte: (c: string, v: string) => Q }>(q: Q) => {
    if (opts.fromISO) q = q.gte('placed_at', opts.fromISO)
    if (opts.toISO) q = q.lte('placed_at', opts.toISO)
    return q
  }
  const whole = range(supabase.from('orders').select(`${cols}, order_items(${itemCols})`).eq('grocery_partner_id', partnerId))
    .order('placed_at', { ascending: false }).limit(limit)
  const split = range(supabase.from('orders').select(`${cols}, order_items!inner(${itemCols})`).eq('order_items.grocery_partner_id', partnerId))
    .order('placed_at', { ascending: false }).limit(limit)
  const [a, b] = await Promise.all([whole, split])

  const out = new Map<string, T & { partial: boolean }>()
  for (const o of (a.data as unknown as T[]) ?? []) out.set(o.id, { ...o, partial: false })
  for (const o of (b.data as unknown as T[]) ?? []) {
    if (out.has(o.id)) continue
    const items = o.order_items ?? []
    const total = Math.round(items.reduce((s, i) => s + Number(i.price) * i.quantity, 0) * 100) / 100
    out.set(o.id, { ...o, total, partial: true })
  }
  return [...out.values()].sort((x, y) => y.placed_at.localeCompare(x.placed_at)).slice(0, limit)
}
