'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bike, CheckCircle, ChefHat, ChevronRight, Package, Truck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/store/cart'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import { showsBottomNav } from '@/components/layout/BottomNav'
import { cn } from '@/lib/utils'

// While a customer has an order in progress, a green pill floats above the
// bottom bar (and above the "View cart" pill). Tapping it opens a sheet with
// that order's live status, the same way the cart opens over the home screen.

type Rel<T> = T | T[] | null
type ActiveOrder = {
  id: string
  status: string
  total: number
  created_at: string
  payment_method: string | null
  payment_status: string | null
  online_amount: number | null
  delivery_partner_id: string | null
  restaurants: Rel<{ name: string }>
  delivery_partners: Rel<{ name: string }>
  order_items: { name: string; quantity: number }[] | null
}

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'out_for_delivery', label: 'On the way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
]

const HEADLINE: Record<string, { title: string; sub: string }> = {
  pending: { title: 'Order placed', sub: 'Waiting for confirmation' },
  confirmed: { title: 'Order confirmed', sub: 'Getting it ready' },
  preparing: { title: 'Preparing your order', sub: 'It will be packed shortly' },
  ready: { title: 'Packed and ready', sub: 'Waiting for the delivery partner' },
  out_for_delivery: { title: 'On the way', sub: 'Your delivery partner is heading to you' },
}

function one<T>(r: Rel<T>): T | null {
  return !r ? null : Array.isArray(r) ? r[0] ?? null : r
}

// An online order that was never paid (or failed) is not a real order yet.
function isRealOrder(o: ActiveOrder) {
  const unpaidOnline = (o.payment_status === 'pending' || o.payment_status === 'failed') && Number(o.online_amount ?? 0) > 0
  return !unpaidOnline
}

export default function ActiveOrderBar() {
  const pathname = usePathname()
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [open, setOpen] = useState(false)
  const eta = useDeliveryEta()
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))
  const cartOpen = useCartStore((s) => s.isOpen)

  const enabled = showsBottomNav(pathname) && pathname !== '/orders'

  useEffect(() => {
    if (!enabled) return
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setOrders([]); return }
      const { data } = await supabase
        .from('orders')
        .select('id, status, total, created_at, payment_method, payment_status, online_amount, delivery_partner_id, restaurants(name), delivery_partners(name), order_items(name, quantity)')
        .eq('user_id', user.id)
        .not('status', 'in', '(delivered,cancelled)')
        .order('created_at', { ascending: false })
        .limit(5)
      setOrders(((data as ActiveOrder[] | null) ?? []).filter(isRealOrder))
    }
    load()
    const refresh = () => { if (document.visibilityState === 'visible') load() }
    const timer = setInterval(refresh, 15000)
    document.addEventListener('visibilitychange', refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      sub.subscription.unsubscribe()
    }
  }, [enabled, pathname])

  if (!enabled || orders.length === 0) return null

  const latest = orders[0]
  const head = HEADLINE[latest.status] ?? HEADLINE.pending
  const pillTitle = orders.length > 1 ? `${orders.length} orders in progress` : head.title
  const pillSub = orders.length > 1 ? 'Tap to see them' : `${one(latest.restaurants)?.name ?? 'Zippy'} · ₹${Number(latest.total).toFixed(0)}`

  const hasCartPill = cartCount > 0 && !cartOpen
  const position = hasCartPill ? 'bottom-[132px] lg:bottom-[80px]' : 'bottom-[72px] lg:bottom-4'

  return (
    <>
      <div className={cn('fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none', position)}>
        <button
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex w-[min(100%,330px)] items-center gap-3 rounded-full bg-[#14532D] py-2 pl-2.5 pr-4 text-white shadow-[0_8px_24px_rgba(20,83,45,0.45)] active:scale-[0.98] transition-transform"
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            {latest.status === 'out_for_delivery' ? <Truck className="h-[18px] w-[18px]" /> : <ChefHat className="h-[18px] w-[18px]" />}
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#86EFAC] ring-2 ring-[#14532D] animate-pulse" />
          </span>
          <span className="min-w-0 flex-1 text-left leading-tight">
            <span className="block truncate text-[14px] font-[800]" style={{ fontWeight: 800 }}>{pillTitle}</span>
            <span className="block truncate text-[12px] text-white/80">{pillSub}</span>
          </span>
          <span className="flex items-center gap-0.5 text-[12.5px] font-[700]">View <ChevronRight className="h-4 w-4" /></span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-[#F0FDF4] sm:max-w-md sm:rounded-3xl">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="text-[17px] font-[800] text-[#14532D]" style={{ fontWeight: 800 }}>
                {orders.length > 1 ? 'Your orders in progress' : 'Your order'}
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#374151] shadow-sm">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto px-4 pb-5">
              {orders.map((o) => {
                const h = HEADLINE[o.status] ?? HEADLINE.pending
                const step = STEPS.findIndex((s) => s.key === o.status)
                const current = o.status === 'ready' ? 1 : step
                const rider = one(o.delivery_partners)
                const items = o.order_items ?? []
                return (
                  <div key={o.id} className="overflow-hidden rounded-2xl border border-[#BBF7D0] bg-white">
                    <div className="bg-gradient-to-r from-[#14532D] to-[#16A34A] px-4 py-3 text-white">
                      <p className="text-[16px] font-[800]" style={{ fontWeight: 800 }}>{h.title}</p>
                      <p className="text-[12.5px] text-white/85">
                        {o.status === 'out_for_delivery' ? `About ${eta} min away` : h.sub}
                      </p>
                    </div>

                    <div className="p-4">
                      <div className="mb-3 flex items-center">
                        {STEPS.map((s, i) => {
                          const Icon = s.icon
                          const done = i <= current
                          return (
                            <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
                              <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', done ? 'bg-[#16A34A] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]')}>
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="text-[10px] leading-tight text-[#6B7280]">{s.label}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="mb-3 flex items-start justify-between gap-3 text-[12.5px]">
                        <p className="min-w-0 text-[#374151]">
                          <span className="font-[700]">{one(o.restaurants)?.name ?? 'Zippy'}</span>
                          <span className="text-[#6B7280]"> · {items.map((i) => (i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name)).slice(0, 3).join(', ')}{items.length > 3 ? ` +${items.length - 3} more` : ''}</span>
                        </p>
                        <span className="shrink-0 font-[800] text-[#111827]" style={{ fontWeight: 800 }}>₹{Number(o.total).toFixed(0)}</span>
                      </div>

                      {rider && (
                        <p className="mb-3 flex items-center gap-2 rounded-xl bg-[#F0FDF4] px-3 py-2 text-[12.5px] text-[#14532D]">
                          <Bike className="h-4 w-4" /> <span><b>{rider.name}</b> is your delivery partner</span>
                        </p>
                      )}

                      <Link
                        href={`/orders/${o.id}/track`}
                        onClick={() => setOpen(false)}
                        className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#16A34A] py-2.5 text-[13.5px] font-[700] text-white active:scale-[0.99]"
                      >
                        Track order{rider ? ' and chat' : ''} <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
