'use client'

import { useCallback, useEffect, useState } from 'react'
import { Landmark, IndianRupee, Clock, CheckCircle2, AlertTriangle, RefreshCw, Loader2, CalendarClock, Receipt } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'
import { cn } from '@/lib/utils'

type Settlement = {
  id: string; utr: string | null; status: string; amountSettled: number; paymentAmount: number
  paymentFrom: string | null; paymentTill: string | null; on: string | null
  charges: number; adjustment: number; type: string | null; recoveredOn?: string | null
}
type Overview = {
  environment: 'production' | 'sandbox'
  generatedAt: string
  totals: { collected: number; paidOrders: number; settled: number; settlements: number; fees: number; failed: number; failedAmount: number; recovered: number; recoveredAmount: number; recoveredOn: string | null }
  inProgress: { count: number; amount: number }
  unsettled: { amount: number; orders: number; since: string | null }
  upcoming: { cutoff: string; expectedOn: string; orders: number; amount: number; cutoffPassed: boolean; overdue: boolean }[]
  lastSettlement: { amount: number; on: string | null; utr: string | null; paymentTill: string | null } | null
  typicalLagDays: number | null
  days: { date: string; orders: number; collected: number; settled: number }[]
  settlements: Settlement[]
  inProgressList: Settlement[]
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
const dateOnly = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PAID:    { label: 'Paid out',   color: '#16A34A', bg: '#DCFCE7' },
  SUCCESS: { label: 'Paid out',   color: '#16A34A', bg: '#DCFCE7' },
  FAILED:  { label: 'Failed',     color: '#DC2626', bg: '#FEF2F2' },
}
const statusStyle = (s: string) => STATUS_STYLE[s] ?? { label: s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' '), color: '#D97706', bg: '#FFFBEB' }

