'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { CheckCircle, ChefHat, Truck, AlertCircle, XCircle, Clock, Phone, Bike, Loader2, ChevronRight, MapPin, Store } from 'lucide-react'
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

type OrderItem = { name: string; quantity: number; price: number; image_url: string | null }
type Order = {
  id: string; status: string; total: number; address: string | null
  delivery_latitude: number | null; delivery_longitude: number | null
  delivery_partner_id: string | null
  created_at: string; order_type: string
  delivery_fee: number | null; discount: number | null
  payment_method: string | null; payment_status: string | null
  restaurants: { name: string; phone: string | null; address: string | null } | { name: string; phone: string | null; address: string | null }[] | null
  order_items: OrderItem[] | null
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

function restPhone(o: Order) {
  if (!o.restaurants) return null
  return Array.isArray(o.restaurants) ? o.restaurants[0]?.phone ?? null : o.restaurants.phone
}

function restAddress(o: Order) {
  if (!o.restaurants) return null
  return Array.isArray(o.restaurants) ? o.restaurants[0]?.address ?? null : o.restaurants.address
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
      .select('id, status, total, address, delivery_latitude, delivery_longitude, delivery_partner_id, created_at, order_type, delivery_fee, discount, payment_method, payment_status, restaurants(name, phone, address), order_items(name, quantity, price, image_url)')
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

  const items = order.order_items ?? []
  const itemsSubtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0)
  const otherCharges = Math.max(
    0,
    Number(order.total) - itemsSubtotal - Number(order.delivery_fee ?? 0) + Number(order.discount ?? 0)
  )

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

          <div className="flex items-center justify-between mb-5 gap-3">
            <div className="min-w-0">
              <h1 className="text-[19px] font-[800] text-[#111827] truncate" style={{ fontWeight: 800 }}>
                {restName(order) ?? 'Your Order'}
              </h1>
              <p className="text-[12.5px] text-[#9CA3AF] font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {restPhone(order) && (
                <a href={`tel:${restPhone(order)}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#F0FDF4] text-[#16A34A] rounded-xl text-[12px] font-[600] hover:bg-[#DCFCE7] transition-all">
                  <Phone className="w-3.5 h-3.5" /> Call restaurant
                </a>
              )}
              <span className="text-[15px] font-[800] text-[#111827]">₹{order.total}</span>
            </div>
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

          {items.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
              <p className="text-[13px] font-[700] text-[#111827] mb-3">Order details</p>
              <div className="space-y-2.5">
                {items.map((it, i) => (
                  <div key={`${it.name}-${i}`} className="flex items-start justify-between gap-3 text-[12.5px]">
                    <span className="text-[#374151] min-w-0">
                      <span className="text-[#9CA3AF] font-mono mr-1.5">{it.quantity}×</span>
                      {it.name}
                    </span>
                    <span className="text-[#111827] font-[600] shrink-0">
                      {Number(it.price) === 0 ? 'FREE' : `₹${(Number(it.price) * it.quantity).toFixed(0)}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#F3F4F6] space-y-1.5 text-[12.5px]">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Items subtotal</span><span>₹{itemsSubtotal.toFixed(0)}</span>
                </div>
                {order.discount ? (
                  <div className="flex justify-between text-[#16A34A]"><span>Discount</span><span>−₹{Number(order.discount).toFixed(0)}</span></div>
                ) : null}
                {order.delivery_fee ? (
                  <div className="flex justify-between text-[#6B7280]"><span>Delivery fee</span><span>₹{Number(order.delivery_fee).toFixed(0)}</span></div>
                ) : null}
                {/* Whatever the recorded lines don't account for — today that's the
                    platform fee, which has no column of its own until the migration runs. */}
                {otherCharges > 0 && (
                  <div className="flex justify-between text-[#6B7280]"><span>Other charges</span><span>₹{otherCharges.toFixed(0)}</span></div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-[#F3F4F6] text-[14px] font-[800] text-[#111827]">
                  <span>Total paid</span><span>₹{Number(order.total).toFixed(0)}</span>
                </div>
              </div>
              <p className="text-[11.5px] text-[#9CA3AF] mt-3 capitalize">
                {order.payment_method ?? '—'} · {order.payment_status ?? 'pending'} · placed {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}

          {(restName(order) || restAddress(order)) && (
            <div className="flex items-start gap-2 bg-white rounded-2xl border border-[#E5E7EB] p-4 text-[12.5px] mb-4">
              <Store className="w-4 h-4 text-[#16A34A] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-[600] text-[#111827] mb-0.5">{restName(order) ?? 'Restaurant'}</p>
                {restAddress(order) && <p className="text-[#6B7280]">{restAddress(order)}</p>}
                {restPhone(order) && (
                  <a href={`tel:${restPhone(order)}`} className="text-[#16A34A] font-[600] hover:underline">{restPhone(order)}</a>
                )}
              </div>
            </div>
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
