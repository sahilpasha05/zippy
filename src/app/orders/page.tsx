'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Package, CheckCircle, XCircle, Truck, ChefHat, MapPin, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import SiteFooter from '@/components/layout/SiteFooter'

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
  order_type: string
  status: string
  total: number
  address: string | null
  created_at: string
  restaurants: Rel<{ name: string }>
  order_items: { name: string; quantity: number }[] | null
}

function restName(o: OrderRow): string | null {
  if (!o.restaurants) return null
  return Array.isArray(o.restaurants) ? o.restaurants[0]?.name ?? null : o.restaurants.name
}

function OrderCard({ order, eta }: { order: OrderRow; eta: number }) {
  const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  const isActive = !CLOSED.includes(order.status)
  const currentStep = STEPS.indexOf(order.status)

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

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F3F4F6]">
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#6B7280] min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{order.address ?? 'No address on file'}</span>
          </span>
          <Link href={`/orders/${order.id}/track`} className="flex items-center gap-1 text-[12.5px] font-medium text-[#16A34A] hover:text-[#15803D] transition-colors shrink-0">
            Details <ChevronRight className="w-3.5 h-3.5" />
          </Link>
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
  const eta = useDeliveryEta()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedIn(false); setLoading(false); return }

      // RLS already scopes this to the signed-in user; the filter keeps the
      // query honest about its intent rather than relying on the policy alone.
      const { data } = await supabase
        .from('orders')
        .select('id, order_type, status, total, address, created_at, restaurants(name), order_items(name, quantity)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setOrders((data as OrderRow[]) ?? [])
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
              shown.map((o) => <OrderCard key={o.id} order={o} eta={eta} />)
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
