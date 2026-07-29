'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Store, Loader2, CheckCircle, AlertCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import ImageUploadField from '@/components/admin/ImageUploadField'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CUISINE_OPTIONS = ['Biryani', 'North Indian', 'South Indian', 'Chinese', 'Pizza', 'Burgers', 'Sushi', 'Italian', 'Mexican', 'Mughlai', 'Desserts', 'Healthy', 'Seafood', 'Wraps', 'Sandwiches']

export default function NewRestaurantPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerLookupMsg, setOwnerLookupMsg] = useState('')

  const [form, setForm] = useState({
    name: '', slug: '', description: '', cuisine: [] as string[],
    cover_url: '', logo_url: '', address: '',
    delivery_time: 30, min_order: 149, delivery_fee: 0,
    is_open: true, is_active: true,
    owner_id: '',
  })

  function set(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'name' && !form.slug) {
      setForm((f) => ({ ...f, slug: (value as string).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))
    }
  }

  function toggleCuisine(c: string) {
    setForm((f) => ({
      ...f,
      cuisine: f.cuisine.includes(c) ? f.cuisine.filter((x) => x !== c) : [...f.cuisine, c],
    }))
  }

  async function lookupOwner() {
    if (!ownerEmail) return
    setOwnerLookupMsg('Looking up...')
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', ownerEmail)
      .single()
    if (data) {
      setForm((f) => ({ ...f, owner_id: data.id }))
      setOwnerLookupMsg(`Found: ${data.full_name ?? ownerEmail}`)
    } else {
      setForm((f) => ({ ...f, owner_id: '' }))
      setOwnerLookupMsg('No user found with that email. They must sign up first.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.slug) { setError('Name and slug are required.'); return }
    if (form.cuisine.length === 0) { setError('Select at least one cuisine.'); return }
    setSaving(true); setError('')

    const payload = {
      name: form.name, slug: form.slug, description: form.description,
      cuisine: form.cuisine, cover_url: form.cover_url || null, logo_url: form.logo_url || null,
      address: form.address, delivery_time: form.delivery_time,
      min_order: form.min_order, delivery_fee: form.delivery_fee,
      is_open: form.is_open, is_active: form.is_active,
      owner_id: form.owner_id || null,
      rating: 4.5, rating_count: 0,
    }

    const { error: err } = await supabase.from('restaurants').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/admin/restaurants'), 1500)
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href="/admin/restaurants">
              <button className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E7EB] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Add Restaurant</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">Create a new restaurant listing</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-6">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="w-16 h-16 bg-[#DCFCE7] rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#16A34A]" />
              </div>
              <p className="text-[17px] font-[700] text-[#111827]">Restaurant created!</p>
              <p className="text-[13px] text-[#6B7280]">Redirecting to restaurants list...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[13px] text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-[#7C3AED]" />
                  <h2 className="text-[14px] font-[700] text-[#111827]">Basic Information</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Restaurant Name *</label>
                    <input value={form.name} onChange={(e) => set('name', e.target.value)}
                      placeholder="e.g. The Biryani House"
                      className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">URL Slug *</label>
                    <input value={form.slug} onChange={(e) => set('slug', e.target.value)}
                      placeholder="the-biryani-house"
                      className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all font-mono" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Address</label>
                    <input value={form.address} onChange={(e) => set('address', e.target.value)}
                      placeholder="Street, Area, City"
                      className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Description</label>
                    <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                      rows={2} placeholder="Short description of the restaurant..."
                      className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all resize-none" />
                  </div>
                </div>
              </div>

              {/* Cuisine */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
                <label className="block text-[12px] font-[600] text-[#374151] mb-3">Cuisine Types * <span className="text-[#9CA3AF] font-normal">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_OPTIONS.map((c) => (
                    <button type="button" key={c} onClick={() => toggleCuisine(c)}
                      className={`px-3 py-1.5 rounded-xl text-[12.5px] font-medium border transition-all ${form.cuisine.includes(c) ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#7C3AED]'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
                <h2 className="text-[14px] font-[700] text-[#111827]">Images</h2>
                <ImageUploadField label="Cover Image" value={form.cover_url || null} onChange={(url) => set('cover_url', url ?? '')} />
                <ImageUploadField label="Logo Image" value={form.logo_url || null} onChange={(url) => set('logo_url', url ?? '')} />
              </div>

              {/* Delivery Settings */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
                <h2 className="text-[14px] font-[700] text-[#111827]">Delivery Settings</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Delivery Time (min)</label>
                    <input type="number" value={form.delivery_time} onChange={(e) => set('delivery_time', +e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Min Order (₹)</label>
                    <input type="number" value={form.min_order} onChange={(e) => set('min_order', +e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Delivery Fee (₹)</label>
                    <input type="number" value={form.delivery_fee} onChange={(e) => set('delivery_fee', +e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_open} onChange={(e) => set('is_open', e.target.checked)} className="w-4 h-4 accent-[#7C3AED]" />
                    <span className="text-[13px] text-[#374151]">Open now</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="w-4 h-4 accent-[#7C3AED]" />
                    <span className="text-[13px] text-[#374151]">Active (visible on app)</span>
                  </label>
                </div>
              </div>

              {/* Owner Assignment */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#7C3AED]" />
                  <h2 className="text-[14px] font-[700] text-[#111827]">Assign Restaurant Owner</h2>
                </div>
                <p className="text-[12px] text-[#6B7280]">The assigned user will be able to manage orders and menu for this restaurant.</p>
                <div className="flex gap-2">
                  <input
                    value={ownerEmail} onChange={(e) => { setOwnerEmail(e.target.value); setOwnerLookupMsg('') }}
                    placeholder="owner@example.com"
                    type="email"
                    className="flex-1 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all"
                  />
                  <button type="button" onClick={lookupOwner}
                    className="px-4 py-2.5 bg-[#F5F3FF] text-[#7C3AED] text-[13px] font-[600] rounded-xl hover:bg-[#EDE9FE] transition-all border border-[#DDD6FE]">
                    Lookup
                  </button>
                </div>
                {ownerLookupMsg && (
                  <p className={`text-[12px] font-medium ${form.owner_id ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{ownerLookupMsg}</p>
                )}
                {form.owner_id && (
                  <p className="text-[11.5px] text-[#9CA3AF] font-mono">ID: {form.owner_id}</p>
                )}
              </div>

              {/* Submit */}
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#7C3AED] text-white text-[15px] font-[700] rounded-2xl hover:bg-[#6D28D9] active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(124,58,237,0.35)] disabled:opacity-60">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Restaurant'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
