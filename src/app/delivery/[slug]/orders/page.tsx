'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Truck, CheckCircle, XCircle, Clock, AlertCircle, ChefHat, Phone, MapPin, Loader2, Bike, Volume2, VolumeX, BellRing, Zap, LogOut, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { unlockAudio, playNewOrderAlarm } from '@/lib/orderAlarm'

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
type Order = {
  id: string; status: string; total: number; customer_name: string | null
  customer_phone: string | null; address: string | null; placed_at: string
  restaurants: { name: string; address: string | null } | { name: string; address: string | null }[] | null
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

export default function DeliveryOrdersPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'delivered'>('active')
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [newOrderFlash, setNewOrderFlash] = useState(false)
  const soundOnRef = useRef(true)
  soundOnRef.current = soundOn
  const [sharingLocation, setSharingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef(0)
  const partnerIdRef = useRef<string | null>(null)

  const loadOrders = useCallback(async (partnerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, customer_name, customer_phone, address, placed_at, restaurants(name, address)')
      .eq('delivery_partner_id', partnerId)
      .order('placed_at', { ascending: false })
      .limit(50)
    setOrders((data as unknown as Order[]) ?? [])
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
      await loadOrders(p.id)
      setLoading(false)
      startLocationSharing() // auto-share — the rider just needs to allow the permission prompt

      channel = supabase
        .channel(`delivery-orders-${p.id}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'orders',
          filter: `delivery_partner_id=eq.${p.id}`,
        }, (payload) => {
          if (payload.eventType === 'UPDATE' && (payload.old as { delivery_partner_id?: string })?.delivery_partner_id !== p.id) {
            // newly assigned to this rider
            if (soundOnRef.current) playNewOrderAlarm()
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
    }
  }, [slug, loadOrders])

  // Stop the GPS watcher if the tab closes while sharing is on
  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [])

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

  async function advance(orderId: string, nextStatus: string) {
    setAdvancing(orderId)
    await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId)
    if (nextStatus === 'delivered' && partner) {
      await supabase.from('delivery_partners').update({ total_deliveries: (partner.total_deliveries ?? 0) + 1 }).eq('id', partner.id)
      setPartner((prev) => prev ? { ...prev, total_deliveries: (prev.total_deliveries ?? 0) + 1 } : prev)
    }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: nextStatus } : o))
    setAdvancing(null)
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
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')
  const shown = tab === 'active' ? activeOrders : deliveredOrders

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
              <button
                onClick={startLocationSharing}
                title={sharingLocation ? 'Sharing your live location with customers' : locationError || 'Tap to allow location sharing'}
                className={cn('w-9 h-9 flex items-center justify-center rounded-xl border transition-all',
                  sharingLocation ? 'bg-[#F5F3FF] border-[#DDD6FE] text-[#7C3AED]' : locationError ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#9CA3AF]')}>
                <Navigation className={cn('w-4 h-4', sharingLocation && 'animate-pulse')} />
              </button>
              <button
                onClick={() => { unlockAudio(); if (!soundOn) playNewOrderAlarm(); setSoundOn(!soundOn) }}
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

          <div className="flex gap-1.5">
            <button onClick={() => setTab('active')}
              className={cn('flex-1 py-2 rounded-xl text-[13px] font-[600] transition-all',
                tab === 'active' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280]')}>
              Active ({activeOrders.length})
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
              {tab === 'active' ? 'No deliveries right now' : 'No deliveries yet'}
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
                      <div>
                        <p className="font-[600] text-[#111827]">Pickup: {restName(o)}</p>
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

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F3F4F6]">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-[800] text-[#111827]">₹{o.total}</span>
                      {o.customer_phone && (
                        <a href={`tel:${o.customer_phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#D1D5DB] transition-all">
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                    </div>
                    {isReady && (
                      <button onClick={() => advance(o.id, 'delivered')} disabled={advancing === o.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] text-white text-[12.5px] font-[600] rounded-xl hover:bg-[#15803D] active:scale-95 transition-all shadow-[0_2px_8px_rgba(22,163,74,0.25)] disabled:opacity-60">
                        {advancing === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Mark Delivered
                      </button>
                    )}
                    {!isReady && o.status !== 'delivered' && (
                      <span className="text-[11.5px] text-[#9CA3AF]">Waiting on restaurant</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
