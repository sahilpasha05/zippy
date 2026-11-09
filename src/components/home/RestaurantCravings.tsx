'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import RestaurantDishCard, { DISH_COLUMNS, toDish, type Dish } from '@/components/RestaurantDishCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Popular dishes, picked by name, from the restaurants that are live. Chips switch the row.
const CRAVINGS: { label: string; emoji: string; words: string[] }[] = [
  { label: 'Biryani', emoji: '🍛', words: ['biryani', 'biriyani', 'pulao'] },
  { label: 'Pizza', emoji: '🍕', words: ['pizza'] },
  { label: 'Burgers', emoji: '🍔', words: ['burger'] },
  { label: 'Momos', emoji: '🥟', words: ['momo'] },
  { label: 'Rolls', emoji: '🌯', words: ['roll', 'shawarma'] },
  { label: 'Chicken', emoji: '🍗', words: ['chicken'] },
  { label: 'Chaat', emoji: '🥘', words: ['chaat', 'puri', 'pav'] },
  { label: 'Cakes', emoji: '🎂', words: ['cake'] },
]

export default function RestaurantCravings() {
  const [all, setAll] = useState<Dish[]>([])
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const filter = CRAVINGS.flatMap((c) => c.words).map((w) => `name.ilike.%${w}%`).join(',')
    supabase.from('restaurant_products').select(DISH_COLUMNS)
      .eq('is_available', true).gt('price', 0).not('image_url', 'is', null).or(filter).limit(300)
      .then(({ data }) => setAll(((data as never[]) ?? []).map(toDish).filter((d): d is Dish => !!d)))
  }, [])

  const groups = CRAVINGS.map((c) => ({ ...c, dishes: all.filter((d) => c.words.some((w) => d.name.toLowerCase().includes(w))) })).filter((g) => g.dishes.length > 0)
  if (groups.length === 0) return null
  const current = groups.find((g) => g.label === active) ?? groups[0]
  // Open restaurants first, then by price.
  const shown = [...current.dishes].sort((a, b) => Number(b.is_open) - Number(a.is_open) || a.price - b.price).slice(0, 12)

  return (
    <section className="rounded-3xl bg-gradient-to-b from-[#FFF3E8] via-[#FFF9F3] to-white p-4 lg:p-6 ring-1 ring-[#FBE3CC]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[20px] lg:text-[22px] font-[800] tracking-tight text-[#9A3412]" style={{ fontWeight: 800 }}>Hungry? Hot from restaurants</h2>
          <p className="mt-0.5 text-[12.5px] text-[#B45309]">Biryani, pizza and more, straight from Tarikere kitchens</p>
        </div>
        <Link href="/restaurants" className="text-[13px] font-[700] text-[#16A34A] hover:text-[#15803D] transition-colors">See all →</Link>
      </div>
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <button key={g.label} onClick={() => setActive(g.label)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-[700] transition-all ${g.label === current.label ? 'border-[#EA580C] bg-[#EA580C] text-white' : 'border-[#FBD5B0] bg-white text-[#9A3412] hover:border-[#EA580C]'}`}>
            <span>{g.emoji}</span>{g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {shown.map((d) => <RestaurantDishCard key={d.id} d={d} />)}
      </div>
    </section>
  )
}
