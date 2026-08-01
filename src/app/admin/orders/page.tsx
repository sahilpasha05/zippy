'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Search, Clock, ChefHat, Truck, CheckCircle, XCircle, AlertCircle, RefreshCw, Bike, Zap, ChevronRight, ChevronDown, Phone, MapPin, CreditCard, Package, ExternalLink } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import LiveTrackingMap from '@/components/LiveTrackingMap'
import { cn, formatMoney } from '@/lib/utils'

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

type OrderItem = { name: string; quantity: number; price: number; image_url: string | null }
type Order = {
  id: string; status: string; total: number; customer_name: string | null; customer_phone: string | null
  placed_at: string; address: string | null; payment_method: string | null; payment_status: string | null
  online_amount: number | null; cod_amount: number | null; cash_collected_at: string | null
  notes: string | null
  order_type: string | null
  delivery_partner_id: string | null; grocery_partner_id: string | null; store_partner_id: string | null
  delivery_latitude: number | null; delivery_longitude: number | null
  restaurants: { name: string } | null
  order_items: OrderItem[]
}
type Partner = { id: string; name: string; is_active: boolean }

const PAYMENT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  paid:            { label: 'Paid',                color: '#16A34A', bg: '#DCFCE7' },
  partially_paid:  { label: 'Half Paid (Cash Due)', color: '#D97706', bg: '#FFFBEB' },
  pending:         { label: 'Pending',             color: '#D97706', bg: '#FFFBEB' },
  failed:          { label: 'Failed',               color: '#DC2626', bg: '#FEF2F2' },
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}


