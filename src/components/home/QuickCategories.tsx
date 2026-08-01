'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import CategoryComingSoon from '@/components/CategoryComingSoon'
import { useGroceryGate } from '@/lib/launchConfig'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Category = { id: string; name: string; slug: string; image_url: string | null; group_name: string | null }

const GROUP_ORDER = ['Grocery & Kitchen', 'Snacks & Drinks', 'Beauty & Personal Care', 'Household Essentials']

export default function QuickCategories() {
  const [comingSoon, setComingSoon] = useState<string | null>(null)
  const gated = useGroceryGate()
  const router = useRouter()

  function openCategory(c: Category) {
    if (gated) setComingSoon(c.name)
    else router.push(`/essentials/${c.slug}`)
  }
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('grocery_categories')
        .select('id, name, slug, image_url, group_name')
        .eq('is_active', true)
        .order('sort_order')
      setCategories((data as Category[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const grouped = GROUP_ORDER
    .map((group) => ({ group, items: categories.filter((c) => c.group_name === group) }))
    .filter((g) => g.items.length > 0)
  const ungrouped = categories.filter((c) => !GROUP_ORDER.includes(c.group_name ?? ''))

  if (loading) {
    return (
      <section>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-5">
          {[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-[#F3F4F6] rounded-2xl animate-pulse" />)}
        </div>
    </section>
    )
  }

  return (
    <section className="space-y-8">
      {grouped.map(({ group, items }) => (
        <div key={group}>
          <h2 className="text-[16px] lg:text-[19px] font-[800] text-[#111827] mb-4" style={{ fontWeight: 800 }}>{group}</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-5">
            {items.map((c) => (
              <button key={c.id} onClick={() => openCategory(c)} className="group flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#F1F5F9] border border-[#E5E7EB] group-hover:shadow-zippy group-hover:border-[#16A34A]/40 transition-all">
                  {c.image_url ? (
                    <Image src={c.image_url} alt={c.name} width={120} height={120}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[24px] font-[800] text-[#93C5FD]">{c.name[0]}</div>
                  )}
                </div>
                <span className="text-[11px] lg:text-[12.5px] font-[600] text-[#374151] text-center leading-tight line-clamp-2">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div>
          <h2 className="text-[16px] lg:text-[19px] font-[800] text-[#111827] mb-4" style={{ fontWeight: 800 }}>More on Zippy</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-5">
            {ungrouped.map((c) => (
              <button key={c.id} onClick={() => openCategory(c)} className="group flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#F1F5F9] border border-[#E5E7EB] group-hover:shadow-zippy group-hover:border-[#16A34A]/40 transition-all">
                  {c.image_url ? (
                    <Image src={c.image_url} alt={c.name} width={120} height={120}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[24px] font-[800] text-[#93C5FD]">{c.name[0]}</div>
                  )}
                </div>
                <span className="text-[11px] lg:text-[12.5px] font-[600] text-[#374151] text-center leading-tight line-clamp-2">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <CategoryComingSoon categoryName={comingSoon} onClose={() => setComingSoon(null)} />
    </section>
  )
}
