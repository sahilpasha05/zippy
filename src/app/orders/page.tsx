'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Package, CheckCircle, XCircle, Truck, ChefHat, MapPin, ChevronRight, Loader2, Star, Phone, Bike, RotateCcw, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import ReviewModal from '@/components/ReviewModal'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import SiteFooter from '@/components/layout/SiteFooter'
import CartConflictDialog from '@/components/CartConflictDialog'
import { useCartStore, conflictsWithCart } from '@/lib/store/cart'
import type { CartItem } from '@/types'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_CONFIG = {
  pending:          { label: 'Order Placed', icon: Package,     color: '#6B7280', bg: '#F3F4F6' },
  confirmed:        { label: 'Confirmed',    icon: CheckCircle, color: '#0891B2', bg: '#ECFEFF' },
  preparing:        { label: 'Preparing',    icon: ChefHat,     color: '#D97706', bg: '#FFFBEB' },
  ready:            { label: 'Ready',        icon: ChefHat,     color: '#D97706', bg: '#FFFBEB' },
  out_for_delivery: { label: 'On the Way',   icon: Truck,       color: '#7C3AED', bg: '#F5F3FF' },
  delivered:        { label: 'Delivered',    icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
  cancelled:        { label: 'Cancelled',    icon: XCircle,     color: '#DC2626', bg: '#FEF2F2' },
}

const STEPS = ['confirmed', 'preparing', 'out_for_delivery', 'delivered']
const CLOSED = ['delivered', 'cancelled']

// Supabase types an embedded to-one relation as either an object or an array
// depending on how it infers the FK, so both shapes have to be unwrapped.
type Rel<T> = T | T[] | null
type OrderRow = {
  id: string
  restaurant_id: string | null
  delivery_partner_id: string | null
  reviews: { id: string }[] | null
  order_type: string
  status: string
  total: number
  address: string | null
  created_at: string
  restaurants: Rel<{ name: string }>
  delivery_partners: Rel<{ name: string; phone: string | null }> | null
  order_items: { name: string; quantity: number }[] | null
}

function restName(o: OrderRow): string | null {
  if (!o.restaurants) return null
  return Array.isArray(o.restaurants) ? o.restaurants[0]?.name ?? null : o.restaurants.name
}

function riderInfo(o: OrderRow): { name: string; phone: string | null } | null {
  if (!o.delivery_partners) return null
  return Array.isArray(o.delivery_partners) ? o.delivery_partners[0] ?? null : o.delivery_partners
}

function OrderCard({ order, eta, onReview, onReorder, reordering }: { order: OrderRow; eta: number; onReview: (o: OrderRow) => void; onReorder: (o: OrderRow) => void; reordering: boolean }) {
  const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  const isActive = !CLOSED.includes(order.status)
  const currentStep = STEPS.indexOf(order.status)
  const rider = riderInfo(order)

  const items = order.order_items ?? []
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0)
  const preview = items.slice(0, 3)
  const extra = items.length - preview.length

  return (
    <div className={cn(
      'bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-zippy',
      isActive ? 'border-[#16A34A] shadow-zippy-sm' : 'border-[#E5E7EB]'
    )}>
      {isActive && (
        <div className="bg-[#DCFCE7] px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#16A34A] rounded-full animate-pulse" />
            <span className="text-[13px] font-semibold text-[#14532D]">Live tracking active</span>
          </div>
          {order.status === 'out_for_delivery' && (
            <span className="text-[12px] font-bold text-[#16A34A] flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> ~{eta} min away
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[13px] font-mono font-bold text-[#374151]">#{order.id.slice(0, 8).toUpperCase()}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: config.bg, color: config.color }}>
                {config.label}
              </span>
            </div>
            <p className="text-[12.5px] text-[#9CA3AF]">
              {restName(order) ? `${restName(order)} · ` : ''}
              {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>₹{Number(order.total).toFixed(0)}</div>
            <div className="text-[12px] text-[#9CA3AF]">{totalUnits} item{totalUnits === 1 ? '' : 's'}</div>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {preview.map((p, i) => (
              <span key={`${p.name}-${i}`} className="text-[12px] text-[#374151] bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-lg">
                {p.quantity > 1 ? `${p.name} × ${p.quantity}` : p.name}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[12px] text-[#6B7280] bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-lg">+{extra} more</span>
            )}
          </div>
        )}

        {isActive && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, i) => {
                const StepCfg = STATUS_CONFIG[step as keyof typeof STATUS_CONFIG]
                const StepIcon = StepCfg.icon
                const done = i <= currentStep
                return (
                  <div key={step} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center transition-all', done ? 'bg-[#16A34A] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]')}>
                      <StepIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-center text-[#6B7280] leading-tight">{StepCfg.label}</span>
                  </div>
                )
              })}
            </div>
            <div className="relative h-1 bg-[#E5E7EB] rounded-full mt-1">
              <div
                className="absolute left-0 top-0 h-full bg-[#16A34A] rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {order.delivery_partner_id && rider && (
          <div className="flex items-center gap-3 mb-3 px-3.5 py-2.5 bg-[#F5F3FF] rounded-xl">
            <div className="w-8 h-8 bg-[#EDE9FE] rounded-xl flex items-center justify-center shrink-0">
              <Bike className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-[700] text-[#4C1D95] truncate">{rider.name}</p>
              <p className="text-[11px] text-[#7C3AED]">Delivery partner assigned</p>
            </div>
            {rider.phone && (
              <a href={`tel:${rider.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7C3AED] text-white text-[12px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all shrink-0">
                <Phone className="w-3 h-3" /> Call
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F3F4F6]">
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#6B7280] min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{order.address ?? 'No address on file'}</span>
          </span>
          <div className="flex items-center gap-3 shrink-0">
            {order.status === 'delivered' && (
              order.reviews?.length ? (
                <span className="flex items-center gap-1 text-[12.5px] font-medium text-[#D97706]">
                  <Star className="w-3.5 h-3.5 fill-[#D97706]" /> Reviewed
                </span>
              ) : (
                <button onClick={() => onReview(order)}
                  className="flex items-center gap-1 text-[12.5px] font-medium text-[#D97706] hover:text-[#B45309] transition-colors">
                  <Star className="w-3.5 h-3.5" /> Write a review
                </button>
              )
            )}
            <Link href={`/orders/${order.id}/track`} className="flex items-center gap-1 text-[12.5px] font-medium text-[#16A34A] hover:text-[#15803D] transition-colors">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            {!isActive && (
              <button
                onClick={() => onReorder(order)}
                disabled={reordering}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#16A34A] text-white text-[12.5px] font-[700] hover:bg-[#15803D] disabled:opacity-60 active:scale-95 transition-all"
              >
                {reordering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Order again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [tab, setTab] = useState<'active' | 'past'>('active')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(true)
  const [reviewing, setReviewing] = useState<OrderRow | null>(null)
  const eta = useDeliveryEta()
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingReplace, setPendingReplace] = useState<Omit<CartItem, 'id'>[] | null>(null)
  const { items: cartItems, addItem, clearCart, openCart } = useCartStore()

  // Order again: put the same items back in the cart at today's prices. Items
  // that are gone or sold out are skipped, and a closed restaurant is refused.
  async function reorder(order: OrderRow) {
    setReorderingId(order.id)
    setNotice(null)
    try {
      const { data: lines } = await supabase.from('order_items').select('product_id, product_type, quantity').eq('order_id', order.id)
      const rows = (lines as { product_id: string | null; product_type: 'grocery' | 'restaurant' | null; quantity: number }[] | null) ?? []
      const groceryIds = rows.filter((r) => r.product_id && r.product_type === 'grocery').map((r) => r.product_id!)
      const dishIds = rows.filter((r) => r.product_id && r.product_type === 'restaurant').map((r) => r.product_id!)

      if (order.restaurant_id) {
        const { data: rest } = await supabase.from('restaurants').select('name, is_open, is_active').eq('id', order.restaurant_id).maybeSingle()
        if (!rest || !rest.is_active || !rest.is_open) {
          setNotice(`${rest?.name ?? restName(order) ?? 'This restaurant'} is closed right now, so this order can't be repeated yet.`)
          return
        }
      }

      const [groceries, dishes] = await Promise.all([
        groceryIds.length
          ? supabase.from('grocery_products').select('id, name, price, image_url, in_stock, is_active').in('id', groceryIds)
          : Promise.resolve({ data: [] as { id: string; name: string; price: number; image_url: string | null; in_stock: boolean; is_active: boolean }[] }),
        dishIds.length
          ? supabase.from('restaurant_products').select('id, name, price, image_url, is_available').in('id', dishIds)
          : Promise.resolve({ data: [] as { id: string; name: string; price: number; image_url: string | null; is_available: boolean }[] }),
      ])
      const g = new Map((groceries.data ?? []).map((p) => [p.id, p]))
      const d = new Map((dishes.data ?? []).map((p) => [p.id, p]))

      const drafts: Omit<CartItem, 'id'>[] = []
      let skipped = 0
      for (const r of rows) {
        if (!r.product_id || !r.product_type) { skipped++; continue }
        const p = r.product_type === 'grocery' ? g.get(r.product_id) : d.get(r.product_id)
        const available = p && (r.product_type === 'grocery' ? (p as { in_stock: boolean; is_active: boolean }).in_stock && (p as { is_active: boolean }).is_active : (p as { is_available: boolean }).is_available)
        if (!p || !available) { skipped++; continue }
        drafts.push({
          product_id: p.id,
          product_type: r.product_type,
          restaurant_id: r.product_type === 'restaurant' ? order.restaurant_id : null,
          name: p.name,
          image_url: p.image_url,
          price: Number(p.price),
          quantity: Math.max(1, r.quantity),
        })
      }

      if (drafts.length === 0) { setNotice("None of the items from that order are available right now."); return }
      if (skipped > 0) setNotice(`${skipped} item${skipped === 1 ? ' is' : 's are'} no longer available and ${skipped === 1 ? 'was' : 'were'} left out.`)

      if (conflictsWithCart(cartItems, drafts[0].restaurant_id)) { setPendingReplace(drafts); return }
      applyDrafts(drafts, false)
    } finally {
      setReorderingId(null)
    }
  }

  function applyDrafts(drafts: Omit<CartItem, 'id'>[], replace: boolean) {
    if (replace) clearCart()
    for (const dft of drafts) for (let i = 0; i < dft.quantity; i++) addItem({ ...dft, quantity: 1 })
    setPendingReplace(null)
    openCart()
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedIn(false); setLoading(false); return }

      // RLS already scopes this to the signed-in user; the filter keeps the
      // query honest about its intent rather than relying on the policy alone.
      const { data } = await supabase
        .from('orders')
        .select('id, order_type, status, total, address, created_at, restaurant_id, delivery_partner_id, restaurants(name), delivery_partners(name, phone), order_items(name, quantity), reviews(id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const loaded = (data as OrderRow[]) ?? []
      setOrders(loaded)
      // Landing here from "Order Again": show past orders unless something is in progress.
      setTab(loaded.some((o) => !CLOSED.includes(o.status)) ? 'active' : 'past')
      setLoading(false)
    }
    load()
  }, [])

  const active = orders.filter((o) => !CLOSED.includes(o.status))
  const past = orders.filter((o) => CLOSED.includes(o.status))
  const shown = tab === 'active' ? active : past

  return (
    <>
      <Navbar />
      <CartSidebar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[900px] mx-auto px-6 py-8">
          <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-6">
            <Link href="/" className="hover:text-[#16A34A]">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#111827] font-medium">My Orders</span>
          </div>

          <h1 className="text-[28px] font-[800] text-[#111827] mb-6" style={{ fontWeight: 800 }}>My Orders</h1>

          {notice && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#92400E]">
              <span className="flex-1">{notice}</span>
              <button onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 text-[#B45309]"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="flex gap-1 p-1 bg-[#F3F4F6] rounded-xl w-fit mb-8">
            {([['active', `Active (${active.length})`], ['past', `Past (${past.length})`]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn('px-5 py-2 rounded-lg text-[13.5px] font-medium transition-all', tab === key ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
                <Loader2 className="w-7 h-7 text-[#16A34A] animate-spin" />
              </div>
            ) : !signedIn ? (
              <div className="flex flex-col items-center gap-4 py-20 bg-white rounded-2xl border border-[#E5E7EB]">
                <span className="text-5xl">🔒</span>
                <p className="font-semibold text-[#374151]">Log in to see your orders</p>
                <Link href="/">
                  <button className="px-5 py-2.5 bg-[#16A34A] text-white text-[13px] font-semibold rounded-xl hover:bg-[#15803D] transition-colors">Go to home</button>
                </Link>
              </div>
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 bg-white rounded-2xl border border-[#E5E7EB]">
                <span className="text-5xl">{tab === 'active' ? '🛵' : '📦'}</span>
                <p className="font-semibold text-[#374151]">{tab === 'active' ? 'No active orders' : 'No past orders'}</p>
                <Link href="/">
                  <button className="px-5 py-2.5 bg-[#16A34A] text-white text-[13px] font-semibold rounded-xl hover:bg-[#15803D] transition-colors">Start shopping</button>
                </Link>
              </div>
            ) : (
              shown.map((o) => <OrderCard key={o.id} order={o} eta={eta} onReview={setReviewing} onReorder={reorder} reordering={reorderingId === o.id} />)
            )}
          </div>
        </div>
      </div>
      {pendingReplace && (
        <CartConflictDialog onCancel={() => setPendingReplace(null)} onReplace={() => applyDrafts(pendingReplace, true)} />
      )}
      {reviewing && (
        <ReviewModal
          orderId={reviewing.id}
          restaurantId={reviewing.restaurant_id}
          restaurantName={restName(reviewing)}
          onClose={() => setReviewing(null)}
          onSaved={() => {
            setOrders((prev) => prev.map((o) => o.id === reviewing.id ? { ...o, reviews: [{ id: 'new' }] } : o))
            setReviewing(null)
          }}
        />
      )}
      <SiteFooter />
    </>
  )
}