// Why an order never really got placed, or null if it is fine. The row is
// written before the customer is redirected to Cashfree, so an online leg that
// was never settled means the payment did not go through.
function notPlaced(o: { payment_status: string | null; online_amount: number | null; status: string }): string | null {
  if (o.status === 'cancelled' || o.status === 'delivered') return null
  if ((o.online_amount ?? 0) <= 0) return null
  if (o.payment_status === 'failed') return 'payment failed'
  if (o.payment_status === 'pending') return 'payment not completed'
  return null
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [groceryPartners, setGroceryPartners] = useState<Partner[]>([])
  const [storePartners, setStorePartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('All')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [autoAssignPartner, setAutoAssignPartner] = useState('')
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [autoAssignMsg, setAutoAssignMsg] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: ords }, { data: parts }, { data: groceryParts }, { data: storeParts }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, status, total, customer_name, customer_phone, placed_at, address, payment_method, payment_status, online_amount, cod_amount, cash_collected_at, notes, order_type, delivery_partner_id, grocery_partner_id, store_partner_id, delivery_latitude, delivery_longitude, restaurants(name), order_items(name, quantity, price, image_url)')
        // Delivered orders older than 24h drop off this view (still fully queryable in Analytics — nothing is deleted)
        .or(`status.neq.delivered,placed_at.gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`)
        .order('placed_at', { ascending: false })
        // The header counts (active / unassigned) and every tab are derived
        // from this list, so capping at 100 under-reported them once there were
        // more orders than that.
        .limit(2000),
      supabase.from('delivery_partners').select('id, name, is_active').order('name'),
      supabase.from('grocery_partners').select('id, name, is_active').order('name'),
      supabase.from('store_partners').select('id, name, is_active').order('name'),
    ])
    setOrders((ords as unknown as Order[]) ?? [])
    setPartners((parts as Partner[]) ?? [])
    setGroceryPartners((groceryParts as Partner[]) ?? [])
    setStorePartners((storeParts as Partner[]) ?? [])
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

  async function saveNote(orderId: string, note: string) {
    await supabase.from('orders').update({ notes: note || null }).eq('id', orderId)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, notes: note || null } : o))
  }

  // Cancelling clears the rider too — a cancelled order shouldn't sit on
  // anyone's run sheet.
  async function cancelOrder(orderId: string) {
    await supabase.from('orders').update({ status: 'cancelled', delivery_partner_id: null }).eq('id', orderId)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'cancelled', delivery_partner_id: null } : o))
    setConfirmCancel(null)
  }

  async function assignOrder(orderId: string, partnerId: string) {
    await supabase.from('orders').update({ delivery_partner_id: partnerId || null, accepted_at: null }).eq('id', orderId)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, delivery_partner_id: partnerId || null } : o))
  }

  async function assignGroceryPartner(orderId: string, partnerId: string) {
    await supabase.from('orders').update({ grocery_partner_id: partnerId || null }).eq('id', orderId)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, grocery_partner_id: partnerId || null } : o))
  }

  async function assignStorePartner(orderId: string, partnerId: string) {
    await supabase.from('orders').update({ store_partner_id: partnerId || null }).eq('id', orderId)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, store_partner_id: partnerId || null } : o))
  }

  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [reconciling, setReconciling] = useState(false)
  const [reconcileMsg, setReconcileMsg] = useState('')

  async function reconcile() {
    setReconciling(true); setReconcileMsg('')
    try {
      const res = await fetch('/api/cashfree/reconcile', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setReconcileMsg(d.error ?? 'Could not verify payments'); return }
      setReconcileMsg(
        d.settled > 0
          ? `Settled ${d.settled} order${d.settled === 1 ? '' : 's'} — ₹${d.settledAmount} recovered`
          : `Checked ${d.checked} — all up to date`
      )
      await load()
    } catch {
      setReconcileMsg('Could not reach the server')
    } finally {
      setReconciling(false)
    }
  }

  async function autoAssign() {
    if (!autoAssignPartner) return
    setAutoAssigning(true)
    const unassignedIds = orders
      .filter((o) => !o.delivery_partner_id && !['delivered', 'cancelled'].includes(o.status))
      .map((o) => o.id)
    if (unassignedIds.length === 0) { setAutoAssigning(false); setAutoAssignMsg('No unassigned orders'); setTimeout(() => setAutoAssignMsg(''), 2000); return }
    await supabase.from('orders').update({ delivery_partner_id: autoAssignPartner, accepted_at: null }).in('id', unassignedIds)
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
    const matchSearch = !q || (o.customer_name ?? '').toLowerCase().includes(q) || (o.customer_phone ?? '').toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const activeCnt = orders.filter((o) => !['delivered','cancelled'].includes(o.status)).length
  const unassignedCnt = orders.filter((o) => !o.delivery_partner_id && !['delivered','cancelled'].includes(o.status)).length
  const partnerName = (id: string | null) => partners.find((p) => p.id === id)?.name
  const groceryPartnerName = (id: string | null) => groceryPartners.find((p) => p.id === id)?.name
  const storePartnerName = (id: string | null) => storePartners.find((p) => p.id === id)?.name

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>All Orders</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">
                {activeCnt} active · {unassignedCnt} unassigned · last updated {timeAgo(lastRefresh.toISOString())}
                <span className="ml-2 inline-flex items-center gap-1 text-[#16A34A] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse inline-block" /> Live
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#7C3AED] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by customer or order ID..."
                  className="bg-transparent text-[13px] outline-none w-full sm:w-48 min-w-0 placeholder:text-[#9CA3AF]" />
              </div>
              <button onClick={load} className="w-9 h-9 shrink-0 flex items-center justify-center border border-[#E5E7EB] rounded-xl text-[#6B7280] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Auto-assign toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl">
            <Bike className="w-4 h-4 text-[#7C3AED] shrink-0" />
            <span className="text-[12.5px] text-[#5B21B6] font-medium shrink-0">Auto-assign</span>
            <select value={autoAssignPartner} onChange={(e) => setAutoAssignPartner(e.target.value)}
              className="flex-1 min-w-[160px] sm:max-w-[220px] px-3 py-1.5 border border-[#DDD6FE] rounded-lg text-[12.5px] bg-white outline-none focus:border-[#7C3AED]">
              <option value="">Select delivery partner...</option>
              {partners.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={autoAssign} disabled={!autoAssignPartner || autoAssigning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7C3AED] text-white text-[12px] font-[600] rounded-lg hover:bg-[#6D28D9] transition-all disabled:opacity-50 shrink-0">
              <Zap className="w-3.5 h-3.5" />
              {autoAssigning ? 'Assigning...' : `Assign all ${unassignedCnt}`}
            </button>
            {autoAssignMsg && <span className="text-[12px] text-[#16A34A] font-medium">{autoAssignMsg}</span>}
          </div>

          {/* Re-asks Cashfree about every order still marked unpaid and settles
              the ones that actually went through — covers payments whose webhook
              never arrived or whose customer closed the tab mid-payment. */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl">
            <RefreshCw className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span className="text-[12.5px] text-[#15803D] font-medium shrink-0">Verify payments with Cashfree</span>
            <button onClick={reconcile} disabled={reconciling}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#16A34A] text-white text-[12px] font-[600] rounded-lg hover:bg-[#15803D] transition-all disabled:opacity-50 shrink-0">
              {reconciling ? 'Checking...' : 'Check now'}
            </button>
            {reconcileMsg && <span className="text-[12px] text-[#15803D] font-medium">{reconcileMsg}</span>}
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
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-x-auto shadow-zippy-sm">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {['Order', 'Customer', 'Restaurant', 'Status', 'Rider', 'Grocery Partner', 'Store Partner', 'Paid online', 'Cash on delivery', 'Pending', 'Total', 'Note', 'Time'].map((h) => (
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
                    const isExpanded = expandedId === o.id
                    const payCfg = o.payment_status ? (PAYMENT_STATUS_CFG[o.payment_status] ?? null) : null
                    return (
                      <Fragment key={o.id}>
                      <tr onClick={() => setExpandedId(isExpanded ? null : o.id)}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer">
                        <td className="px-5 py-3.5 text-[12px] font-mono text-[#6B7280]">
                          <span className="flex items-center gap-1.5">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />}
                            {o.id.slice(0,8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-[600] text-[#111827]">{o.customer_name ?? '—'}</p>
                          {o.customer_phone && <p className="text-[11.5px] text-[#9CA3AF]">{o.customer_phone}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-[12.5px] text-[#6B7280]">{restName ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full w-fit" style={{ background: cfg.bg, color: cfg.color }}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                          {/* The order row is always written before the customer
                              is sent to Cashfree, so an unpaid online leg means
                              money never arrived — flag it rather than let it
                              read like a normal pending order. */}
                          {notPlaced(o) && (
                            <span className="block mt-1 text-[10.5px] font-[600] text-[#DC2626] leading-tight">
                              Not placed · {notPlaced(o)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
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
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          {o.order_type !== 'grocery' ? (
                            <span className="text-[12px] text-[#9CA3AF]">—</span>
                          ) : isFinal ? (
                            <span className="text-[12px] text-[#9CA3AF]">{groceryPartnerName(o.grocery_partner_id) ?? '—'}</span>
                          ) : (
                            <select value={o.grocery_partner_id ?? ''} onChange={(e) => assignGroceryPartner(o.id, e.target.value)}
                              className={cn('px-2.5 py-1.5 border rounded-lg text-[12px] outline-none bg-white transition-all max-w-[150px]',
                                o.grocery_partner_id ? 'border-[#BBF7D0] text-[#16A34A] font-medium' : 'border-[#FECACA] text-[#DC2626]')}>
                              <option value="">Unassigned</option>
                              {groceryPartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          {o.order_type !== 'grocery' ? (
                            <span className="text-[12px] text-[#9CA3AF]">—</span>
                          ) : isFinal ? (
                            <span className="text-[12px] text-[#9CA3AF]">{storePartnerName(o.store_partner_id) ?? '—'}</span>
                          ) : (
                            <select value={o.store_partner_id ?? ''} onChange={(e) => assignStorePartner(o.id, e.target.value)}
                              className={cn('px-2.5 py-1.5 border rounded-lg text-[12px] outline-none bg-white transition-all max-w-[150px]',
                                o.store_partner_id ? 'border-[#BBF7D0] text-[#16A34A] font-medium' : 'border-[#FECACA] text-[#DC2626]')}>
                              <option value="">Unassigned</option>
                              {storePartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          )}
                        </td>
                        {/* Split payments take 50% online and 50% cash, so the
                            two legs are shown separately rather than only the total. */}
                        <td className="px-5 py-3.5 text-[13px]">
                          {Number(o.online_amount ?? 0) > 0 ? (
                            <>
                              <span className="font-[700] text-[#16A34A]">₹{formatMoney(o.online_amount)}</span>
                              <span className="block text-[11px] text-[#9CA3AF] capitalize">
                                {o.payment_method ?? '—'} · {o.payment_status ?? 'pending'}
                              </span>
                            </>
                          ) : <span className="text-[#9CA3AF]">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-[13px]">
                          {Number(o.cod_amount ?? 0) > 0 ? (
                            <span className="font-[700] text-[#D97706]">₹{formatMoney(o.cod_amount)}</span>
                          ) : <span className="text-[#9CA3AF]">—</span>}
                        </td>
                        {/* Outstanding = total less what has actually been received.
                            The online leg counts once payment_status moves past
                            "pending"; the cash leg only once the rider records
                            collecting it. */}
                        <td className="px-5 py-3.5 text-[13px]">
                          {(() => {
                            const onlinePaid = ['partially_paid', 'paid'].includes(o.payment_status ?? '') ? Number(o.online_amount ?? 0) : 0
                            const cashPaid = (o.payment_status === 'paid' || o.cash_collected_at) ? Number(o.cod_amount ?? 0) : 0
                            const pending = Math.max(0, Number(o.total) - onlinePaid - cashPaid)
                            return pending > 0
                              ? <span className="font-[700] text-[#DC2626]">₹{formatMoney(pending)}</span>
                              : <span className="font-[600] text-[#16A34A]">Settled</span>
                          })()}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] font-[700] text-[#111827]">₹{formatMoney(o.total)}</td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            defaultValue={o.notes ?? ''}
                            onBlur={(e) => { if (e.target.value !== (o.notes ?? '')) saveNote(o.id, e.target.value.trim()) }}
                            placeholder="Add note..."
                            className="w-36 px-2 py-1 border border-[#E5E7EB] rounded-lg text-[12px] outline-none focus:border-[#7C3AED] bg-white"
                          />
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF]">{timeAgo(o.placed_at)}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#FAFAFA]">
                          <td colSpan={13} className="px-5 py-4 border-t border-b border-[#F3F4F6]">
                            <div className="grid sm:grid-cols-3 gap-4">
                              <div>
                                <p className="flex items-center gap-1.5 text-[11px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-1.5"><Phone className="w-3 h-3" /> Contact</p>
                                <p className="text-[13px] text-[#111827] font-medium">{o.customer_name ?? '—'}</p>
                                <p className="text-[12.5px] text-[#6B7280]">{o.customer_phone ?? '—'}</p>
                              </div>
                              <div>
                                <p className="flex items-center gap-1.5 text-[11px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-1.5"><MapPin className="w-3 h-3" /> Delivery address</p>
                                <p className="text-[12.5px] text-[#374151]">{o.address ?? '—'}</p>
                                {o.delivery_latitude && o.delivery_longitude && (
                                  <>
                                    <LiveTrackingMap
                                      riderLocation={null}
                                      dropLocation={{ lat: o.delivery_latitude, lng: o.delivery_longitude }}
                                      showRiderStatus={false}
                                      className="h-32 mt-2 rounded-lg overflow-hidden"
                                    />
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.delivery_latitude},${o.delivery_longitude}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 text-[11.5px] font-[600] text-[#16A34A] hover:underline mt-1.5">
                                      <ExternalLink className="w-3 h-3" /> Open in Maps
                                    </a>
                                  </>
                                )}
                              </div>
                              <div>
                                <p className="flex items-center gap-1.5 text-[11px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-1.5"><CreditCard className="w-3 h-3" /> Payment</p>
                                <p className="text-[12.5px] text-[#374151] capitalize">{o.payment_method ?? '—'}</p>
                                {payCfg && (
                                  <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: payCfg.bg, color: payCfg.color }}>
                                    {payCfg.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="flex items-center gap-1.5 text-[11px] font-[600] text-[#9CA3AF] uppercase tracking-wide mt-4 mb-2"><Package className="w-3 h-3" /> Items</p>
                            {o.order_items?.length ? (
                              <div className="space-y-2">
                                {o.order_items.map((item, i) => (
                                  <div key={i} className="flex items-center gap-3 bg-white border border-[#F3F4F6] rounded-lg px-3 py-2">
                                    {item.image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-md object-cover shrink-0" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-md bg-[#F3F4F6] flex items-center justify-center shrink-0">
                                        <Package className="w-4 h-4 text-[#9CA3AF]" />
                                      </div>
                                    )}
                                    <span className="flex-1 text-[12.5px] text-[#111827]">{item.name}</span>
                                    <span className="text-[12px] text-[#6B7280]">× {item.quantity}</span>
                                    <span className="text-[12.5px] font-[600] text-[#111827] w-16 text-right">₹{item.price * item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[12.5px] text-[#9CA3AF]">No item details recorded for this order.</p>
                            )}

                            {!['delivered', 'cancelled'].includes(o.status) && (
                              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#F3F4F6]">
                                {o.delivery_partner_id && (
                                  <button onClick={() => assignOrder(o.id, '')}
                                    className="px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-[12px] font-[600] text-[#374151] hover:bg-white transition-all">
                                    Unassign rider
                                  </button>
                                )}
                                {confirmCancel === o.id ? (
                                  <>
                                    <span className="text-[12px] text-[#6B7280]">Cancel this order?</span>
                                    <button onClick={() => cancelOrder(o.id)}
                                      className="px-3 py-1.5 bg-[#DC2626] text-white rounded-lg text-[12px] font-[700] hover:bg-[#B91C1C] transition-all">
                                      Yes, cancel
                                    </button>
                                    <button onClick={() => setConfirmCancel(null)}
                                      className="px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-[12px] font-[600] text-[#374151] hover:bg-white transition-all">
                                      Keep
                                    </button>
                                  </>
                                ) : (
                                  <button onClick={() => setConfirmCancel(o.id)}
                                    className="px-3 py-1.5 border border-[#FECACA] text-[#DC2626] rounded-lg text-[12px] font-[600] hover:bg-[#FEF2F2] transition-all">
                                    Cancel order
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      </Fragment>
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
