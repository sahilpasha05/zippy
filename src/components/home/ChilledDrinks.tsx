'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import BlinkitProductCard, { type BlinkitProduct } from '@/components/BlinkitProductCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Energy drinks first, then the rest, in the order they are added.
const FIRST = ['red bull', 'monster', 'diet coke']
function rank(name: string) {
  const i = FIRST.findIndex((w) => name.toLowerCase().includes(w))
  return i === -1 ? FIRST.length : i
}

// A permanent "Chilled drinks & energy" row on the home screen, fed by the Drinks
// category: anything in stock there with a photo shows up. Hidden when there is none.
export default function ChilledDrinks() {
  const [products, setProducts] = useState<BlinkitProduct[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: cat } = await supabase.from('grocery_categories').select('id').eq('slug', 'drinks').maybeSingle()
      if (!cat || cancelled) return
      const { data } = await supabase
        .from('grocery_products')
        .select('id, name, price, mrp, weight, image_url, in_stock')
        .eq('category_id', cat.id)
        .eq('is_active', true)
        .eq('in_stock', true)
        .not('image_url', 'is', null)
        .limit(12)
      if (cancelled) return
      setProducts(((data as BlinkitProduct[]) ?? []).sort((a, b) => rank(a.name) - rank(b.name)))
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (products.length === 0) return null

  return (
    <section className="rounded-3xl bg-gradient-to-b from-[#E6F5FF] via-[#F2FAFF] to-white p-4 lg:p-6 ring-1 ring-[#D4ECFB]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[20px] lg:text-[22px] font-[800] tracking-tight text-[#0C4A6E]" style={{ fontWeight: 800 }}>Chilled drinks &amp; energy</h2>
          <p className="mt-0.5 text-[12.5px] text-[#4B7A94]">Ice-cold cans, delivered in minutes</p>
        </div>
        <Link href="/essentials/drinks" className="text-[13px] font-[700] text-[#16A34A] hover:text-[#15803D] transition-colors">
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((p) => <BlinkitProductCard key={p.id} p={p} />)}
      </div>
    </section>
  )
}
