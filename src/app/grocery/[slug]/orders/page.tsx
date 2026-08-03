'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { Search, ChefHat, Truck, CheckCircle, XCircle, Clock, AlertCircle, Phone, Loader2, Volume2, VolumeX, BellRing, MapPin, Bike, X, Calendar } from 'lucide-react'
import GroceryPartnerSidebar from '@/components/grocery/GroceryPartnerSidebar'
import LiveTrackingMap from '@/components/LiveTrackingMap'
import { cn, toLocalDateInput } from '@/lib/utils'
import { unlockAudio, startAlarm, stopAlarm } from '@/lib/orderAlarm'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof ChefHat; next?: string; nextLabel?: string }> = {
  confirmed:        { label: 'Confirmed',   color: '#0891B2', bg: '#ECFEFF', icon: AlertCircle, next: 'preparing',        nextLabel: 'Start Packing' },
  preparing:        { label: 'Packing',     color: '#D97706', bg: '#FFFBEB', icon: ChefHat,     next: 'out_for_delivery', nextLabel: 'Ready for Pickup' },
  // Deliberately has no `next`: completing an order is the delivery partner's
  // call, not the shop's. The rider's own panel stamps delivered_at, settles COD
  // payment status and credits the rider — none of which happened when a shop
  // marked it delivered from here.
  out_for_delivery: { label: 'With rider',  color: '#7C3AED', bg: '#F5F3FF', icon: Truck },
  delivered:        { label: 'Delivered',   color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  cancelled:        { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
  pending:          { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6', icon: Clock,        next: 'confirmed',        nextLabel: 'Confirm Order' },
}

const TABS = ['All', 'Active', 'Preparing', 'Delivered', 'Cancelled']

type OrderItem = { name: string; quantity: number; price: number; image_url: string | null; product_type: string | null }
type Order = {
  id: string; status: string; total: number; customer_name: string | null
  customer_phone: string | null; placed_at: string; address: string | null
  delivery_latitude: number | null; delivery_longitude: number | null
  delivery_partner_id: string | null
  order_items: OrderItem[]
}
type Partner = { id: string; name: string; slug: string }
type DeliveryPartner = { id: string; name: string; phone: string | null }

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)}h ago`
}

function etaMinutes(placedAt: string, status: string) {
  const mins = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000)
  const eta = status === 'confirmed' ? 25 - mins : status === 'preparing' ? 15 - mins : status === 'out_for_delivery' ? 8 - mins : null
  return eta !== null && eta > 0 ? `${eta} min` : null
}


// Announced orders are remembered per browser so reopening the panel — or a tab
// left open since yesterday — doesn't replay the alarm for orders already seen.
const ANNOUNCED_KEY = 'zippy-announced-orders'

function loadAnnounced(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(ANNOUNCED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function rememberAnnounced(id: string) {
  try {
    const next = [...loadAnnounced(), id].slice(-500) // bounded
    localStorage.setItem(ANNOUNCED_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — the in-memory guard still applies for this session
  }
}


// The stages a shop controls. "delivered" is deliberately absent — completing an
// order is the rider's call and stamps delivery/payment fields this panel can't set.
const SHOP_STAGES: { value: string; label: string }[] = [
  { value: 'pending',          label: 'New order' },
  { value: 'confirmed',        label: 'Confirmed' },
  { value: 'preparing',        label: 'Preparing' },
  { value: 'out_for_delivery', label: 'Ready for pickup' },
  { value: 'cancelled',        label: 'Cancelled' },
]

export default function GrocerySlugOrdersPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [newOrderFlash, setNewOrderFlash] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null)
  // Orders already shown in the popup, so later updates to the same row (status
  // changes the shop itself makes) don't pop it again.
  const poppedRef = useRef<Set<string>>(new Set())
  // Set once the panel knows which shop it is, so the refresh fallbacks below
  // can reload without re-reading the slug.
  const idRef = useRef<string | null>(null)
  const [riders, setRiders] = useState<DeliveryPartner[]>([])
  const [mapOrder, setMapOrder] = useState<Order | null>(null)
  const soundOnRef = useRef(true)
  soundOnRef.current = soundOn

  const riderFor = useCallback((id: string | null) => riders.find((p) => p.id === id) ?? null, [riders])

  const loadOrders = useCallback(async (partnerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, customer_name, customer_phone, placed_at, address, delivery_latitude, delivery_longitude, delivery_partner_id, order_items(name, quantity, price, image_url, product_type)')
      .eq('grocery_partner_id', partnerId)
      .order('placed_at', { ascending: false })
      // A busy day runs well past 50 orders; capping here made them vanish
      // from the panel entirely.
      .limit(500)
    const rows = (data as unknown as Order[]) ?? []
    setOrders(rows.map((o) => ({ ...o, order_items: (o.order_items ?? []).filter((i) => i.product_type === 'grocery') })))
    return rows
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    let pollId: ReturnType<typeof setInterval> | null = null

    // Realtime alone isn't enough: the socket drops on backgrounding or a
    // network change and the panel then sits frozen on stale data.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && idRef.current) loadOrders(idRef.current)
    }

    async function init() {
      const { data: part } = await supabase
        .from('grocery_partners')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()
      if (!part || cancelled) { setLoading(false); return }
      setPartner(part as Partner)
      idRef.current = part.id
      const [{ data: riderRows }, loaded] = await Promise.all([
        supabase.from('delivery_partners').select('id, name, phone'),
        loadOrders(part.id),
      ])
      setRiders((riderRows as DeliveryPartner[]) ?? [])
      setLoading(false)

      // A shop that opens the panel after an order arrived would otherwise see
      // nothing: the popup only fired on a live INSERT, so anything placed while
      // the tab was shut stayed silent. Ring for whatever is still un-actioned
      // at load, the way the rider panel already does.
      // Only ring for something genuinely new. Matching on status alone meant a
      // stale order sitting in "pending" from days ago re-triggered the alarm
      // every single time the panel was opened, including in an old tab. It has
      // to be recent AND not already announced on this device.
      const FRESH_MS = 30 * 60 * 1000
      const seen = loadAnnounced()
      const waiting = loaded.find((o) =>
        o.status === 'pending' &&
        Date.now() - new Date(o.placed_at).getTime() < FRESH_MS &&
        !seen.has(o.id)
      )
      if (waiting) {
        rememberAnnounced(waiting.id)
        setPendingOrder(waiting)
        if (soundOnRef.current) startAlarm('New order')
      }

      channel = supabase
        .channel(`grocery-partner-orders-${part.id}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'orders',
          filter: `grocery_partner_id=eq.${part.id}`,
        }, (payload) => {
          // Reacting to INSERT alone meant this never fired: checkout creates the
          // order with no partner attached, and an admin assigns it afterwards —
          // so the row only starts matching this channel's filter on an UPDATE.
          // Pop for any live row the shop hasn't been shown yet, whichever event
          // brought it into view.
          const row = payload.new as Record<string, unknown> | undefined
          const rowId = row?.id as string | undefined
          const isLive = !!row && !['delivered', 'cancelled'].includes(row.status as string)
          if (rowId && isLive && !poppedRef.current.has(rowId) && !loadAnnounced().has(rowId)) {
            poppedRef.current.add(rowId)
            rememberAnnounced(rowId)
            setPendingOrder({
              id: rowId,
              status: row.status as string,
              total: row.total as number,
              customer_name: row.customer_name as string | null,
              customer_phone: row.customer_phone as string | null,
              placed_at: row.placed_at as string,
              address: row.address as string | null,
              delivery_latitude: row.delivery_latitude as number | null,
              delivery_longitude: row.delivery_longitude as number | null,
              delivery_partner_id: row.delivery_partner_id as string | null,
              order_items: [],
            })
            if (soundOnRef.current) startAlarm('New order')
            setNewOrderFlash(true)
            setTimeout(() => setNewOrderFlash(false), 4000)
          }
          loadOrders(part.id)
        })
        .subscribe()

      pollId = setInterval(() => { if (idRef.current) loadOrders(idRef.current) }, 30000)
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('online', onVisible)
      window.addEventListener('focus', onVisible)
    }
    init()

    return () => {
      cancelled = true
      if (pollId) clearInterval(pollId)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      window.removeEventListener('focus', onVisible)
      if (channel) supabase.removeChannel(channel)
      stopAlarm()
    }
  }, [slug, loadOrders])

  function acceptPendingOrder() {
    stopAlarm()
    setPendingOrder(null)
  }

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
    const matchDate = !dateFilter || toLocalDateInput(o.placed_at) === dateFilter
    return matchTab && matchSearch && matchDate
  })

  const activeCnt = orders.filter((o) => !['delivered','cancelled'].includes(o.status)).length

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <GroceryPartnerSidebar partner={partner} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Orders</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">
                {activeCnt} active
                <span className="ml-2 inline-flex items-center gap-1 text-[#16A34A] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse inline-block" /> Live
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => { unlockAudio(); if (soundOn) stopAlarm(); setSoundOn(!soundOn) }}
                title={soundOn ? 'New-order alarm is ON — click to mute' : 'Alarm muted — click to enable'}
                className={cn('shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-[600] border transition-all',
                  soundOn ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#9CA3AF]')}>
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {soundOn ? 'Alarm On' : 'Muted'}
              </button>
              <div className="flex-1 sm:flex-none flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#16A34A] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search orders..."
                  className="bg-transparent text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none w-full sm:w-40 min-w-0" />
              </div>
              <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#16A34A] transition-all">
                <Calendar className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-[13px] text-[#111827] outline-none" />
                {dateFilter && (
                  <button onClick={() => setDateFilter('')} title="Clear date filter" className="shrink-0 text-[#9CA3AF] hover:text-[#374151]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {newOrderFlash && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] rounded-xl animate-pulse">
              <BellRing className="w-4 h-4 text-white" />
              <span className="text-[13px] font-[700] text-white">New order received!</span>
            </div>
          )}
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
          ) : !partner ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <XCircle className="w-12 h-12 text-[#D1D5DB]" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">Partner not found</p>
              <p className="text-[13px] text-[#9CA3AF]">Check the portal link and try again</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <CheckCircle className="w-12 h-12 text-[#D1D5DB]" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No orders found</p>
              {orders.length === 0 && <p className="text-[13px] text-[#9CA3AF]">Orders will appear here in real-time as they&apos;re assigned to you</p>}
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
                  <div key={o.id} className={cn('bg-white rounded-2xl border overflow-hidden shadow-zippy-sm', isActive ? 'border-[#16A34A]' : 'border-[#E5E7EB]')}>
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

                      {items.length > 0 && (
                        <div className="bg-[#F8FAFC] rounded-xl p-3 mb-3 space-y-2">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 text-[12.5px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-md overflow-hidden bg-white border border-[#E5E7EB] shrink-0">
                                  {item.image_url && (
                                    <Image src={item.image_url} alt={item.name} width={28} height={28} unoptimized className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <span className="text-[#374151] truncate">{item.name} <span className="text-[#9CA3AF]">× {item.quantity}</span></span>
                              </div>
                              <span className="text-[#111827] font-medium shrink-0">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(o.address || o.delivery_partner_id) && (
                        <div className="border border-[#E5E7EB] rounded-xl p-3 mb-3 space-y-2">
                          {o.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[#9CA3AF] mt-0.5 shrink-0" />
                              <p className="text-[12px] text-[#374151] flex-1 line-clamp-2">{o.address}</p>
                              {o.delivery_latitude != null && o.delivery_longitude != null && (
                                <button onClick={() => setMapOrder(o)} className="text-[11px] font-[600] text-[#16A34A] hover:underline shrink-0">Map</button>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Bike className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                            {riderFor(o.delivery_partner_id) ? (
                              <>
                                <span className="text-[12px] text-[#374151] flex-1">{riderFor(o.delivery_partner_id)!.name}</span>
                                {riderFor(o.delivery_partner_id)!.phone && (
                                  <a href={`tel:${riderFor(o.delivery_partner_id)!.phone}`} className="text-[11px] font-[600] text-[#16A34A] hover:underline shrink-0">Call rider</a>
                                )}
                              </>
                            ) : (
                              <span className="text-[12px] text-[#9CA3AF] flex-1">No rider assigned yet</span>
                            )}
                          </div>
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
                        </div>
                        {/* Any stage can be picked directly — an order that was
                            missed or advanced by mistake can be put back where it
                            belongs. The change reaches the rider and admin panels
                            through the same orders row they both read. */}
                        {!['delivered', 'cancelled'].includes(o.status) && (
                          <select
                            value={o.status}
                            disabled={advancing === o.id}
                            onChange={(e) => advance(o.id, e.target.value)}
                            className="px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-[12px] font-[600] text-[#374151] bg-white outline-none focus:border-[#16A34A] disabled:opacity-60"
                          >
                            {SHOP_STAGES.map((st) => (
                              <option key={st.value} value={st.value}>{st.label}</option>
                            ))}
                          </select>
                        )}
                        {cfg.next && (
                          <button onClick={() => advance(o.id, cfg.next!)} disabled={advancing === o.id}
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

      {pendingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10 text-center order-success-pop">
            <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BellRing className="w-8 h-8 text-[#16A34A]" />
            </div>
            <h2 className="text-[19px] font-[800] text-[#111827] mb-1">New Order!</h2>
            <p className="text-[13px] text-[#6B7280] mb-4">{pendingOrder.customer_name ?? 'A customer'} just placed an order</p>
            <div className="bg-[#F8FAFC] rounded-2xl p-4 mb-5 text-left space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6B7280]">Order ID</span>
                <span className="font-mono font-[700] text-[#111827]">{pendingOrder.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6B7280]">Total</span>
                <span className="font-[800] text-[#111827]">₹{pendingOrder.total}</span>
              </div>
              {pendingOrder.address && (
                <div className="flex justify-between text-[13px] gap-3">
                  <span className="text-[#6B7280] shrink-0">Address</span>
                  <span className="text-[#111827] text-right line-clamp-2">{pendingOrder.address}</span>
                </div>
              )}
            </div>
            <button onClick={acceptPendingOrder}
              className="w-full py-3.5 bg-[#16A34A] text-white text-[15px] font-[800] rounded-2xl hover:bg-[#15803D] active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(22,163,74,0.35)]">
              Accept Order
            </button>
            <p className="text-[11px] text-[#9CA3AF] mt-3">The alarm will keep ringing until you accept</p>
          </div>
        </div>
      )}

      {mapOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMapOrder(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
              <h2 className="text-[15px] font-[800] text-[#111827]">Delivery Location</h2>
              <button onClick={() => setMapOrder(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
            <LiveTrackingMap
              riderLocation={null}
              showRiderStatus={false}
              dropLocation={mapOrder.delivery_latitude != null && mapOrder.delivery_longitude != null
                ? { lat: mapOrder.delivery_latitude, lng: mapOrder.delivery_longitude }
                : null}
              className="h-64"
            />
            {mapOrder.address && <p className="text-[12.5px] text-[#374151] p-4">{mapOrder.address}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
