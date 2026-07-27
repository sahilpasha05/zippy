'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import BlinkitProductCard from '@/components/BlinkitProductCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Product = {
  id: string; name: string; price: number; mrp: number | null
  weight: string | null; brand: string | null; rating: number | null
  in_stock: boolean; image_url: string | null
}

export default function TrendingProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('grocery_products')
        .select('id, name, price, mrp, weight, brand, rating, in_stock, image_url')
        .eq('is_trending', true)
        .eq('is_active', true)
        .limit(12)
      setProducts((data as Product[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-[800] text-[#111827] tracking-tight" style={{ fontWeight: 800 }}>
            Trending right now
          </h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">What everyone&apos;s ordering today</p>
        </div>
        <Link href="/essentials" className="text-[13.5px] font-[600] text-[#16A34A] hover:text-[#15803D] transition-colors">
          See all →
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="aspect-[3/4] bg-[#F3F4F6] rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {products.map((p) => <BlinkitProductCard key={p.id} p={p} />)}
        </div>
      )}
    </section>
  )
}
