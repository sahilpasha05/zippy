'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Smartphone, Banknote, Clock, ShoppingBag, Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'

const supabase = createClient()

type Order = {
  id: string; placed_at: string; customer_name: string | null
  payment_method: string | null; payment_status: string | null
  total: number; online_amount: number | null; cod_amount: number | null
  cash_collected_at: string | null; cash_proof_image_url: string | null
}

const PAYMENT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  paid:           { label: 'Paid',                color: '#16A34A', bg: '#DCFCE7' },
  partially_paid: { label: 'Half Paid (Cash Due)', color: '#D97706', bg: '#FFFBEB' },
  pending:        { label: 'Pending',             color: '#6B7280', bg: '#F3F4F6' },
  failed:         { label: 'Failed',               color: '#DC2626', bg: '#FEF2F2' },
  refunded:       { label: 'Refunded',             color: '#7C3AED', bg: '#F5F3FF' },
}

export default function AdminLedgerPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>(presetRange(30))
  const [proofPreview, setProofPreview] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const fromISO = new Date(range.from + 'T00:00:00').toISOString()
      const toISO = new Date(range.to + 'T23:59:59.999').toISOString()
      const { data } = await supabase
        .from('orders')
        .select('id, placed_at, customer_name, payment_method, payment_status, total, online_amount, cod_amount, cash_collected_at, cash_proof_image_url')
        .gte('placed_at', fromISO).lte('placed_at', toISO)
        .order('placed_at', { ascending: false })
        .limit(2000)
      setOrders((data as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [range])

  const onlineCollected = orders
    .filter((o) => o.payment_status === 'paid' || o.payment_status === 'partially_paid')
    .reduce((s, o) => s + (o.online_amount ?? 0), 0)
  const cashCollected = orders
    .filter((o) => o.cash_collected_at)
    .reduce((s, o) => s + (o.cod_amount ?? 0), 0)
  const cashPending = orders
    .filter((o) => (o.cod_amount ?? 0) > 0 && !o.cash_collected_at)
    .reduce((s, o) => s + (o.cod_amount ?? 0), 0)

  const stats = [
    { label: 'Collected Online', value: `₹${onlineCollected.toLocaleString()}`, icon: Smartphone, color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Cash Collected',   value: `₹${cashCollected.toLocaleString()}`,   icon: Banknote,    color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Cash Pending',     value: `₹${cashPending.toLocaleString()}`,     icon: Clock,       color: '#D97706', bg: '#FFFBEB' },
    { label: 'Total Orders',     value: orders.length,                          icon: ShoppingBag, color: '#0891B2', bg: '#ECFEFF' },
  ]

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 space-y-3">
          <div>
            <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Payment Ledger</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Every order&apos;s online and cash amounts, down to the rupee</p>
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
                {stats.map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="text-[22px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{value}</div>
                    <div className="text-[12px] text-[#9CA3AF] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-x-auto shadow-zippy-sm">
                <table className="w-full min-w-[820px]">
                  <thead>
                    <tr className="border-b border-[#F3F4F6]">
                      {['Order', 'Date', 'Customer', 'Method', 'Total', 'Online', 'Cash Due', 'Cash Collected', 'Proof', 'Status'].map((h) => (
                        <th key={h} className="text-left text-[11px] font-[600] text-[#9CA3AF] px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {orders.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-16 text-[13px] text-[#9CA3AF]">No orders in this range</td></tr>
                    ) : orders.map((o) => {
                      const payCfg = o.payment_status ? PAYMENT_STATUS_CFG[o.payment_status] : null
                      return (
                        <tr key={o.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-4 py-3 text-[11.5px] font-mono text-[#6B7280] whitespace-nowrap">{o.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-4 py-3 text-[12px] text-[#9CA3AF] whitespace-nowrap">{new Date(o.placed_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-[12.5px] text-[#111827] whitespace-nowrap">{o.customer_name ?? '—'}</td>
                          <td className="px-4 py-3 text-[12px] text-[#6B7280] capitalize whitespace-nowrap">{o.payment_method ?? '—'}</td>
                          <td className="px-4 py-3 text-[13px] font-[700] text-[#111827] whitespace-nowrap">₹{o.total}</td>
                          <td className="px-4 py-3 text-[12.5px] text-[#16A34A] font-medium whitespace-nowrap">{(o.online_amount ?? 0) > 0 ? `₹${o.online_amount}` : '—'}</td>
                          <td className="px-4 py-3 text-[12.5px] text-[#D97706] font-medium whitespace-nowrap">{(o.cod_amount ?? 0) > 0 ? `₹${o.cod_amount}` : '—'}</td>
                          <td className="px-4 py-3 text-[12px] whitespace-nowrap">
                            {(o.cod_amount ?? 0) === 0 ? (
                              <span className="text-[#9CA3AF]">—</span>
                            ) : o.cash_collected_at ? (
                              <span className="text-[#16A34A] font-medium">✓ {new Date(o.cash_collected_at).toLocaleDateString()}</span>
                            ) : (
                              <span className="text-[#DC2626] font-medium">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {o.cash_proof_image_url ? (
                              <button onClick={() => setProofPreview(o.cash_proof_image_url)} className="block w-9 h-9 rounded-lg overflow-hidden border border-[#E5E7EB]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={o.cash_proof_image_url} alt="Cash proof" className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <span className="text-[#D1D5DB] text-[11.5px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {payCfg && (
                              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: payCfg.bg, color: payCfg.color }}>
                                {payCfg.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {proofPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setProofPreview(null)}>
          <div className="absolute inset-0 bg-black/70" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proofPreview} alt="Cash collection proof" className="relative z-10 max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}
