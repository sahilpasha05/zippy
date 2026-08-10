'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { TrendingUp, ShoppingBag, Star, Clock, Loader2, X, Package } from 'lucide-react'
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'
import { getDailyRevenue, todayKey } from '@/lib/analytics'
import { removePriceMarkup } from '@/lib/cartPricing'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Restaurant = { id: string; name: string; slug: string }
type OrderItem = { name: string; quantity: number; price: number }
type Order = {
  id: string; status: string; total: number; placed_at: string
  customer_name: string | null; customer_phone: string | null
  order_items: OrderItem[]
}

// What the restaurant is actually owed for the food itself. `order.total`
// bundles in delivery_fee, platform_fee, and a small packaging charge —
// none of which is the restaurant's revenue. And `order_items.price` itself
// is the cart-facing price, already marked up 4% over the menu price at
// checkout (see PRICE_MARKUP in cartPricing.ts) — removePriceMarkup recovers
// the actual menu price the restaurant listed.
function menuTotal(o: Order) {
  return (o.order_items ?? []).reduce((s, item) => s + removePriceMarkup(item.price) * item.quantity, 0)
}
function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SlugAnalyticsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>(presetRange(30))
  const [drillOpen, setDrillOpen] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: rest } = await supabase.from('restaurants').select('id, name, slug').eq('slug', slug).single()
      if (!rest) { setLoading(false); return }
      setRestaurant(rest as Restaurant)
      const fromISO = new Date(range.from + 'T00:00:00').toISOString()
      const toISO = new Date(range.to + 'T23:59:59.999').toISOString()
      const { data: ords } = await supabase.from('orders').select('id, status, total, placed_at, customer_name, customer_phone, order_items(name, quantity, price)')
        .eq('restaurant_id', rest.id)
        .gte('placed_at', fromISO).lte('placed_at', toISO)
        .order('placed_at', { ascending: false }).limit(2000)
      setOrders((ords as unknown as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [slug, range])

  const delivered = orders.filter((o) => o.status === 'delivered')
  const totalRevenue = delivered.reduce((s, o) => s + menuTotal(o), 0)
  const avgOrderValue = delivered.length ? totalRevenue / delivered.length : 0

  // Delivered orders behind the Total Revenue figure, grouped by day for
  // the drill-down — most recent day first.
  const revenueByDay = (() => {
    const map = new Map<string, { day: string; orders: Order[]; amount: number }>()
    for (const o of delivered) {
      const key = dayKey(o.placed_at)
      if (!map.has(key)) map.set(key, { day: key, orders: [], amount: 0 })
      const entry = map.get(key)!
      entry.orders.push(o)
      entry.amount += menuTotal(o)
    }
    return Array.from(map.values()).sort((a, b) => b.day.localeCompare(a.day))
  })()

  // One bar per actual calendar date in the selected range, not per day of
  // the week — so a spike or dip on a specific date is visible. Bars use
  // menu-only revenue too, so they sum to the Total Revenue stat above.
  const dailyRevenue = getDailyRevenue(orders.map((o) => ({ ...o, total: menuTotal(o) })), range)
  const maxDaily = Math.max(...dailyRevenue.map((d) => d.revenue), 1)
  const today = todayKey()

  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc }, {} as Record<string, number>)

  const stats = [
    { label: 'Total Revenue',   value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Total Orders',    value: orders.length,                        icon: ShoppingBag, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Avg Order Value', value: `₹${avgOrderValue.toFixed(0)}`,       icon: Star,        color: '#D97706', bg: '#FFFBEB' },
    { label: 'Delivered',       value: delivered.length,                     icon: Clock,       color: '#7C3AED', bg: '#F5F3FF' },
  ]

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={restaurant} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 space-y-3">
          <div>
            <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Analytics</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Your restaurant performance</p>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(({ label, value, icon: Icon, color, bg }) => {
                  const clickable = label === 'Total Revenue'
                  const Tag = clickable ? 'button' : 'div'
                  return (
                    <Tag key={label} onClick={clickable ? () => setDrillOpen(true) : undefined}
                      className={`bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm text-left w-full ${clickable ? 'hover:border-[#16A34A] transition-all active:scale-[0.98]' : ''}`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="text-[22px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{value}</div>
                      <div className="text-[12px] text-[#9CA3AF] mt-0.5">{label}{clickable ? ' · menu items only, tap for details' : ''}</div>
                    </Tag>
                  )
                })}
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                <h2 className="text-[15px] font-[700] text-[#111827] mb-1">Revenue by Day</h2>
                <p className="text-[12px] text-[#9CA3AF] mb-5">From delivered orders, one bar per date in range</p>
                <div className="flex items-end gap-1.5 h-40 overflow-x-auto pb-1">
                  {dailyRevenue.map((d) => {
                    const pct = (d.revenue / maxDaily) * 100
                    const isToday = d.date === today
                    return (
                      <div key={d.date} className="flex flex-col items-center gap-2 shrink-0 w-9">
                        <div className="text-[9px] text-[#9CA3AF] whitespace-nowrap">{d.revenue > 0 ? `₹${(d.revenue/1000).toFixed(1)}k` : ''}</div>
                        <div className="w-full rounded-t-lg min-h-[4px]" style={{ height: `${Math.max(pct, 4)}%`, background: isToday ? '#16A34A' : '#DCFCE7' }} />
                        <div className="text-[10px] whitespace-nowrap" style={{ color: isToday ? '#16A34A' : '#9CA3AF', fontWeight: isToday ? 600 : 400 }}>{d.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                <h2 className="text-[15px] font-[700] text-[#111827] mb-5">Order Status Breakdown</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { status: 'confirmed',        label: 'Confirmed',  color: '#0891B2', bg: '#ECFEFF' },
                    { status: 'preparing',        label: 'Preparing',  color: '#D97706', bg: '#FFFBEB' },
                    { status: 'out_for_delivery', label: 'On the way', color: '#7C3AED', bg: '#F5F3FF' },
                    { status: 'delivered',        label: 'Delivered',  color: '#16A34A', bg: '#DCFCE7' },
                    { status: 'cancelled',        label: 'Cancelled',  color: '#DC2626', bg: '#FEF2F2' },
                    { status: 'pending',          label: 'Pending',    color: '#6B7280', bg: '#F3F4F6' },
                  ].map(({ status, label, color, bg }) => (
                    <div key={status} className="rounded-xl p-4 text-center" style={{ background: bg }}>
                      <div className="text-[26px] font-[800] mb-1" style={{ color, fontWeight: 800 }}>{statusCounts[status] ?? 0}</div>
                      <div className="text-[12px] font-[600]" style={{ color }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Order-level detail behind Total Revenue: day by day, each order's
          items with name/qty/price, and a menu-only total per order. */}
      {drillOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrillOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col z-10">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#F3F4F6] shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-[600] uppercase tracking-wide text-[#16A34A]">Total Revenue · menu items only</p>
                <h2 className="text-[15px] font-[800] text-[#111827] truncate" style={{ fontWeight: 800 }}>₹{totalRevenue.toLocaleString()}</h2>
              </div>
              <button onClick={() => setDrillOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] shrink-0">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {revenueByDay.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF] text-center py-10">No delivered orders in this range.</p>
              ) : (
                revenueByDay.map(({ day, orders: dayOrders, amount }) => (
                  <div key={day}>
                    <div className="flex items-center justify-between px-5 py-2.5 bg-[#F8FAFC] border-y border-[#F3F4F6] sticky top-0">
                      <span className="text-[12px] font-[700] text-[#111827]">
                        {new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[12px] text-[#6B7280]">
                        {dayOrders.length} order{dayOrders.length !== 1 ? 's' : ''} · <span className="font-[700] text-[#111827]">₹{amount.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="divide-y divide-[#F3F4F6]">
                      {dayOrders.map((o) => (
                        <div key={o.id} className="px-5 py-4">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="text-[12px] font-mono font-[700] text-[#374151]">{o.id.slice(0, 8).toUpperCase()}</span>
                            <span className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                              <Clock className="w-3 h-3" />
                              {new Date(o.placed_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[13px] font-[600] text-[#111827] mb-2">
                            {o.customer_name ?? 'Customer'}
                            {o.customer_phone && <span className="text-[#9CA3AF] font-normal"> · {o.customer_phone}</span>}
                          </p>
                          {o.order_items?.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {o.order_items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-[12.5px] text-[#374151]">
                                  <span className="flex items-center gap-1.5 min-w-0">
                                    <Package className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                                    <span className="truncate">{item.name} × {item.quantity}</span>
                                  </span>
                                  <span className="font-[600] shrink-0">₹{(removePriceMarkup(item.price) * item.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between text-[13px] font-[700] text-[#111827] pt-2 border-t border-[#F3F4F6]">
                            <span>Menu total</span>
                            <span>₹{menuTotal(o).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
