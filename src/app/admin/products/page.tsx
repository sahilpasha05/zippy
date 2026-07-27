'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { Plus, Search, Trash2, ToggleLeft, ToggleRight, Loader2, CheckCircle, AlertCircle, Package, Flame } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Category = { id: string; name: string; slug: string }
type Product = {
  id: string; category_id: string; name: string; description: string | null
  image_url: string | null; price: number; mrp: number | null
  weight: string | null; brand: string | null; in_stock: boolean; is_active: boolean
  is_trending: boolean
}

const EMPTY_FORM = { name: '', description: '', image_url: '', price: '', mrp: '', weight: '', brand: '', category_id: '' }

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const load = useCallback(async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('grocery_categories').select('id, name, slug').eq('is_active', true).order('sort_order'),
      supabase.from('grocery_products').select('id, category_id, name, description, image_url, price, mrp, weight, brand, in_stock, is_active, is_trending').order('created_at', { ascending: false }),
    ])
    setCategories((cats as Category[]) ?? [])
    setProducts((prods as Product[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price || !form.category_id) { setError('Name, price and category are required'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('grocery_products').insert({
      category_id: form.category_id,
      name: form.name,
      description: form.description || null,
      image_url: form.image_url || null,
      price: +form.price,
      mrp: form.mrp ? +form.mrp : +form.price,
      weight: form.weight || null,
      brand: form.brand || null,
      in_stock: true,
      is_active: true,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowModal(false)
    setForm(EMPTY_FORM)
    setSavedMsg('Product added!')
    setTimeout(() => setSavedMsg(''), 2500)
    load()
  }

  async function toggleStock(p: Product) {
    await supabase.from('grocery_products').update({ in_stock: !p.in_stock }).eq('id', p.id)
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, in_stock: !p.in_stock } : x))
  }

  async function toggleTrending(p: Product) {
    await supabase.from('grocery_products').update({ is_trending: !p.is_trending }).eq('id', p.id)
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_trending: !p.is_trending } : x))
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('grocery_products').delete().eq('id', id)
    setProducts((prev) => prev.filter((x) => x.id !== id))
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'

  const filtered = products.filter((p) => {
    const matchCat = activeCat === 'all' || p.category_id === activeCat
    return matchCat && p.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Products</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{products.length} products · {categories.length} categories</p>
            </div>
            <div className="flex items-center gap-3">
              {savedMsg && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-[#16A34A] font-medium">
                  <CheckCircle className="w-4 h-4" /> {savedMsg}
                </span>
              )}
              <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#7C3AED] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="bg-transparent text-[13px] outline-none w-40 placeholder:text-[#9CA3AF]" />
              </div>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
          </div>
          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setActiveCat('all')}
              className={cn('px-3.5 py-1.5 rounded-xl text-[12px] font-medium whitespace-nowrap shrink-0 transition-all',
                activeCat === 'all' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
              All ({products.length})
            </button>
            {categories.map((c) => {
              const count = products.filter((p) => p.category_id === c.id).length
              return (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={cn('px-3.5 py-1.5 rounded-xl text-[12px] font-medium whitespace-nowrap shrink-0 transition-all',
                    activeCat === c.id ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                  {c.name} {count > 0 && <span className="opacity-70">({count})</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-white rounded-2xl border border-[#E5E7EB] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[#9CA3AF]">
              <Package className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No products in this category</p>
              <button onClick={() => setShowModal(true)} className="text-[13px] text-[#7C3AED] font-medium">+ Add the first product</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className={cn('bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-zippy-sm', !p.in_stock && 'opacity-60')}>
                  <div className="h-32 bg-[#F8FAFC] relative">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="300px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]"><Package className="w-8 h-8" /></div>
                    )}
                    <span className="absolute top-2 left-2 text-[10px] font-[600] bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[#6B7280]">
                      {catName(p.category_id)}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <h3 className="text-[13px] font-[700] text-[#111827] leading-snug line-clamp-1">{p.name}</h3>
                    <p className="text-[11px] text-[#9CA3AF] mb-2">{p.brand ?? ''}{p.brand && p.weight ? ' · ' : ''}{p.weight ?? ''}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[14px] font-[800] text-[#111827]">₹{p.price}</span>
                        {p.mrp && p.mrp > p.price && <span className="text-[11px] text-[#9CA3AF] line-through ml-1">₹{p.mrp}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleTrending(p)}
                          title={p.is_trending ? 'Trending on home page — click to remove' : 'Mark as Trending on home page'}
                          className={cn('p-1.5 rounded-lg transition-all', p.is_trending ? 'bg-[#FFF7ED] text-[#EA580C]' : 'text-[#D1D5DB] hover:text-[#EA580C] hover:bg-[#FFF7ED]')}>
                          <Flame className={cn('w-4 h-4', p.is_trending && 'fill-[#EA580C]')} />
                        </button>
                        <button onClick={() => toggleStock(p)} title={p.in_stock ? 'In stock' : 'Out of stock'}>
                          {p.in_stock ? <ToggleRight className="w-7 h-7 text-[#16A34A]" /> : <ToggleLeft className="w-7 h-7 text-[#D1D5DB]" />}
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="text-[#DC2626] hover:bg-[#FEF2F2] p-1.5 rounded-lg transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add product modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-[17px] font-[800] text-[#111827] mb-5">Add New Product</h2>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#DC2626] mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <form className="space-y-4" onSubmit={addProduct}>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Category *</label>
                <select value={form.category_id} onChange={(e) => setF('category_id', e.target.value)} required
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] bg-white transition-all">
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Product Name *</label>
                <input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="e.g. Amul Butter" required
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setF('description', e.target.value)} rows={2} placeholder="Short description..."
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Price (₹) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setF('price', e.target.value)} placeholder="49" required
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">MRP (₹)</label>
                  <input type="number" step="0.01" value={form.mrp} onChange={(e) => setF('mrp', e.target.value)} placeholder="55"
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Weight / Size</label>
                  <input value={form.weight} onChange={(e) => setF('weight', e.target.value)} placeholder="500 g"
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Brand</label>
                  <input value={form.brand} onChange={(e) => setF('brand', e.target.value)} placeholder="Amul"
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Image URL</label>
                <input value={form.image_url} onChange={(e) => setF('image_url', e.target.value)} placeholder="https://..."
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all font-mono" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#6D28D9] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