export default function AdminCashfreePage() {
  const [range, setRange] = useState<DateRange>(presetRange(30))
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/cashfree-overview?from=${range.from}&to=${range.to}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not load Cashfree data')
      setData(json as Overview)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Cashfree data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { void load() }, [load])

  const lagText = data?.typicalLagDays != null ? `Settlements usually land about ${data.typicalLagDays.toFixed(1)} day(s) after their payment cut-off.` : null

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Cashfree Payments</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">Online collections, settlements and what is still to come</p>
            </div>
            <div className="flex items-center gap-2">
              {data && (
                <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-[700]', data.environment === 'production' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FFFBEB] text-[#B45309]')}>
                  {data.environment === 'production' ? 'Live' : 'Sandbox'}
                </span>
              )}
              <button onClick={() => void load()} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-xl text-[12.5px] font-medium text-[#374151] hover:border-[#D1D5DB] disabled:opacity-60">
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
              </button>
            </div>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[13px] text-[#B91C1C]">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}

          {loading && !data ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" /></div>
          ) : data && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Collected online', value: inr(data.totals.collected), sub: `${data.totals.paidOrders} paid order${data.totals.paidOrders !== 1 ? 's' : ''} in range`, icon: IndianRupee, color: '#16A34A', bg: '#DCFCE7' },
                  { label: 'Settled to bank', value: inr(data.totals.settled), sub: `${data.totals.settlements} payout${data.totals.settlements !== 1 ? 's' : ''}${data.totals.fees ? ` · fees ${inr(data.totals.fees)}` : ''}`, icon: Landmark, color: '#0891B2', bg: '#ECFEFF' },
                  { label: 'Awaiting settlement', value: inr(data.unsettled.amount), sub: data.unsettled.since ? `${data.unsettled.orders} order${data.unsettled.orders !== 1 ? 's' : ''} collected since ${dateTime(data.unsettled.since)} (estimate, before fees)` : 'No settlement history found yet', icon: Clock, color: '#D97706', bg: '#FFFBEB' },
                  { label: 'Next settlement', value: data.upcoming[0] ? inr(data.upcoming[0].amount) : '—', sub: data.upcoming[0] ? `${data.upcoming[0].overdue ? 'was due' : 'expected'} ~${dateTime(data.upcoming[0].expectedOn)} · ${data.upcoming[0].cutoffPassed ? 'cut-off passed' : `still collecting until ${dateTime(data.upcoming[0].cutoff)}`}` : 'Nothing queued yet', icon: CalendarClock, color: '#7C3AED', bg: '#F5F3FF' },
                  { label: 'Settlement in progress', value: inr(data.inProgress.amount), sub: data.inProgress.count ? `${data.inProgress.count} payout${data.inProgress.count !== 1 ? 's' : ''} being processed` : 'None right now', icon: CalendarClock, color: '#7C3AED', bg: '#F5F3FF' },
                  { label: 'Last settlement', value: data.lastSettlement ? inr(data.lastSettlement.amount) : '—', sub: data.lastSettlement ? `${dateTime(data.lastSettlement.on)}${data.lastSettlement.utr ? ` · UTR ${data.lastSettlement.utr}` : ''}` : 'No payouts yet', icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7' },
                  { label: 'Failed settlements', value: String(data.totals.failed), sub: data.totals.failed ? `${inr(data.totals.failedAmount)} not yet re-paid — check Cashfree` : data.totals.recovered ? `${data.totals.recovered} failed (${inr(data.totals.recoveredAmount)}) — already re-paid in the ${dateTime(data.totals.recoveredOn)} payout` : 'None in this range', icon: AlertTriangle, color: data.totals.failed ? '#DC2626' : '#6B7280', bg: data.totals.failed ? '#FEF2F2' : '#F3F4F6' },
                ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="text-[22px] font-[800] text-[#111827] break-words" style={{ fontWeight: 800 }}>{value}</div>
                    <div className="text-[12.5px] font-[600] text-[#374151]">{label}</div>
                    <div className="text-[11.5px] text-[#9CA3AF] mt-0.5 break-words">{sub}</div>
                  </div>
                ))}
              </div>

              {(lagText || data.unsettled.since) && (
                <p className="text-[12px] text-[#6B7280] leading-relaxed">
                  {lagText} “Awaiting settlement” is what customers paid online after the last paid-out cut-off. Cashfree deducts its fees before paying out, so the bank amount will be a little lower.
                </p>
              )}

              {data.upcoming.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#F3F4F6] flex flex-wrap items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-[#7C3AED]" />
                    <h2 className="text-[14px] font-[700] text-[#111827]">Upcoming settlements</h2>
                    <span className="text-[11.5px] text-[#9CA3AF]">estimated from your usual payout schedule — bank holidays and weekends can delay a payout</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px]">
                      <thead>
                        <tr className="bg-[#F8FAFC] text-left text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                          <th className="px-5 py-2.5 font-[600]">Expected payout</th>
                          <th className="px-5 py-2.5 font-[600]">Payments up to</th>
                          <th className="px-5 py-2.5 font-[600] text-right">Orders</th>
                          <th className="px-5 py-2.5 font-[600] text-right">Amount (before fees)</th>
                          <th className="px-5 py-2.5 font-[600]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3F4F6]">
                        {data.upcoming.map((c) => (
                          <tr key={c.cutoff} className="hover:bg-[#FAFAFA]">
                            <td className="px-5 py-3 text-[13px] font-[700] text-[#111827] whitespace-nowrap">{dateTime(c.expectedOn)}</td>
                            <td className="px-5 py-3 text-[12px] text-[#6B7280] whitespace-nowrap">{dateTime(c.cutoff)}</td>
                            <td className="px-5 py-3 text-[12.5px] text-[#374151] text-right">{c.orders}</td>
                            <td className="px-5 py-3 text-[13px] font-[700] text-[#16A34A] text-right whitespace-nowrap">{inr(c.amount)}</td>
                            <td className="px-5 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-[700]" style={c.overdue ? { background: '#FFFBEB', color: '#D97706' } : c.cutoffPassed ? { background: '#ECFEFF', color: '#0891B2' } : { background: '#F3F4F6', color: '#6B7280' }}>
                                {c.overdue ? 'Due — processing' : c.cutoffPassed ? 'Cut-off passed' : 'Still collecting'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.inProgressList.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#DDD6FE] shadow-zippy-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#F3F4F6] bg-[#F5F3FF] flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-[#7C3AED]" />
                    <h2 className="text-[14px] font-[700] text-[#111827]">Upcoming / in progress</h2>
                  </div>
                  <SettlementTable rows={data.inProgressList} />
                </div>
              )}

              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#F3F4F6] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#6B7280]" />
                  <h2 className="text-[14px] font-[700] text-[#111827]">Day-wise collections</h2>
                  <span className="text-[11.5px] text-[#9CA3AF]">online payments by the day the order was placed</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-left text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                        <th className="px-5 py-2.5 font-[600]">Date</th>
                        <th className="px-5 py-2.5 font-[600] text-right">Orders</th>
                        <th className="px-5 py-2.5 font-[600] text-right">Collected</th>
                        <th className="px-5 py-2.5 font-[600] text-right">Settled that day</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {data.days.length === 0 && (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px] text-[#9CA3AF]">No online payments in this range.</td></tr>
                      )}
                      {data.days.map((d) => (
                        <tr key={d.date} className="hover:bg-[#FAFAFA]">
                          <td className="px-5 py-3 text-[13px] text-[#111827] whitespace-nowrap">{dayLabel(d.date)}</td>
                          <td className="px-5 py-3 text-[13px] text-[#6B7280] text-right">{d.orders || '—'}</td>
                          <td className="px-5 py-3 text-[13px] font-[700] text-[#16A34A] text-right">{d.collected ? inr(d.collected) : '—'}</td>
                          <td className="px-5 py-3 text-[13px] font-[600] text-[#0891B2] text-right">{d.settled ? inr(d.settled) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#F3F4F6] flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#6B7280]" />
                  <h2 className="text-[14px] font-[700] text-[#111827]">Settlements</h2>
                  <span className="text-[11.5px] text-[#9CA3AF]">payouts from Cashfree to your bank in this range</span>
                </div>
                <SettlementTable rows={data.settlements} empty="No settlements in this range." />
              </div>

              <p className="text-[11px] text-[#9CA3AF]">Updated {dateTime(data.generatedAt)} · online amounts come from paid orders in your database; settlements come straight from Cashfree.</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function SettlementTable({ rows, empty }: { rows: Settlement[]; empty?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="bg-[#F8FAFC] text-left text-[11px] uppercase tracking-wide text-[#9CA3AF]">
            <th className="px-5 py-2.5 font-[600]">Date</th>
            <th className="px-5 py-2.5 font-[600]">Status</th>
            <th className="px-5 py-2.5 font-[600]">Covers payments</th>
            <th className="px-5 py-2.5 font-[600] text-right">Payments</th>
            <th className="px-5 py-2.5 font-[600] text-right">Fees</th>
            <th className="px-5 py-2.5 font-[600] text-right">To bank</th>
            <th className="px-5 py-2.5 font-[600]">UTR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-[#9CA3AF]">{empty ?? 'Nothing here.'}</td></tr>
          )}
          {rows.map((s) => {
            const st = s.status === 'FAILED' && s.recoveredOn
              ? { label: 'Failed — re-paid later', color: '#B45309', bg: '#FFFBEB' }
              : statusStyle(s.status)
            return (
              <tr key={s.id + (s.utr ?? '')} className="hover:bg-[#FAFAFA]">
                <td className="px-5 py-3 text-[12.5px] text-[#111827] whitespace-nowrap">{dateTime(s.on)}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-[700]" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                <td className="px-5 py-3 text-[12px] text-[#6B7280] whitespace-nowrap">{dateOnly(s.paymentFrom)} → {dateOnly(s.paymentTill)}</td>
                <td className="px-5 py-3 text-[12.5px] text-[#374151] text-right whitespace-nowrap">{inr(s.paymentAmount)}</td>
                <td className="px-5 py-3 text-[12.5px] text-[#9CA3AF] text-right whitespace-nowrap">{s.charges ? inr(s.charges) : '—'}</td>
                <td className="px-5 py-3 text-[13px] font-[700] text-[#111827] text-right whitespace-nowrap">{inr(s.amountSettled)}</td>
                <td className="px-5 py-3 text-[11px] font-mono text-[#9CA3AF] whitespace-nowrap">{s.utr ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
