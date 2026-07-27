'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { CheckCircle, ChefHat, Truck, AlertCircle, XCircle, Clock, Phone, Bike, Loader2, ChevronRight, MapPin } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import LiveTrackingMap, { type LatLng } from '@/components/LiveTrackingMap'
import { cn } from '@/lib/utils'
import SiteFooter from '@/components/layout/SiteFooter'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STEPS = [
  { key: 'confirmed',        label: 'Confirmed',   icon: AlertCircle },
  { key: 'preparing',        label: 'Preparing',   icon: ChefHat },
  { key: 'out_for_delivery', label: 'On the way',  icon: Truck },
  { key: 'delivered',        label: 'Delivered',   icon: CheckCircle },
]

type Order = {
  id: string; status: string; total: number; address: string | null
  delivery_latitude: number | null; delivery_longitude: number | null
  delivery_partner_id: string | null
  restaurants: { name: string } | { name: string }[] | null
}
type Partner = {
  id: string; name: string; phone: string | null; vehicle_type: string | null; vehicle_number: string | null
  current_latitude: number | null; current_longitude: number | null; last_location_at: string | null
}

const STALE_MS = 2 * 60 * 1000 // rider dot considered stale after 2 min without an update

function restName(o: Order) {
  if (!o.restaurants) return null
  return Array.isArray(o.restaurants) ? o.restaurants[0]?.name : o.restaurants.name
}

export default function TrackOrderPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const loadOrder = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, address, delivery_latitude, delivery_longitude, delivery_partner_id, restaurants(name)')
      .eq('id', id)
      .single()
    if (!data) { setNotFound(true); return null }
    setOrder(data as unknown as Order)
    return data as unknown as Order
  }, [id])

  const loadPartner = useCallback(async (partnerId: string) => {
    const { data } = await supabase
      .from('delivery_partners')
      .select('id, name, phone, vehicle_type, vehicle_number, current_latitude, current_longitude, last_location_at')
      .eq('id', partnerId)
      .single()
    setPartner((data as Partner) ?? null)
  }, [])

  useEffect(() => {
    let orderChannel: ReturnType<typeof supabase.channel> | null = null
    let partnerChannel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function init() {
      const o = await loadOrder()
      setLoading(false)
      if (!o || cancelled) return
      if (o.delivery_partner_id) await loadPartner(o.delivery_partner_id)

      orderChannel = supabase
        .channel(`track-order-${id}-${Date.now()}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, async (payload) => {
          const updated = payload.new as Order
          setOrder((prev) => prev ? { ...prev, ...updated } : updated)
          if (updated.delivery_partner_id && updated.delivery_partner_id !== partner?.id) {
            await loadPartner(updated.delivery_partner_id)
          }
        })
        .subscribe()

      if (o.delivery_partner_id) {
        partnerChannel = supabase
          .channel(`track-partner-${o.delivery_partner_id}-${Date.now()}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_partners', filter: `id=eq.${o.delivery_partner_id}` }, (payload) => {
            setPartner(payload.new as Partner)
          })
          .subscribe()
      }
    }
    init()

    return () => {
      cancelled = true
      if (orderChannel) supabase.removeChannel(orderChannel)
      if (partnerChannel) supabase.removeChannel(partnerChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" />
      </div>
    </>
  )

  if (notFound || !order) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <p className="text-[16px] font-semibold text-[#374151]">Order not found</p>
        <Link href="/orders" className="text-[13px] text-[#16A34A]">← Back to your orders</Link>
      </div>
    </>
  )

  const currentStepIdx = STEPS.findIndex((s) => s.key === order.status)
  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'

  const dropLocation: LatLng | null = order.delivery_latitude && order.delivery_longitude
    ? { lat: order.delivery_latitude, lng: order.delivery_longitude } : null
  const riderStale = !!(partner?.last_location_at && Date.now() - new Date(partner.last_location_at).getTime() > STALE_MS)
  const riderLocation: LatLng | null = partner?.current_latitude && partner?.current_longitude
    ? { lat: partner.current_latitude, lng: partner.current_longitude } : null

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-[12.5px] text-[#6B7280] mb-4">
            <Link href="/orders" className="hover:text-[#16A34A]">Your Orders</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#111827]">Track</span>
          </div>

          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[19px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>
                {restName(order) ?? 'Your Order'}
              </h1>
              <p className="text-[12.5px] text-[#9CA3AF] font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span className="text-[15px] font-[800] text-[#111827]">₹{order.total}</span>
          </div>

          {isCancelled ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[13px] text-[#DC2626] mb-5">
              <XCircle className="w-4 h-4" /> This order was cancelled.
            </div>
          ) : (
            <div className="flex items-center justify-between mb-6 px-2">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const done = i <= currentStepIdx
                return (
                  <div key={s.key} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && <div className={cn('absolute top-4 right-1/2 w-full h-0.5', done ? 'bg-[#16A34A]' : 'bg-[#E5E7EB]')} style={{ left: '-50%' }} />}
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0', done ? 'bg-[#16A34A] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]')}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={cn('text-[10.5px] mt-1.5 font-medium text-center', done ? 'text-[#16A34A]' : 'text-[#9CA3AF]')}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {!isCancelled && !isDelivered && (
            <>
              {order.delivery_partner_id ? (
                <>
                  <LiveTrackingMap riderLocation={riderLocation} dropLocation={dropLocation} riderStale={riderStale} className="h-72 mb-4" />
                  {partner && (
                    <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-5 shadow-zippy-sm">
                      <div className="w-11 h-11 bg-[#F5F3FF] rounded-xl flex items-center justify-center shrink-0">
                        <Bike className="w-5 h-5 text-[#7C3AED]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-[700] text-[#111827] truncate">{partner.name}</p>
                        <p className="text-[11.5px] text-[#9CA3AF] capitalize">{partner.vehicle_type ?? 'Rider'}{partner.vehicle_number ? ` · ${partner.vehicle_number}` : ''}</p>
                      </div>
                      {partner.phone && (
                        <a href={`tel:${partner.phone}`}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F0FDF4] text-[#16A34A] rounded-xl text-[12.5px] font-[600] hover:bg-[#DCFCE7] transition-all shrink-0">
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center mb-5">
                  <Bike className="w-8 h-8 text-[#D1D5DB]" />
                  <p className="text-[13.5px] font-semibold text-[#374151]">Waiting for a delivery partner to be assigned</p>
                  <p className="text-[12px] text-[#9CA3AF]">Live tracking will appear here the moment a rider picks up your order.</p>
                </div>
              )}
            </>
          )}

          {order.address && (
            <div className="flex items-start gap-2 bg-white rounded-2xl border border-[#E5E7EB] p-4 text-[12.5px]">
              <MapPin className="w-4 h-4 text-[#16A34A] mt-0.5 shrink-0" />
              <div>
                <p className="font-[600] text-[#111827] mb-0.5">Delivering to</p>
                <p className="text-[#6B7280]">{order.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
