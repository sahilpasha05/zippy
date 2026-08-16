'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Search, Star, Edit2, ToggleLeft, ToggleRight, Loader2, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Restaurant = {
  id: string; name: string; slug: string; cuisine: string[]
  rating: number; rating_count: number; is_open: boolean; is_active: boolean
  logo_url: string | null; cover_url: string | null; owner_id: string | null
  delivery_time: number; min_order: number
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [togglingOpen, setTogglingOpen] = useState<string | null>(null)

  useEffect(() => {
    loadRestaurants()
  }, [])

  async function loadRestaurants() {
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, slug, cuisine, rating, rating_count, is_open, is_active, logo_url, cover_url, owner_id, delivery_time, min_order')
      .order('created_at', { ascending: false })
    setRestaurants((data as Restaurant[]) ?? [])
    setLoading(false)
  }

  async function toggleActive(id: string, current: boolean) {
    setToggling(id)
    // Only flip the local state on confirmed success — the previous version
    // updated the UI unconditionally, so a failed write (bad session, RLS
    // denial, network hiccup) looked identical to success: silently reverted
    // on the next reload with no indication anything went wrong.
    const { error } = await supabase.from('restaurants').update({ is_active: !current }).eq('id', id)
    if (!error) {
      setRestaurants((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r))
    } else {
      alert(`Could not update: ${error.message}`)
    }
    setToggling(null)
  }

  // Separate from is_active (whether the restaurant is listed at all) — this
  // is the day-to-day "accepting orders right now" switch, previously only
  // changeable directly in the database.
  async function toggleOpen(id: string, current: boolean) {
    setTogglingOpen(id)
    const { error } = await supabase.from('restaurants').update({ is_open: !current }).eq('id', id)
    if (!error) {
      setRestaurants((prev) => prev.map((r) => r.id === id ? { ...r, is_open: !current } : r))
    } else {
      alert(`Could not update: ${error.message}`)
    }
    setTogglingOpen(null)
  }

  const filtered = restaurants.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine.join(' ').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Restaurants</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{restaurants.length} total listings</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#7C3AED] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search restaurants..."
                  className="bg-transparent text-[13px] outline-none w-40 placeholder:text-[#9CA3AF]"
                />
              </div>
              <Link href="/admin/restaurants/new">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
                  <Plus className="w-4 h-4" /> Add Restaurant
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-white rounded-2xl border border-[#E5E7EB] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-24 gap-3">
              <p className="text-[15px] font-semibold text-[#374151]">{search ? 'No restaurants match your search' : 'No restaurants yet'}</p>
              {!search && (
                <Link href="/admin/restaurants/new">
                  <button className="px-5 py-2.5 bg-[#7C3AED] text-white text-[13px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all">
                    Add first restaurant
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-zippy-sm hover:shadow-zippy transition-all group">
                  {/* Cover */}
                  <div className="relative h-32 bg-[#F3F4F6]">
                    {r.cover_url ? (
                      <Image src={r.cover_url} alt={r.name} fill className="object-cover" sizes="400px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] flex items-center justify-center">
                        <span className="text-3xl font-bold text-[#7C3AED] opacity-30">{r.name[0]}</span>
                      </div>
                    )}
                    {/* Active toggle */}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => toggleActive(r.id, r.is_active)}
                        disabled={toggling === r.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm transition-all"
                        style={{ background: r.is_active ? 'rgba(22,163,74,0.85)' : 'rgba(239,68,68,0.85)', color: 'white' }}
                      >
                        {toggling === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : r.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                        {r.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-[14.5px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>{r.name}</h3>
                        <p className="text-[12px] text-[#6B7280]">{r.cuisine.join(' · ')}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[12px] font-semibold text-[#D97706] shrink-0">
                        <Star className="w-3.5 h-3.5 fill-[#D97706]" /> {r.rating}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      {r.owner_id ? (
                        <span className="flex items-center gap-1 text-[11px] text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full font-medium">
                          <UserCheck className="w-3 h-3" /> Owner assigned
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full font-medium">
                          <UserX className="w-3 h-3" /> No owner
                        </span>
                      )}
                      <button
                        onClick={() => toggleOpen(r.id, r.is_open)}
                        disabled={togglingOpen === r.id}
                        title={r.is_open ? 'Currently accepting orders — click to close' : 'Currently closed — click to reopen'}
                        className={cn('flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium transition-all disabled:opacity-60',
                          r.is_open ? 'text-[#16A34A] bg-[#DCFCE7] hover:bg-[#BBF7D0]' : 'text-[#6B7280] bg-[#F3F4F6] hover:bg-[#E5E7EB]')}>
                        {togglingOpen === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (r.is_open ? '● Open' : '○ Closed')}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
                      <span className="text-[11.5px] text-[#6B7280]">{r.delivery_time} min · Min ₹{r.min_order}</span>
                      <Link href={`/admin/restaurants/${r.id}`}>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] text-[12px] font-medium text-[#374151] rounded-xl hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                          <Edit2 className="w-3 h-3" /> Manage
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
