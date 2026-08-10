'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { TrendingUp, ShoppingBag, Store, Users, X, ChevronLeft, ChevronRight, Package, Clock } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'
import { getDailyRevenue, todayKey } from '@/lib/analytics'
import { removePriceMarkup } from '@/lib/cartPricing'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Order = { id: string; status: string; total: number; placed_at: string; restaurant_id: string | null }

type TodayOrderItem = { name: string; quantity: number; price: number }
type TodayOrder = {
  id: string; status: string; total: number; placed_at: string
  restaurant_id: string | null
  customer_name: string | null; customer_phone: string | null
  restaurants: { name: string } | { name: string }[] | null
  order_items: TodayOrderItem[]
}

type Bucket = 'total' | 'delivered' | 'pending' | 'cancelled'
const BUCKET_CFG: Record<Bucket, { label: string; color: string; bg: string }> = {
  total:     { label: "Today's Total", color: '#7C3AED', bg: '#F5F3FF' },
  delivered: { label: 'Delivered',     color: '#16A34A', bg: '#DCFCE7' },
  pending:   { label: 'Pending',       color: '#D97706', bg: '#FFFBEB' },
  cancelled: { label: 'Cancelled',     color: '#DC2626', bg: '#FEF2F2' },
}

function inBucket(o: TodayOrder, bucket: Bucket) {
  if (bucket === 'total') return true
  if (bucket === 'delivered') return o.status === 'delivered'
  if (bucket === 'cancelled') return o.status === 'cancelled'
  return !['delivered', 'cancelled'].includes(o.status)
}

// Grocery/essentials orders have no restaurant — grouped under one bucket
// rather than dropped, so every rupee of today's total is accounted for
// somewhere in the breakdown.
const GROCERY_KEY = '__groceries__'
function restKey(o: TodayOrder) {
  return o.restaurant_id ?? GROCERY_KEY
}
function restName(o: TodayOrder) {
  if (!o.restaurants) return 'Groceries / Essentials'
  return (Array.isArray(o.restaurants) ? o.restaurants[0]?.name : o.restaurants.name) ?? 'Groceries / Essentials'
}

