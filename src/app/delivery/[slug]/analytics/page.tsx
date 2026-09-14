'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, CheckCircle, XCircle, TrendingUp, Bike, Loader2 } from 'lucide-react'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Partner = { id: string; name: string; slug: string; total_deliveries: number | null }
type Order = { id: string; status: string; total: number; placed_at: string; delivered_at: string | null }

const MAX_CHART_DAYS = 60

function daysBetween(fromISO: string, toISO: string): string[] {
  const days: string[] = []
  const d = new Date(fromISO + 'T00:00:00')
  const end = new Date(toISO + 'T00:00:00')
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export default function DeliveryAnalyticsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>(presetRange(30))

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: p } = await supabase.from('delivery_partners').select('id, name, slug, total_deliveries').eq('slug', slug).single()
      if (!p) { setLoading(false); return }
      setPartner(p as Partner)
      const fromISO = new Date(range.from + 'T00:00:00').toISOString()
      const toISO = new Date(range.to + 'T23:59:59.999').toISOString()
      const { data: ords } = await supabase.from('orders').select('id, status, total, placed_at, delivered_at')
        .eq('delivery_partner_id', p.id)
        .gte('placed_at', fromISO).lte('placed_at', toISO)
        .order('placed_at', { ascending: false }).limit(2000)
      setOrders((ords as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [slug, range])

  const delivered = orders.filter((o) => o.status === 'delivered')
  const cancelled = orders.filter((o) => o.status === 'cancelled')

  const allDays = daysBetween(range.from, range.to)
  const chartDays = allDays.length > MAX_CHART_DAYS ? allDays.slice(-MAX_CHART_DAYS) : allDays
  const deliveredByDay = chartDays.map((day) =>
    delivered.filter((o) => o.delivered_at?.slice(0, 10) === day).length
  )
  const maxDay = Math.max(...deliveredByDay, 1)
  const avgPerDay = allDays.length ? delivered.length / allDays.length : 0

  const stats = [
    { label: 'Delivered (in range)', value: delivered.length, icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Lifetime Delivered', value: partner?.total_deliveries ?? 0, icon: Bike, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Cancelled', value: cancelled.length, icon: XCircle, color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Avg / Day', value: avgPerDay.toFixed(1), icon: TrendingUp, color: '#D97706', bg: '#FFFBEB' },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Link href={`/delivery/${slug}/orders`}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E7EB] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Analytics</h1>
              <p className="text-[12px] text-[#9CA3AF]">{partner?.name ?? 'Your delivery performance'}</p>
            </div>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-zippy-sm">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: bg }}>
                    <Icon className="w-4.5 h-4.5" style={{ color }} />
                  </div>
                  <div className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{value}</div>
                  <div className="text-[11.5px] text-[#9CA3AF] mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-zippy-sm">
              <h2 className="text-[14px] font-[700] text-[#111827] mb-1">Deliveries per Day</h2>
              <p className="text-[11.5px] text-[#9CA3AF] mb-4">
                {allDays.length > MAX_CHART_DAYS ? `Last ${MAX_CHART_DAYS} days shown` : 'Across the selected range'}
              </p>
              <div className="flex items-end gap-1.5 h-36 overflow-x-auto pb-1">
                {chartDays.map((day, i) => {
                  const val = deliveredByDay[i]
                  const pct = (val / maxDay) * 100
                  const isToday = day === new Date().toISOString().slice(0, 10)
                  return (
                    <div key={day} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: chartDays.length > 20 ? '20px' : undefined, flex: chartDays.length > 20 ? undefined : 1 }}>
                      <div className="text-[9px] text-[#9CA3AF]">{val > 0 ? val : ''}</div>
                      <div className="w-full rounded-t-md min-h-[4px]" style={{ height: `${Math.max(pct, 4)}%`, background: isToday ? '#7C3AED' : '#EDE9FE' }} />
                      {chartDays.length <= 20 && (
                        <div className="text-[10px] text-[#9CA3AF] whitespace-nowrap">{new Date(day + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
