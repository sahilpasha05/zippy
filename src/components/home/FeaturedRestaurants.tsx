'use client'

import { useEffect, useState } from 'react'
import { Star, Clock, MapPin, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type Restaurant = {
  id: string
  name: string
  slug: string
  cuisine: string[]
  rating: number
  rating_count: number
  distance: number | null
  delivery_time: number
  is_open: boolean
  cover_url: string | null
  logo_url: string | null
  min_order: number
}

function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <Link href={`/restaurants/${r.slug}`} className="group bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-zippy hover:border-[#D1D5DB] transition-all duration-200 hover:-translate-y-0.5 block">
      {/* Cover */}
      <div className="relative h-40 bg-[#F8FAFC] overflow-hidden">
        {r.cover_url && (
          <Image
            src={r.cover_url}
            alt={r.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        )}
        {/* Open/closed badge */}
        <div className={cn(
          'absolute top-3 right-3 px-2 py-1 rounded-full text-[10.5px] font-semibold',
          r.is_open ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F3F4F6] text-[#6B7280]'
        )}>
          {r.is_open ? '● Open' : '○ Closed'}
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB] shrink-0">
            {r.logo_url && <Image src={r.logo_url} alt={r.name} width={40} height={40} className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-[700] text-[#111827] truncate" style={{ fontWeight: 700 }}>{r.name}</h3>
            <p className="text-[12px] text-[#6B7280] truncate">{r.cuisine.join(', ')}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[12px] text-[#6B7280]">
          <span className="flex items-center gap-1 text-[#D97706] font-semibold">
            <Star className="w-3 h-3 fill-[#D97706]" />
            {r.rating}
            <span className="text-[#9CA3AF] font-normal">({r.rating_count.toLocaleString()})</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {r.delivery_time} min
          </span>
          {r.distance != null && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {r.distance} km
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function RestaurantSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden animate-pulse">
      <div className="h-40 bg-[#F3F4F6]" />
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-[#F3F4F6] rounded-xl shrink-0" />
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

export default function FeaturedRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('restaurants')
      .select('id, name, slug, cuisine, rating, rating_count, distance, delivery_time, is_open, cover_url, logo_url, min_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(4)
      .then(({ data }) => {
        if (data) setRestaurants(data as Restaurant[])
        setLoading(false)
      })
  }, [])

  if (!loading && restaurants.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-[800] text-[#111827] tracking-tight" style={{ fontWeight: 800 }}>
            Top restaurants nearby
          </h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            {loading ? 'Loading…' : `${restaurants.length} restaurants delivering to you`}
          </p>
        </div>
        <Link href="/restaurants" className="flex items-center gap-1 text-[13.5px] font-[600] text-[#16A34A] hover:text-[#15803D] transition-colors" style={{ fontWeight: 600 }}>
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [...Array(4)].map((_, i) => <RestaurantSkeleton key={i} />)
          : restaurants.map((r) => <RestaurantCard key={r.id} r={r} />)}
      </div>
    </section>
  )
}
