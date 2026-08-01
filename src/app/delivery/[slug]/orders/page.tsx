'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Search, Truck, CheckCircle, XCircle, Clock, AlertCircle, ChefHat, Phone, MapPin, Loader2, Bike, Volume2, VolumeX, BellRing, Zap, LogOut, Navigation, Map, Package, BarChart3, X, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { unlockAudio, startAlarm, stopAlarm } from '@/lib/orderAlarm'
import LiveTrackingMap from '@/components/LiveTrackingMap'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  confirmed:        { label: 'Confirmed',   color: '#0891B2', bg: '#ECFEFF', icon: AlertCircle },
  preparing:        { label: 'Preparing',   color: '#D97706', bg: '#FFFBEB', icon: ChefHat },
  out_for_delivery: { label: 'Out for delivery', color: '#7C3AED', bg: '#F5F3FF', icon: Truck },
  delivered:        { label: 'Delivered',   color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  cancelled:        { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
}

type Partner = { id: string; name: string; slug: string; vehicle_type: string | null; total_deliveries: number | null }
type OrderItem = { name: string; quantity: number; price: number }
type Order = {
  id: string; status: string; total: number; customer_name: string | null
  customer_phone: string | null; address: string | null; placed_at: string
  delivery_latitude: number | null; delivery_longitude: number | null
  accepted_at: string | null
  online_amount: number | null; cod_amount: number | null
  payment_status: string | null; cash_collected_at: string | null
  order_items: OrderItem[]
  restaurants: { name: string; address: string | null; phone: string | null } | { name: string; address: string | null; phone: string | null }[] | null
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)}h ago`
}

function restName(o: Order) {
  if (!o.restaurants) return 'Zippy Mart'
  return Array.isArray(o.restaurants) ? o.restaurants[0]?.name : o.restaurants.name
}
function restAddress(o: Order) {
  if (!o.restaurants) return null
  return Array.isArray(o.restaurants) ? o.restaurants[0]?.address : o.restaurants.address
}
function restPhone(o: Order) {
  if (!o.restaurants) return null
  return Array.isArray(o.restaurants) ? o.restaurants[0]?.phone ?? null : o.restaurants.phone
}


// What the rider must actually take at the door. A split order only leaves the
// cash half outstanding once the online half has really been received — if that
// payment never completed, the whole total is still owed, and telling the rider
// to collect only the cash half hands the difference away.
function amountToCollect(o: { total: number; online_amount: number | null; cod_amount: number | null; payment_status: string | null; cash_collected_at: string | null }) {
  const onlinePaid = ['partially_paid', 'paid'].includes(o.payment_status ?? '') ? Number(o.online_amount ?? 0) : 0
  const cashPaid = (o.payment_status === 'paid' || o.cash_collected_at) ? Number(o.cod_amount ?? 0) : 0
  return Math.max(0, Number(o.total) - onlinePaid - cashPaid)
}

function onlineSettled(o: { online_amount: number | null; payment_status: string | null }) {
  return (o.online_amount ?? 0) > 0 && ['partially_paid', 'paid'].includes(o.payment_status ?? '')
}

export default function DeliveryOrdersPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'pending' | 'delivered'>('active')
  const [search, setSearch] = useState('')
  const [soundOn, setSoundOn] = useState(true)
  const [newOrderFlash, setNewOrderFlash] = useState(false)
  const soundOnRef = useRef(true)
  soundOnRef.current = soundOn
  const [sharingLocation, setSharingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef(0)
  const partnerIdRef = useRef<string | null>(null)
  const [pendingAccept, setPendingAccept] = useState<Order[]>([])
  const pendingAcceptRef = useRef<Order[]>([])
  // Orders already announced, so an unrelated update to the same row doesn't re-ring.
  const announcedRef = useRef<Set<string>>(new Set())
  pendingAcceptRef.current = pendingAccept
  const [mapOrder, setMapOrder] = useState<Order | null>(null)
  const [uploadingProofFor, setUploadingProofFor] = useState<string | null>(null)
  const [proofError, setProofError] = useState<{ orderId: string; message: string } | null>(null)
  const proofInputOrderRef = useRef<string | null>(null)
  const proofFileInputRef = useRef<HTMLInputElement>(null)

  const loadOrders = useCallback(async (partnerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, customer_name, customer_phone, address, placed_at, delivery_latitude, delivery_longitude, accepted_at, online_amount, cod_amount, payment_status, cash_collected_at, order_items(name, quantity, price), restaurants(name, address, phone)')
      .eq('delivery_partner_id', partnerId)
      // Most recently assigned first — admin stamps updated_at when it assigns,
      // so a re-assignment brings the order back to the top of this board.
      .order('updated_at', { ascending: false })
      .order('placed_at', { ascending: false })
      .limit(50)
    const raw = (data as unknown as Order[]) ?? []
    // Anything still awaiting acceptance floats above the rest.
    const fetched = [...raw].sort((a, b) => Number(!!a.accepted_at) - Number(!!b.accepted_at))
    setOrders(fetched)
    const pending = fetched.filter((o) => o.accepted_at === null && !['delivered', 'cancelled'].includes(o.status))
    setPendingAccept(pending)
    // Authoritative: if the server says nothing is waiting to be accepted, the
    // alarm has nothing to ring about. Guarantees it stops after an accept even
    // if some other path started it.
    if (pending.length === 0) stopAlarm()
    return fetched
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function init() {
      const { data: p } = await supabase.from('delivery_partners')
        .select('id, name, slug, vehicle_type, total_deliveries')
        .eq('slug', slug).single()
      if (!p || cancelled) { setLoading(false); return }
      setPartner(p as Partner)
      partnerIdRef.current = p.id
      const fetched = await loadOrders(p.id)
      setLoading(false)
      startLocationSharing() // auto-share — the rider just needs to allow the permission prompt

      const hasPendingOnLoad = fetched.some((o) => o.accepted_at === null && !['delivered', 'cancelled'].includes(o.status))
      if (hasPendingOnLoad && soundOnRef.current) startAlarm()

      channel = supabase
        .channel(`delivery-orders-${p.id}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'orders',
          filter: `delivery_partner_id=eq.${p.id}`,
        }, (payload) => {
          // Don't test payload.old: Postgres only ships the previous values of
          // REPLICA IDENTITY columns (the primary key by default), so
          // old.delivery_partner_id is undefined on every update — which made
          // `old.delivery_partner_id !== p.id` true even for the rider's own
          // "accepted_at" write, restarting the alarm the instant they accepted.
          // Ring on what the row now says instead: still unaccepted and live.
          const row = payload.new as { id?: string; accepted_at?: string | null; status?: string } | undefined
          const rowId = row?.id
          const awaitingAccept = !!row && row.accepted_at == null
            && !['delivered', 'cancelled'].includes(row.status ?? '')
          if (awaitingAccept && rowId && !announcedRef.current.has(rowId)) {
            announcedRef.current.add(rowId)
            if (soundOnRef.current) startAlarm('New delivery')
            setNewOrderFlash(true)
            setTimeout(() => setNewOrderFlash(false), 4000)
          }
          loadOrders(p.id)
        })
        .subscribe()
    }
    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      stopAlarm()
    }
  }, [slug, loadOrders])

  // Stop the GPS watcher if the tab closes while sharing is on
  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [])

  // Browsers block audio without a prior user gesture — if a ring was already due on
  // load (see init() above), the very first tap anywhere unlocks it and retries.
  // The retry is deferred because pointerdown precedes click: if that first tap
  // is the Accept button itself, checking synchronously would still see the
  // order as pending and restart the alarm the rider is dismissing.
  useEffect(() => {
    function unlockOnFirstTap() {
      unlockAudio()
      setTimeout(() => {
        if (pendingAcceptRef.current.length > 0 && soundOnRef.current) startAlarm('New delivery')
      }, 400)
    }
    document.addEventListener('pointerdown', unlockOnFirstTap, { once: true })
    return () => document.removeEventListener('pointerdown', unlockOnFirstTap)
  }, [pendingAccept.length])

  function startLocationSharing() {
    if (watchIdRef.current !== null) return // already sharing
    if (!navigator.geolocation) { setLocationError('Geolocation not supported on this device'); return }
    setLocationError('')
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastSentRef.current < 4000) return // throttle writes to ~1 per 4s
        lastSentRef.current = now
        const id = partnerIdRef.current
        if (!id) return
        supabase.from('delivery_partners').update({
          current_latitude: pos.coords.latitude,
          current_longitude: pos.coords.longitude,
          last_location_at: new Date().toISOString(),
        }).eq('id', id).then()
      },
      (err) => setLocationError(err.message || 'Could not access location'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
    setSharingLocation(true)
  }

  function acceptOrder(orderId: string) {
    setPendingAccept((prev) => {
      const next = prev.filter((o) => o.id !== orderId)
      announcedRef.current.delete(orderId)
      if (next.length === 0) stopAlarm()
      return next
    })
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, accepted_at: new Date().toISOString() } : o))
    supabase.from('orders').update({ accepted_at: new Date().toISOString() }).eq('id', orderId).then()
  }

  function triggerProofCapture(orderId: string) {
    proofInputOrderRef.current = orderId
    setProofError(null)
    proofFileInputRef.current?.click()
  }

  async function handleProofFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const orderId = proofInputOrderRef.current
    e.target.value = ''
    if (!file || !orderId) return

    setUploadingProofFor(orderId)
    setProofError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/delivery/upload-cash-proof', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not upload photo')

      const now = new Date().toISOString()
      const order = orders.find((o) => o.id === orderId)
      const collectsCash = order ? amountToCollect(order) > 0 : false

      // Every delivery captures a photo; only the ones that actually hand over
      // cash also settle the payment and stamp the cash-collection time.
      await supabase.from('orders').update({
        status: 'delivered',
        delivered_at: now,
        cash_proof_image_url: data.url,
        ...(collectsCash ? { payment_status: 'paid', cash_collected_at: now } : {}),
      }).eq('id', orderId)

      if (partner) {
        await supabase.from('delivery_partners').update({ total_deliveries: (partner.total_deliveries ?? 0) + 1 }).eq('id', partner.id)
        setPartner((prev) => prev ? { ...prev, total_deliveries: (prev.total_deliveries ?? 0) + 1 } : prev)
      }
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'delivered' } : o))
    } catch (err: unknown) {
      setProofError({ orderId, message: err instanceof Error ? err.message : 'Could not upload photo. Please try again.' })
    } finally {
      setUploadingProofFor(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
    </div>
  )

  if (!partner) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <p className="text-[15px] text-[#374151]">Delivery partner not found</p>
    </div>
  )

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
  // Not yet picked up: still with the kitchen, or assigned but not accepted.
  const pendingOrders = activeOrders.filter((o) => !o.accepted_at || ['pending', 'confirmed', 'preparing'].includes(o.status))
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')

  const q = search.trim().toLowerCase()
  const matches = (o: Order) => !q || [
    o.id.slice(0, 8), o.customer_name ?? '', o.customer_phone ?? '', o.address ?? '', restName(o) ?? '',
  ].some((f) => f.toLowerCase().includes(q))

  const shown = (tab === 'active' ? activeOrders : tab === 'pending' ? pendingOrders : deliveredOrders).filter(matches)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#F5F3FF] rounded-xl flex items-center justify-center">
                <Bike className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <h1 className="text-[15px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{partner.name}</h1>
                <p className="text-[11.5px] text-[#9CA3AF] capitalize">{partner.vehicle_type ?? 'Rider'} · {partner.total_deliveries ?? 0} delivered</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/delivery/${slug}/analytics`}
                title="Analytics"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E5E7EB] text-[#9CA3AF] hover:text-[#7C3AED] hover:border-[#DDD6FE] transition-all">
                <BarChart3 className="w-4 h-4" />
              </Link>
              <button
                onClick={startLocationSharing}
                title={sharingLocation ? 'Sharing your live location with customers' : locationError || 'Tap to allow location sharing'}
                className={cn('w-9 h-9 flex items-center justify-center rounded-xl border transition-all',
                  sharingLocation ? 'bg-[#F5F3FF] border-[#DDD6FE] text-[#7C3AED]' : locationError ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#9CA3AF]')}>
                <Navigation className={cn('w-4 h-4', sharingLocation && 'animate-pulse')} />
              </button>
              <button
                onClick={() => { unlockAudio(); if (soundOn) stopAlarm(); setSoundOn(!soundOn) }}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-[600] border transition-all',
                  soundOn ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#9CA3AF]')}>
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <a href="/" className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E5E7EB] text-[#9CA3AF] hover:text-[#DC2626] hover:border-[#FECACA] transition-all">
                <LogOut className="w-4 h-4" />
              </a>
            </div>
          </div>
          {locationError && <p className="text-[11.5px] text-[#DC2626] mb-3">{locationError} — tap the location icon to retry</p>}

          {newOrderFlash && (
            <div className="mb-3 flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] rounded-xl animate-pulse">
              <BellRing className="w-4 h-4 text-white" />
              <span className="text-[13px] font-[700] text-white">New delivery assigned!</span>
            </div>
          )}

          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order, name, phone or address"
              className="w-full pl-9 pr-8 py-2 border border-[#E5E7EB] rounded-xl text-[13px] outline-none focus:border-[#7C3AED] bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            <button onClick={() => setTab('active')}
              className={cn('flex-1 py-2 rounded-xl text-[13px] font-[600] transition-all',
                tab === 'active' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280]')}>
              Active ({activeOrders.length})
            </button>
            <button onClick={() => setTab('pending')}
              className={cn('flex-1 py-2 rounded-xl text-[13px] font-[600] transition-all',
                tab === 'pending' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280]')}>
              Pending ({pendingOrders.length})
            </button>
            <button onClick={() => setTab('delivered')}
              className={cn('flex-1 py-2 rounded-xl text-[13px] font-[600] transition-all',
                tab === 'delivered' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280]')}>
              Delivered ({deliveredOrders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-[#9CA3AF]">
            <Truck className="w-12 h-12" strokeWidth={1} />
            <p className="text-[15px] font-semibold text-[#374151]">
              {search ? 'Nothing matches that search' : tab === 'active' ? 'No deliveries right now' : tab === 'pending' ? 'Nothing waiting to be picked up' : 'No deliveries yet'}
            </p>
            {tab === 'active' && <p className="text-[13px]">New assignments from admin will show up here instantly.</p>}
          </div>
        ) : (
          shown.map((o) => {
            const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.confirmed
            const Icon = cfg.icon
            const isReady = o.status === 'out_for_delivery'
            return (
              <div key={o.id} className={cn('bg-white rounded-2xl border overflow-hidden shadow-zippy-sm', isReady ? 'border-[#7C3AED]' : 'border-[#E5E7EB]')}>
                {isReady && (
                  <div className="bg-[#F5F3FF] px-4 py-2 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#7C3AED]" />
                    <span className="text-[11.5px] font-semibold text-[#5B21B6]">Ready for pickup</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[13px] font-mono font-bold text-[#374151]">{o.id.slice(0,8).toUpperCase()}</span>
                      <p className="text-[12px] text-[#9CA3AF]">{timeAgo(o.placed_at)}</p>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 text-[12.5px]">
                      <MapPin className="w-3.5 h-3.5 text-[#7C3AED] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-[600] text-[#111827]">Pickup: {restName(o)}</p>
                          {restPhone(o) && (
                            <a href={`tel:${restPhone(o)}`} className="text-[11px] font-[600] text-[#7C3AED] hover:underline shrink-0">Call restaurant</a>
                          )}
                        </div>
                        {restAddress(o) && <p className="text-[#6B7280]">{restAddress(o)}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-[12.5px]">
                      <MapPin className="w-3.5 h-3.5 text-[#16A34A] mt-0.5 shrink-0" />
                      <div>
                        <p className="font-[600] text-[#111827]">Drop: {o.customer_name ?? 'Customer'}</p>
                        {o.address && <p className="text-[#6B7280]">{o.address}</p>}
                      </div>
                    </div>
                  </div>

                  {o.order_items?.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <p className="flex items-center gap-1.5 text-[10.5px] font-[600] text-[#9CA3AF] uppercase tracking-wide"><Package className="w-3 h-3" /> Items</p>
                      {o.order_items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[12px] text-[#374151]">
                          <span>{item.name} × {item.quantity}</span>
                          <span className="font-[600]">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* The rider has to know what has already been received, or they
                      will collect the cash half of a split order whose online half
                      never went through. */}
                  {!['delivered', 'cancelled'].includes(o.status) && (
                    <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 mb-3 text-[12px] font-[600]',
                      amountToCollect(o) > 0 ? 'bg-[#FFFBEB] text-[#B45309]' : 'bg-[#DCFCE7] text-[#15803D]')}>
                      <span>
                        {amountToCollect(o) > 0
                          ? <>Collect <strong>₹{amountToCollect(o)}</strong> from the customer</>
                          : <>Fully paid — collect nothing</>}
                      </span>
                      <span className="ml-auto text-[11px] font-[500] opacity-80">
                        {onlineSettled(o)
                          ? `₹${o.online_amount} received online`
                          : (o.online_amount ?? 0) > 0
                            ? 'online payment not received'
                            : 'cash on delivery'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F3F4F6]">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-[800] text-[#111827]">₹{o.total}</span>
                      {o.customer_phone && (
                        <a href={`tel:${o.customer_phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#D1D5DB] transition-all">
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                      {o.delivery_latitude && o.delivery_longitude && (
                        <>
                          <button onClick={() => setMapOrder(o)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#D1D5DB] transition-all">
                            <Map className="w-3.5 h-3.5" /> Map
                          </button>
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.delivery_latitude},${o.delivery_longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#D1D5DB] transition-all">
                            <Navigation className="w-3.5 h-3.5" /> Go to
                          </a>
                        </>
                      )}
                    </div>
                    {/* Completing a delivery always goes through the camera —
                        the photo is the delivery record, cash or no cash. */}
                    {isReady && (
                      <button onClick={() => triggerProofCapture(o.id)} disabled={uploadingProofFor === o.id}
                        title={amountToCollect(o) > 0 ? `Collect ₹${amountToCollect(o)} cash, then take the delivery photo` : 'Take the delivery photo to complete this order'}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] text-white text-[12.5px] font-[600] rounded-xl hover:bg-[#15803D] active:scale-95 transition-all shadow-[0_2px_8px_rgba(22,163,74,0.25)] disabled:opacity-60">
                        {uploadingProofFor === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        {uploadingProofFor === o.id
                          ? 'Uploading...'
                          : amountToCollect(o) > 0 ? `Collect ₹${amountToCollect(o)} & Photo` : 'Delivered — Take Photo'}
                      </button>
                    )}
                    {!isReady && o.status !== 'delivered' && (
                      <span className="text-[11.5px] text-[#9CA3AF]">Waiting on restaurant</span>
                    )}
                  </div>
                  {proofError?.orderId === o.id && (
                    <p className="text-[11.5px] text-[#DC2626] mt-2">{proofError.message}</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {pendingAccept[0] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10 text-center">
            <div className="w-16 h-16 bg-[#F5F3FF] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BellRing className="w-8 h-8 text-[#7C3AED]" />
            </div>
            <h2 className="text-[19px] font-[800] text-[#111827] mb-1">New Delivery!</h2>
            <p className="text-[13px] text-[#6B7280] mb-4">{restName(pendingAccept[0])} · pickup for {pendingAccept[0].customer_name ?? 'a customer'}</p>
            <div className="bg-[#F8FAFC] rounded-2xl p-4 mb-5 text-left space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6B7280]">Order ID</span>
                <span className="font-mono font-[700] text-[#111827]">{pendingAccept[0].id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6B7280]">Total</span>
                <span className="font-[800] text-[#111827]">₹{pendingAccept[0].total}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6B7280]">Items</span>
                <span className="text-[#111827]">{pendingAccept[0].order_items?.length ?? 0}</span>
              </div>
              {pendingAccept[0].address && (
                <div className="flex justify-between text-[13px] gap-3">
                  <span className="text-[#6B7280] shrink-0">Drop address</span>
                  <span className="text-[#111827] text-right line-clamp-2">{pendingAccept[0].address}</span>
                </div>
              )}
            </div>
            <button onClick={() => acceptOrder(pendingAccept[0].id)}
              className="w-full py-3.5 bg-[#16A34A] text-white text-[15px] font-[800] rounded-2xl hover:bg-[#15803D] active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(22,163,74,0.35)]">
              Accept Delivery
            </button>
            <p className="text-[11px] text-[#9CA3AF] mt-3">
              {pendingAccept.length > 1 ? `The alarm will keep ringing — 1 of ${pendingAccept.length} new deliveries` : 'The alarm will keep ringing until you accept'}
            </p>
          </div>
        </div>
      )}

      {mapOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMapOrder(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
              <h2 className="text-[15px] font-[800] text-[#111827]">Drop Location</h2>
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

      <input
        ref={proofFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleProofFileSelected}
      />
    </div>
  )
}
