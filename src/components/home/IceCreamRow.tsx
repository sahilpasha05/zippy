'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import BlinkitProductCard, { type BlinkitProduct } from '@/components/BlinkitProductCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// A playful row for the Ice Creams & More shelf. Out-of-stock flavours stay visible with a label.
// Hidden when the shelf is empty.
export default function IceCreamRow() {
  const [products, setProducts] = useState<BlinkitProduct[]>([])

  useEffect(() => {
    supabase.from('grocery_categories').select('id').eq('slug', 'ice-creams-more').maybeSingle().then(({ data: cat }) => {
      if (!cat) return
      supabase
        .from('grocery_products')
        .select('id, name, price, mrp, weight, image_url, in_stock')
        .eq('category_id', cat.id)
        .eq('is_active', true)
        .not('image_url', 'is', null)
        .limit(12)
        .then(({ data }) => setProducts((data as BlinkitProduct[]) ?? []))
    })
  }, [])

  if (products.length === 0) return null

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFE4F1] via-[#FFF1E6] to-[#FFF9E6] p-4 lg:p-6 ring-1 ring-[#FBCFE8]">
      <span aria-hidden className="pointer-events-none absolute -right-4 -top-4 text-[84px] opacity-20 rotate-12">🍦</span>
      <div className="relative mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[20px] lg:text-[22px] font-[800] tracking-tight text-[#9D174D]" style={{ fontWeight: 800 }}>Scoop of happiness 🍨</h2>
          <p className="mt-0.5 text-[12.5px] text-[#B4527D]">Cold, creamy and at your door in minutes</p>
        </div>
        <Link href="/essentials/ice-creams-more" className="text-[13px] font-[700] text-[#9D174D] hover:underline">See all →</Link>
      </div>
      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((p) => <BlinkitProductCard key={p.id} p={p} />)}
      </div>
    </section>
  )
}
