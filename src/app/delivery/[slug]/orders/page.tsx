'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { format, isToday, isYesterday } from 'date-fns'
import Link from 'next/link'
import { Search, Truck, CheckCircle, XCircle, Clock, AlertCircle, ChefHat, Phone, MapPin, Loader2, Bike, Volume2, VolumeX, BellRing, LogOut, Navigation, Map, Package, BarChart3, X, ChevronRight, MessageCircle, RefreshCw, QrCode, Banknote, Smartphone, ChevronDown } from 'lucide-react'
import { cn, toLocalDateInput } from '@/lib/utils'
import { unlockAudio, startAlarm, stopAlarm, chime, systemNotify } from '@/lib/orderAlarm'
import LiveTrackingMap from '@/components/LiveTrackingMap'
import OrderChat from '@/components/OrderChat'
import CollectQrModal from '@/components/CollectQrModal'
import { CITY } from '@/lib/city'
import TimeAgo from '@/components/TimeAgo'
import DelayedStrip from '@/components/DelayedStrip'
import { useNow } from '@/lib/useNow'
import { DELAYED_AFTER_MIN, DELAYED_MAX_AGE_MIN, delayedMinutes } from '@/lib/delay'

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
  accepted_at: string | null; restaurant_id: string | null
  online_amount: number | null; cod_amount: number | null
  payment_status: string | null; cash_collected_at: string | null; delivered_at: string | null
  collection_mode: 'cash' | 'online' | null; collected_amount: number | null
  order_items: OrderItem[]
  restaurants: { name: string; address: string | null; phone: string | null } | { name: string; address: string | null; phone: string | null }[] | null
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

function dayLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, d MMM')
}

// Buckets orders by the rider's local day, most recent day first. Orders
// within a day keep whatever relative order they already had (e.g. unaccepted
// ones floated to the top), so grouping never reorders the underlying list —
// it only adds headers over it.
function groupByDay(list: Order[], dateOf: (o: Order) => string) {
  // Plain object, not `Map` — lucide-react's `Map` icon is imported into this
  // file's scope and shadows the global Map constructor.
  const buckets: Record<string, Order[]> = {}
  for (const o of list) {
    const key = toLocalDateInput(dateOf(o))
    ;(buckets[key] ??= []).push(o)
  }
  return Object.entries(buckets).sort((a, b) => b[0].localeCompare(a[0]))
}

