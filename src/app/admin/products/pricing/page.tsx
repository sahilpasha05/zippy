'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Search, Loader2, CheckCircle, Package } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Category = { id: string; name: string }
type Product = {
  id: string; category_id: string; name: string; brand: string | null
  image_url: string | null; price: number; mrp: number | null; weight: string | null
}

const SAVE_DEBOUNCE_MS = 600

export default function PricingBulkEditPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState('all')
  const [needsPricingOnly, setNeedsPricingOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const load = useCallback(async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('grocery_categories').select('id, name').eq('is_active', true).order('sort_order'),
      supabase.from('grocery_products').select('id, category_id, name, brand, image_url, price, mrp, weight').order('name'),
    ])
    setCategories((cats as Category[]) ?? [])
    setProducts((prods as Product[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function updateLocal(id: string, patch: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function scheduleSave(id: string, patch: Record<string, number | null>) {
    if (timers.current[id]) clearTimeout(timers.current[id])
    setSavedIds((s) => { if (!s.has(id)) return s; const n = new Set(s); n.delete(id); return n })
    timers.current[id] = setTimeout(async () => {
      setSavingIds((s) => new Set(s).add(id))
      await supabase.from('grocery_products').update(patch).eq('id', id)
      setSavingIds((s) => { const n = new Set(s); n.delete(id); return n })
      setSavedIds((s) => new Set(s).add(id))
      setTimeout(() => setSavedIds((s) => { const n = new Set(s); n.delete(id); return n }), 1500)
    }, SAVE_DEBOUNCE_MS)
  }

  function onPriceChange(p: Product, value: string) {
    const num = value === '' ? 0 : Number(value)
    updateLocal(p.id, { price: num })
    scheduleSave(p.id, { price: num })
  }

  function onMrpChange(p: Product, value: string) {
    const num = value === '' ? null : Number(value)
    updateLocal(p.id, { mrp: num })
    scheduleSave(p.id, { mrp: num })
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'
  const needsPricingCount = products.filter((p) => !p.price).length

  const filtered = products.filter((p) => {
    const matchCat = activeCat === 'all' || p.category_id === activeCat
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchNeedsPricing = !needsPricingOnly || !p.price
    return matchCat && matchSearch && matchNeedsPricing
  })

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <Link href="/admin/products" className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] hover:text-[#7C3AED] transition-colors mb-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
              </Link>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Bulk Edit Prices</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">
                {products.length} products
                {needsPricingCount > 0 && <span className="text-[#D97706] font-medium"> · {needsPricingCount} need pricing</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#7C3AED] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="bg-transparent text-[13px] outline-none w-40 placeholder:text-[#9CA3AF]" />
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setNeedsPricingOnly((v) => !v)}
              className={cn('px-3.5 py-1.5 rounded-xl text-[12px] font-medium whitespace-nowrap shrink-0 transition-all',
                needsPricingOnly ? 'bg-[#D97706] text-white' : 'bg-[#FFFBEB] text-[#D97706] hover:bg-[#FEF3C7]')}>
              Needs Pricing ({needsPricingCount})
            </button>
            <button onClick={() => setActiveCat('all')}
              className={cn('px-3.5 py-1.5 rounded-xl text-[12px] font-medium whitespace-nowrap shrink-0 transition-all',
                activeCat === 'all' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
              All Categories
            </button>
            {categories.map((c) => {
              const count = products.filter((p) => p.category_id === c.id).length
              if (count === 0) return null
              return (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={cn('px-3.5 py-1.5 rounded-xl text-[12px] font-medium whitespace-nowrap shrink-0 transition-all',
                    activeCat === c.id ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                  {c.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl border border-[#E5E7EB] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[#9CA3AF]">
              <Package className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No products match</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-x-auto shadow-zippy-sm">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {['', 'Product', 'Category', 'Price (₹)', 'MRP (₹)', ''].map((h, i) => (
                      <th key={i} className="text-left text-[11px] font-[600] text-[#9CA3AF] px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFC]">
                  {filtered.map((p) => (
                    <tr key={p.id} className={cn('hover:bg-[#FAFAFA] transition-colors', !p.price && 'bg-[#FFFBEB]/40')}>
                      <td className="pl-4 py-2.5">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB] relative shrink-0">
                          {p.image_url ? (
                            <Image src={p.image_url} alt={p.name} fill unoptimized className="object-cover" sizes="40px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]"><Package className="w-4 h-4" /></div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-[13px] font-[600] text-[#111827] leading-snug">{p.name}</p>
                        <p className="text-[11px] text-[#9CA3AF]">{p.brand ?? ''}{p.brand && p.weight ? ' · ' : ''}{p.weight ?? ''}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[#6B7280] whitespace-nowrap">{catName(p.category_id)}</td>
                      <td className="px-4 py-2.5">
                        <input type="number" step="0.01" min="0" value={p.price === 0 ? '' : p.price}
                          onChange={(e) => onPriceChange(p, e.target.value)}
                          placeholder="0"
                          className={cn('w-24 px-2.5 py-1.5 border rounded-lg text-[13px] font-[700] outline-none transition-all',
                            !p.price ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#D97706] focus:border-[#D97706]' : 'border-[#E5E7EB] text-[#111827] focus:border-[#7C3AED]')} />
                      </td>
                      <td className="px-4 py-2.5">
                        <input type="number" step="0.01" min="0" value={p.mrp ?? ''}
                          onChange={(e) => onMrpChange(p, e.target.value)}
                          placeholder="—"
                          className="w-24 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[13px] text-[#374151] outline-none focus:border-[#7C3AED] transition-all" />
                      </td>
                      <td className="px-4 py-2.5 w-8">
                        {savingIds.has(p.id) && <Loader2 className="w-4 h-4 text-[#9CA3AF] animate-spin" />}
                        {savedIds.has(p.id) && <CheckCircle className="w-4 h-4 text-[#16A34A]" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
