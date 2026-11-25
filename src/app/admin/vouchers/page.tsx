'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdminSidebar from '@/components/admin/AdminSidebar'

const supabase = createClient()

type Voucher = {
  id: string
  code: string
  description: string | null
  discount_type: 'flat' | 'percent'
  discount_value: number
  max_discount: number | null
  min_order: number
  applies_to: 'all' | 'orders' | 'auto'
  max_uses: number | null
  uses: number
  expires_at: string | null
  is_active: boolean
}

const SCOPE: Record<string, string> = { all: 'Orders & autos', orders: 'Food & grocery orders', auto: 'Auto rides' }

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'flat' | 'percent'>('flat')
  const [value, setValue] = useState('')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [scope, setScope] = useState<'all' | 'orders' | 'auto'>('all')
  const [maxUses, setMaxUses] = useState('')
  const [expires, setExpires] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false })
    setVouchers((data as Voucher[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    const c = code.trim().toUpperCase().replace(/\s+/g, '')
    const v = Number(value)
    if (!c || !(v > 0)) { setMsg('Enter a code and a discount greater than 0.'); return }
    if (type === 'percent' && v > 100) { setMsg('A percentage discount cannot be more than 100.'); return }
    setSaving(true)
    const { error } = await supabase.from('vouchers').insert({
      code: c, description: description.trim() || null, discount_type: type, discount_value: v,
      max_discount: maxDiscount ? Number(maxDiscount) : null, min_order: minOrder ? Number(minOrder) : 0,
      applies_to: scope, max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
    })
    setSaving(false)
    if (error) { setMsg(error.code === '23505' ? 'That code already exists.' : 'Could not create the voucher.'); return }
    setMsg(`Voucher ${c} created.`)
    setCode(''); setDescription(''); setValue(''); setMaxDiscount(''); setMinOrder(''); setMaxUses(''); setExpires('')
    load()
  }

  async function toggle(v: Voucher) {
    setVouchers((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_active: !x.is_active } : x)))
    const { error } = await supabase.from('vouchers').update({ is_active: !v.is_active }).eq('id', v.id)
    if (error) { setMsg('Could not update the voucher.'); load() }
  }

  async function remove(v: Voucher) {
    if (!window.confirm(`Delete voucher ${v.code}?`)) return
    const { error } = await supabase.from('vouchers').delete().eq('id', v.id)
    if (error) setMsg('Could not delete the voucher.'); else load()
  }

  const input = 'mt-1 w-full px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30'

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Vouchers</h1>
          <p className="text-[12.5px] text-[#9CA3AF]">Optional discount codes. Only the codes created here work in the app.</p>
        </div>

        <div className="p-6 space-y-4">
          {msg && <div className="px-4 py-2.5 rounded-xl bg-[#F3E8FF] text-[#6D28D9] text-[13px]">{msg}</div>}

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
            <p className="flex items-center gap-2 text-[14px] font-[700] text-[#111827]"><Plus className="w-4 h-4 text-[#7C3AED]" /> New voucher</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Code
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME50" className={input} /></label>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Discount type
                <select value={type} onChange={(e) => setType(e.target.value as 'flat' | 'percent')} className={input}>
                  <option value="flat">Flat ₹ off</option><option value="percent">Percent % off</option></select></label>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">{type === 'flat' ? 'Amount (₹)' : 'Percent (%)'}
                <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className={input} /></label>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Valid for
                <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className={input}>
                  <option value="all">Orders & autos</option><option value="orders">Food & grocery orders</option><option value="auto">Auto rides</option></select></label>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Minimum order (₹)
                <input type="number" min={0} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" className={input} /></label>
              {type === 'percent' && (
                <label className="text-[11.5px] font-[600] text-[#6B7280]">Max discount (₹)
                  <input type="number" min={0} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="No cap" className={input} /></label>
              )}
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Total uses allowed
                <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" className={input} /></label>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Expires on
                <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={input} /></label>
              <label className="text-[11.5px] font-[600] text-[#6B7280] sm:col-span-2">Note (shown to the customer)
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="₹50 off your first order" className={input} /></label>
            </div>
            <button onClick={create} disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#7C3AED] text-white text-[13px] font-[600] hover:bg-[#6D28D9] disabled:opacity-50">
              {saving ? 'Creating…' : 'Create voucher'}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#7C3AED] animate-spin" /></div>
          ) : vouchers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 bg-white rounded-2xl border border-[#E5E7EB]">
              <Ticket className="w-8 h-8 text-[#D1D5DB]" />
              <p className="text-[14px] font-[600] text-[#374151]">No vouchers yet</p>
              <p className="text-[12.5px] text-[#9CA3AF]">Customers will see an optional voucher box at checkout, but no code works until you create it.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vouchers.map((v) => {
                const expired = v.expires_at && new Date(v.expires_at) < new Date()
                const used = v.max_uses != null && v.uses >= v.max_uses
                return (
                  <div key={v.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[15px] font-mono font-[700] text-[#111827]">{v.code}
                        <span className="ml-2 text-[13px] font-sans font-[600] text-[#7C3AED]">
                          {v.discount_type === 'flat' ? `₹${v.discount_value} off` : `${v.discount_value}% off${v.max_discount ? ` (max ₹${v.max_discount})` : ''}`}
                        </span>
                      </p>
                      <p className="text-[12px] text-[#6B7280]">
                        {SCOPE[v.applies_to]} · min ₹{v.min_order} · used {v.uses}{v.max_uses ? `/${v.max_uses}` : ''}
                        {v.expires_at ? ` · expires ${new Date(v.expires_at).toLocaleDateString()}` : ''}
                      </p>
                      {v.description && <p className="text-[12px] text-[#9CA3AF]">{v.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggle(v)}
                        className={cn('px-3 py-1.5 rounded-full text-[11.5px] font-[700]',
                          v.is_active && !expired && !used ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F3F4F6] text-[#6B7280]')}>
                        {expired ? 'Expired' : used ? 'Used up' : v.is_active ? 'Active' : 'Off'}
                      </button>
                      <button onClick={() => remove(v)} className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2]" aria-label={`Delete ${v.code}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
