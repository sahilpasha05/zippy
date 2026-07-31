'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, CheckCircle, AlertCircle, PlusCircle, Package } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Category = { id: string; name: string }
type RecentProduct = { id: string; name: string; price: number; mrp: number | null; category_id: string; created_at: string }

const EMPTY_FORM = { category_id: '', name: '', price: '', offerPrice: '' }
const INPUT = 'w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all'

export default function QuickAddProductPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [recent, setRecent] = useState<RecentProduct[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const load = useCallback(async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('grocery_categories').select('id, name').eq('is_active', true).order('sort_order'),
      supabase.from('grocery_products').select('id, name, price, mrp, category_id, created_at').order('created_at', { ascending: false }).limit(8),
    ])
    setCategories((cats as Category[]) ?? [])
    setRecent((prods as RecentProduct[]) ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price || !form.category_id) { setError('Product name, price and category are required'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('grocery_products').insert({
      category_id: form.category_id,
      name: form.name,
      price: form.offerPrice ? +form.offerPrice : +form.price,
      mrp: +form.price,
      in_stock: true,
      is_active: true,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(EMPTY_FORM)
    setSavedMsg(`"${form.name}" added!`)
    setTimeout(() => setSavedMsg(''), 2500)
    load()
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#F5F3FF] rounded-xl flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Quick Add Product</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">Name, price, offer price, category — that's it.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#DC2626] mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            {savedMsg && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-[12.5px] text-[#16A34A] mb-4">
                <CheckCircle className="w-4 h-4 shrink-0" /> {savedMsg}
              </div>
            )}

            <form className="space-y-4" onSubmit={addProduct}>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Category *</label>
                <select value={form.category_id} onChange={(e) => setF('category_id', e.target.value)} required
                  className={INPUT + ' bg-white'}>
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Product Name *</label>
                <input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="e.g. Amul Butter" required className={INPUT} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Price (₹) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setF('price', e.target.value)} placeholder="55" required className={INPUT} />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Offer Price (₹)</label>
                  <input type="number" step="0.01" value={form.offerPrice} onChange={(e) => setF('offerPrice', e.target.value)} placeholder="49 (optional)" className={INPUT} />
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3 bg-[#7C3AED] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#6D28D9] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Add Product
              </button>
            </form>
          </div>

          {recent.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-2">Recently added</p>
              <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
                {recent.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-[#D1D5DB]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-[600] text-[#111827] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{catName(p.category_id)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[13px] font-[700] text-[#111827]">₹{p.price}</span>
                      {p.mrp && p.mrp > p.price && <span className="text-[11px] text-[#9CA3AF] line-through ml-1">₹{p.mrp}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
