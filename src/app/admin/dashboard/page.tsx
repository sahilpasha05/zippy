'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Store, ShoppingBag, Users, TrendingUp, ArrowUpRight, Clock, CheckCircle, ChefHat, Truck, XCircle, AlertCircle, Plus, Eye } from 'lucide-react'
import Link from 'next/link'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending:          { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6', icon: Clock },
  confirmed:        { label: 'Confirmed',   color: '#0891B2', bg: '#ECFEFF', icon: AlertCircle },
  preparing:        { label: 'Preparing',   color: '#D97706', bg: '#FFFBEB', icon: ChefHat },
  out_for_delivery: { label: 'On the way',  color: '#7C3AED', bg: '#F5F3FF', icon: Truck },
  delivered:        { label: 'Delivered',   color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  cancelled:        { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
}

type Order = {
  id: string; status: string; total: number; customer_name: string | null
  placed_at: string; restaurants: { name: string } | { name: string }[] | null
}
type Restaurant = { id: string; name: string; is_active: boolean; rating: number; owner_id: string | null }

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: ords }, { data: rests }] = await Promise.all([
        supabase.from('orders').select('id, status, total, customer_name, placed_at, restaurants(name)').order('placed_at', { ascending: false }).limit(10),
        supabase.from('restaurants').select('id, name, is_active, rating, owner_id').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
      ])
      setOrders((ords as unknown as Order[]) ?? [])
      setRestaurants((rests as Restaurant[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)

  const stats = [
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, sub: 'from recent orders', icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Active Orders', value: activeOrders, sub: 'being processed now', icon: ShoppingBag, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Restaurants', value: restaurants.length, sub: 'active listings', icon: Store, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Total Orders', value: orders.length, sub: 'loaded in view', icon: Users, color: '#16A34A', bg: '#DCFCE7' },
  ]

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Dashboard</h1>
              <p className="text-[12.5px] text-[#9CA3AF] mt-0.5">Overview of Zippy operations</p>
            </div>
            <Link href="/admin/restaurants/new">
              <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
                <Plus className="w-4 h-4" /> Add Restaurant
              </button>
            </Link>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                      <Icon className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#9CA3AF]" />
                  </div>
                  <div className="text-[26px] font-[800] text-[#111827] leading-none mb-1" style={{ fontWeight: 800 }}>
                    {loading ? <span className="w-16 h-6 bg-[#F3F4F6] rounded animate-pulse block" /> : s.value}
                  </div>
                  <div className="text-[12px] text-[#9CA3AF]">{s.label}</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">{s.sub}</div>
                </div>
              )
            })}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Recent Orders */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="text-[15px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>Recent Orders</h2>
                <Link href="/admin/orders" className="text-[12.5px] text-[#7C3AED] font-medium hover:text-[#6D28D9]">View all →</Link>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-[#F8FAFC] rounded-xl animate-pulse" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-[#9CA3AF]">
                  <ShoppingBag className="w-10 h-10 mb-2" strokeWidth={1} />
                  <p className="text-[13px]">No orders yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F3F4F6]">
                  {orders.map((o) => {
                    const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending
                    const Icon = cfg.icon
                    return (
                      <div key={o.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-[600] text-[#111827] truncate">{o.customer_name ?? 'Customer'}</span>
                            {o.restaurants && <span className="text-[11px] text-[#9CA3AF] truncate">@ {Array.isArray(o.restaurants) ? o.restaurants[0]?.name : (o.restaurants as { name: string })?.name}</span>}
                          </div>
                          <p className="text-[11.5px] text-[#9CA3AF]">{new Date(o.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[13px] font-[700] text-[#111827]">₹{o.total}</div>
                          <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Restaurants */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="text-[15px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>Restaurants</h2>
                <Link href="/admin/restaurants" className="text-[12.5px] text-[#7C3AED] font-medium hover:text-[#6D28D9]">Manage →</Link>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-[#F8FAFC] rounded-xl animate-pulse" />)}
                </div>
              ) : restaurants.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-[#9CA3AF]">
                  <Store className="w-10 h-10 mb-2" strokeWidth={1} />
                  <p className="text-[13px] mb-3">No restaurants yet</p>
                  <Link href="/admin/restaurants/new">
                    <button className="px-4 py-2 bg-[#7C3AED] text-white text-[12px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all">
                      Add first restaurant
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#F3F4F6]">
                  {restaurants.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors group">
                      <div className="w-9 h-9 bg-[#F5F3FF] rounded-xl flex items-center justify-center text-[#7C3AED] font-bold text-[13px] shrink-0">
                        {r.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-[600] text-[#111827] truncate">{r.name}</p>
                        <p className="text-[11px] text-[#9CA3AF]">
                          ★ {r.rating} · {r.owner_id ? <span className="text-[#16A34A]">Owner assigned</span> : <span className="text-[#EF4444]">No owner</span>}
                        </p>
                      </div>
                      <Link href={`/admin/restaurants/${r.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-4 h-4 text-[#9CA3AF] hover:text-[#7C3AED]" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
