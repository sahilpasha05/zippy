'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Receipt, HandCoins } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { todayKey } from '@/lib/analytics'

const supabase = createClient()

type DayOrder = {
  total: number; payment_status: string | null; online_amount: number | null
  collection_mode: 'cash' | 'online' | null; collected_amount: number | null
}
type Entry = { id: string; kind: 'collection' | 'expense'; label: string | null; amount: number }

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

function shiftDay(key: string, by: number) {
  const d = new Date(`${key}T00:00:00`)
  d.setDate(d.getDate() + by)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AdminDayBookPage() {
  const [day, setDay] = useState(todayKey())
  const [orders, setOrders] = useState<DayOrder[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [collection, setCollection] = useState({ label: '', amount: '' })
  const [expense, setExpense] = useState({ label: '', amount: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const fromISO = new Date(`${day}T00:00:00`).toISOString()
    const toISO = new Date(`${day}T23:59:59.999`).toISOString()
    const [{ data: ords }, { data: ents, error: entErr }] = await Promise.all([
      supabase.from('orders')
        .select('total, payment_status, online_amount, collection_mode, collected_amount')
        .eq('status', 'delivered')
        .gte('delivered_at', fromISO).lte('delivered_at', toISO),
      supabase.from('daybook_entries').select('id, kind, label, amount').eq('entry_date', day).order('created_at'),
    ])
    setOrders((ords as DayOrder[]) ?? [])
    setEntries(((ents as Entry[]) ?? []).map((e) => ({ ...e, amount: Number(e.amount) })))
    if (entErr) setError('Day Book entries are not set up yet — run supabase-migration-daybook.sql once in Supabase.')
    setLoading(false)
  }, [day])

  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  async function add(kind: 'collection' | 'expense') {
    const form = kind === 'collection' ? collection : expense
    const amount = Number(form.amount)
    if (!amount || amount < 0) return
    setBusy(true); setError('')
    const { error: err } = await supabase.from('daybook_entries').insert({
      entry_date: day, kind, label: form.label.trim() || null, amount,
    })
    if (err) setError(err.message.includes('daybook_entries') ? 'Day Book entries are not set up yet — run supabase-migration-daybook.sql once in Supabase.' : err.message)
    else (kind === 'collection' ? setCollection : setExpense)({ label: '', amount: '' })
    await load()
    setBusy(false)
  }

  async function remove(id: string) {
    if (!confirm('Remove this entry?')) return
    await supabase.from('daybook_entries').delete().eq('id', id)
    await load()
  }

  const deliveredTotal = orders.reduce((s, o) => s + Number(o.total), 0)
  const cashfree = orders
    .filter((o) => o.payment_status === 'paid' || o.payment_status === 'partially_paid')
    .reduce((s, o) => s + Number(o.online_amount ?? 0), 0)
  const riderQr = orders.filter((o) => o.collection_mode === 'online').reduce((s, o) => s + Number(o.collected_amount ?? 0), 0)
  const cashDue = deliveredTotal - cashfree - riderQr
  const collections = entries.filter((e) => e.kind === 'collection')
  const expenses = entries.filter((e) => e.kind === 'expense')
  const collected = collections.reduce((s, e) => s + e.amount, 0)
  const spent = expenses.reduce((s, e) => s + e.amount, 0)
  const pending = cashDue - collected
  const finalAmount = collected + cashfree + riderQr - spent
  const ifAllCollected = deliveredTotal - spent

  const dayLabel = new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const row = (label: string, value: string, opts?: { sign?: string; strong?: boolean; color?: string }) => (
    <div className={`flex items-center justify-between py-2.5 ${opts?.strong ? 'border-t border-[#E5E7EB] mt-1 pt-3' : ''}`}>
      <span className={`text-[13px] ${opts?.strong ? 'font-[700] text-[#111827]' : 'text-[#6B7280]'}`}>{opts?.sign ? `${opts.sign} ` : ''}{label}</span>
      <span className={`${opts?.strong ? 'text-[17px] font-[800]' : 'text-[14px] font-[600]'}`} style={{ color: opts?.color ?? '#111827' }}>{value}</span>
    </div>
  )

  const entryBox = (kind: 'collection' | 'expense') => {
    const isCol = kind === 'collection'
    const form = isCol ? collection : expense
    const setForm = isCol ? setCollection : setExpense
    const list = isCol ? collections : expenses
    const accent = isCol ? '#16A34A' : '#DC2626'
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
        <p className="text-[13.5px] font-[700] text-[#111827] mb-3 flex items-center gap-1.5">
          {isCol ? <HandCoins className="w-4 h-4" style={{ color: accent }} /> : <Receipt className="w-4 h-4" style={{ color: accent }} />}
          {isCol ? 'Collected from delivery boys' : 'Expenses'}
        </p>
        <div className="flex gap-2 mb-3">
          <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder={isCol ? 'Rider name (optional)' : 'What for?'}
            className="min-w-0 flex-1 px-2.5 py-2 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#7C3AED]" />
          <input type="number" min="0" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="₹"
            className="w-24 px-2.5 py-2 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#7C3AED]" />
          <button onClick={() => add(kind)} disabled={busy} aria-label="Add"
            className="flex items-center justify-center w-10 rounded-lg text-white disabled:opacity-50" style={{ background: accent }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {list.length === 0 ? (
          <p className="text-[12px] text-[#9CA3AF] py-3 text-center">Nothing added for this day.</p>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {list.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[12.5px] text-[#374151] truncate">{e.label ?? (isCol ? 'Collection' : 'Expense')}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-[13px] font-[700]" style={{ color: accent }}>{inr(e.amount)}</span>
                  <button onClick={() => remove(e.id)} aria-label="Remove" className="text-[#9CA3AF] hover:text-[#DC2626]"><Trash2 className="w-3.5 h-3.5" /></button>
                </span>
              </div>
            ))}
          </div>
        )}
        {list.length > 1 && (
          <div className="flex justify-between border-t border-[#E5E7EB] mt-2 pt-2.5 text-[12.5px] font-[700] text-[#111827]">
            <span>Total</span><span>{inr(isCol ? collected : spent)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 space-y-3">
          <div>
            <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Day Book</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Delivered orders, what the riders handed in, Cashfree, expenses and the final amount for the day</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E5E7EB] hover:bg-[#F8FAFC]"><ChevronLeft className="w-4 h-4" /></button>
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)}
              className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-[13px] outline-none focus:border-[#7C3AED]" />
            <button onClick={() => setDay(shiftDay(day, 1))} aria-label="Next day" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E5E7EB] hover:bg-[#F8FAFC]"><ChevronRight className="w-4 h-4" /></button>
            {[['2 days ago', -2], ['Yesterday', -1], ['Today', 0], ['Tomorrow', 1]].map(([label, offset]) => {
              const key = shiftDay(todayKey(), offset as number)
              return (
                <button key={label as string} onClick={() => setDay(key)}
                  className={`px-3 py-2 rounded-lg text-[12.5px] font-[600] ${day === key ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'}`}>
                  {label as string}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6 space-y-6 max-w-5xl">
          {error && <div className="px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[12.5px] text-[#B91C1C]">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" /></div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                <p className="text-[12px] text-[#9CA3AF] mb-1">{dayLabel}</p>
                {row(`Delivered orders (${orders.length})`, inr(deliveredTotal), { strong: true })}
                {row('Cashfree (paid online)', inr(cashfree), { sign: '−' })}
                {riderQr > 0 && row('Paid by QR straight to your UPI', inr(riderQr), { sign: '−' })}
                {row('Cash the delivery boys should hand in', inr(cashDue), { strong: true })}
                {row('Collected from delivery boys', inr(collected), { sign: '−' })}
                {row(pending < 0 ? 'Extra collected' : 'Pending with delivery boys', inr(Math.abs(pending)), { strong: true, color: pending > 0 ? '#D97706' : pending < 0 ? '#7C3AED' : '#16A34A' })}
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {entryBox('collection')}
                {entryBox('expense')}
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-zippy-sm">
                {row('Collected + Cashfree' + (riderQr > 0 ? ' + QR' : ''), inr(collected + cashfree + riderQr))}
                {row('Expenses', inr(spent), { sign: '−' })}
                {row(finalAmount >= 0 ? 'Final amount (in hand)' : 'Final amount (loss)', `${finalAmount < 0 ? '−' : ''}${inr(Math.abs(finalAmount))}`, { strong: true, color: finalAmount >= 0 ? '#16A34A' : '#DC2626' })}
                {pending > 0 && (
                  <p className="text-[12px] text-[#6B7280] mt-1">
                    Once the pending {inr(pending)} comes in, the day ends at <b>{ifAllCollected < 0 ? '−' : ''}{inr(Math.abs(ifAllCollected))}</b>.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
