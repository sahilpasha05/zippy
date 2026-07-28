'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { TrendingUp, ShoppingBag, Star, Clock, ArrowUp, ArrowDown, Eye, ChefHat, Truck, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof ChefHat }> = {
  pending:          { label: 'Pending',    color: '#6B7280', bg: '#F3F4F6', icon: AlertCircle },
  confirmed:        { label: 'Confirmed',  color: '#0891B2', bg: '#ECFEFF', icon: AlertCircle },
  preparing:        { label: 'Preparing',  color: '#D97706', bg: '#FFFBEB', icon: ChefHat },
  out_for_delivery: { label: 'On the way', color: '#7C3AED', bg: '#F5F3FF', icon: Truck },
  delivered:        { label: 'Delivered',  color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  cancelled:        { label: 'Cancelled',  color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
}

type Order = {
  id: string; status: string; total: number; customer_name: string | null
  placed_at: string; order_items: { name: string; quantity: number; price: number }[]
}
type Restaurant = { id: string; name: string; slug: string; is_open: boolean; rating: number }

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function SlugDashboard() {
  const { slug } = useParams<{ slug: string }>()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, name, slug, is_open, rating')
        .eq('slug', slug)
        .single()
      if (!rest) { setLoading(false); return }
      setRestaurant(rest as Restaurant)
      setIsOpen(rest.is_open)
      const { data: ords } = await supabase
        .from('orders')
        .select('id, status, total, customer_name, placed_at, order_items(name, quantity, price)')
        .eq('restaurant_id', rest.id)
        .order('placed_at', { ascending: false })
        .limit(20)
      setOrders((ords as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [slug])

  async function toggleOpen() {
    if (!restaurant) return
    setToggling(true)
    await supabase.from('restaurants').update({ is_open: !isOpen }).eq('id', restaurant.id)
    setIsOpen((v) => !v)
    setToggling(false)
  }

  const recentOrders = orders.slice(0, 5)
  const activeCount  = orders.filter((o) => !['delivered','cancelled'].includes(o.status)).length
  const todayRevenue = orders
    .filter((o) => o.status === 'delivered' && new Date(o.placed_at) > new Date(Date.now() - 86400000))
    .reduce((s, o) => s + o.total, 0)
  const todayOrders  = orders.filter((o) => new Date(o.placed_at) > new Date(Date.now() - 86400000)).length

  const stats = [
    { label: "Today's Revenue", value: `₹${todayRevenue || 0}`, change: +18, icon: TrendingUp, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Orders Today',    value: String(todayOrders),      change: +12, icon: ShoppingBag, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Avg Rating',      value: `${restaurant?.rating ?? '—'}★`, change: +0.1, icon: Star, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Active Orders',   value: String(activeCount),      change: activeCount, icon: Clock, color: '#7C3AED', bg: '#F5F3FF' },
  ]

  if (loading) return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={null} />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" />
      </main>
    </div>
  )

  if (!restaurant) return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={null} />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-[15px] text-[#374151]">Restaurant not found</p>
      </main>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={restaurant} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Dashboard</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">{restaurant.name}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12.5px] font-medium text-[#6B7280]">Restaurant</span>
            <button onClick={toggleOpen} disabled={toggling}
              className={cn('relative w-11 h-6 rounded-full transition-all duration-300', isOpen ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]')}>
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300', isOpen ? 'translate-x-5' : 'translate-x-0')} />
            </button>
            <span className={cn('text-[12.5px] font-[600]', isOpen ? 'text-[#16A34A]' : 'text-[#9CA3AF]')}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value, change, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} strokeWidth={2} />
                  </div>
                  <span className={cn('flex items-center gap-0.5 text-[11.5px] font-[600] px-2 py-0.5 rounded-full',
                    change > 0 ? 'bg-[#DCFCE7] text-[#15803D]' : change < 0 ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#F3F4F6] text-[#6B7280]')}>
                    {change > 0 ? <ArrowUp className="w-3 h-3" /> : change < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                    {Math.abs(change)}%
                  </span>
                </div>
                <div className="text-[22px] font-[800] text-[#111827] mb-0.5" style={{ fontWeight: 800 }}>{value}</div>
                <div className="text-[12px] text-[#9CA3AF]">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
                <h2 className="text-[15px] font-[700] text-[#111827]">Recent Orders</h2>
                <a href={`/restaurant/${slug}/orders`} className="text-[12.5px] text-[#16A34A] font-medium flex items-center gap-1 hover:text-[#15803D]">
                  View all <Eye className="w-3.5 h-3.5" />
                </a>
              </div>
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-[#9CA3AF] gap-2">
                  <ShoppingBag className="w-10 h-10" strokeWidth={1} />
                  <p className="text-[13px]">No orders yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F8FAFC]">
                  {recentOrders.map((o) => {
                    const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending
                    const Icon = cfg.icon
                    const itemSummary = o.order_items?.map((i) => `${i.name} × ${i.quantity}`).join(', ') ?? ''
                    return (
                      <div key={o.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12.5px] font-[600] text-[#111827]">{o.customer_name ?? 'Customer'}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          </div>
                          <p className="text-[11.5px] text-[#9CA3AF] truncate">{itemSummary}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[13px] font-[700] text-[#111827]">₹{o.total}</div>
                          <div className="text-[11px] text-[#9CA3AF]">{timeAgo(o.placed_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm">
              <div className="px-5 py-4 border-b border-[#F3F4F6]">
                <h2 className="text-[15px] font-[700] text-[#111827]">Order Breakdown</h2>
                <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">All time</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {Object.entries(STATUS_CFG).map(([status, cfg]) => {
                  const count = orders.filter((o) => o.status === status).length
                  const Icon = cfg.icon
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium text-[#374151]">{cfg.label}</span>
                          <span className="text-[12px] font-[700] text-[#111827]">{count}</span>
                        </div>
                        <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${orders.length ? (count / orders.length) * 100 : 0}%`, background: cfg.color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
