'use client'

import { useState, useEffect } from 'react'
import { Search, Star, Clock, MapPin, ChevronRight, Filter } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const CUISINES = ['All', 'Biryani', 'Pizza', 'South Indian', 'Chinese', 'North Indian', 'Desserts', 'Fast Food', 'Healthy', 'Beverages']

type Restaurant = {
  id: string
  name: string
  slug: string
  cuisine: string[]
  rating: number
  rating_count: number
  distance: number
  delivery_time: number
  is_open: boolean
  cover_url: string | null
  logo_url: string | null
  min_order: number
  delivery_fee: number
}

function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <Link href={`/restaurants/${r.slug}`} className="group bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-zippy hover:border-[#D1D5DB] transition-all duration-200 hover:-translate-y-0.5 block">
      <div className="relative h-44 bg-[#F8FAFC] overflow-hidden">
        {r.cover_url && (
          <Image src={r.cover_url} alt={r.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
        )}
        <div className={cn('absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold border', r.is_open ? 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]' : 'bg-white text-[#6B7280] border-[#E5E7EB]')}>
          {r.is_open ? '● Open now' : '○ Closed'}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#E5E7EB] shrink-0 bg-[#F8FAFC]">
            {r.logo_url && <Image src={r.logo_url} alt="" width={44} height={44} className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>{r.name}</h3>
            <p className="text-[12.5px] text-[#6B7280] truncate">{r.cuisine.join(' • ')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-[12px] text-[#6B7280]">
          <span className="flex items-center gap-1 text-[#D97706] font-semibold">
            <Star className="w-3.5 h-3.5 fill-[#D97706]" />{r.rating}
            <span className="text-[#9CA3AF] font-normal">({r.rating_count.toLocaleString()})</span>
          </span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.delivery_time} min</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.distance} km</span>
        </div>
        <div className="mt-2 pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[11.5px] text-[#9CA3AF]">
          <span>Min order ₹{r.min_order}</span>
          <span className="text-[#16A34A] font-medium">{r.delivery_fee === 0 ? 'Free delivery' : `₹${r.delivery_fee} delivery`}</span>
        </div>
      </div>
    </Link>
  )
}

function RestaurantSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden animate-pulse">
      <div className="h-44 bg-[#F3F4F6]" />
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-11 h-11 bg-[#F3F4F6] rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#F3F4F6] rounded w-3/4" />
            <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-[#F3F4F6] rounded" />
      </div>
    </div>
  )
}

export default function RestaurantsPage() {
  const [search, setSearch] = useState('')
  const [activeCuisine, setActiveCuisine] = useState('All')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    supabase
      .from('restaurants')
      .select('id, name, slug, cuisine, rating, rating_count, distance, delivery_time, is_open, cover_url, logo_url, min_order, delivery_fee')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .then(({ data }) => {
        if (data) setRestaurants(data as Restaurant[])
        setLoading(false)
      })
  }, [])

  const filtered = restaurants.filter((r) => {
    const matchCuisine = activeCuisine === 'All' || r.cuisine.some((c) => c === activeCuisine)
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine.some((c) => c.toLowerCase().includes(search.toLowerCase()))
    return matchCuisine && matchSearch
  })

  return (
    <>
      <Navbar />
      <CartSidebar />
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-6">
            <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-4">
              <Link href="/" className="hover:text-[#16A34A]">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#111827] font-medium">Restaurants</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-[800] text-[#111827] tracking-tight" style={{ fontWeight: 800 }}>Restaurants near you</h1>
                <p className="text-[14px] text-[#6B7280] mt-1">
                  {loading ? 'Loading…' : `${restaurants.length} restaurants delivering to Koramangala`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus-within:border-[#16A34A] transition-all">
                  <Search className="w-4 h-4 text-[#9CA3AF]" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search restaurants..." className="bg-transparent text-[13.5px] outline-none w-48 placeholder:text-[#9CA3AF]" />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] font-medium text-[#374151] hover:border-[#D1D5DB] bg-white">
                  <Filter className="w-4 h-4" /> Sort
                </button>
              </div>
            </div>
          </div>
          {/* Cuisine tabs */}
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {CUISINES.map((c) => (
                <button key={c} onClick={() => setActiveCuisine(c)} className={cn('px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all shrink-0', activeCuisine === c ? 'bg-[#16A34A] text-white shadow-[0_2px_8px_rgba(22,163,74,0.3)]' : 'bg-[#F8FAFC] text-[#374151] border border-[#E5E7EB] hover:border-[#D1D5DB]')}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <RestaurantSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24">
              <span className="text-5xl">🍽️</span>
              <p className="font-semibold text-[#374151]">No restaurants found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filtered.map((r) => <RestaurantCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
