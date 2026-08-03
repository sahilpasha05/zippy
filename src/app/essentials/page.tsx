'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, ChevronRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { cn, matchesSearchQuery, whatsappSupportUrl } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import ViewCartBar from '@/components/layout/ViewCartBar'
import { createBrowserClient } from '@supabase/ssr'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import BlinkitProductCard from '@/components/BlinkitProductCard'
import SiteFooter from '@/components/layout/SiteFooter'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Category = { id: string; name: string; slug: string }

type Product = {
  id: string
  name: string
  price: number
  mrp: number
  weight: string | null
  brand: string | null
  rating: number
  in_stock: boolean
  delivery_eta: string
  image_url: string | null
  category_slug: string
}

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#F3F4F6]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[#F3F4F6] rounded w-3/4" />
        <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
        <div className="h-8 bg-[#F3F4F6] rounded-xl mt-3" />
      </div>
    </div>
  )
}

export default function EssentialsPage() {
  return (
    <Suspense fallback={null}>
      <EssentialsPageInner />
    </Suspense>
  )
}

function EssentialsPageInner() {
  const searchParams = useSearchParams()
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const deliveryEta = useDeliveryEta()

  useEffect(() => {
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    Promise.all([
      supabase
        .from('grocery_products')
        .select('id, name, price, mrp, weight, brand, rating, in_stock, delivery_eta, image_url, grocery_categories(slug)')
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('grocery_categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order'),
    ]).then(([{ data: prods }, { data: cats }]) => {
      if (prods) {
        setProducts(
          prods.map((p: any) => ({
            ...p,
            category_slug: p.grocery_categories?.slug ?? '',
          }))
        )
      }
      setCategories((cats as Category[]) ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === 'all' || p.category_slug === activeCategory
    const matchSearch = matchesSearchQuery(search, p.name, p.brand, p.weight)
    return matchCat && matchSearch
  })

  return (
    <>
      <Navbar />
      <CartSidebar />
      <ViewCartBar />
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-6">
            <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-4">
              <Link href="/" className="hover:text-[#16A34A] transition-colors">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#111827] font-medium">Essentials</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-[800] text-[#111827] tracking-tight" style={{ fontWeight: 800 }}>Grocery Essentials</h1>
                <p className="text-[14px] text-[#6B7280] mt-1">Delivered in {deliveryEta} minutes</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus-within:border-[#16A34A] transition-all">
                  <Search className="w-4 h-4 text-[#9CA3AF]" strokeWidth={2} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="bg-transparent text-[13.5px] text-[#111827] placeholder:text-[#9CA3AF] outline-none w-48"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] font-medium text-[#374151] hover:border-[#D1D5DB] bg-white transition-all">
                  <SlidersHorizontal className="w-4 h-4" strokeWidth={2} /> Filter
                </button>
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all shrink-0',
                  activeCategory === 'all'
                    ? 'bg-[#16A34A] text-white shadow-[0_2px_8px_rgba(22,163,74,0.3)]'
                    : 'bg-[#F8FAFC] text-[#374151] border border-[#E5E7EB] hover:border-[#D1D5DB]'
                )}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.slug)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all shrink-0',
                    activeCategory === c.slug
                      ? 'bg-[#16A34A] text-white shadow-[0_2px_8px_rgba(22,163,74,0.3)]'
                      : 'bg-[#F8FAFC] text-[#374151] border border-[#E5E7EB] hover:border-[#D1D5DB]'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="text-5xl">🔍</span>
              <p className="text-[16px] font-semibold text-[#374151]">No products found</p>
              <p className="text-[13px] text-[#6B7280]">Try a different category or search term</p>
              <a
                href={whatsappSupportUrl(search
                  ? `Hi, I need assistance with groceries. I couldn't find: "${search}"`
                  : 'Hi, I need assistance with groceries.')}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 mt-2 px-5 py-2.5 bg-[#25D366] text-white text-[13.5px] font-[700] rounded-xl hover:bg-[#1DA851] transition-all shadow-[0_2px_10px_rgba(37,211,102,0.3)]"
              >
                <MessageCircle className="w-4 h-4" /> Ask us on WhatsApp
              </a>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-[#6B7280] mb-5">{filtered.length} products</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filtered.map((p) => <BlinkitProductCard key={p.id} p={p} />)}
              </div>
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
