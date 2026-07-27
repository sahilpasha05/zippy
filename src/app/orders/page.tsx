'use client'

import { useState } from 'react'
import { Package, Clock, CheckCircle, XCircle, Truck, ChefHat, MapPin, ChevronRight, Star } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'

const STATUS_CONFIG = {
  pending:          { label: 'Order Placed',     icon: Package,     color: '#6B7280', bg: '#F3F4F6' },
  confirmed:        { label: 'Confirmed',         icon: CheckCircle, color: '#0891B2', bg: '#ECFEFF' },
  preparing:        { label: 'Preparing',         icon: ChefHat,     color: '#D97706', bg: '#FFFBEB' },
  out_for_delivery: { label: 'On the Way',        icon: Truck,       color: '#7C3AED', bg: '#F5F3FF' },
  delivered:        { label: 'Delivered',         icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
  cancelled:        { label: 'Cancelled',         icon: XCircle,     color: '#DC2626', bg: '#FEF2F2' },
}

const MOCK_ORDERS = [
  {
    id: 'ORD-8842', type: 'grocery', status: 'out_for_delivery', total: 387, items: 5,
    address: 'Koramangala, Bangalore', createdAt: '2026-07-27T10:22:00Z',
    eta: '5 min away', products: ['Organic Bananas', 'Red Tomatoes', 'Amul Butter', '+2 more'],
  },
  {
    id: 'ORD-8801', type: 'restaurant', status: 'delivered', total: 649, items: 2,
    address: 'Koramangala, Bangalore', createdAt: '2026-07-26T19:14:00Z',
    eta: null, products: ['Hyderabadi Chicken Dum Biryani', 'Seekh Kebab (6 pcs)'],
    restaurant: 'The Biryani House',
  },
  {
    id: 'ORD-8755', type: 'grocery', status: 'delivered', total: 220, items: 3,
    address: 'Koramangala, Bangalore', createdAt: '2026-07-25T08:45:00Z',
    eta: null, products: ['Fresh Spinach', 'Dahi Curd', 'Britannia Bread'],
  },
]

function OrderCard({ order }: { order: typeof MOCK_ORDERS[0] }) {
  const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]
  const Icon = config.icon
  const isActive = !['delivered', 'cancelled'].includes(order.status)

  const STEPS = ['confirmed', 'preparing', 'out_for_delivery', 'delivered']
  const currentStep = STEPS.indexOf(order.status)

  return (
    <div className={cn(
      'bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-zippy',
      isActive ? 'border-[#16A34A] shadow-zippy-sm' : 'border-[#E5E7EB]'
    )}>
      {/* Active order banner */}
      {isActive && (
        <div className="bg-[#DCFCE7] px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#16A34A] rounded-full animate-pulse" />
            <span className="text-[13px] font-semibold text-[#14532D]">Live tracking active</span>
          </div>
          {order.eta && (
            <span className="text-[12px] font-bold text-[#16A34A] flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> {order.eta}
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-mono font-bold text-[#374151]">{order.id}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: config.bg, color: config.color }}>
                {config.label}
              </span>
            </div>
            <p className="text-[12.5px] text-[#9CA3AF]">
              {order.type === 'restaurant' && order.restaurant ? `${order.restaurant} · ` : ''}
              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>₹{order.total}</div>
            <div className="text-[12px] text-[#9CA3AF]">{order.items} items</div>
          </div>
        </div>

        {/* Items preview */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {order.products.map((p) => (
            <span key={p} className="text-[12px] text-[#374151] bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-lg">{p}</span>
          ))}
        </div>

        {/* Progress bar for active orders */}
        {isActive && order.status !== 'cancelled' && (
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
                    {i < STEPS.length - 1 && (
                      <div className="absolute" />
                    )}
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#6B7280]">
            <MapPin className="w-3.5 h-3.5" /> {order.address}
          </span>
          <div className="flex items-center gap-2">
            {order.status === 'delivered' && (
              <button className="flex items-center gap-1 text-[12.5px] font-medium text-[#D97706] hover:text-[#B45309] transition-colors">
                <Star className="w-3.5 h-3.5" /> Rate
              </button>
            )}
            <Link href={`/orders/${order.id}`} className="flex items-center gap-1 text-[12.5px] font-medium text-[#16A34A] hover:text-[#15803D] transition-colors">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [tab, setTab] = useState<'active' | 'past'>('active')
  const active = MOCK_ORDERS.filter((o) => !['delivered', 'cancelled'].includes(o.status))
  const past = MOCK_ORDERS.filter((o) => ['delivered', 'cancelled'].includes(o.status))

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

          {/* Tabs */}
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
            {(tab === 'active' ? active : past).length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 bg-white rounded-2xl border border-[#E5E7EB]">
                <span className="text-5xl">{tab === 'active' ? '🛵' : '📦'}</span>
                <p className="font-semibold text-[#374151]">{tab === 'active' ? 'No active orders' : 'No past orders'}</p>
                <Link href="/">
                  <button className="px-5 py-2.5 bg-[#16A34A] text-white text-[13px] font-semibold rounded-xl hover:bg-[#15803D] transition-colors">Start shopping</button>
                </Link>
              </div>
            ) : (
              (tab === 'active' ? active : past).map((o) => <OrderCard key={o.id} order={o} />)
            )}
          </div>
        </div>
      </div>
    </>
  )
}
