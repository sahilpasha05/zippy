'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { TrendingUp, ShoppingBag, Store, Users } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Order = { id: string; status: string; total: number; placed_at: string; restaurant_id: string | null }

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<DateRange>(presetRange(30))
  const [orders, setOrders] = useState<Order[]>([])
  const [restaurantCount, setRestaurantCount] = useState(0)
  const [loading, setLoading] = useState(true)

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

  // Revenue by day of week
  const revenueByDay = DAYS.map((_, idx) => {
    const dayOrders = delivered.filter((o) => new Date(o.placed_at).getDay() === idx)
    return dayOrders.reduce((s, o) => s + o.total, 0)
  })
  const maxDayRevenue = Math.max(...revenueByDay, 1)

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
              <h2 className="text-[15px] font-[700] text-[#111827] mb-1" style={{ fontWeight: 700 }}>Revenue by Day of Week</h2>
              <p className="text-[12px] text-[#9CA3AF] mb-5">From delivered orders in range</p>
              <div className="flex items-end gap-2 h-40">
                {DAYS.map((day, i) => {
                  const val = revenueByDay[i]
                  const pct = (val / maxDayRevenue) * 100
                  const isToday = i === new Date().getDay()
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-[10px] text-[#9CA3AF] font-medium">{val > 0 ? `₹${(val/1000).toFixed(1)}k` : ''}</div>
                      <div className="w-full rounded-t-lg min-h-[4px] transition-all" style={{ height: `${Math.max(pct, 4)}%`, background: isToday ? '#7C3AED' : '#DDD6FE' }} />
                      <div className={cn('text-[11px] font-medium', isToday ? 'text-[#7C3AED]' : 'text-[#9CA3AF]')}>{day}</div>
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
    </div>
  )
}
