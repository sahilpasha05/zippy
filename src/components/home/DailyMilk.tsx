'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { isPlainMilk } from '@/lib/milk'
import BlinkitProductCard, { type BlinkitProduct } from '@/components/BlinkitProductCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Milk (and Marie Gold biscuits, its usual companion) are daily buys, so they get a permanent spot
// near the top of the home screen. Milk first. Hidden when there are none.
export default function DailyMilk() {
  const [products, setProducts] = useState<BlinkitProduct[]>([])

  useEffect(() => {
    supabase
      .from('grocery_products')
      .select('id, name, price, mrp, weight, image_url, in_stock')
      .eq('is_active', true)
      .or('name.ilike.%milk%,name.ilike.%marie gold%')
      .limit(30)
      .then(({ data }) => setProducts(((data as BlinkitProduct[]) ?? []).filter((p) => isPlainMilk(p.name) || p.name.toLowerCase().includes('marie gold')).sort((a, b) => Number(!isPlainMilk(a.name)) - Number(!isPlainMilk(b.name)))))
  }, [])

  if (products.length === 0) return null

  return (
    <section id="daily-milk" className="scroll-mt-[var(--zippy-header-h,170px)] rounded-3xl bg-gradient-to-b from-[#EEF6FF] via-[#F8FBFF] to-white p-4 lg:p-6 ring-1 ring-[#DCE8F7]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[20px] lg:text-[22px] font-[800] tracking-tight text-[#1E3A5F]" style={{ fontWeight: 800 }}>Milk &amp; daily essentials</h2>
          <p className="mt-0.5 text-[12.5px] text-[#5B7A9D]">Fresh milk and Marie biscuits, delivered in minutes</p>
        </div>
        <Link href="/essentials/dairy" className="text-[13px] font-[700] text-[#16A34A] hover:text-[#15803D] transition-colors">
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((p) => <BlinkitProductCard key={p.id} p={p} />)}
      </div>
    </section>
  )
}
