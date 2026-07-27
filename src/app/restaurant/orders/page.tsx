'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Search, ChefHat, Truck, CheckCircle, XCircle, Clock, AlertCircle, Phone, MessageSquare, Loader2, Volume2, VolumeX, BellRing } from 'lucide-react'
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar'
import { cn } from '@/lib/utils'
import { unlockAudio, playNewOrderAlarm } from '@/lib/orderAlarm'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof ChefHat; next?: string; nextLabel?: string }> = {
  confirmed:        { label: 'Confirmed',   color: '#0891B2', bg: '#ECFEFF', icon: AlertCircle, next: 'preparing',        nextLabel: 'Start Preparing' },
  preparing:        { label: 'Preparing',   color: '#D97706', bg: '#FFFBEB', icon: ChefHat,     next: 'out_for_delivery', nextLabel: 'Ready for Pickup' },
  out_for_delivery: { label: 'On the way',  color: '#7C3AED', bg: '#F5F3FF', icon: Truck,       next: 'delivered',        nextLabel: 'Mark Delivered'   },
  delivered:        { label: 'Delivered',   color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  cancelled:        { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
  pending:          { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6', icon: Clock, next: 'confirmed', nextLabel: 'Confirm Order' },
}

const TABS = ['All', 'Active', 'Preparing', 'Delivered', 'Cancelled']

type OrderItem = { name: string; quantity: number; price: number }
type Order = {
  id: string; status: string; total: number; customer_name: string | null
  customer_phone: string | null; placed_at: string; address: string | null
  order_items: OrderItem[]
}
type Restaurant = { id: string; name: string }

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)}h ago`
}

function etaMinutes(placedAt: string, status: string) {
  const minutesSince = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000)
  const eta = status === 'confirmed' ? 25 - minutesSince : status === 'preparing' ? 15 - minutesSince : status === 'out_for_delivery' ? 8 - minutesSince : null
  return eta !== null && eta > 0 ? `${eta} min` : null
}

export default function RestaurantOrdersPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [newOrderFlash, setNewOrderFlash] = useState(false)
  const soundOnRef = useRef(true)
  soundOnRef.current = soundOn

  const loadOrders = useCallback(async (restaurantId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, customer_name, customer_phone, placed_at, address, order_items(name, quantity, price)')
      .eq('restaurant_id', restaurantId)
      .order('placed_at', { ascending: false })
      .limit(50)
    setOrders((data as unknown as Order[]) ?? [])
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      const query = user
        ? supabase.from('restaurants').select('id, name').eq('owner_id', user.id).single()
        : supabase.from('restaurants').select('id, name').eq('is_active', true).limit(1).single()
      const { data: rest } = await query
      if (!rest || cancelled) { setLoading(false); return }
      setRestaurant(rest as Restaurant)
      await loadOrders(rest.id)
      setLoading(false)

      // Realtime: new/updated orders pop in instantly
      channel = supabase
        .channel(`restaurant-orders-${rest.id}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'orders',
          filter: `restaurant_id=eq.${rest.id}`,
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            if (soundOnRef.current) playNewOrderAlarm()
            setNewOrderFlash(true)
            setTimeout(() => setNewOrderFlash(false), 4000)
          }
          loadOrders(rest.id)
        })
        .subscribe()
    }
    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [loadOrders])

  async function advance(orderId: string, nextStatus: string) {
    setAdvancing(orderId)
    await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: nextStatus } : o))
    setAdvancing(null)
  }

  const filtered = orders.filter((o) => {
    const matchTab =
      activeTab === 'All'       ? true :
      activeTab === 'Active'    ? !['delivered','cancelled'].includes(o.status) :
      activeTab === 'Preparing' ? o.status === 'preparing' :
      activeTab === 'Delivered' ? o.status === 'delivered' :
      activeTab === 'Cancelled' ? o.status === 'cancelled' : true
    const q = search.toLowerCase()
    const matchSearch = !q || (o.customer_name ?? '').toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const activeCnt = orders.filter((o) => !['delivered','cancelled'].includes(o.status)).length

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={restaurant} />
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Orders</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">
                {activeCnt} active
                <span className="ml-2 inline-flex items-center gap-1 text-[#16A34A] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse inline-block" /> Live
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { unlockAudio(); if (!soundOn) playNewOrderAlarm(); setSoundOn(!soundOn) }}
                title={soundOn ? 'New-order alarm is ON — click to mute' : 'Alarm muted — click to enable'}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-[600] border transition-all',
                  soundOn ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#9CA3AF]')}>
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {soundOn ? 'Alarm On' : 'Muted'}
              </button>
              <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#16A34A] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search orders..."
                  className="bg-transparent text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none w-40" />
              </div>
            </div>
          </div>
          {newOrderFlash && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] rounded-xl animate-pulse">
              <BellRing className="w-4 h-4 text-white" />
              <span className="text-[13px] font-[700] text-white">New order received!</span>
            </div>
          )}
          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('px-4 py-1.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-all shrink-0',
                  activeTab === tab ? 'bg-[#16A34A] text-white shadow-[0_2px_6px_rgba(22,163,74,0.3)]' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                {tab}
                {tab === 'Active' && activeCnt > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-[#EF4444] text-white text-[10px] rounded-full">{activeCnt}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <CheckCircle className="w-12 h-12 text-[#D1D5DB]" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No orders found</p>
              {orders.length === 0 && <p className="text-[13px] text-[#9CA3AF]">Orders will appear here in real-time as customers place them</p>}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((o) => {
                const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending
                const Icon = cfg.icon
                const isActive = !['delivered','cancelled'].includes(o.status)
                const eta = isActive ? etaMinutes(o.placed_at, o.status) : null
                const items = Array.isArray(o.order_items) ? o.order_items : []

                return (
                  <div key={o.id} className={cn('bg-white rounded-2xl border overflow-hidden shadow-zippy-sm transition-all', isActive ? 'border-[#16A34A]' : 'border-[#E5E7EB]')}>
                    {isActive && (
                      <div className="bg-[#F0FDF4] px-4 py-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                        <span className="text-[11.5px] font-semibold text-[#14532D]">Live Order</span>
                        {eta && <span className="ml-auto text-[11.5px] text-[#16A34A] font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> ETA {eta}</span>}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[13px] font-mono font-bold text-[#374151]">{o.id.slice(0,8).toUpperCase()}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
                              <Icon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#9CA3AF]">{o.customer_name ?? 'Customer'} · {timeAgo(o.placed_at)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-[15px] font-[800] text-[#111827]">₹{o.total}</div>
                          <div className="text-[11px] text-[#9CA3AF]">{items.length} item{items.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>

                      {/* Items */}
                      {items.length > 0 && (
                        <div className="bg-[#F8FAFC] rounded-xl p-3 mb-3 space-y-1.5">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[12.5px]">
                              <span className="text-[#374151]">{item.name} <span className="text-[#9CA3AF]">× {item.quantity}</span></span>
                              <span className="text-[#111827] font-medium">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {o.customer_phone && (
                            <a href={`tel:${o.customer_phone}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#D1D5DB] transition-all">
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                          )}
                          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#D1D5DB] transition-all">
                            <MessageSquare className="w-3.5 h-3.5" /> Chat
                          </button>
                        </div>
                        {cfg.next && (
                          <button
                            onClick={() => advance(o.id, cfg.next!)}
                            disabled={advancing === o.id}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#16A34A] text-white text-[12px] font-[600] rounded-xl hover:bg-[#15803D] active:scale-95 transition-all shadow-[0_2px_8px_rgba(22,163,74,0.25)] disabled:opacity-60">
                            {advancing === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {cfg.nextLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
