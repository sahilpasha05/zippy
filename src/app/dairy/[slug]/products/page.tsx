'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { Plus, Search, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle, Package, X, Edit2 } from 'lucide-react'
import DairySidebar from '@/components/dairy/DairySidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DAIRY_SLUGS = ['dairy', 'eggs']

type Category = { id: string; name: string; slug: string }
type Partner = { id: string; name: string; slug: string }
type Product = {
  id: string; name: string; category_id: string; image_url: string | null
  price: number; mrp: number | null; weight: string | null
  in_stock: boolean; is_active: boolean
}

const EMPTY_FORM = { name: '', price: '', mrp: '', weight: '', category_id: '' }

export default function DairyProductsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async (partnerId: string, cats: Category[]) => {
    const catIds = cats.map((c) => c.id)
    const { data } = await supabase
      .from('grocery_products')
      .select('id, name, category_id, image_url, price, mrp, weight, in_stock, is_active')
      .eq('grocery_partner_id', partnerId)
      .in('category_id', catIds)
      .order('created_at', { ascending: false })
    setProducts((data as Product[]) ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const [{ data: part }, { data: cats }] = await Promise.all([
        supabase.from('grocery_partners').select('id, name, slug').eq('slug', slug).single(),
        supabase.from('grocery_categories').select('id, name, slug').in('slug', DAIRY_SLUGS).order('sort_order'),
      ])
      if (!part) { setLoading(false); return }
      const dairyCats = (cats as Category[]) ?? []
      setPartner(part as Partner)
      setCategories(dairyCats)
      if (dairyCats.length > 0) {
        setForm((f) => ({ ...f, category_id: dairyCats[0].id }))
        await loadData((part as Partner).id, dairyCats)
      }
      setLoading(false)
    }
    init()
  }, [slug, loadData])

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  function openAdd() {
    setForm((f) => ({ ...EMPTY_FORM, category_id: categories[0]?.id ?? '' }))
    setImageUrl('')
    setFormError('')
    setEditItem(null)
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setForm({ name: p.name, price: String(p.price), mrp: p.mrp !== null ? String(p.mrp) : '', weight: p.weight ?? '', category_id: p.category_id })
    setImageUrl(p.image_url ?? '')
    setFormError('')
    setEditItem(p)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!partner) return
    if (!form.name || !form.price || !form.category_id) { setFormError('Name, price and category are required'); return }
    setSaving(true); setFormError('')

    const price = Number(form.price)
    const mrp = form.mrp ? Number(form.mrp) : price
    const image_url = imageUrl.trim() || null

    if (editItem) {
      const { error } = await supabase.from('grocery_products').update({
        name: form.name, price, mrp, weight: form.weight || null, image_url, category_id: form.category_id,
      }).eq('id', editItem.id)
      if (error) { setFormError(error.message); setSaving(false); return }
      setProducts((prev) => prev.map((p) => p.id === editItem.id ? { ...p, name: form.name, price, mrp, weight: form.weight || null, image_url, category_id: form.category_id } : p))
    } else {
      const { data, error } = await supabase.from('grocery_products').insert({
        grocery_partner_id: partner.id,
        category_id: form.category_id,
        name: form.name, price, mrp,
        weight: form.weight || null,
        image_url,
        in_stock: true,
        is_active: true,
      }).select().single()
      if (error || !data) { setFormError(error?.message ?? 'Failed to add'); setSaving(false); return }
      setProducts((prev) => [data as Product, ...prev])
    }

    setSaving(false)
    setShowModal(false)
    setEditItem(null)
  }

  async function toggleActive(p: Product) {
    await supabase.from('grocery_products').update({ is_active: !p.is_active }).eq('id', p.id)
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
  }

  async function toggleStock(p: Product) {
    await supabase.from('grocery_products').update({ in_stock: !p.in_stock }).eq('id', p.id)
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, in_stock: !p.in_stock } : x))
  }

  async function deleteProduct(id: string) {
    if (!confirm('Remove this product from your catalog?')) return
    await supabase.from('grocery_products').delete().eq('id', id)
    setProducts((prev) => prev.filter((x) => x.id !== id))
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? ''
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <DairySidebar partner={partner} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>My Products</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{products.length} items · {products.filter((p) => p.is_active).length} live</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#0891B2] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
                  className="bg-transparent text-[13px] outline-none w-full sm:w-40 min-w-0 placeholder:text-[#9CA3AF]" />
              </div>
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white text-[13px] font-[600] rounded-xl hover:bg-[#0E7490] transition-all shadow-[0_2px_8px_rgba(8,145,178,0.3)] shrink-0">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-[#0891B2] animate-spin" />
            </div>
          ) : !partner ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <p className="text-[15px] font-semibold text-[#374151]">Partner not found</p>
              <p className="text-[13px] text-[#9CA3AF]">Check the portal link and try again</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[#9CA3AF]">
              <Package className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No products yet</p>
              <button onClick={openAdd} className="text-[13px] text-[#0891B2] font-medium">+ Add your first item</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className={cn('bg-white rounded-2xl border overflow-hidden shadow-zippy-sm', p.is_active ? 'border-[#E5E7EB]' : 'border-[#E5E7EB] opacity-60')}>
                  <div className="h-36 bg-[#F8FAFC] relative">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill unoptimized className="object-cover" sizes="300px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]"><Package className="w-10 h-10" strokeWidth={1} /></div>
                    )}
                    {/* Active badge */}
                    <div className="absolute top-3 right-3">
                      <button onClick={() => toggleActive(p)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm"
                        style={{ background: p.is_active ? 'rgba(8,145,178,0.85)' : 'rgba(239,68,68,0.85)', color: 'white' }}>
                        {p.is_active ? 'Live' : 'Hidden'}
                      </button>
                    </div>
                    {/* Category chip */}
                    <span className="absolute top-3 left-3 text-[10px] font-[600] bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[#6B7280]">
                      {catName(p.category_id)}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-[14px] font-[700] text-[#111827] line-clamp-1">{p.name}</h3>
                    <p className="text-[11px] text-[#9CA3AF] mb-3">{p.weight ?? ''}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-[15px] font-[800] text-[#111827]">₹{p.price}</span>
                        {p.mrp && p.mrp > p.price && <span className="text-[11px] text-[#9CA3AF] line-through ml-1">₹{p.mrp}</span>}
                      </div>
                      <button onClick={() => toggleStock(p)} title={p.in_stock ? 'In stock' : 'Out of stock'}
                        className={cn('text-[11px] px-2.5 py-1 rounded-full font-medium transition-all',
                          p.in_stock ? 'text-[#16A34A] bg-[#DCFCE7]' : 'text-[#6B7280] bg-[#F3F4F6]')}>
                        {p.in_stock ? '● In Stock' : '○ Out of Stock'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-[#F3F4F6]">
                      <button onClick={() => openEdit(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#0891B2] hover:text-[#0891B2] transition-all">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => deleteProduct(p.id)}
                        className="flex items-center justify-center py-2 px-4 border border-[#FEE2E2] rounded-xl text-[12px] text-[#DC2626] hover:bg-[#FEF2F2] transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white">
              <h2 className="text-[16px] font-[800] text-[#111827]">{editItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
            <div className="p-6">
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#DC2626] mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Category</label>
                  <select value={form.category_id} onChange={(e) => setF('category_id', e.target.value)} required
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#0891B2] bg-white transition-all">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Item Name *</label>
                  <input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="e.g. Amul Butter 500g" required
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#0891B2] transition-all" />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Weight / Pack</label>
                  <input value={form.weight} onChange={(e) => setF('weight', e.target.value)} placeholder="500 g / 6 pcs (optional)"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#0891B2] transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Price (₹) *</label>
                    <input type="number" step="0.01" value={form.price} onChange={(e) => setF('price', e.target.value)} placeholder="49" required
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#0891B2] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">MRP (₹)</label>
                    <input type="number" step="0.01" value={form.mrp} onChange={(e) => setF('mrp', e.target.value)} placeholder="55 (optional)"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#0891B2] transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Image URL</label>
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..."
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#0891B2] transition-all font-mono" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-[#0891B2] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#0E7490] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
