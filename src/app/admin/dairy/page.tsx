'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Plus, Search, Trash2, ToggleLeft, ToggleRight, Loader2, CheckCircle, AlertCircle, Package, X, Save } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createClient()

type Category = { id: string; name: string; slug: string }
type Product = {
  id: string; category_id: string; name: string; description: string | null
  image_url: string | null; price: number; mrp: number | null
  weight: string | null; brand: string | null
  in_stock: boolean; is_active: boolean
  created_at: string
}

const DAIRY_SLUGS = ['dairy', 'eggs']
const EMPTY_FORM = { name: '', description: '', image_url: '', price: '', mrp: '', weight: '', brand: '', category_id: '' }
const FIELD_LABEL = 'text-[11px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-1'
const FIELD_INPUT = 'w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all'

export default function AdminDairyPage() {
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
  const [togglingStock, setTogglingStock] = useState<string | null>(null)
  const [togglingActive, setTogglingActive] = useState<string | null>(null)

  // Detail / edit view
  const [selected, setSelected] = useState<Product | null>(null)
  const [detailForm, setDetailForm] = useState<Product | null>(null)
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailError, setDetailError] = useState('')

  const load = useCallback(async () => {
    const { data: cats } = await supabase
      .from('grocery_categories')
      .select('id, name, slug')
      .in('slug', DAIRY_SLUGS)
      .order('sort_order')
    const dairyCats = (cats as Category[]) ?? []
    setCategories(dairyCats)

    if (dairyCats.length === 0) { setLoading(false); return }

    const catIds = dairyCats.map((c) => c.id)
    const { data: prods } = await supabase
      .from('grocery_products')
      .select('id, category_id, name, description, image_url, price, mrp, weight, brand, in_stock, is_active, created_at')
      .in('category_id', catIds)
      .order('created_at', { ascending: false })
    setProducts((prods as Product[]) ?? [])
    setLoading(false)

    // Pre-select first category in the add form
    if (dairyCats.length > 0 && !form.category_id) {
      setForm((f) => ({ ...f, category_id: dairyCats[0].id }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setForm((f) => ({ ...EMPTY_FORM, category_id: f.category_id }))
    setSavedMsg('Product added!')
    setTimeout(() => setSavedMsg(''), 2500)
    load()
  }

  async function toggleStock(p: Product) {
    setTogglingStock(p.id)
    const { error: err } = await supabase.from('grocery_products').update({ in_stock: !p.in_stock }).eq('id', p.id)
    if (!err) setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, in_stock: !p.in_stock } : x))
    setTogglingStock(null)
  }

  async function toggleActive(p: Product) {
    setTogglingActive(p.id)
    const { error: err } = await supabase.from('grocery_products').update({ is_active: !p.is_active }).eq('id', p.id)
    if (!err) setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
    setTogglingActive(null)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('grocery_products').delete().eq('id', id)
    setProducts((prev) => prev.filter((x) => x.id !== id))
    if (selected?.id === id) { setSelected(null); setDetailForm(null) }
  }

  function openDetail(p: Product) {
    setSelected(p)
    setDetailForm({ ...p })
    setDetailError('')
  }

  function setDF<K extends keyof Product>(k: K, v: Product[K]) {
    setDetailForm((f) => f ? { ...f, [k]: v } : f)
  }

  async function saveDetail() {
    if (!detailForm) return
    setDetailSaving(true); setDetailError('')
    const { error: err } = await supabase.from('grocery_products').update({
      name: detailForm.name,
      description: detailForm.description,
      image_url: detailForm.image_url,
      price: detailForm.price,
      mrp: detailForm.mrp,
      weight: detailForm.weight,
      brand: detailForm.brand,
      category_id: detailForm.category_id,
      in_stock: detailForm.in_stock,
      is_active: detailForm.is_active,
    }).eq('id', detailForm.id)
    setDetailSaving(false)
    if (err) { setDetailError(err.message); return }
    setProducts((prev) => prev.map((x) => x.id === detailForm.id ? detailForm : x))
    setSelected(detailForm)
    setSavedMsg('Saved!')
    setTimeout(() => setSavedMsg(''), 2500)
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'

  const filtered = products.filter((p) => {
    const matchCat = activeCat === 'all' || p.category_id === activeCat
    return matchCat && p.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Dairy & Eggs</h1>
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

        {/* Product cards */}
        <div className="p-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-white rounded-2xl border border-[#E5E7EB] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[#9CA3AF]">
              <Package className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No products yet</p>
              <button onClick={() => setShowModal(true)} className="text-[13px] text-[#7C3AED] font-medium">+ Add first product</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className={cn('bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-zippy-sm hover:shadow-zippy transition-all group', !p.in_stock && 'opacity-70')}>
                  {/* Cover image */}
                  <div className="relative h-36 bg-[#F8FAFC]">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill unoptimized className="object-cover" sizes="400px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]">
                        <Package className="w-10 h-10" strokeWidth={1} />
                      </div>
                    )}
                    {/* Active badge */}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => toggleActive(p)}
                        disabled={togglingActive === p.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm transition-all"
                        style={{ background: p.is_active ? 'rgba(22,163,74,0.85)' : 'rgba(239,68,68,0.85)', color: 'white' }}
                      >
                        {togglingActive === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : p.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                        {p.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    {/* Category badge */}
                    <span className="absolute top-3 left-3 text-[10px] font-[600] bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[#6B7280]">
                      {catName(p.category_id)}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-[14.5px] font-[700] text-[#111827] line-clamp-1" style={{ fontWeight: 700 }}>{p.name}</h3>
                        <p className="text-[12px] text-[#6B7280]">
                          {p.brand ?? ''}{p.brand && p.weight ? ' · ' : ''}{p.weight ?? ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[15px] font-[800] text-[#111827]">₹{p.price}</span>
                        {p.mrp && p.mrp > p.price && (
                          <div className="text-[11px] text-[#9CA3AF] line-through">₹{p.mrp}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
                      {/* Stock toggle */}
                      <button
                        onClick={() => toggleStock(p)}
                        disabled={togglingStock === p.id}
                        title={p.in_stock ? 'In stock — click to mark out of stock' : 'Out of stock — click to mark in stock'}
                        className={cn('flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full font-medium transition-all disabled:opacity-60',
                          p.in_stock ? 'text-[#16A34A] bg-[#DCFCE7] hover:bg-[#BBF7D0]' : 'text-[#6B7280] bg-[#F3F4F6] hover:bg-[#E5E7EB]')}>
                        {togglingStock === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (p.in_stock ? '● In Stock' : '○ Out of Stock')}
                      </button>

                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetail(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] text-[12px] font-medium text-[#374151] rounded-xl hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                          Edit
                        </button>
                        <button onClick={() => deleteProduct(p.id)}
                          className="p-1.5 text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all">
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
            <h2 className="text-[17px] font-[800] text-[#111827] mb-5">Add Dairy / Egg Product</h2>
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
                  <option value="">Select...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Product Name *</label>
                <input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="e.g. Amul Butter 500g" required
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
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Weight / Pack</label>
                  <input value={form.weight} onChange={(e) => setF('weight', e.target.value)} placeholder="500 g / 6 pcs"
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

      {/* Edit modal */}
      {selected && detailForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSelected(null); setDetailForm(null) }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white z-10">
              <h2 className="text-[16px] font-[800] text-[#111827]">Edit Product</h2>
              <button onClick={() => { setSelected(null); setDetailForm(null) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {detailError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {detailError}
                </div>
              )}
              <div className="grid sm:grid-cols-[160px_1fr] gap-5">
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB] relative shrink-0">
                  {detailForm.image_url ? (
                    <Image src={detailForm.image_url} alt={detailForm.name} fill unoptimized className="object-cover" sizes="160px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]"><Package className="w-8 h-8" /></div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={FIELD_LABEL}>Name</label>
                    <input value={detailForm.name} onChange={(e) => setDF('name', e.target.value)} className={FIELD_INPUT} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Image URL</label>
                    <input value={detailForm.image_url ?? ''} onChange={(e) => setDF('image_url', e.target.value)} className={cn(FIELD_INPUT, 'font-mono text-[12px]')} />
                  </div>
                </div>
              </div>
              <div>
                <label className={FIELD_LABEL}>Description</label>
                <textarea value={detailForm.description ?? ''} onChange={(e) => setDF('description', e.target.value)} rows={2} className={cn(FIELD_INPUT, 'resize-none')} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={FIELD_LABEL}>Price (₹)</label>
                  <input type="number" value={detailForm.price} onChange={(e) => setDF('price', +e.target.value)} className={FIELD_INPUT} />
                </div>
                <div>
                  <label className={FIELD_LABEL}>MRP (₹)</label>
                  <input type="number" value={detailForm.mrp ?? ''} onChange={(e) => setDF('mrp', e.target.value ? +e.target.value : null)} className={FIELD_INPUT} />
                </div>
                <div>
                  <label className={FIELD_LABEL}>Weight / Pack</label>
                  <input value={detailForm.weight ?? ''} onChange={(e) => setDF('weight', e.target.value)} className={FIELD_INPUT} />
                </div>
                <div>
                  <label className={FIELD_LABEL}>Brand</label>
                  <input value={detailForm.brand ?? ''} onChange={(e) => setDF('brand', e.target.value)} className={FIELD_INPUT} />
                </div>
              </div>
              <div>
                <label className={FIELD_LABEL}>Category</label>
                <select value={detailForm.category_id} onChange={(e) => setDF('category_id', e.target.value)} className={cn(FIELD_INPUT, 'bg-white')}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F3F4F6]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={detailForm.in_stock} onChange={(e) => setDF('in_stock', e.target.checked)} className="w-4 h-4 accent-[#16A34A]" />
                  <span className="text-[12.5px] text-[#374151] font-medium">In Stock</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={detailForm.is_active} onChange={(e) => setDF('is_active', e.target.checked)} className="w-4 h-4 accent-[#16A34A]" />
                  <span className="text-[12.5px] text-[#374151] font-medium">Active (visible)</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => deleteProduct(detailForm.id)}
                  className="flex items-center gap-1.5 px-4 py-3 border border-[#FECACA] text-[#DC2626] text-[13.5px] font-[600] rounded-xl hover:bg-[#FEF2F2] transition-all">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <button onClick={saveDetail} disabled={detailSaving}
                  className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#6D28D9] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {detailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
