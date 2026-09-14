'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Smartphone, PiggyBank, Receipt, Wallet, Plus, Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DateRangeFilter, { presetRange, type DateRange } from '@/components/DateRangeFilter'
import { todayKey } from '@/lib/analytics'

const supabase = createClient()

type SavingEntry = { id: string; entry_date: string; online_amount: number; cash_amount: number; note: string | null }
type ExpenseEntry = { id: string; entry_date: string; description: string; amount: number; note: string | null }

export default function AdminSavingsPage() {
  const [range, setRange] = useState<DateRange>(presetRange(30))
  const [savings, setSavings] = useState<SavingEntry[]>([])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [savingForm, setSavingForm] = useState({ date: todayKey(), online: '', cash: '', note: '' })
  const [expenseForm, setExpenseForm] = useState({ date: todayKey(), description: '', amount: '', note: '' })
  const [savingBusy, setSavingBusy] = useState(false)
  const [expenseBusy, setExpenseBusy] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: sv }, { data: ex }] = await Promise.all([
      supabase.from('savings_entries').select('id, entry_date, online_amount, cash_amount, note')
        .gte('entry_date', range.from).lte('entry_date', range.to)
        .order('entry_date', { ascending: false }),
      supabase.from('expense_entries').select('id, entry_date, description, amount, note')
        .gte('entry_date', range.from).lte('entry_date', range.to)
        .order('entry_date', { ascending: false }),
    ])
    setSavings((sv as SavingEntry[]) ?? [])
    setExpenses((ex as ExpenseEntry[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [range])

  async function addSaving() {
    const online = Number(savingForm.online) || 0
    const cash = Number(savingForm.cash) || 0
    if (online === 0 && cash === 0) return
    setSavingBusy(true)
    await supabase.from('savings_entries').insert({
      entry_date: savingForm.date, online_amount: online, cash_amount: cash, note: savingForm.note || null,
    })
    setSavingForm({ date: todayKey(), online: '', cash: '', note: '' })
    await load()
    setSavingBusy(false)
  }

  async function addExpense() {
    const amount = Number(expenseForm.amount) || 0
    if (amount === 0 || !expenseForm.description.trim()) return
    setExpenseBusy(true)
    await supabase.from('expense_entries').insert({
      entry_date: expenseForm.date, description: expenseForm.description.trim(), amount, note: expenseForm.note || null,
    })
    setExpenseForm({ date: todayKey(), description: '', amount: '', note: '' })
    await load()
    setExpenseBusy(false)
  }

  const totalSavedOnline = savings.reduce((s, e) => s + Number(e.online_amount), 0)
  const totalSavedCash = savings.reduce((s, e) => s + Number(e.cash_amount), 0)
  const totalSaved = totalSavedOnline + totalSavedCash
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const netSavings = totalSaved - totalExpenses

  const book = [
    ...savings.map((s) => ({ type: 'saving' as const, id: s.id, date: s.entry_date, label: 'Daily savings', amount: Number(s.online_amount) + Number(s.cash_amount), note: s.note, detail: `Online ₹${s.online_amount} · Cash ₹${s.cash_amount}` })),
    ...expenses.map((e) => ({ type: 'expense' as const, id: e.id, date: e.entry_date, label: e.description, amount: Number(e.amount), note: e.note, detail: null as string | null })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 space-y-3">
          <div>
            <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Savings & Expenses</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Record what you actually saved each day, then deduct expenses from it</p>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Saved Online', value: totalSavedOnline, icon: Smartphone, color: '#16A34A', bg: '#DCFCE7' },
              { label: 'Saved Cash',   value: totalSavedCash,   icon: PiggyBank,   color: '#7C3AED', bg: '#F5F3FF' },
              { label: 'Expenses',     value: totalExpenses,    icon: Receipt,     color: '#DC2626', bg: '#FEF2F2' },
              { label: 'Net Savings',  value: netSavings,       icon: Wallet,      color: '#0891B2', bg: '#ECFEFF' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="text-[22px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>₹{value.toLocaleString()}</div>
                <div className="text-[12px] text-[#9CA3AF] mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
              <p className="text-[13.5px] font-[700] text-[#111827] mb-3 flex items-center gap-1.5"><PiggyBank className="w-4 h-4 text-[#16A34A]" /> Add Savings</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input type="date" value={savingForm.date} onChange={(e) => setSavingForm((f) => ({ ...f, date: e.target.value }))}
                  className="col-span-2 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#16A34A]" />
                <input type="number" min="0" placeholder="Online ₹" value={savingForm.online} onChange={(e) => setSavingForm((f) => ({ ...f, online: e.target.value }))}
                  className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#16A34A]" />
                <input type="number" min="0" placeholder="Cash ₹" value={savingForm.cash} onChange={(e) => setSavingForm((f) => ({ ...f, cash: e.target.value }))}
                  className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#16A34A]" />
                <textarea placeholder="Note (optional) — write anything you need to remember about this entry" rows={2} value={savingForm.note} onChange={(e) => setSavingForm((f) => ({ ...f, note: e.target.value }))}
                  className="col-span-2 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#16A34A] resize-y" />
              </div>
              <button onClick={addSaving} disabled={savingBusy}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#16A34A] text-white text-[12.5px] font-[600] disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> {savingBusy ? 'Saving…' : 'Add Savings'}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
              <p className="text-[13.5px] font-[700] text-[#111827] mb-3 flex items-center gap-1.5"><Receipt className="w-4 h-4 text-[#DC2626]" /> Add Expense</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                  className="col-span-2 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#DC2626]" />
                <input type="text" placeholder="Description" value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                  className="col-span-2 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#DC2626]" />
                <input type="number" min="0" placeholder="Amount ₹" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  className="col-span-2 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#DC2626]" />
                <textarea placeholder="Note (optional) — write anything you need to remember about this entry" rows={2} value={expenseForm.note} onChange={(e) => setExpenseForm((f) => ({ ...f, note: e.target.value }))}
                  className="col-span-2 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#DC2626] resize-y" />
              </div>
              <button onClick={addExpense} disabled={expenseBusy}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#DC2626] text-white text-[12.5px] font-[600] disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> {expenseBusy ? 'Saving…' : 'Add Expense'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-zippy-sm">
            <h2 className="text-[15px] font-[700] text-[#111827] mb-4" style={{ fontWeight: 700 }}>Entries</h2>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
              </div>
            ) : book.length === 0 ? (
              <p className="text-[12.5px] text-[#9CA3AF] text-center py-10">No savings or expenses recorded in this range yet.</p>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {book.map((entry) => (
                  <div key={`${entry.type}-${entry.id}`} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-[600] text-[#111827] truncate">{entry.label}</p>
                      <p className="text-[11px] text-[#9CA3AF]">
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {entry.detail ? ` · ${entry.detail}` : ''}
                      </p>
                      {entry.note && <p className="text-[11.5px] text-[#6B7280] mt-1 whitespace-pre-wrap">{entry.note}</p>}
                    </div>
                    <span className="text-[13px] font-[700] shrink-0" style={{ color: entry.type === 'saving' ? '#16A34A' : '#DC2626' }}>
                      {entry.type === 'saving' ? '+' : '−'}₹{entry.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
