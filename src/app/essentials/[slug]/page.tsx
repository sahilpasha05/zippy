'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Search, ChevronRight, Package, Loader2, MessageCircle, Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import CategoryComingSoon from '@/components/CategoryComingSoon'
import { useGroceryGate } from '@/lib/launchConfig'
import { useCartStore } from '@/lib/store/cart'
import { cn, matchesSearchQuery, whatsappSupportUrl } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import ViewCartBar from '@/components/layout/ViewCartBar'
import BlinkitProductCard from '@/components/BlinkitProductCard'
import SiteFooter from '@/components/layout/SiteFooter'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Category = { id: string; name: string; slug: string; image_url: string | null }
type Subcategory = { id: string; name: string; slug: string; image_url: string | null }
type Product = {
  id: string; name: string; price: number; mrp: number | null
  weight: string | null; brand: string | null; rating: number | null
  in_stock: boolean; image_url: string | null; subcategory_id: string | null
}

export default function CategoryPage() {
  const [comingSoon, setComingSoon] = useState<string | null>(null)
  const groceryGated = useGroceryGate()
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSub, setActiveSub] = useState<string>('all')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: cat }, { data: cats }] = await Promise.all([
        supabase.from('grocery_categories').select('id, name, slug, image_url').eq('slug', slug).single(),
        supabase.from('grocery_categories').select('id, name, slug, image_url').eq('is_active', true).order('sort_order'),
      ])
      setAllCategories((cats as Category[]) ?? [])
      if (!cat) { setCategory(null); setLoading(false); return }
      setCategory(cat as Category)
      setActiveSub('all')

      const [{ data: subs }, { data: prods }] = await Promise.all([
        supabase.from('grocery_subcategories').select('id, name, slug, image_url').eq('category_id', cat.id).eq('is_active', true).order('sort_order'),
        supabase.from('grocery_products').select('id, name, price, mrp, weight, brand, rating, in_stock, image_url, subcategory_id')
          .eq('category_id', cat.id).eq('is_active', true).order('created_at', { ascending: false }),
      ])
      setSubcategories((subs as Subcategory[]) ?? [])
      setProducts((prods as Product[]) ?? [])
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => { useCartStore.persist.rehydrate() }, [])

  if (groceryGated) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <div className="w-16 h-16 bg-[#F5F3FF] rounded-2xl flex items-center justify-center">
            <Clock className="w-7 h-7 text-[#7C3AED]" />
          </div>
          <h1 className="text-[20px] font-[800] text-[#111827]">Groceries aren&apos;t available right now</h1>
          <p className="text-[13.5px] text-[#6B7280] max-w-sm">We&apos;ve paused grocery ordering for the moment — check back shortly, or reach out below.</p>
          <a
            href={whatsappSupportUrl('Hi, I need assistance with groceries.')}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 mt-2 px-5 py-2.5 bg-[#25D366] text-white text-[13.5px] font-[700] rounded-xl hover:bg-[#1DA851] transition-all shadow-[0_2px_10px_rgba(37,211,102,0.3)]"
          >
            <MessageCircle className="w-4 h-4" /> Ask us on WhatsApp
          </a>
        </div>
        <SiteFooter />
      </>
    )
  }

  const filtered = products.filter((p) => matchesSearchQuery(search, p.name, p.brand, p.weight))
  const hasSubcategories = subcategories.length > 0

  function scrollToSub(subId: string) {
    setActiveSub(subId)
    sectionRefs.current[subId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Group products under their subcategory. Anything without one lands in "All / Other".
  const groups = hasSubcategories
    ? subcategories.map((s) => ({ sub: s, items: filtered.filter((p) => p.subcategory_id === s.id) }))
        .concat([{ sub: { id: 'other', name: `More ${category?.name ?? ''}`, slug: 'other', image_url: null }, items: filtered.filter((p) => !p.subcategory_id) }])
        .filter((g) => g.items.length > 0)
    : [{ sub: { id: 'all', name: category?.name ?? '', slug: 'all', image_url: null }, items: filtered }]

  return (
    <>
      <Navbar />
      <CartSidebar />
      <ViewCartBar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-10 py-4 lg:py-8">
          {/* Breadcrumb — desktop only */}
          <div className="hidden lg:flex items-center gap-2 text-[12.5px] text-[#6B7280] mb-6">
            <Link href="/" className="hover:text-[#16A34A]">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/essentials" className="hover:text-[#16A34A]">Essentials</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#111827]">{category?.name ?? '...'}</span>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4 lg:mb-6">
            <h1 className="text-[18px] lg:text-[26px] font-[800] text-[#111827] tracking-tight" style={{ fontWeight: 800 }}>
              {category?.name ?? 'Category'}
              <span className="text-[12px] lg:text-[14px] font-normal text-[#9CA3AF] ml-2 lg:ml-3">{filtered.length} products</span>
            </h1>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#16A34A] transition-all">
              <Search className="w-4 h-4 text-[#9CA3AF]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search in category..."
                className="bg-transparent text-[13.5px] outline-none w-44 placeholder:text-[#9CA3AF]" />
            </div>
          </div>

          {/* Other-category pills — desktop */}
          <div className="hidden lg:flex gap-2 overflow-x-auto pb-2 mb-6">
            {allCategories.map((c) => (
              <button key={c.id} onClick={() => { if (groceryGated) setComingSoon(c.name); else router.push(`/essentials/${c.slug}`) }}
                className={cn('px-4 py-2 rounded-xl text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-all border',
                  c.slug === slug ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-[0_2px_6px_rgba(22,163,74,0.3)]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#16A34A] hover:text-[#16A34A]')}>
                {c.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" />
            </div>
          ) : !category ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <p className="text-[16px] font-semibold text-[#374151]">Category not found</p>
              <Link href="/essentials" className="text-[13px] text-[#16A34A]">← Browse all essentials</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-[#9CA3AF]">
              <Package className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">{search ? 'No products found' : 'No products here yet'}</p>
              <p className="text-[13px]">{search ? 'Try a different search term.' : 'Products added in the admin panel will show up here instantly.'}</p>
              <a
                href={whatsappSupportUrl(search
                  ? `Hi, I need assistance with groceries. I couldn't find: "${search}" in ${category?.name ?? 'this category'}`
                  : `Hi, I need assistance with groceries. ${category?.name ?? 'This category'} looks empty.`)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 mt-1 px-5 py-2.5 bg-[#25D366] text-white text-[13.5px] font-[700] rounded-xl hover:bg-[#1DA851] transition-all shadow-[0_2px_10px_rgba(37,211,102,0.3)]"
              >
                <MessageCircle className="w-4 h-4" /> Ask us on WhatsApp
              </a>
            </div>
          ) : (
            <div className="flex gap-3 lg:gap-6">
              {/* Subcategory sidebar — Blinkit style, sticky, own scroll */}
              {hasSubcategories && (
                <aside className="w-[76px] sm:w-[92px] shrink-0">
                  <div className="sticky top-[130px] lg:top-24 flex flex-col gap-1 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
                    {groups.map(({ sub, items }) => (
                      <button
                        key={sub.id}
                        onClick={() => scrollToSub(sub.id)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all text-center border-l-[3px]',
                          activeSub === sub.id ? 'bg-[#F0FDF4] border-[#16A34A]' : 'border-transparent hover:bg-[#F8FAFC]'
                        )}
                      >
                        <div className={cn('w-11 h-11 rounded-full overflow-hidden bg-[#F3F4F6] shrink-0 ring-2', activeSub === sub.id ? 'ring-[#16A34A]' : 'ring-transparent')}>
                          {sub.image_url ? (
                            <Image src={sub.image_url} alt={sub.name} width={44} height={44} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]"><Package className="w-4 h-4" /></div>
                          )}
                        </div>
                        <span className={cn('text-[10px] leading-tight line-clamp-2', activeSub === sub.id ? 'text-[#16A34A] font-[700]' : 'text-[#374151] font-medium')}>
                          {sub.name}
                        </span>
                        <span className="text-[9px] text-[#9CA3AF]">({items.length})</span>
                      </button>
                    ))}
                  </div>
                </aside>
              )}

              {/* Product sections */}
              <div className="flex-1 min-w-0 space-y-8">
                {groups.map(({ sub, items }) => (
                  <div key={sub.id} ref={(el) => { sectionRefs.current[sub.id] = el }} className="scroll-mt-[150px] lg:scroll-mt-28">
                    {hasSubcategories && (
                      <h2 className="text-[15px] lg:text-[17px] font-[800] text-[#111827] mb-3" style={{ fontWeight: 800 }}>{sub.name}</h2>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 lg:gap-4">
                      {items.map((p) => <BlinkitProductCard key={p.id} p={p} />)}
                    </div>
                  </div>
                ))}

                {/* Category info blurb — like Blinkit's SEO footer */}
                {category?.name && (
                  <p className="text-[12px] text-[#9CA3AF] leading-relaxed pt-4 border-t border-[#E5E7EB]">
                    Shop the best {category.name.toLowerCase()} online with Zippy — handpicked quality, honest pricing, and delivery in minutes, right to your door in Tarikere.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <CategoryComingSoon categoryName={comingSoon} onClose={() => setComingSoon(null)} />
      <SiteFooter />
    </>
  )
}