// What the restaurant is actually owed for the food itself. `o.total`
// bundles in delivery_fee, platform_fee, and a small packaging charge —
// none of which belongs to the restaurant. And `order_items.price` itself
// is the cart-facing price, already marked up 4% over the menu price at
// checkout (see PRICE_MARKUP in cartPricing.ts) — removePriceMarkup recovers
// the actual menu price the restaurant listed.
function menuTotal(o: TodayOrder) {
  return (o.order_items ?? []).reduce((s, item) => s + removePriceMarkup(item.price) * item.quantity, 0)
}
function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<DateRange>(presetRange(30))
  const [orders, setOrders] = useState<Order[]>([])
  const [restaurantCount, setRestaurantCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [todayOrders, setTodayOrders] = useState<TodayOrder[]>([])
  const [todayLoading, setTodayLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [drillBucket, setDrillBucket] = useState<Bucket | null>(null)
  const [drillRestKey, setDrillRestKey] = useState<string | null>(null)

  // Follows the same range picker as the section below — always joined
  // with restaurant name + line items since the drill-down needs both,
  // while the other range-based fetch deliberately stays lightweight.
  //
  // Boundaries are recomputed on every call, not captured once in a
  // stale closure — a tab left open across midnight would otherwise
  // keep querying yesterday's window forever when range includes today.
  // Only auto-refreshes/refocus-refetches while the range includes
  // today; a purely historical range has nothing live to catch.
  const includesToday = range.to >= todayKey()
  useEffect(() => {
    async function loadToday() {
      setTodayLoading(true)
      const start = new Date(range.from + 'T00:00:00')
      const end = new Date(range.to + 'T23:59:59.999')
      const { data } = await supabase
        .from('orders')
        .select('id, status, total, placed_at, restaurant_id, customer_name, customer_phone, restaurants(name), order_items(name, quantity, price)')
        .gte('placed_at', start.toISOString()).lte('placed_at', end.toISOString())
        .order('placed_at', { ascending: false })
        .limit(5000)
      setTodayOrders((data as unknown as TodayOrder[]) ?? [])
      setTodayLoading(false)
      setLastRefreshed(new Date())
    }
    loadToday()
    if (!includesToday) return
    const interval = setInterval(loadToday, 60_000)
    function onFocus() { if (document.visibilityState === 'visible') loadToday() }
    document.addEventListener('visibilitychange', onFocus)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onFocus) }
  }, [refreshNonce, range, includesToday])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const fromISO = new Date(range.from + 'T00:00:00').toISOString()
      const toISO = new Date(range.to + 'T23:59:59.999').toISOString()
      const [{ data: ords }, { count }] = await Promise.all([
        supabase.from('orders').select('id, status, total, placed_at, restaurant_id')
          .gte('placed_at', fromISO).lte('placed_at', toISO)
          .order('placed_at', { ascending: false }).limit(5000),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ])
      setOrders((ords as Order[]) ?? [])
      setRestaurantCount(count ?? 0)
      setLoading(false)
    }
    load()
  }, [range])

  const delivered = orders.filter((o) => o.status === 'delivered')
  const totalRevenue = delivered.reduce((s, o) => s + o.total, 0)
  const avgOrderValue = delivered.length ? totalRevenue / delivered.length : 0

  const isTodayOnly = range.from === range.to && range.to === todayKey()
  const fmtRangeDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const rangeGlanceLabel = isTodayOnly ? 'Today at a Glance' : `${fmtRangeDate(range.from)} – ${fmtRangeDate(range.to)} at a Glance`

  // Today's buckets — count + amount for each card, and (when a bucket is
  // open) that bucket's orders grouped by restaurant for the drill-down.
  const todayBuckets = (['total', 'delivered', 'pending', 'cancelled'] as const).map((key) => {
    const bucketOrders = todayOrders.filter((o) => inBucket(o, key))
    return { key, count: bucketOrders.length, amount: bucketOrders.reduce((s, o) => s + Number(o.total), 0) }
  })

  // Net after costs: 4% off the whole day's total, then a flat ₹30 per
  // delivered order (payout to the rider) — pending/cancelled orders don't
  // carry that delivery cost since nothing was actually delivered for them.
  const NET_FEE_PCT = 0.04
  const NET_PER_DELIVERY = 30
  const todayTotalAmount = todayBuckets.find((b) => b.key === 'total')?.amount ?? 0
  const deliveredCount = todayBuckets.find((b) => b.key === 'delivered')?.count ?? 0
  const feeDeduction = todayTotalAmount * NET_FEE_PCT
  const deliveryDeduction = deliveredCount * NET_PER_DELIVERY
  const netAmount = todayTotalAmount - feeDeduction - deliveryDeduction

  const bucketOrders = drillBucket ? todayOrders.filter((o) => inBucket(o, drillBucket)) : []
  const restaurantBreakdown = (() => {
    const map = new Map<string, { key: string; name: string; amount: number; count: number }>()
    for (const o of bucketOrders) {
      const key = restKey(o)
      if (!map.has(key)) map.set(key, { key, name: restName(o), amount: 0, count: 0 })
      const entry = map.get(key)!
      entry.amount += menuTotal(o)
      entry.count += 1
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
  })()
  const selectedRestaurant = restaurantBreakdown.find((r) => r.key === drillRestKey) ?? null
  const selectedRestaurantOrders = drillRestKey ? bucketOrders.filter((o) => restKey(o) === drillRestKey) : []

  // Per-day payout view for the selected restaurant — most recent day
  // first, each day's total is menu items only (see menuTotal above).
  const selectedRestaurantByDay = (() => {
    const map = new Map<string, { day: string; orders: TodayOrder[]; menuAmount: number }>()
    for (const o of selectedRestaurantOrders) {
      const key = dayKey(o.placed_at)
      if (!map.has(key)) map.set(key, { day: key, orders: [], menuAmount: 0 })
      const entry = map.get(key)!
      entry.orders.push(o)
      entry.menuAmount += menuTotal(o)
    }
    return Array.from(map.values()).sort((a, b) => b.day.localeCompare(a.day))
  })()

  // One bar per actual calendar date in the selected range, not per day of
  // the week — so a spike or dip on a specific date is visible.
  const dailyRevenue = getDailyRevenue(orders, range)
  const maxDailyRevenue = Math.max(...dailyRevenue.map((d) => d.revenue), 1)
  const today = todayKey()

  // Order status breakdown
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Revenue by hour
  const revenueByHour = Array.from({ length: 24 }, (_, h) => {
    const hourOrders = delivered.filter((o) => new Date(o.placed_at).getHours() === h)
    return hourOrders.reduce((s, o) => s + o.total, 0)
  })
  const maxHourRevenue = Math.max(...revenueByHour, 1)

  const stats = [
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Active Restaurants', value: restaurantCount, icon: Store, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Avg Order Value', value: `₹${avgOrderValue.toFixed(0)}`, icon: Users, color: '#D97706', bg: '#FFFBEB' },
  ]

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 space-y-3">
          <div>
            <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Analytics</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Platform-wide performance overview</p>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>

        <div className="p-6 space-y-6">
          {/* Today at a glance — click a card to see it broken down by
              restaurant, then click a restaurant to see its actual orders. */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-[15px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>{rangeGlanceLabel}</h2>
              <button
                onClick={() => setRefreshNonce((n) => n + 1)}
                className="shrink-0 text-[11px] text-[#9CA3AF] hover:text-[#7C3AED] transition-colors"
              >
                {todayLoading ? 'Refreshing…' : lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Refresh` : 'Refresh'}
              </button>
            </div>
            <p className="text-[12px] text-[#9CA3AF] mb-5">
              Click any amount to break it down by restaurant · follows the date range above{includesToday ? ' · auto-refreshes every minute' : ''}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {todayBuckets.map(({ key, count, amount }) => {
                const cfg = BUCKET_CFG[key]
                return (
                  <button key={key} onClick={() => { setDrillBucket(key); setDrillRestKey(null) }}
                    className="text-left rounded-xl p-4 transition-all hover:brightness-95 active:scale-[0.98]"
                    style={{ background: cfg.bg }}>
                    {todayLoading ? (
                      <div className="h-7 w-20 bg-white/60 rounded animate-pulse mb-1" />
                    ) : (
                      <div className="text-[22px] font-[800] mb-0.5" style={{ color: cfg.color, fontWeight: 800 }}>₹{amount.toLocaleString()}</div>
                    )}
                    <div className="text-[12px] font-[600]" style={{ color: cfg.color }}>{key === 'total' ? (isTodayOnly ? "Today's Total" : 'Total') : cfg.label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: cfg.color, opacity: 0.75 }}>{count} order{count !== 1 ? 's' : ''}</div>
                  </button>
                )
              })}
            </div>

            {/* Not a bucket to drill into — a computed net figure, so it's
                visually separate (not clickable) from the four cards above. */}
            <div className="mt-4 rounded-xl p-4 bg-[#111827]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-[600] text-white/60 uppercase tracking-wide mb-1">Net after costs</p>
                  {todayLoading ? (
                    <div className="h-8 w-28 bg-white/10 rounded animate-pulse" />
                  ) : (
                    <p className="text-[26px] font-[800] text-white" style={{ fontWeight: 800 }}>₹{netAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  )}
                </div>
                {!todayLoading && (
                  <p className="text-[11.5px] text-white/50 leading-relaxed">
                    ₹{todayTotalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} total
                    − {(NET_FEE_PCT * 100).toFixed(0)}% fee (₹{feeDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                    − ₹{NET_PER_DELIVERY}×{deliveredCount} delivered (₹{deliveryDeduction.toLocaleString()})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                {loading ? <div className="h-7 w-24 bg-[#F3F4F6] rounded animate-pulse mb-1" /> : (
                  <div className="text-[24px] font-[800] text-[#111827] mb-0.5" style={{ fontWeight: 800 }}>{value}</div>
                )}
                <div className="text-[12px] text-[#9CA3AF]">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue by day */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
              <h2 className="text-[15px] font-[700] text-[#111827] mb-1" style={{ fontWeight: 700 }}>Revenue by Day</h2>
              <p className="text-[12px] text-[#9CA3AF] mb-5">From delivered orders, one bar per date in range</p>
              <div className="flex items-end gap-1.5 h-40 overflow-x-auto pb-1">
                {dailyRevenue.map((d) => {
                  const pct = (d.revenue / maxDailyRevenue) * 100
                  const isToday = d.date === today
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-2 shrink-0 w-9">
                      <div className="text-[9px] text-[#9CA3AF] font-medium whitespace-nowrap">{d.revenue > 0 ? `₹${(d.revenue/1000).toFixed(1)}k` : ''}</div>
                      <div className="w-full rounded-t-lg min-h-[4px] transition-all" style={{ height: `${Math.max(pct, 4)}%`, background: isToday ? '#7C3AED' : '#DDD6FE' }} />
                      <div className={cn('text-[10px] font-medium whitespace-nowrap', isToday ? 'text-[#7C3AED]' : 'text-[#9CA3AF]')}>{d.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Revenue by hour */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
              <h2 className="text-[15px] font-[700] text-[#111827] mb-1" style={{ fontWeight: 700 }}>Revenue by Hour</h2>
              <p className="text-[12px] text-[#9CA3AF] mb-5">Peak ordering times in range</p>
              <div className="flex items-end gap-1 h-40">
                {revenueByHour.map((val, h) => {
                  const pct = (val / maxHourRevenue) * 100
                  const isNow = h === new Date().getHours()
                  const label = h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h-12}p`
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t min-h-[2px]" style={{ height: `${Math.max(pct, 2)}%`, background: isNow ? '#7C3AED' : '#DDD6FE' }} />
                      {h % 4 === 0 && <div className="text-[9px] text-[#9CA3AF]">{label}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Order status breakdown */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
            <h2 className="text-[15px] font-[700] text-[#111827] mb-5" style={{ fontWeight: 700 }}>Order Status Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { status: 'confirmed',        label: 'Confirmed',   color: '#0891B2', bg: '#ECFEFF' },
                { status: 'preparing',        label: 'Preparing',   color: '#D97706', bg: '#FFFBEB' },
                { status: 'out_for_delivery', label: 'On the way',  color: '#7C3AED', bg: '#F5F3FF' },
                { status: 'delivered',        label: 'Delivered',   color: '#16A34A', bg: '#DCFCE7' },
                { status: 'cancelled',        label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2' },
                { status: 'pending',          label: 'Pending',     color: '#6B7280', bg: '#F3F4F6' },
              ].map(({ status, label, color, bg }) => {
                const count = statusCounts[status] ?? 0
                const pct = orders.length ? ((count / orders.length) * 100).toFixed(0) : '0'
                return (
                  <div key={status} className="rounded-xl p-4 text-center" style={{ background: bg }}>
                    <div className="text-[26px] font-[800] mb-1" style={{ color, fontWeight: 800 }}>{loading ? '—' : count}</div>
                    <div className="text-[12px] font-[600]" style={{ color }}>{label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color, opacity: 0.7 }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Drill-down: bucket -> restaurants -> that restaurant's orders/items.
          One modal, two views, so going back doesn't lose the bucket context. */}
      {drillBucket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setDrillBucket(null); setDrillRestKey(null) }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col z-10">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#F3F4F6] shrink-0">
              {selectedRestaurant ? (
                <button onClick={() => setDrillRestKey(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] shrink-0">
                  <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                </button>
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-[600] uppercase tracking-wide" style={{ color: BUCKET_CFG[drillBucket].color }}>
                  {BUCKET_CFG[drillBucket].label} · {isTodayOnly ? 'Today' : rangeGlanceLabel.replace(' at a Glance', '')}
                </p>
                <h2 className="text-[15px] font-[800] text-[#111827] truncate" style={{ fontWeight: 800 }}>
                  {selectedRestaurant ? selectedRestaurant.name : 'By restaurant'}
                </h2>
              </div>
              <button onClick={() => { setDrillBucket(null); setDrillRestKey(null) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] shrink-0">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {!selectedRestaurant ? (
                // Level 2: restaurants in this bucket, most revenue first
                restaurantBreakdown.length === 0 ? (
                  <p className="text-[13px] text-[#9CA3AF] text-center py-10">No orders in this bucket today.</p>
                ) : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {restaurantBreakdown.map((r) => (
                      <button key={r.key} onClick={() => setDrillRestKey(r.key)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-all text-left">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-[600] text-[#111827] truncate">{r.name}</p>
                          <p className="text-[11.5px] text-[#9CA3AF]">{r.count} order{r.count !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[14px] font-[800] text-[#111827]">₹{r.amount.toLocaleString()}</span>
                          <ChevronRight className="w-4 h-4 text-[#D1D5DB]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                // Level 3: this restaurant's orders, grouped by day. Each
                // day's subtotal and each order's line total are menu items
                // only (menuTotal) — delivery fee, platform fee, and the 4%
                // platform cut are the platform's, not the restaurant's.
                <div>
                  {selectedRestaurantByDay.map(({ day, orders: dayOrders, menuAmount }) => (
                    <div key={day}>
                      <div className="flex items-center justify-between px-5 py-2.5 bg-[#F8FAFC] border-y border-[#F3F4F6] sticky top-0">
                        <span className="text-[12px] font-[700] text-[#111827]">
                          {new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[12px] text-[#6B7280]">
                          {dayOrders.length} order{dayOrders.length !== 1 ? 's' : ''} · <span className="font-[700] text-[#111827]">₹{menuAmount.toLocaleString()}</span> menu
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
