'use client'

import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Loader2, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchAllRows } from '@/lib/fetchAllRows'

const supabase = createClient()

// An order that was cancelled after the customer paid online (all of it, or
// the online half of a split payment) has money to hand back. This lists
// those, and lets the admin mark each one "refund completed" once the money
// has actually been returned (in the Cashfree dashboard or by UPI). Marking
// sets payment_status to 'refunded', which the orders table already allows.
type RefundOrder = {
  id: string; placed_at: string; payment_status: string; online_amount: number; cod_amount: number | null; total: number
  customer_name: string | null; customer_phone: string | null; notes: string | null
  restaurants: { name: string } | { name: string }[] | null
}

const restName = (o: RefundOrder) => (Array.isArray(o.restaurants) ? o.restaurants[0]?.name : o.restaurants?.name) ?? '—'
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function RefundsPanel({ range }: { range: { from: string; to: string } }) {
  const [rows, setRows] = useState<RefundOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Only orders that were cancelled AFTER the customer paid online.
      const data = await fetchAllRows<RefundOrder>((from, to) => supabase
        .from('orders')
        .select('id, placed_at, payment_status, online_amount, cod_amount, total, customer_name, customer_phone, notes, restaurants(name)')
        .eq('status', 'cancelled')
        .gt('online_amount', 0)
        .in('payment_status', ['paid', 'partially_paid'])
        .order('placed_at', { ascending: false }).order('id')
        .range(from, to))
      setRows(data)
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled').eq('payment_status', 'refunded')
      setDoneCount(count ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function markRefunded(o: RefundOrder) {
    if (!confirm(`Mark the ${inr(o.online_amount)} refund for ${o.customer_name ?? 'this customer'} (order ${o.id.slice(0, 8).toUpperCase()}) as completed?\n\nOnly do this after the money has actually been returned.`)) return
    setBusy(o.id); setError('')
    const stamp = `REFUND COMPLETED ${inr(o.online_amount)} - marked by admin on ${new Date().toLocaleString('en-IN')}`
    const { error: err } = await supabase
      .from('orders')
      .update({ payment_status: 'refunded', notes: o.notes ? `${o.notes}\n${stamp}` : stamp })
      .eq('id', o.id)
      .eq('status', 'cancelled')
    setBusy(null)
    if (err) { setError('Could not update this order. Please try again.'); return }
    // Leaves the pending list as soon as it is marked.
    setRows((prev) => prev.filter((r) => r.id !== o.id))
    setDoneCount((n) => n + 1)
  }

  // Follows the page's date range (by the day the order was placed, India
  // time). Refunds owed outside the range are never hidden: they're counted
  // in the note under the list so the full amount is always visible.
  const dayOf = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const pending = rows.filter((r) => { const d = dayOf(r.placed_at); return d >= range.from && d <= range.to })
  const outside = rows.filter((r) => { const d = dayOf(r.placed_at); return d < range.from || d > range.to })
  const pendingTotal = pending.reduce((s, r) => s + Number(r.online_amount), 0)
  const outsideTotal = outside.reduce((s, r) => s + Number(r.online_amount), 0)
  const list = pending

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-wrap items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] flex items-center justify-center shrink-0">
          <RotateCcw className="w-4.5 h-4.5 text-[#DC2626]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>Refunds to complete</h2>
          <p className="text-[12px] text-[#9CA3AF]">Cancelled orders where the customer already paid online. Mark each one after you return the money.</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[18px] font-[800] text-[#DC2626]" style={{ fontWeight: 800 }}>{loading ? '—' : inr(pendingTotal)}</div>
          <div className="text-[11px] text-[#9CA3AF]">{loading ? '' : `${pending.length} pending`}</div>
        </div>
      </div>

      {error && <p className="mx-5 mt-3 text-[12.5px] text-[#DC2626]">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" /></div>
      ) : list.length === 0 ? (
        <p className="text-[13px] text-[#9CA3AF] text-center py-10">
          {outside.length > 0 ? 'No refunds pending for orders in this date range.' : 'No refunds pending. Every cancelled order that was paid online has been refunded.'}
        </p>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-[#F8FAFC] text-left text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                <th className="px-5 py-2.5 font-[600]">Order</th>
                <th className="px-5 py-2.5 font-[600]">Customer</th>
                <th className="px-5 py-2.5 font-[600]">Restaurant</th>
                <th className="px-5 py-2.5 font-[600] text-right">Paid online</th>
                <th className="px-5 py-2.5 font-[600] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {list.map((o) => (
                <tr key={o.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[12px] font-mono font-[700] text-[#374151]">{o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{when(o.placed_at)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-[13px] font-[600] text-[#111827]">{o.customer_name ?? '—'}</div>
                    {o.customer_phone && (
                      <a href={`tel:${o.customer_phone}`} className="inline-flex items-center gap-1 text-[11.5px] text-[#16A34A] hover:underline"><Phone className="w-3 h-3" />{o.customer_phone}</a>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-[#374151]">{restName(o)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <div className="text-[13.5px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{inr(Number(o.online_amount))}</div>
                    <div className="text-[11px] text-[#9CA3AF]">of {inr(Number(o.total))}{(o.cod_amount ?? 0) > 0 ? ' · rest was cash' : ''}</div>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => void markRefunded(o)} disabled={busy === o.id}
                      className="px-3 py-1.5 bg-[#16A34A] text-white text-[12px] font-[700] rounded-lg hover:bg-[#15803D] disabled:opacity-60 transition-all">
                      {busy === o.id ? 'Saving…' : 'Mark refund completed'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && (outside.length > 0 || doneCount > 0) && (
        <p className="px-5 py-3 text-[11.5px] text-[#9CA3AF] border-t border-[#F3F4F6]">
          {outside.length > 0 && (
            <span className="font-[600] text-[#B45309]">
              {outside.length} more refund{outside.length !== 1 ? 's' : ''} ({inr(outsideTotal)}) pending for orders outside this date range — widen the range (e.g. All time) to see them.{' '}
            </span>
          )}
          {doneCount > 0 && <>{doneCount} refund{doneCount !== 1 ? 's' : ''} already marked completed.</>}
        </p>
      )}
    </div>
  )
}
