'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Search, ChefHat, Truck, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Phone } from 'lucide-react'
import DairySidebar from '@/components/dairy/DairySidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof ChefHat; next?: string; nextLabel?: string }> = {
  pending:          { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6', icon: Clock,        next: 'confirmed',        nextLabel: 'Confirm Order' },
  confirmed:        { label: 'Confirmed',   color: '#0891B2', bg: '#ECFEFF', icon: AlertCircle,  next: 'preparing',        nextLabel: 'Start Packing' },
  preparing:        { label: 'Packing',     color: '#D97706', bg: '#FFFBEB', icon: ChefHat,      next: 'out_for_delivery', nextLabel: 'Ready for Pickup' },
  out_for_delivery: { label: 'With rider',  color: '#7C3AED', bg: '#F5F3FF', icon: Truck },
  delivered:        { label: 'Delivered',   color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  cancelled:        { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
}

const TABS = ['All', 'Active', 'Delivered', 'Cancelled']

type OrderItem = { name: string; quantity: number; price: number }
type Order = {
  id: string; status: string; total: number; customer_name: string | null
  customer_phone: string | null; placed_at: string; address: string | null
  order_items: OrderItem[]
}
type Partner = { id: string; name: string; slug: string }

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function DairyOrdersPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('All')
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadOrders = useCallback(async (partnerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, customer_name, customer_phone, placed_at, address, order_items(name, quantity, price)')
      .eq('grocery_partner_id', partnerId)
      .order('placed_at', { ascending: false })
      .limit(100)
    setOrders((data as Order[]) ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: part } = await supabase
        .from('grocery_partners').select('id, name, slug').eq('slug', slug).single()
      if (!part) { setLoading(false); return }
      setPartner(part as Partner)
      await loadOrders((part as Partner).id)
      setLoading(false)
    }
    init()
  }, [slug, loadOrders])

  // Live reload every 30 s
  useEffect(() => {
    if (!partner) return
    const id = setInterval(() => loadOrders(partner.id), 30000)
    return () => clearInterval(id)
  }, [partner, loadOrders])

  async function advanceStatus(order: Order) {
    const cfg = STATUS_CFG[order.status]
    if (!cfg?.next) return
    setAdvancing(order.id)
    const { error } = await supabase.from('orders').update({ status: cfg.next }).eq('id', order.id)
    if (!error) setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: cfg.next! } : o))
    setAdvancing(null)
  }

  const filtered = orders.filter((o) => {
    const matchSearch = !search || (o.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) || o.id.includes(search)
    const matchTab = tab === 'All' ? true
      : tab === 'Active' ? ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)
      : tab === 'Delivered' ? o.status === 'delivered'
      : o.status === 'cancelled'
    return matchSearch && matchTab
  })

  const activeCount = orders.filter((o) => ['pending', 'confirmed', 'preparing'].includes(o.status)).length

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <DairySidebar partner={partner} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Orders</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{orders.length} total · {activeCount > 0 && <span className="text-[#0891B2] font-medium">{activeCount} active</span>}</p>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#0891B2] transition-all">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or order ID..."
                className="bg-transparent text-[13px] outline-none w-44 placeholder:text-[#9CA3AF]" />
            </div>
          </div>
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-3.5 py-1.5 rounded-xl text-[12px] font-medium whitespace-nowrap transition-all',
                  tab === t ? 'bg-[#0891B2] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-[#0891B2] animate-spin" />
            </div>
          ) : !partner ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <p className="text-[15px] font-semibold text-[#374151]">Partner not found</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[#9CA3AF]">
              <Clock className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((o) => {
                const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending
                const Icon = cfg.icon
                const isExpanded = expanded === o.id
                const itemSummary = o.order_items?.map((i) => `${i.name} ×${i.quantity}`).join(', ') ?? ''

                return (
                  <div key={o.id} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm overflow-hidden">
                    {/* Order row */}
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : o.id)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                        <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[13px] font-[700] text-[#111827]">{o.customer_name ?? 'Customer'}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </div>
                        <p className="text-[11.5px] text-[#9CA3AF] truncate">{itemSummary}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[14px] font-[800] text-[#111827]">₹{o.total}</div>
                        <div className="text-[11px] text-[#9CA3AF]">{timeAgo(o.placed_at)}</div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-4 border-t border-[#F3F4F6]">
                        {/* Items */}
                        <div className="py-3 space-y-1.5">
                          {o.order_items?.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-[12.5px]">
                              <span className="text-[#374151]">{item.name} <span className="text-[#9CA3AF]">×{item.quantity}</span></span>
                              <span className="font-[600] text-[#111827]">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Delivery address */}
                        {o.address && (
                          <p className="text-[11.5px] text-[#6B7280] mb-3 flex items-start gap-1">
                            <span className="mt-0.5">📍</span> {o.address}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {o.customer_phone && (
                            <a href={`tel:${o.customer_phone}`}
                              className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#0891B2] hover:text-[#0891B2] transition-all">
                              <Phone className="w-3.5 h-3.5" /> Call Customer
                            </a>
                          )}
                          {cfg.next && (
                            <button onClick={() => advanceStatus(o)} disabled={advancing === o.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-[#0891B2] text-white text-[12px] font-[600] rounded-xl hover:bg-[#0E7490] transition-all disabled:opacity-60">
                              {advancing === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                              {cfg.nextLabel}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
