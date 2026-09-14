'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { TrendingUp, ShoppingBag, Star, Clock, Loader2 } from 'lucide-react'
import StorePartnerSidebar from '@/components/store/StorePartnerSidebar'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Partner = { id: string; name: string; slug: string }
type Order = { id: string; status: string; total: number; placed_at: string }

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function StoreSlugAnalyticsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>(presetRange(30))

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: part } = await supabase.from('store_partners').select('id, name, slug').eq('slug', slug).single()
      if (!part) { setLoading(false); return }
      setPartner(part as Partner)
      const fromISO = new Date(range.from + 'T00:00:00').toISOString()
      const toISO = new Date(range.to + 'T23:59:59.999').toISOString()
      const { data: ords } = await supabase.from('orders').select('id, status, total, placed_at')
        .eq('store_partner_id', part.id)
        .gte('placed_at', fromISO).lte('placed_at', toISO)
        .order('placed_at', { ascending: false }).limit(2000)
      setOrders((ords as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [slug, range])

  const delivered = orders.filter((o) => o.status === 'delivered')
  const totalRevenue = delivered.reduce((s, o) => s + o.total, 0)
  const avgOrderValue = delivered.length ? totalRevenue / delivered.length : 0

  const revenueByDay = DAYS.map((_, i) =>
    delivered.filter((o) => new Date(o.placed_at).getDay() === i).reduce((s, o) => s + o.total, 0)
  )
  const maxDay = Math.max(...revenueByDay, 1)

  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc }, {} as Record<string, number>)

  const stats = [
    { label: 'Total Revenue',   value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Total Orders',    value: orders.length,                        icon: ShoppingBag, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Avg Order Value', value: `₹${avgOrderValue.toFixed(0)}`,       icon: Star,        color: '#D97706', bg: '#FFFBEB' },
    { label: 'Delivered',       value: delivered.length,                     icon: Clock,       color: '#7C3AED', bg: '#F5F3FF' },
  ]

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <StorePartnerSidebar partner={partner} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 space-y-3">
          <div>
            <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Analytics</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Your store performance</p>
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
                {stats.map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="text-[22px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{value}</div>
                    <div className="text-[12px] text-[#9CA3AF] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                <h2 className="text-[15px] font-[700] text-[#111827] mb-1">Revenue by Day of Week</h2>
                <p className="text-[12px] text-[#9CA3AF] mb-5">From delivered orders in range</p>
                <div className="flex items-end gap-2 h-40">
                  {DAYS.map((day, i) => {
                    const val = revenueByDay[i]
                    const pct = (val / maxDay) * 100
                    const isToday = i === new Date().getDay()
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-[10px] text-[#9CA3AF]">{val > 0 ? `₹${(val/1000).toFixed(1)}k` : ''}</div>
                        <div className="w-full rounded-t-lg min-h-[4px]" style={{ height: `${Math.max(pct, 4)}%`, background: isToday ? '#16A34A' : '#DCFCE7' }} />
                        <div className="text-[11px]" style={{ color: isToday ? '#16A34A' : '#9CA3AF', fontWeight: isToday ? 600 : 400 }}>{day}</div>
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
                    { status: 'preparing',        label: 'Packing',    color: '#D97706', bg: '#FFFBEB' },
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
    </div>
  )
}
