'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Star, Award, Loader2 } from 'lucide-react'
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar'
import ImageUploadField from '@/components/admin/ImageUploadField'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Restaurant = { id: string; name: string; slug: string }
type Category = { id: string; name: string }
type MenuItem = {
  id: string
  category_id: string | null
  category_name: string | null
  name: string
  description: string | null
  image_url: string | null
  price: number
  mrp: number | null
  is_veg: boolean
  is_available: boolean
  is_bestseller: boolean
  rating: number
}

export default function SlugMenuPage() {
  const { slug } = useParams<{ slug: string }>()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formImage, setFormImage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: rest } = await supabase
        .from('restaurants').select('id, name, slug').eq('slug', slug).single()
      if (!rest) { setLoading(false); return }
      setRestaurant(rest as Restaurant)

      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('restaurant_categories').select('id, name').eq('restaurant_id', rest.id).order('sort_order'),
        supabase.from('restaurant_products').select('*, restaurant_categories(name)').eq('restaurant_id', rest.id).order('created_at', { ascending: false }),
      ])
      setCategories(cats ?? [])
      setItems(
        (prods ?? []).map((p) => ({
          id: p.id,
          category_id: p.category_id,
          category_name: (p.restaurant_categories as { name: string } | null)?.name ?? null,
          name: p.name,
          description: p.description,
          image_url: p.image_url,
          price: Number(p.price),
          mrp: p.mrp !== null ? Number(p.mrp) : null,
          is_veg: p.is_veg,
          is_available: p.is_available,
          is_bestseller: p.is_bestseller,
          rating: Number(p.rating ?? 4),
        }))
      )
      setLoading(false)
    }
    load()
  }, [slug])

  async function findOrCreateCategory(name: string): Promise<{ id: string; name: string } | null> {
    if (!name || !restaurant) return null
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing
    const { data, error } = await supabase
      .from('restaurant_categories')
      .insert({ restaurant_id: restaurant.id, name })
      .select('id, name')
      .single()
    if (error || !data) throw error ?? new Error('Could not create category')
    setCategories((prev) => [...prev, data])
    return data
  }

  async function toggle(item: MenuItem) {
    const next = !item.is_available
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)))
    const { error } = await supabase.from('restaurant_products').update({ is_available: next }).eq('id', item.id)
    if (error) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !next } : i)))
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return
    const prevItems = items
    setItems((p) => p.filter((i) => i.id !== item.id))
    const { error } = await supabase.from('restaurant_products').delete().eq('id', item.id)
    if (error) setItems(prevItems)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!restaurant) return
    setSaving(true)
    setFormError('')

    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') ?? '').trim()
    const description = String(fd.get('description') ?? '').trim() || null
    const price = Number(fd.get('price'))
    const mrpRaw = String(fd.get('mrp') ?? '').trim()
    const mrp = mrpRaw ? Number(mrpRaw) : null
    const categoryName = String(fd.get('category') ?? '').trim()
    const isVeg = fd.get('veg') === 'on'
    const isBestseller = fd.get('bestseller') === 'on'

    if (!name || !price) {
      setFormError('Name and price are required')
      setSaving(false)
      return
    }

    try {
      const category = await findOrCreateCategory(categoryName)
      if (editItem) {
        const { error } = await supabase
          .from('restaurant_products')
          .update({ name, description, image_url: formImage, price, mrp, category_id: category?.id ?? null, is_veg: isVeg, is_bestseller: isBestseller })
          .eq('id', editItem.id)
        if (error) throw error
        setItems((prev) =>
          prev.map((i) =>
            i.id === editItem.id
              ? { ...i, name, description, image_url: formImage, price, mrp, category_id: category?.id ?? null, category_name: category?.name ?? null, is_veg: isVeg, is_bestseller: isBestseller }
              : i
          )
        )
      } else {
        const { data, error } = await supabase
          .from('restaurant_products')
          .insert({ restaurant_id: restaurant.id, name, description, image_url: formImage, price, mrp, category_id: category?.id ?? null, is_veg: isVeg, is_bestseller: isBestseller })
          .select()
          .single()
        if (error || !data) throw error ?? new Error('Failed to add item')
        setItems((prev) => [
          {
            id: data.id,
            category_id: data.category_id,
            category_name: category?.name ?? null,
            name: data.name,
            description: data.description,
            image_url: data.image_url,
            price: Number(data.price),
            mrp: data.mrp !== null ? Number(data.mrp) : null,
            is_veg: data.is_veg,
            is_available: data.is_available,
            is_bestseller: data.is_bestseller,
            rating: Number(data.rating ?? 4),
          },
          ...prev,
        ])
      }
      setShowAddModal(false)
      setEditItem(null)
      setFormImage(null)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const categoryChips = ['All', 'Bestsellers', ...categories.map((c) => c.name)]

  const filtered = items.filter((i) => {
    const matchCat =
      activeCategory === 'All' ? true : activeCategory === 'Bestsellers' ? i.is_bestseller : i.category_name === activeCategory
    return matchCat && i.name.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={null} />
      <main className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" /></main>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={restaurant} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Menu</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{items.filter((i) => i.is_available).length} available · {items.filter((i) => !i.is_available).length} unavailable</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#16A34A] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..."
                  className="bg-transparent text-[13px] outline-none w-36 placeholder:text-[#9CA3AF]" />
              </div>
              <button onClick={() => { setFormError(''); setFormImage(null); setShowAddModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-[13px] font-[600] rounded-xl hover:bg-[#15803D] transition-all shadow-[0_2px_8px_rgba(22,163,74,0.3)]">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categoryChips.map((c) => (
              <button key={c} onClick={() => setActiveCategory(c)}
                className={cn('px-4 py-1.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-all shrink-0',
                  activeCategory === c ? 'bg-[#16A34A] text-white shadow-[0_2px_6px_rgba(22,163,74,0.3)]' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                {c}
                {c !== 'All' && (
                  <span className="ml-1.5 text-[10.5px] opacity-70">
                    ({c === 'Bestsellers' ? items.filter((i) => i.is_bestseller).length : items.filter((i) => i.category_name === c).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <p className="text-[15px] font-semibold text-[#374151]">No items found</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <div key={item.id} className={cn('bg-white rounded-2xl border transition-all', item.is_available ? 'border-[#E5E7EB] shadow-zippy-sm' : 'border-[#E5E7EB] opacity-60')}>
                  {item.image_url && (
                    <div className="h-32 rounded-t-2xl overflow-hidden bg-[#F8FAFC]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn('w-4 h-4 border-2 rounded-sm flex items-center justify-center shrink-0', item.is_veg ? 'border-[#16A34A]' : 'border-[#DC2626]')}>
                            <span className={cn('w-2 h-2 rounded-full', item.is_veg ? 'bg-[#16A34A]' : 'bg-[#DC2626]')} />
                          </span>
                          {item.is_bestseller && (
                            <span className="flex items-center gap-1 text-[10px] font-[700] text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-1.5 py-0.5 rounded-lg">
                              <Award className="w-3 h-3" /> Bestseller
                            </span>
                          )}
                        </div>
                        <h3 className="text-[13.5px] font-[700] text-[#111827] leading-snug">{item.name}</h3>
                        {item.description && <p className="text-[11.5px] text-[#9CA3AF] mt-0.5 line-clamp-1">{item.description}</p>}
                      </div>
                      <button onClick={() => toggle(item)} className="shrink-0 mt-0.5">
                        {item.is_available ? <ToggleRight className="w-8 h-8 text-[#16A34A]" /> : <ToggleLeft className="w-8 h-8 text-[#D1D5DB]" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <span className="text-[15px] font-[800] text-[#111827]">₹{item.price}</span>
                        {item.mrp !== null && item.mrp > item.price && (
                          <span className="text-[11.5px] text-[#9CA3AF] line-through ml-1.5">₹{item.mrp}</span>
                        )}
                      </div>
                      <span className="flex items-center gap-0.5 text-[11.5px] text-[#D97706]"><Star className="w-3 h-3 fill-[#D97706]" /> {item.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F3F4F6]">
                      <button onClick={() => { setFormError(''); setFormImage(item.image_url); setEditItem(item) }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#16A34A] hover:text-[#16A34A] transition-all">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(item)}
                        className="flex items-center justify-center gap-1.5 py-2 px-4 border border-[#FEE2E2] rounded-xl text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-all">
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

      {(showAddModal || editItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditItem(null); setFormImage(null) }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-[17px] font-[800] text-[#111827] mb-5">{editItem ? 'Edit Item' : 'Add New Item'}</h2>
            {formError && <p className="text-[12.5px] text-[#DC2626] mb-3">{formError}</p>}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Item Name</label>
                <input name="name" defaultValue={editItem?.name ?? ''} placeholder="e.g. Chicken Biryani"
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
              </div>
              <ImageUploadField label="Item Photo" value={formImage} onChange={setFormImage} />
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Description</label>
                <textarea name="description" defaultValue={editItem?.description ?? ''} placeholder="Short description..." rows={2}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Price (₹)</label>
                  <input name="price" type="number" defaultValue={editItem?.price ?? ''} placeholder="299"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">MRP (₹)</label>
                  <input name="mrp" type="number" defaultValue={editItem?.mrp ?? ''} placeholder="349"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Category</label>
                <input name="category" list="category-options" defaultValue={editItem?.category_name ?? ''} placeholder="e.g. Mains"
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
                <datalist id="category-options">
                  {categories.map((c) => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input name="veg" type="checkbox" defaultChecked={editItem ? editItem.is_veg : true} className="w-4 h-4 accent-[#16A34A]" />
                  <span className="text-[12.5px] text-[#374151] font-medium">Vegetarian</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input name="bestseller" type="checkbox" defaultChecked={editItem?.is_bestseller ?? false} className="w-4 h-4 accent-[#D97706]" />
                  <span className="text-[12.5px] text-[#374151] font-medium">Bestseller</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setEditItem(null); setFormImage(null) }}
                  className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60">
                  {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