// Drag-to-confirm — a plain tap can happen by accident in a pocket or while
// riding; requiring a deliberate full-width drag makes "mark delivered"
// something the rider has to actually mean, with no camera step at all.
function SlideToDeliver({ busy, onComplete }: { busy: boolean; onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const maxXRef = useRef(0)
  const startXRef = useRef(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [completed, setCompleted] = useState(false)

  function onPointerDown(e: React.PointerEvent) {
    if (busy || completed) return
    const track = trackRef.current
    if (!track) return
    maxXRef.current = track.clientWidth - 56
    startXRef.current = e.clientX - dragX
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    setDragX(Math.min(Math.max(0, e.clientX - startXRef.current), maxXRef.current))
  }
  function onPointerUp() {
    if (!dragging) return
    setDragging(false)
    if (maxXRef.current > 0 && dragX >= maxXRef.current * 0.85) {
      setDragX(maxXRef.current)
      setCompleted(true)
      onComplete()
    } else {
      setDragX(0)
    }
  }

  return (
    <div ref={trackRef} className="relative h-14 rounded-full bg-[#DCFCE7] overflow-hidden select-none touch-none">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-14">
        <span className="text-[13px] font-[700] text-[#15803D]">
          {busy ? 'Marking delivered…' : completed ? 'Delivered!' : 'Slide to Mark as Delivered'}
        </span>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${dragX}px)`, transition: dragging ? 'none' : 'transform 200ms ease' }}
        className="absolute left-1 top-1 w-12 h-12 rounded-full bg-[#16A34A] flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing"
      >
        {busy || completed
          ? <CheckCircle className="w-5 h-5 text-white" />
          : <ChevronRight className="w-5 h-5 text-white" />}
      </div>
    </div>
  )
}

export default function DeliveryOrdersPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'pending' | 'delivered'>('active')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(() => toLocalDateInput(new Date().toISOString()))
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
  const [chatOrder, setChatOrder] = useState<Order | null>(null)

  // Customer chat alerts: how many messages each active order has received,
  // against how many this rider has already seen on this device.
  type ChatCount = { orderId: string; customer: string | null; count: number; lastBody: string }
  const [chatCounts, setChatCounts] = useState<ChatCount[]>([])
  const [chatBanner, setChatBanner] = useState<{ customer: string; body: string; orderId: string } | null>(null)
  const seenKey = `zippy-rider-chat-seen-${slug}`
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(`zippy-rider-chat-seen-${slug}`) ?? '{}') } catch { return {} }
  })
  const chatCountsRef = useRef<Record<string, number>>({})
  const seenRef = useRef<Record<string, number>>({})
  seenRef.current = seenCounts

  const markSeen = useCallback((orderId: string, count: number) => {
    setSeenCounts((prev) => {
      const next = { ...prev, [orderId]: Math.max(prev[orderId] ?? 0, count) }
      try { localStorage.setItem(seenKey, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }, [seenKey])

  useEffect(() => {
    let stop = false
    async function poll() {
      if (document.visibilityState !== 'visible' && Notification?.permission !== 'granted') return
      try {
        const res = await fetch(`/api/delivery/chat-summary?rider=${encodeURIComponent(slug)}`, { cache: 'no-store' })
        if (!res.ok || stop) return
        const json = await res.json() as { orders: ChatCount[] }
        setChatCounts(json.orders)
        for (const c of json.orders) {
          const known = chatCountsRef.current[c.orderId]
          chatCountsRef.current[c.orderId] = c.count
          const seen = seenRef.current[c.orderId] ?? 0
          // Ring only for something that arrived since the last poll (known is
          // undefined on the first poll, so reopening the panel is quiet).
          if (known !== undefined && c.count > known && c.count > seen) {
            chime()
            setChatBanner({ customer: c.customer ?? 'Customer', body: c.lastBody, orderId: c.orderId })
            systemNotify(`New message from ${c.customer ?? 'customer'}`, c.lastBody)
          }
        }
      } catch { /* try again next tick */ }
    }
    void poll()
    const t = setInterval(poll, 7000)
    return () => { stop = true; clearInterval(t) }
  }, [slug])

  const unreadFor = (orderId: string) => {
    const c = chatCounts.find((x) => x.orderId === orderId)
    return c ? Math.max(0, c.count - (seenCounts[orderId] ?? 0)) : 0
  }
  const [confirmingDelivery, setConfirmingDelivery] = useState<Order | null>(null)
  // How the amount due at the door was taken: chosen before the slide to deliver.
  const [collectMode, setCollectMode] = useState<'cash' | 'online' | null>(null)
  const [qrOrder, setQrOrder] = useState<Order | null>(null)
  // Cards stay short; the arrow on a card opens its items and details.
  const [openCards, setOpenCards] = useState<string[]>([])
  // Which of the day's collections the rider is looking at (tap the cash / online tiles).
  const [collectList, setCollectList] = useState<'cash' | 'online' | null>(null)
  // Re-read every 30 seconds so "waiting 1 h 5 min" stays exact without a reload.
  const nowMs = useNow()
  const openAndScrollTo = (id: string) => {
    setOpenCards((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setTimeout(() => document.getElementById(`order-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }
  const toggleCard = (id: string) => setOpenCards((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  // Rider-side status changes: out for delivery (one "are you sure"), and cancel
  // (a reason of at least 5 characters, then a second "are you sure").
  const [outTarget, setOutTarget] = useState<Order | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelStep, setCancelStep] = useState<'reason' | 'confirm'>('reason')
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [deliveringBusy, setDeliveringBusy] = useState(false)
  const [deliverError, setDeliverError] = useState('')
  const [slideAttempt, setSlideAttempt] = useState(0)
  // "Check payment": asks Cashfree whether an online payment that still shows pending has come through.
  const [checkingPay, setCheckingPay] = useState<string | null>(null)
  const [payResult, setPayResult] = useState<Record<string, string>>({})

  const loadOrders = useCallback(async (partnerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, customer_name, customer_phone, address, placed_at, delivery_latitude, delivery_longitude, accepted_at, delivered_at, restaurant_id, online_amount, cod_amount, payment_status, cash_collected_at, collection_mode, collected_amount, order_items(name, quantity, price), restaurants(name, address, phone)')
      .eq('delivery_partner_id', partnerId)
      // Most recently assigned first — admin stamps updated_at when it assigns,
      // so a re-assignment brings the order back to the top of this board.
      .order('updated_at', { ascending: false })
      .order('placed_at', { ascending: false })
      // A rider can hold well past 50 orders — capping here meant an order
      // assigned from admin simply never appeared on their board.
      .limit(500)
    const raw = (data as unknown as Order[]) ?? []
    // A switched-off restaurant can't be read through the join above, which made its orders look
    // like "Zippy Mart" with no address or phone. Fetch those details separately.
    const missing = raw.filter((o) => o.restaurant_id && !o.restaurants).map((o) => o.id)
    if (missing.length > 0) {
      const { data: info } = await supabase.rpc('order_restaurant_info', { p_order_ids: missing })
      const byOrder = Object.fromEntries(((info as { order_id: string; name: string; address: string | null; phone: string | null }[]) ?? []).map((r) => [r.order_id, r]))
      for (const o of raw) {
        const r = byOrder[o.id]
        if (r) o.restaurants = { name: r.name, address: r.address, phone: r.phone }
      }
    }
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
    let pollId: ReturnType<typeof setInterval> | null = null

    // The board used to rely entirely on the realtime socket. On a phone that
    // socket drops whenever the app is backgrounded or the network switches
    // between wifi and data, and nothing ever reconnected the data — the board
    // silently froze on whatever it had loaded. These refresh it regardless.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && partnerIdRef.current) {
        loadOrders(partnerIdRef.current)
      }
    }

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
          // Replication can trail the notification by a moment; a single retry
          // stops an assignment ringing without ever landing on the board.
          setTimeout(() => loadOrders(p.id), 1500)
        })
        .subscribe()

      // Cheap safety net: a periodic reload, plus one whenever the rider comes
      // back to the tab or the connection returns.
      pollId = setInterval(() => { if (partnerIdRef.current) loadOrders(partnerIdRef.current) }, 30000)
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

  const MIN_CANCEL_REASON = 5

  async function markOutForDelivery(orderId: string) {
    setActionBusy(true); setActionError('')
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'out_for_delivery', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .select('id')
    setActionBusy(false)
    if (error) { setActionError(error.message); return }
    if (!data || data.length === 0) { setActionError('This order has already changed. Pull to refresh.'); return }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'out_for_delivery' } : o))
    setOutTarget(null)
  }

  function openCancel(o: Order) {
    setCancelTarget(o); setCancelReason(''); setCancelStep('reason'); setActionError('')
  }

  // The reason is kept on the order's notes, so the admin and the restaurant can
  // read who cancelled it and why. The rider stays attached for the same reason.
  async function cancelAsRider(orderId: string) {
    const reason = cancelReason.trim()
    if (reason.length < MIN_CANCEL_REASON) return
    setActionBusy(true); setActionError('')
    const { data: current } = await supabase.from('orders').select('notes').eq('id', orderId).single()
    const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    const line = `CANCELLED BY RIDER ${partner?.name ?? ''} (${stamp}): ${reason}`
    const notes = current?.notes ? `${current.notes}\n${line}` : line
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', notes, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .not('status', 'in', '(delivered,cancelled)')
      .select('id')
    setActionBusy(false)
    if (error) { setActionError(error.message); return }
    if (!data || data.length === 0) { setActionError('This order was already delivered or cancelled.'); return }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    setCancelTarget(null)
  }

  // Only the orders that actually hand over cash also settle the payment
  // and stamp the cash-collection time — no photo involved anywhere here.
  async function completeDelivery(orderId: string, mode: 'cash' | 'online' | null) {
    setDeliveringBusy(true)
    setDeliverError('')
    try {
      const now = new Date().toISOString()
      const order = orders.find((o) => o.id === orderId)
      const toCollect = order ? amountToCollect(order) : 0
      // If the online leg was never confirmed by Cashfree (payment_status still
      // pending/failed), the rider just collected the ENTIRE total at the door —
      // amountToCollect() already accounts for that. Reclassify online_amount
      // into cod_amount so the admin dashboard and the Cashfree numbers do not
      // count it as a Cashfree payment that never actually went through.
      const onlineWasConfirmed = order ? ['partially_paid', 'paid'].includes(order.payment_status ?? '') : false
      const reclassify = order && !onlineWasConfirmed ? { online_amount: 0, cod_amount: order.total } : {}

      // Cash: the rider holds it and hands it over, so it is stamped as cash collected.
      // Online: the customer paid the company UPI account directly through the QR,
      // so there is no cash to hand over (and no cash_collected_at).
      const collection = toCollect <= 0 ? {} : mode === 'online' ? {
        payment_status: 'paid',
        collection_mode: 'online',
        collected_amount: toCollect,
        collected_at: now,
        ...reclassify,
      } : {
        payment_status: 'paid',
        cash_collected_at: now,
        collection_mode: 'cash',
        collected_amount: toCollect,
        collected_at: now,
        ...reclassify,
      }

      const { error } = await supabase.from('orders').update({
        status: 'delivered',
        delivered_at: now,
        ...collection,
      }).eq('id', orderId)
      if (error) throw error

      if (partner) {
        await supabase.from('delivery_partners').update({ total_deliveries: (partner.total_deliveries ?? 0) + 1 }).eq('id', partner.id)
        setPartner((prev) => prev ? { ...prev, total_deliveries: (prev.total_deliveries ?? 0) + 1 } : prev)
      }
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'delivered', ...(toCollect > 0 ? { collection_mode: (mode === 'online' ? 'online' : 'cash') as 'cash' | 'online', collected_amount: toCollect } : {}) } : o))
      setDeliveringBusy(false)
      setTimeout(() => setConfirmingDelivery(null), 700)
    } catch (err: unknown) {
      setDeliveringBusy(false)
      setDeliverError(err instanceof Error ? err.message : 'Could not mark delivered. Please try again.')
      setSlideAttempt((n) => n + 1)
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

  async function checkPayment(orderId: string) {
    setCheckingPay(orderId)
    setPayResult((r) => ({ ...r, [orderId]: '' }))
    let msg = 'Could not check. Try again.'
    try {
      const res = await fetch(`/api/cashfree/status/${orderId}`)
      const json = await res.json()
      if (json.state === 'COMPLETED') {
        msg = 'Payment received'
        if (partnerIdRef.current) await loadOrders(partnerIdRef.current)
      } else if (json.state === 'PENDING') msg = 'Still pending. Not paid yet.'
      else if (json.state === 'FAILED') msg = 'Payment failed or expired'
    } catch { /* keep the default message */ }
    setCheckingPay(null)
    setPayResult((r) => ({ ...r, [orderId]: msg }))
    setTimeout(() => setPayResult((r) => ({ ...r, [orderId]: '' })), 6000)
  }

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
  // Not yet picked up: still with the kitchen, or assigned but not accepted.
  const pendingOrders = activeOrders.filter((o) => !o.accepted_at || ['pending', 'confirmed', 'preparing'].includes(o.status))
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')

  const q = search.trim().toLowerCase()
  const matches = (o: Order) => !q || [
    o.id.slice(0, 8), o.customer_name ?? '', o.customer_phone ?? '', o.address ?? '', restName(o) ?? '',
  ].some((f) => f.toLowerCase().includes(q))

  // Delivered orders group by when they were delivered; active/pending ones
  // by when they were placed — a still-open order keeps no delivered_at yet.
  const dateOf = (o: Order) => tab === 'delivered' ? (o.delivered_at ?? o.placed_at) : o.placed_at
  const matchesDate = (o: Order) => !dateFilter || toLocalDateInput(dateOf(o)) === dateFilter

  const shown = (tab === 'active' ? activeOrders : tab === 'pending' ? pendingOrders : deliveredOrders)
    .filter(matches)
    .filter(matchesDate)

  const dayGroups = groupByDay(shown, dateOf)

  // The at-a-glance card tracks whatever day is selected above (today by
  // default), so it's a real per-day record the rider can look back on via
  // the calendar — not just a number that resets and is lost at midnight.
  // Clearing the filter rolls it up to an all-time total instead.
  const deliveredForStats = orders.filter((o) => o.status === 'delivered'
    && (!dateFilter || toLocalDateInput(o.delivered_at ?? o.placed_at) === dateFilter))
  // Cash taken at the door, and amounts paid online through the QR. Deliveries from
  // before the choice existed have no mode: they count as cash, as they always did.
  const collectedForStats = deliveredForStats.reduce((sum, o) =>
    sum + (o.collection_mode === 'online' ? 0 : Number(o.collected_amount ?? o.cod_amount ?? 0)), 0)
  const onlineForStats = deliveredForStats.reduce((sum, o) =>
    sum + (o.collection_mode === 'online' ? Number(o.collected_amount ?? 0) : 0), 0)
  // Orders still open that were placed 50+ minutes ago (within the last day, so old
  // stuck orders do not clutter this), longest waiting first.
  const delayedOrders = activeOrders
    .map((o) => ({ o, mins: delayedMinutes(o.placed_at, nowMs) }))
    .filter(({ mins }) => mins >= DELAYED_AFTER_MIN && mins < DELAYED_MAX_AGE_MIN)
    .sort((a, b) => b.mins - a.mins)
  const collectedAmountOf = (o: Order) => Number(o.collected_amount ?? o.cod_amount ?? 0)
  const cashOrders = deliveredForStats
    .filter((o) => o.collection_mode !== 'online' && collectedAmountOf(o) > 0)
    .sort((a, b) => new Date(b.delivered_at ?? b.placed_at).getTime() - new Date(a.delivered_at ?? a.placed_at).getTime())
  const onlineOrders = deliveredForStats
    .filter((o) => o.collection_mode === 'online')
    .sort((a, b) => new Date(b.delivered_at ?? b.placed_at).getTime() - new Date(a.delivered_at ?? a.placed_at).getTime())
  const statsLabel = dateFilter ? dayLabel(dateFilter).toLowerCase() : 'all time'

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-[#F5F3FF] rounded-lg flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4 text-[#7C3AED]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[14px] font-[800] text-[#111827] leading-tight truncate" style={{ fontWeight: 800 }}>{partner.name}</h1>
                <p className="text-[10.5px] text-[#9CA3AF] capitalize leading-tight">{partner.vehicle_type ?? 'Rider'} · {partner.total_deliveries ?? 0} delivered</p>
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

          {chatBanner && (
            <button onClick={() => { const o = orders.find((x) => x.id === chatBanner.orderId); if (o) { setChatOrder(o); const c = chatCounts.find((x) => x.orderId === o.id); if (c) markSeen(o.id, c.count) } setChatBanner(null) }}
              className="mb-2 w-full flex items-center gap-2 px-3 py-2 bg-[#16A34A] rounded-xl text-left">
              <MessageCircle className="w-4 h-4 text-white shrink-0" />
              <span className="flex-1 min-w-0 text-[12.5px] text-white truncate"><strong>{chatBanner.customer}:</strong> {chatBanner.body}</span>
              <span className="text-[11px] font-[700] text-white/90 shrink-0">Open</span>
            </button>
          )}

          {newOrderFlash && (
            <div className="mb-3 flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] rounded-xl animate-pulse">
              <BellRing className="w-4 h-4 text-white" />
              <span className="text-[13px] font-[700] text-white">New delivery assigned!</span>
            </div>
          )}

          {/* A per-day record, not a live-only snapshot — it tracks whichever
              day is selected below (today by default), so switching the date
              re-opens that day's own totals instead of losing them at midnight. */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-2 py-1">
              <p className="text-[14px] font-[800] text-[#15803D] leading-none">{deliveredForStats.length}</p>
              <p className="text-[9.5px] text-[#15803D]/70 mt-0.5 truncate">delivered {statsLabel}</p>
            </div>
            <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg px-2 py-1">
              <p className="text-[14px] font-[800] text-[#6D28D9] leading-none">{activeOrders.length}</p>
              <p className="text-[9.5px] text-[#6D28D9]/70 mt-0.5 truncate">still to deliver</p>
            </div>
            <button type="button" onClick={() => setCollectList('cash')} aria-label="See who paid cash"
              className="text-left bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-2 py-1 active:scale-95 transition-transform">
              <p className="text-[14px] font-[800] text-[#B45309] leading-none">₹{collectedForStats.toFixed(0)}</p>
              <p className="text-[9.5px] text-[#B45309]/70 mt-0.5 truncate">cash {statsLabel} ›</p>
            </button>
            <button type="button" onClick={() => setCollectList('online')} aria-label="See who paid online"
              className="text-left bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-2 py-1 active:scale-95 transition-transform">
              <p className="text-[14px] font-[800] text-[#1D4ED8] leading-none">₹{onlineForStats.toFixed(0)}</p>
              <p className="text-[9.5px] text-[#1D4ED8]/70 mt-0.5 truncate">online {statsLabel} ›</p>
            </button>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, name, phone…"
                className="w-full pl-8 pr-7 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#7C3AED] bg-white"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="relative shrink-0">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                title="Filter by date"
                className="w-[138px] px-1.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[11.5px] outline-none focus:border-[#7C3AED] bg-white"
              />
            </div>
            {dateFilter !== toLocalDateInput(new Date().toISOString()) ? (
              <button onClick={() => setDateFilter(toLocalDateInput(new Date().toISOString()))}
                className="px-2 py-1.5 rounded-lg text-[11.5px] font-[600] border border-[#E5E7EB] text-[#374151] whitespace-nowrap">
                Today
              </button>
            ) : null}
            {dateFilter && (
              <button onClick={() => setDateFilter('')} title="Show every day" className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#9CA3AF] hover:text-[#374151]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            <button onClick={() => setTab('active')}
              className={cn('flex-1 py-1.5 rounded-lg text-[12.5px] font-[600] transition-all',
                tab === 'active' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280]')}>
              Active ({activeOrders.length})
            </button>
            <button onClick={() => setTab('pending')}
              className={cn('flex-1 py-1.5 rounded-lg text-[12.5px] font-[600] transition-all',
                tab === 'pending' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280]')}>
              Pending ({pendingOrders.length})
            </button>
            <button onClick={() => setTab('delivered')}
              className={cn('flex-1 py-1.5 rounded-lg text-[12.5px] font-[600] transition-all',
                tab === 'delivered' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280]')}>
              Delivered ({deliveredOrders.length})
            </button>
          </div>

        </div>
      </div>

      {/* Orders */}
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {tab !== 'delivered' && (
          <DelayedStrip
            items={delayedOrders.map(({ o, mins }) => ({ id: o.id, name: o.customer_name ?? 'Customer', minutes: mins }))}
            onSelect={(id) => { if (tab === 'pending' && !pendingOrders.some((x) => x.id === id)) setTab('active'); openAndScrollTo(id) }}
          />
        )}
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-[#9CA3AF]">
            <Truck className="w-12 h-12" strokeWidth={1} />
            <p className="text-[15px] font-semibold text-[#374151]">
              {search
                ? 'Nothing matches that search'
                : dateFilter
                  ? `No ${tab} orders on ${dayLabel(dateFilter).toLowerCase()}`
                  : tab === 'active' ? 'No deliveries right now' : tab === 'pending' ? 'Nothing waiting to be picked up' : 'No deliveries yet'}
            </p>
            {tab === 'active' && !dateFilter && <p className="text-[13px]">New assignments from admin will show up here instantly.</p>}
            {dateFilter && <p className="text-[13px]">Pick another date above, or clear it to see every day.</p>}
          </div>
        ) : (
          dayGroups.map(([dateKey, dayOrders]) => (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11.5px] font-[700] text-[#6B7280] uppercase tracking-wide">{dayLabel(dateKey)}</span>
                <span className="text-[11px] text-[#9CA3AF]">({dayOrders.length})</span>
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>
              {dayOrders.map((o) => {
                const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.confirmed
                const Icon = cfg.icon
                const isReady = o.status === 'out_for_delivery'
                return (
              <div key={o.id} id={`order-${o.id}`} className={cn('bg-white rounded-2xl border overflow-hidden shadow-zippy-sm', isReady ? 'border-[#7C3AED]' : 'border-[#E5E7EB]')}>
                <div className="px-3.5 py-3">
                  {/* Header: order, age, status, and the arrow that opens the details */}
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono font-bold text-[#374151]">{o.id.slice(0,8).toUpperCase()}</span>
                    <span className="text-[11.5px] text-[#9CA3AF] truncate">· <TimeAgo date={o.placed_at} /></span>
                    <span className="ml-auto shrink-0 text-[10.5px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
                      <Icon className="w-3 h-3" /> {isReady ? 'Ready for pickup' : cfg.label}
                    </span>
                    <button onClick={() => toggleCard(o.id)} aria-expanded={openCards.includes(o.id)} aria-label={openCards.includes(o.id) ? 'Hide details' : 'Show items and details'}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                      <ChevronDown className={cn('w-4 h-4 transition-transform', openCards.includes(o.id) && 'rotate-180')} />
                    </button>
                  </div>

                  {/* Where it goes, one short line each */}
                  <div className="mt-2 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-1.5">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-[800] text-[#5B21B6]" style={{ fontWeight: 800 }}>
                      <span className="shrink-0 rounded bg-[#7C3AED] px-1.5 py-0.5 text-[9.5px] font-[800] tracking-wide text-white">FROM</span>
                      <span className="truncate">{restName(o)}</span>
                      <span className="ml-auto shrink-0 text-[11px] font-[600] text-[#6D28D9]/80">{(o.order_items ?? []).reduce((n, i) => n + i.quantity, 0)} item{(o.order_items ?? []).reduce((n, i) => n + i.quantity, 0) === 1 ? '' : 's'}</span>
                    </p>
                    {restAddress(o) && <p className="mt-0.5 truncate text-[11.5px] font-[600] text-[#5B21B6]/90">{restAddress(o)}</p>}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#111827]">
                    <span className="shrink-0 rounded bg-[#16A34A] px-1.5 py-0.5 text-[9.5px] font-[800] tracking-wide text-white">TO</span>
                    <span className="truncate"><span className="font-[700]">{o.customer_name ?? 'Customer'}</span>{o.address && <span className="text-[#6B7280]"> · {o.address}</span>}</span>
                  </p>

                  {/* The rider has to know what has already been received, or they
                      will collect the cash half of a split order whose online half
                      never went through. */}
                  {!['delivered', 'cancelled'].includes(o.status) && (
                    <div className={cn('mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-[600]',
                      amountToCollect(o) > 0 ? 'bg-[#FFFBEB] text-[#B45309]' : 'bg-[#DCFCE7] text-[#15803D]')}>
                      <span>
                        {amountToCollect(o) > 0
                          ? <>Collect <strong>₹{amountToCollect(o)}</strong></>
                          : <>Fully paid · collect nothing</>}
                      </span>
                      <span className="ml-auto text-[11px] font-[500] opacity-80 truncate">
                        {onlineSettled(o)
                          ? `₹${o.online_amount} received online`
                          : (o.online_amount ?? 0) > 0
                            ? 'online payment not received'
                            : 'cash on delivery'}
                      </span>
                    </div>
                  )}
                  {!['delivered', 'cancelled'].includes(o.status) && (o.online_amount ?? 0) > 0 && !onlineSettled(o) && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <button onClick={() => void checkPayment(o.id)} disabled={checkingPay === o.id}
                        className="flex items-center gap-1.5 rounded-lg border border-[#16A34A] bg-[#F0FDF4] px-3 py-1.5 text-[12px] font-[700] text-[#15803D] transition-all active:scale-95 disabled:opacity-60">
                        <RefreshCw className={cn('h-3.5 w-3.5', checkingPay === o.id && 'animate-spin')} />
                        {checkingPay === o.id ? 'Checking...' : `Check payment (₹${o.online_amount})`}
                      </button>
                      {payResult[o.id] && <span className={cn('text-[11.5px] font-[600]', payResult[o.id] === 'Payment received' ? 'text-[#15803D]' : 'text-[#B45309]')}>{payResult[o.id]}</span>}
                    </div>
                  )}

                  {/* Actions: call and chat on the left, the main action on the right */}
                  <div className="mt-2.5 flex items-center gap-2">
                    {o.customer_phone && (
                      <a href={`tel:${o.customer_phone}`} aria-label="Call the customer"
                        className="shrink-0 w-10 h-10 flex items-center justify-center border border-[#E5E7EB] rounded-xl text-[#374151] hover:border-[#D1D5DB] transition-all">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {!['delivered', 'cancelled'].includes(o.status) && (
                      <button aria-label="Chat with the customer" onClick={() => { unlockAudio(); setChatOrder(o); setChatBanner(null); const c = chatCounts.find((x) => x.orderId === o.id); if (c) markSeen(o.id, c.count) }}
                        className={cn('relative shrink-0 w-10 h-10 flex items-center justify-center border rounded-xl transition-all',
                          unreadFor(o.id) > 0 ? 'border-[#16A34A] bg-[#F0FDF4] text-[#15803D]' : 'border-[#E5E7EB] text-[#374151] hover:border-[#16A34A] hover:text-[#16A34A]')}>
                        <MessageCircle className="w-4 h-4" />
                        {unreadFor(o.id) > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#EF4444] text-white text-[10px] font-[800]">{unreadFor(o.id)}</span>
                        )}
                      </button>
                    )}
                    <div className="flex flex-1 min-w-0 items-center justify-end gap-2">
                      {!['delivered', 'cancelled'].includes(o.status) && o.delivery_latitude && o.delivery_longitude && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.delivery_latitude},${o.delivery_longitude}`}
                          target="_blank" rel="noopener noreferrer" aria-label="Go to the customer on Google Maps" title="Go to the customer's location"
                          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D] hover:bg-[#DCFCE7] active:scale-95 transition-all">
                          <Navigation className="w-5 h-5" />
                        </a>
                      )}
                      {isReady && (
                        <button onClick={() => { setConfirmingDelivery(o); setCollectMode(null); setDeliverError(''); setSlideAttempt((n) => n + 1) }}
                          title={amountToCollect(o) > 0 ? `Collect ₹${amountToCollect(o)}, then mark delivered` : 'Mark this order delivered'}
                          className="flex-1 min-w-0 h-10 justify-center flex items-center gap-1.5 px-3 bg-[#16A34A] text-white text-[12.5px] font-[600] rounded-xl hover:bg-[#15803D] active:scale-95 transition-all shadow-[0_2px_8px_rgba(22,163,74,0.3)]">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{amountToCollect(o) > 0 ? `Collect ₹${amountToCollect(o)} & Deliver` : 'Mark as Delivered'}</span>
                        </button>
                      )}
                      {!isReady && !['delivered', 'cancelled'].includes(o.status) && (
                        <button onClick={() => { setOutTarget(o); setActionError('') }}
                          className="flex-1 min-w-0 h-10 justify-center flex items-center gap-1.5 px-3 bg-[#7C3AED] text-white text-[12.5px] font-[600] rounded-xl hover:bg-[#6D28D9] active:scale-95 transition-all">
                          <Truck className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Out for delivery</span>
                        </button>
                      )}
                      {o.status === 'delivered' && o.collection_mode && (
                        <span className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-[700]',
                          o.collection_mode === 'online' ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'bg-[#FFFBEB] text-[#B45309]')}>
                          {o.collection_mode === 'online' ? <Smartphone className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                          {o.collection_mode === 'online' ? 'Online' : 'Cash'} ₹{Number(o.collected_amount ?? 0).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details, opened with the arrow */}
                  {openCards.includes(o.id) && (
                    <div className="mt-3 pt-3 border-t border-[#F3F4F6] space-y-3">
                      <div className="space-y-2">
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
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 text-[10.5px] font-[600] text-[#9CA3AF] uppercase tracking-wide"><Package className="w-3 h-3" /> Items</p>
                          {o.order_items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-[12px] text-[#374151]">
                              <span>{item.name} × {item.quantity}</span>
                              <span className="font-[600]">₹{Math.round(item.price * item.quantity)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between border-t border-dashed border-[#E5E7EB] pt-1 text-[12.5px] font-[800] text-[#111827]">
                            <span>Order total</span><span>₹{o.total}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
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
                        {!['delivered', 'cancelled'].includes(o.status) && (
                          <button onClick={() => openCancel(o)} className="ml-auto text-[12px] font-[600] text-[#DC2626] hover:text-[#B91C1C] underline underline-offset-2">
                            Cancel this order
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
                )
              })}
            </div>
          ))
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

      {chatOrder && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setChatOrder(null)} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <h2 className="text-[15px] font-[800] text-[#111827]">Chat with {chatOrder.customer_name ?? 'customer'}</h2>
                <p className="text-[11.5px] text-[#9CA3AF] font-mono">Order {chatOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setChatOrder(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
            <OrderChat orderId={chatOrder.id} riderSlug={slug} viewer="rider" />
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

      {outTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!actionBusy) setOutTarget(null) }} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10 text-center">
            <div className="w-16 h-16 bg-[#F5F3FF] rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-[#7C3AED]" />
            </div>
            <h2 className="text-[18px] font-[800] text-[#111827] mb-1">Are you sure?</h2>
            <p className="text-[13px] text-[#6B7280] mb-5">
              Mark {outTarget.customer_name ?? 'this'} order {outTarget.id.slice(0, 8).toUpperCase()} as picked up and <strong>out for delivery</strong>. The customer will see it is on the way.
            </p>
            {actionError && <p className="text-[12px] text-[#DC2626] mb-3">{actionError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setOutTarget(null)} disabled={actionBusy}
                className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-[600] text-[#374151] disabled:opacity-50">Not yet</button>
              <button onClick={() => markOutForDelivery(outTarget.id)} disabled={actionBusy}
                className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl text-[13.5px] font-[700] disabled:opacity-60 flex items-center justify-center gap-2">
                {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />} Yes, out for delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!actionBusy) setCancelTarget(null) }} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="w-14 h-14 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-7 h-7 text-[#DC2626]" />
            </div>
            {cancelStep === 'reason' ? (
              <>
                <h2 className="text-[18px] font-[800] text-[#111827] text-center mb-1">Cancel this order?</h2>
                <p className="text-[12.5px] text-[#6B7280] text-center mb-4">
                  {cancelTarget.customer_name ?? 'Customer'} · {cancelTarget.id.slice(0, 8).toUpperCase()}. Tell us why. It is recorded on the order.
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Reason for cancelling (at least 5 characters)"
                  className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[#DC2626] resize-none"
                />
                <p className={cn('text-[11.5px] mt-1', cancelReason.trim().length >= MIN_CANCEL_REASON ? 'text-[#15803D]' : 'text-[#9CA3AF]')}>
                  {cancelReason.trim().length}/{MIN_CANCEL_REASON} characters minimum
                </p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setCancelTarget(null)}
                    className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-[600] text-[#374151]">Keep order</button>
                  <button onClick={() => setCancelStep('confirm')} disabled={cancelReason.trim().length < MIN_CANCEL_REASON}
                    className="flex-1 py-3 bg-[#DC2626] text-white rounded-xl text-[13.5px] font-[700] disabled:opacity-40 disabled:cursor-not-allowed">Continue</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-[18px] font-[800] text-[#111827] text-center mb-1">Are you sure?</h2>
                <p className="text-[13px] text-[#6B7280] text-center mb-3">
                  Cancelling order {cancelTarget.id.slice(0, 8).toUpperCase()} cannot be undone from here. The admin will be able to see your reason:
                </p>
                <p className="rounded-xl bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] text-[#991B1B] mb-3 break-words">{cancelReason.trim()}</p>
                {actionError && <p className="text-[12px] text-[#DC2626] mb-3">{actionError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setCancelStep('reason')} disabled={actionBusy}
                    className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-[600] text-[#374151] disabled:opacity-50">Go back</button>
                  <button onClick={() => cancelAsRider(cancelTarget.id)} disabled={actionBusy}
                    className="flex-1 py-3 bg-[#DC2626] text-white rounded-xl text-[13.5px] font-[700] disabled:opacity-60 flex items-center justify-center gap-2">
                    {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />} Yes, cancel order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {collectList && (() => {
        const list = collectList === 'cash' ? cashOrders : onlineOrders
        const total = list.reduce((sum, o) => sum + collectedAmountOf(o), 0)
        return (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCollectList(null)} />
            <div role="dialog" aria-modal="true" className="relative z-10 flex max-h-[80vh] w-full flex-col rounded-t-3xl bg-white sm:max-w-sm sm:rounded-3xl">
              <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', collectList === 'cash' ? 'bg-[#FFFBEB] text-[#B45309]' : 'bg-[#EFF6FF] text-[#1D4ED8]')}>
                  {collectList === 'cash' ? <Banknote className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{collectList === 'cash' ? 'Cash collected' : 'Paid online (UPI)'} {statsLabel}</h2>
                  <p className="text-[12px] text-[#6B7280]">{list.length} order{list.length !== 1 ? 's' : ''} · ₹{total.toFixed(0)}</p>
                </div>
                <button onClick={() => setCollectList(null)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151]"><X className="h-4 w-4" /></button>
              </div>
              <div className="overflow-y-auto border-t border-[#F3F4F6] px-5 pb-5">
                {list.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-[#9CA3AF]">Nothing {collectList === 'cash' ? 'collected in cash' : 'paid online'} {statsLabel}.</p>
                ) : list.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] py-3 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-[700] text-[#111827]">{o.customer_name ?? 'Customer'}</p>
                      <p className="text-[11.5px] text-[#9CA3AF]">
                        <span className="font-mono">{o.id.slice(0, 8).toUpperCase()}</span> · {format(new Date(o.delivered_at ?? o.placed_at), 'd MMM, h:mm a')}
                      </p>
                    </div>
                    <span className={cn('shrink-0 text-[14px] font-[800]', collectList === 'cash' ? 'text-[#B45309]' : 'text-[#1D4ED8]')} style={{ fontWeight: 800 }}>₹{collectedAmountOf(o).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {qrOrder && (
        <CollectQrModal
          amount={amountToCollect(qrOrder)}
          orderId={qrOrder.id}
          customerName={qrOrder.customer_name}
          onClose={() => setQrOrder(null)}
        />
      )}

      {confirmingDelivery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!deliveringBusy) setConfirmingDelivery(null) }} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10 text-center">
            <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#16A34A]" />
            </div>
            <h2 className="text-[18px] font-[800] text-[#111827] mb-1">Are you sure delivery is complete?</h2>
            <p className="text-[13px] text-[#6B7280] mb-5">
              {confirmingDelivery.customer_name ?? 'Customer'} · {confirmingDelivery.id.slice(0, 8).toUpperCase()}
              {amountToCollect(confirmingDelivery) > 0 && <> · collect ₹{amountToCollect(confirmingDelivery)}</>}
            </p>
            {amountToCollect(confirmingDelivery) > 0 && collectMode === null ? (
              <div>
                <p className="text-[13.5px] font-[800] text-[#111827] mb-3" style={{ fontWeight: 800 }}>
                  How did the customer pay ₹{amountToCollect(confirmingDelivery).toFixed(2)}?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setCollectMode('cash')}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#FDE68A] bg-[#FFFBEB] py-4 text-[#B45309] active:scale-95 transition-all">
                    <Banknote className="w-6 h-6" />
                    <span className="text-[13px] font-[800]" style={{ fontWeight: 800 }}>Cash collected</span>
                  </button>
                  {CITY.upiId && (
                    <button onClick={() => setCollectMode('online')}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#BFDBFE] bg-[#EFF6FF] py-4 text-[#1D4ED8] active:scale-95 transition-all">
                      <Smartphone className="w-6 h-6" />
                      <span className="text-[13px] font-[800]" style={{ fontWeight: 800 }}>Online (UPI)</span>
                    </button>
                  )}
                </div>
                {CITY.upiId && (
                  <button onClick={() => setQrOrder(confirmingDelivery)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-[700] text-[#7C3AED]">
                    <QrCode className="w-4 h-4" /> Show payment QR
                  </button>
                )}
              </div>
            ) : (
              <>
                {amountToCollect(confirmingDelivery) > 0 && collectMode && (
                  <div className={cn('mb-3 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[12.5px] font-[700]',
                    collectMode === 'online' ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'bg-[#FFFBEB] text-[#B45309]')}>
                    <span className="flex items-center gap-1.5">
                      {collectMode === 'online' ? <Smartphone className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                      {collectMode === 'online' ? 'Paid online (UPI)' : 'Cash collected'}: ₹{amountToCollect(confirmingDelivery).toFixed(2)}
                    </span>
                    <button onClick={() => setCollectMode(null)} disabled={deliveringBusy} className="underline text-[11.5px] disabled:opacity-50">Change</button>
                  </div>
                )}
                <SlideToDeliver key={slideAttempt} busy={deliveringBusy} onComplete={() => completeDelivery(confirmingDelivery.id, collectMode)} />
              </>
            )}
            {deliverError && <p className="text-[12px] text-[#DC2626] mt-3">{deliverError}</p>}
            <button onClick={() => setConfirmingDelivery(null)} disabled={deliveringBusy}
              className="mt-4 text-[12.5px] font-[600] text-[#9CA3AF] hover:text-[#374151] disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
