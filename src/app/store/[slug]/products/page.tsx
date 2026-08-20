'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { Plus, Search, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle, Package, X, Edit2 } from 'lucide-react'
import StorePartnerSidebar from '@/components/store/StorePartnerSidebar'
import ImageUploadField from '@/components/admin/ImageUploadField'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Vegetables & Fruits has its own separate partner portal — store partners
// manage every other category.
const PRODUCE_CATEGORY_ID = 'beec9b69-bce0-436c-9d3b-e6260ba88ef4'

type Category = { id: string; name: string }
type Partner = { id: string; name: string; slug: string }
type Product = {
  id: string; name: string; image_url: string | null
  price: number; mrp: number | null; weight: string | null; category_id: string | null
  in_stock: boolean; is_active: boolean
}

const EMPTY_FORM = { category_id: '', name: '', price: '', mrp: '', weight: '' }

export default function StoreSlugProductsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formImage, setFormImage] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadProducts = useCallback(async (partnerId: string) => {
    // Products added centrally in the admin panel have no store_partner_id —
    // they're the shared catalog every store carries alongside whatever this
    // store has added on its own.
    const { data } = await supabase
      .from('grocery_products')
      .select('id, name, image_url, price, mrp, weight, category_id, in_stock, is_active')
      .or(`store_partner_id.eq.${partnerId},store_partner_id.is.null`)
      .order('created_at', { ascending: false })
    setProducts((data as Product[]) ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const [{ data: part }, { data: cats }] = await Promise.all([
        supabase.from('store_partners').select('id, name, slug').eq('slug', slug).single(),
        supabase.from('grocery_categories').select('id, name').eq('is_active', true).neq('id', PRODUCE_CATEGORY_ID).order('sort_order'),
      ])
      setCategories((cats as Category[]) ?? [])
      if (!part) { setLoading(false); return }
      setPartner(part as Partner)
      await loadProducts(part.id)
      setLoading(false)
    }
    init()
  }, [slug, loadProducts])

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormImage(null)
    setFormError('')
    setEditItem(null)
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setForm({ category_id: p.category_id ?? '', name: p.name, price: String(p.price), mrp: p.mrp !== null ? String(p.mrp) : '', weight: p.weight ?? '' })
    setFormImage(p.image_url)
    setFormError('')
    setEditItem(p)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditItem(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!partner) return
    if (!form.name || !form.price || !form.category_id) { setFormError('Name, price and category are required'); return }
    setSaving(true)
    setFormError('')

    const price = Number(form.price)
    const mrp = form.mrp ? Number(form.mrp) : price

    if (editItem) {
      const { error } = await supabase
        .from('grocery_products')
        .update({ name: form.name, price, mrp, weight: form.weight || null, image_url: formImage, category_id: form.category_id })
        .eq('id', editItem.id)
      if (error) { setFormError(error.message); setSaving(false); return }
      setProducts((prev) => prev.map((p) => p.id === editItem.id
        ? { ...p, name: form.name, price, mrp, weight: form.weight || null, image_url: formImage, category_id: form.category_id }
        : p))
    } else {
      const { data, error } = await supabase
        .from('grocery_products')
        .insert({
          store_partner_id: partner.id,
          category_id: form.category_id,
          name: form.name,
          price, mrp,
          weight: form.weight || null,
          image_url: formImage,
          in_stock: true,
          is_active: true,
        })
        .select()
        .single()
      if (error || !data) { setFormError(error?.message ?? 'Failed to add product'); setSaving(false); return }
      setProducts((prev) => [data as Product, ...prev])
    }

    setSaving(false)
    closeModal()
  }

  async function toggleActive(p: Product) {
    await supabase.from('grocery_products').update({ is_active: !p.is_active }).eq('id', p.id)
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
  }

  async function deleteProduct(id: string) {
    if (!confirm('Remove this product from your catalog?')) return
    await supabase.from('grocery_products').delete().eq('id', id)
    setProducts((prev) => prev.filter((x) => x.id !== id))
  }

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—'
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <StorePartnerSidebar partner={partner} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Products</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{products.length} products · {products.filter((p) => p.is_active).length} live</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#16A34A] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your products..."
                  className="bg-transparent text-[13px] outline-none w-full sm:w-40 min-w-0 placeholder:text-[#9CA3AF]" />
              </div>
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-[13px] font-[600] rounded-xl hover:bg-[#15803D] transition-all shadow-[0_2px_8px_rgba(22,163,74,0.3)] shrink-0">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" />
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
              <button onClick={openAdd} className="text-[13px] text-[#16A34A] font-medium">+ Add your first product</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className={cn('bg-white rounded-2xl border overflow-hidden shadow-zippy-sm', p.is_active ? 'border-[#E5E7EB]' : 'border-[#E5E7EB] opacity-60')}>
                  <div className="h-32 bg-[#F8FAFC] relative">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill unoptimized className="object-cover" sizes="300px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]"><Package className="w-8 h-8" /></div>
                    )}
                    <span className="absolute top-2 left-2 text-[10px] font-[600] bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[#6B7280]">
                      {catName(p.category_id)}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <h3 className="text-[13px] font-[700] text-[#111827] leading-snug line-clamp-1">{p.name}</h3>
                    <p className="text-[11px] text-[#9CA3AF] mb-2">{p.weight ?? ''}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[14px] font-[800] text-[#111827]">₹{p.price}</span>
                        {p.mrp && p.mrp > p.price && <span className="text-[11px] text-[#9CA3AF] line-through ml-1">₹{p.mrp}</span>}
                      </div>
                      <button onClick={() => toggleActive(p)} title={p.is_active ? 'Live' : 'Hidden'}>
                        {p.is_active ? <ToggleRight className="w-7 h-7 text-[#16A34A]" /> : <ToggleLeft className="w-7 h-7 text-[#D1D5DB]" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F3F4F6]">
                      <button onClick={() => openEdit(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#16A34A] hover:text-[#16A34A] transition-all">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => deleteProduct(p.id)} className="flex items-center justify-center gap-1.5 py-2 px-4 border border-[#FEE2E2] rounded-xl text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-all">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white z-10">
              <h2 className="text-[16px] font-[800] text-[#111827]">{editItem ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
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
                <ImageUploadField label="Photo" value={formImage} onChange={setFormImage} endpoint="/api/grocery/upload-image" onUploadingChange={setImageUploading} />
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Category</label>
                  <select value={form.category_id} onChange={(e) => setF('category_id', e.target.value)}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] bg-white transition-all">
                    <option value="">Select category...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Product Name</label>
                  <input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="e.g. Amul Butter"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Weight / Size</label>
                  <input value={form.weight} onChange={(e) => setF('weight', e.target.value)} placeholder="500 g (optional)"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Price (₹)</label>
                    <input type="number" step="0.01" value={form.price} onChange={(e) => setF('price', e.target.value)} placeholder="99"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">MRP (₹)</label>
                    <input type="number" step="0.01" value={form.mrp} onChange={(e) => setF('mrp', e.target.value)} placeholder="129 (optional)"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all">Cancel</button>
                  <button type="submit" disabled={saving || imageUploading}
                    className="flex-1 py-3 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {(saving || imageUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                    {imageUploading ? 'Uploading photo...' : editItem ? 'Save Changes' : 'Add Product'}
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
