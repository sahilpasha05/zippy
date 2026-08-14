'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Wallet, Clock, CheckCircle2, X, Phone, Bike, Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Partner = { id: string; name: string; phone: string | null }
type Order = {
  id: string; placed_at: string; customer_name: string | null; customer_phone: string | null
  status: string; total: number; cod_amount: number | null; cash_collected_at: string | null
  delivery_partner_id: string | null
}

export default function AdminCollectionsPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>(presetRange(30))
  const [drillPartnerId, setDrillPartnerId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const fromISO = new Date(range.from + 'T00:00:00').toISOString()
      const toISO = new Date(range.to + 'T23:59:59.999').toISOString()
      const [{ data: parts }, { data: ords }] = await Promise.all([
        supabase.from('delivery_partners').select('id, name, phone').order('name'),
        supabase.from('orders')
          .select('id, placed_at, customer_name, customer_phone, status, total, cod_amount, cash_collected_at, delivery_partner_id')
          .not('delivery_partner_id', 'is', null)
          .gt('cod_amount', 0)
          .gte('placed_at', fromISO).lte('placed_at', toISO)
          .order('placed_at', { ascending: false }),
      ])
      setPartners((parts as Partner[]) ?? [])
      setOrders((ords as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [range])

  // One row per rider — what they've collected in cash vs. what's still
  // outstanding from cash-on-delivery orders assigned to them in this range.
  const rows = partners
    .map((p) => {
      const theirOrders = orders.filter((o) => o.delivery_partner_id === p.id)
      const collected = theirOrders.filter((o) => o.cash_collected_at)
      const pending = theirOrders.filter((o) => !o.cash_collected_at)
      return {
        partner: p,
        orders: theirOrders,
        collectedAmount: collected.reduce((s, o) => s + Number(o.cod_amount ?? 0), 0),
        collectedCount: collected.length,
        pendingAmount: pending.reduce((s, o) => s + Number(o.cod_amount ?? 0), 0),
        pendingCount: pending.length,
      }
    })
    .filter((r) => r.orders.length > 0)
    .sort((a, b) => b.pendingAmount - a.pendingAmount)

  const totalCollected = rows.reduce((s, r) => s + r.collectedAmount, 0)
  const totalPending = rows.reduce((s, r) => s + r.pendingAmount, 0)
  const drillRow = rows.find((r) => r.partner.id === drillPartnerId) ?? null

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 space-y-3">
          <div>
            <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Delivery Collections</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Cash-on-delivery amounts, collected and still outstanding, per rider</p>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Cash Collected',  value: totalCollected, icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7' },
                  { label: 'Still to Collect', value: totalPending,   icon: Clock,        color: '#D97706', bg: '#FFFBEB' },
                  { label: 'Riders with COD orders', value: rows.length, icon: Bike, color: '#7C3AED', bg: '#F5F3FF', isCount: true },
                  { label: 'COD Orders',       value: orders.length,  icon: Wallet,       color: '#0891B2', bg: '#ECFEFF', isCount: true },
                ].map(({ label, value, icon: Icon, color, bg, isCount }) => (
                  <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="text-[22px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{isCount ? value : `₹${value.toLocaleString()}`}</div>
                    <div className="text-[12px] text-[#9CA3AF] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm">
                <div className="px-5 py-4 border-b border-[#F3F4F6]">
                  <h2 className="text-[15px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>By Rider</h2>
                  <p className="text-[12px] text-[#9CA3AF] mt-0.5">Sorted by outstanding amount — click a rider to see their orders</p>
                </div>
                {rows.length === 0 ? (
                  <p className="text-[13px] text-[#9CA3AF] text-center py-14">No cash-on-delivery orders in this range.</p>
                ) : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {rows.map((r) => (
                      <button key={r.partner.id} onClick={() => setDrillPartnerId(r.partner.id)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-all text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center shrink-0">
                            <Bike className="w-4.5 h-4.5 text-[#7C3AED]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-[700] text-[#111827] truncate">{r.partner.name}</p>
                            <p className="text-[11.5px] text-[#9CA3AF]">{r.partner.phone ?? 'No phone on file'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-right">
                            <p className="text-[13px] font-[700] text-[#16A34A]">₹{r.collectedAmount.toLocaleString()}</p>
                            <p className="text-[10.5px] text-[#9CA3AF]">{r.collectedCount} collected</p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="text-[13px] font-[700]" style={{ color: r.pendingAmount > 0 ? '#D97706' : '#9CA3AF' }}>₹{r.pendingAmount.toLocaleString()}</p>
                            <p className="text-[10.5px] text-[#9CA3AF]">{r.pendingCount} pending</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {drillRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrillPartnerId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col z-10">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#F3F4F6] shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-[600] uppercase tracking-wide text-[#7C3AED]">Cash Collection</p>
                <h2 className="text-[15px] font-[800] text-[#111827] truncate" style={{ fontWeight: 800 }}>{drillRow.partner.name}</h2>
              </div>
              <button onClick={() => setDrillPartnerId(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] shrink-0">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F3F4F6] shrink-0">
              <div className="flex-1 rounded-xl bg-[#DCFCE7] px-3 py-2">
                <p className="text-[15px] font-[800] text-[#15803D]">₹{drillRow.collectedAmount.toLocaleString()}</p>
                <p className="text-[10.5px] text-[#15803D]/70">Collected</p>
              </div>
              <div className="flex-1 rounded-xl bg-[#FFFBEB] px-3 py-2">
                <p className="text-[15px] font-[800] text-[#B45309]">₹{drillRow.pendingAmount.toLocaleString()}</p>
                <p className="text-[10.5px] text-[#B45309]/70">Still to collect</p>
              </div>
              {drillRow.partner.phone && (
                <a href={`tel:${drillRow.partner.phone}`}
                  className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#E5E7EB] text-[#374151] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all shrink-0">
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-[#F3F4F6]">
              {drillRow.orders.map((o) => (
                <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono font-[700] text-[#374151]">{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                        <Clock className="w-3 h-3" />
                        {new Date(o.placed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[12.5px] font-[600] text-[#111827] mt-0.5 truncate">
                      {o.customer_name ?? 'Customer'}
                      {o.customer_phone && <span className="text-[#9CA3AF] font-normal"> · {o.customer_phone}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-[800] text-[#111827]">₹{Number(o.cod_amount).toLocaleString()}</p>
                    {o.cash_collected_at ? (
                      <span className="text-[10.5px] font-[600] text-[#16A34A]">✓ Collected</span>
                    ) : (
                      <span className="text-[10.5px] font-[600] text-[#D97706]">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
