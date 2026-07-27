'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Search, Clock, ChefHat, Truck, CheckCircle, XCircle, AlertCircle, RefreshCw, Bike, Zap } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending:          { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6', icon: Clock },
  confirmed:        { label: 'Confirmed',   color: '#0891B2', bg: '#ECFEFF', icon: AlertCircle },
  preparing:        { label: 'Preparing',   color: '#D97706', bg: '#FFFBEB', icon: ChefHat },
  out_for_delivery: { label: 'On the way',  color: '#7C3AED', bg: '#F5F3FF', icon: Truck },
  delivered:        { label: 'Delivered',   color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  cancelled:        { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
}

const TABS = ['All', 'Active', 'Unassigned', 'Preparing', 'Delivered', 'Cancelled']

type Order = {
  id: string; status: string; total: number; customer_name: string | null
  placed_at: string; address: string | null; payment_method: string | null
  delivery_partner_id: string | null
  restaurants: { name: string } | null
}
type Partner = { id: string; name: string; is_active: boolean }

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('All')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [autoAssignPartner, setAutoAssignPartner] = useState('')
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [autoAssignMsg, setAutoAssignMsg] = useState('')

  const load = useCallback(async () => {
    const [{ data: ords }, { data: parts }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, status, total, customer_name, placed_at, address, payment_method, delivery_partner_id, restaurants(name)')
        // Delivered orders older than 24h drop off this view (still fully queryable in Analytics — nothing is deleted)
        .or(`status.neq.delivered,placed_at.gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`)
        .order('placed_at', { ascending: false })
        .limit(100),
      supabase.from('delivery_partners').select('id, name, is_active').order('name'),
    ])
    setOrders((ords as unknown as Order[]) ?? [])
    setPartners((parts as Partner[]) ?? [])
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function assignOrder(orderId: string, partnerId: string) {
    await supabase.from('orders').update({ delivery_partner_id: partnerId || null }).eq('id', orderId)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, delivery_partner_id: partnerId || null } : o))
  }

  async function autoAssign() {
    if (!autoAssignPartner) return
    setAutoAssigning(true)
    const unassignedIds = orders
      .filter((o) => !o.delivery_partner_id && !['delivered', 'cancelled'].includes(o.status))
      .map((o) => o.id)
    if (unassignedIds.length === 0) { setAutoAssigning(false); setAutoAssignMsg('No unassigned orders'); setTimeout(() => setAutoAssignMsg(''), 2000); return }
    await supabase.from('orders').update({ delivery_partner_id: autoAssignPartner }).in('id', unassignedIds)
    setOrders((prev) => prev.map((o) => unassignedIds.includes(o.id) ? { ...o, delivery_partner_id: autoAssignPartner } : o))
    setAutoAssigning(false)
    setAutoAssignMsg(`Assigned ${unassignedIds.length} order${unassignedIds.length !== 1 ? 's' : ''}!`)
    setTimeout(() => setAutoAssignMsg(''), 2500)
  }

  const filtered = orders.filter((o) => {
    const matchTab =
      tab === 'All'        ? true :
      tab === 'Active'     ? !['delivered','cancelled'].includes(o.status) :
      tab === 'Unassigned' ? !o.delivery_partner_id && !['delivered','cancelled'].includes(o.status) :
      tab === 'Preparing'  ? o.status === 'preparing' :
      tab === 'Delivered'  ? o.status === 'delivered' :
      tab === 'Cancelled'  ? o.status === 'cancelled' : true
    const q = search.toLowerCase()
    const matchSearch = !q || (o.customer_name ?? '').toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const activeCnt = orders.filter((o) => !['delivered','cancelled'].includes(o.status)).length
  const unassignedCnt = orders.filter((o) => !o.delivery_partner_id && !['delivered','cancelled'].includes(o.status)).length
  const partnerName = (id: string | null) => partners.find((p) => p.id === id)?.name

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>All Orders</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">
                {activeCnt} active · {unassignedCnt} unassigned · last updated {timeAgo(lastRefresh.toISOString())}
                <span className="ml-2 inline-flex items-center gap-1 text-[#16A34A] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse inline-block" /> Live
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#7C3AED] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by customer or order ID..."
                  className="bg-transparent text-[13px] outline-none w-48 placeholder:text-[#9CA3AF]" />
              </div>
              <button onClick={load} className="w-9 h-9 flex items-center justify-center border border-[#E5E7EB] rounded-xl text-[#6B7280] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Auto-assign toolbar */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl">
            <Bike className="w-4 h-4 text-[#7C3AED] shrink-0" />
            <span className="text-[12.5px] text-[#5B21B6] font-medium shrink-0">Auto-assign</span>
            <select value={autoAssignPartner} onChange={(e) => setAutoAssignPartner(e.target.value)}
              className="flex-1 max-w-[220px] px-3 py-1.5 border border-[#DDD6FE] rounded-lg text-[12.5px] bg-white outline-none focus:border-[#7C3AED]">
              <option value="">Select delivery partner...</option>
              {partners.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={autoAssign} disabled={!autoAssignPartner || autoAssigning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7C3AED] text-white text-[12px] font-[600] rounded-lg hover:bg-[#6D28D9] transition-all disabled:opacity-50">
              <Zap className="w-3.5 h-3.5" />
              {autoAssigning ? 'Assigning...' : `Assign all ${unassignedCnt} unassigned`}
            </button>
            {autoAssignMsg && <span className="text-[12px] text-[#16A34A] font-medium">{autoAssignMsg}</span>}
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-4 py-1.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-all shrink-0',
                  tab === t ? 'bg-[#7C3AED] text-white shadow-[0_2px_6px_rgba(124,58,237,0.3)]' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                {t}
                {t === 'Active' && activeCnt > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-[#EF4444] text-white text-[10px] rounded-full">{activeCnt}</span>
                )}
                {t === 'Unassigned' && unassignedCnt > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-[#EF4444] text-white text-[10px] rounded-full">{unassignedCnt}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-[#E5E7EB] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-24 gap-3 text-[#9CA3AF]">
              <CheckCircle className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No orders found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-zippy-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {['Order', 'Customer', 'Restaurant', 'Status', 'Rider', 'Total', 'Time'].map((h) => (
                      <th key={h} className="text-left text-[11.5px] font-[600] text-[#9CA3AF] px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFC]">
                  {filtered.map((o) => {
                    const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending
                    const Icon = cfg.icon
                    const restName = Array.isArray(o.restaurants) ? o.restaurants[0]?.name : (o.restaurants as { name: string } | null)?.name
                    const isFinal = ['delivered', 'cancelled'].includes(o.status)
                    return (
                      <tr key={o.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-5 py-3.5 text-[12px] font-mono text-[#6B7280]">{o.id.slice(0,8).toUpperCase()}</td>
                        <td className="px-5 py-3.5 text-[13px] font-[600] text-[#111827]">{o.customer_name ?? '—'}</td>
                        <td className="px-5 py-3.5 text-[12.5px] text-[#6B7280]">{restName ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full w-fit" style={{ background: cfg.bg, color: cfg.color }}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {isFinal ? (
                            <span className="text-[12px] text-[#9CA3AF]">{partnerName(o.delivery_partner_id) ?? '—'}</span>
                          ) : (
                            <select value={o.delivery_partner_id ?? ''} onChange={(e) => assignOrder(o.id, e.target.value)}
                              className={cn('px-2.5 py-1.5 border rounded-lg text-[12px] outline-none bg-white transition-all max-w-[150px]',
                                o.delivery_partner_id ? 'border-[#BBF7D0] text-[#16A34A] font-medium' : 'border-[#FECACA] text-[#DC2626]')}>
                              <option value="">Unassigned</option>
                              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] font-[700] text-[#111827]">₹{o.total}</td>
                        <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF]">{timeAgo(o.placed_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
