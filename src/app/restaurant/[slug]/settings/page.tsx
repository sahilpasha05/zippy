'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Save, CheckCircle, Loader2 } from 'lucide-react'
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Restaurant = { id: string; name: string; slug: string; address: string; description: string; delivery_time: number; min_order: number; delivery_fee: number; is_open: boolean }

export default function SlugSettingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('restaurants')
        .select('id, name, slug, address, description, delivery_time, min_order, delivery_fee, is_open')
        .eq('slug', slug).single()
      setRestaurant(data as Restaurant ?? null)
      setLoading(false)
    }
    load()
  }, [slug])

  function set(k: keyof Restaurant, v: unknown) {
    setRestaurant((r) => r ? { ...r, [k]: v } : r)
  }

  async function save() {
    if (!restaurant) return
    setSaving(true)
    const { error } = await supabase.from('restaurants').update({
      name: restaurant.name, address: restaurant.address, description: restaurant.description,
      delivery_time: restaurant.delivery_time, min_order: restaurant.min_order,
      delivery_fee: restaurant.delivery_fee, is_open: restaurant.is_open,
    }).eq('id', restaurant.id)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      alert(`Could not save: ${error.message}`)
    }
  }

  if (loading) return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={null} />
      <main className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" /></main>
    </div>
  )

  if (!restaurant) return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={null} />
      <main className="flex-1 flex items-center justify-center"><p className="text-[#374151]">Restaurant not found</p></main>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={restaurant} />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Settings</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Manage your restaurant details</p>
          </div>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-[13px] font-[600] rounded-xl hover:bg-[#15803D] transition-all shadow-[0_2px_8px_rgba(22,163,74,0.3)] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <div className="max-w-2xl mx-auto p-6 space-y-5">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <h2 className="text-[14px] font-[700] text-[#111827]">Restaurant Info</h2>
            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Restaurant Name</label>
              <input value={restaurant.name} onChange={(e) => set('name', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
            </div>
            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Address</label>
              <input value={restaurant.address ?? ''} onChange={(e) => set('address', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
            </div>
            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Description</label>
              <textarea value={restaurant.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={2}
                className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all resize-none" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <h2 className="text-[14px] font-[700] text-[#111827]">Delivery Settings</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Delivery Time (min)</label>
                <input type="number" value={restaurant.delivery_time} onChange={(e) => set('delivery_time', +e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Min Order (₹)</label>
                <input type="number" value={restaurant.min_order} onChange={(e) => set('min_order', +e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Delivery Fee (₹)</label>
                <input type="number" value={restaurant.delivery_fee} onChange={(e) => set('delivery_fee', +e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={restaurant.is_open} onChange={(e) => set('is_open', e.target.checked)} className="w-4 h-4 accent-[#16A34A]" />
              <span className="text-[13px] text-[#374151] font-medium">Restaurant is currently open</span>
            </label>
          </div>
        </div>
      </main>
    </div>
  )
}
