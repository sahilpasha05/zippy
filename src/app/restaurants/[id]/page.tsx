'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Star, Clock, MapPin, ChevronRight, Plus, Minus, Search, Heart, Share2, Flame, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cart'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import SiteFooter from '@/components/layout/SiteFooter'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Restaurant = {
  id: string; name: string; slug: string
  cuisine: string[]; description: string
  cover_url: string | null; logo_url: string | null
  address: string; delivery_time: number
  min_order: number; delivery_fee: number
  is_open: boolean; rating: number
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'

type MenuItem = { id: string; name: string; desc: string; price: number; image: string; isVeg: boolean; isBestseller: boolean; rating: number }
type MenuSection = { category: string; items: MenuItem[] }

function MenuItemRow({ item, restaurantId, disabled }: { item: MenuItem; restaurantId: string; disabled: boolean }) {
  const { addItem, items, updateQuantity } = useCartStore()
  const cartItem = items.find((i) => i.product_id === item.id)

  return (
    <div className="flex items-start gap-4 py-5 border-b border-[#F3F4F6] last:border-0 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', item.isVeg ? 'border-[#16A34A]' : 'border-red-500')}>
            <div className={cn('w-1.5 h-1.5 rounded-full', item.isVeg ? 'bg-[#16A34A]' : 'bg-red-500')} />
          </div>
          {item.isBestseller && (
            <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3" /> Bestseller
            </span>
          )}
        </div>
        <h4 className="text-[14.5px] font-[600] text-[#111827] mb-1">{item.name}</h4>
        <p className="text-[12.5px] text-[#6B7280] mb-2 leading-relaxed line-clamp-2">{item.desc}</p>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-[800] text-[#111827]">₹{item.price}</span>
          <span className="flex items-center gap-0.5 text-[11.5px] text-[#D97706] font-medium">
            <Star className="w-3 h-3 fill-[#D97706]" />{item.rating}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB]">
          <Image src={item.image} alt={item.name} width={128} height={128} unoptimized className="w-full h-full object-cover" />
        </div>
        {disabled ? (
          <button disabled className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#F3F4F6] text-[#9CA3AF] text-[12px] font-[600] rounded-xl cursor-not-allowed">
            Unavailable
          </button>
        ) : cartItem ? (
          <div className="flex items-center gap-1">
            <button onClick={() => updateQuantity(item.id, cartItem.quantity - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#16A34A]"><Minus className="w-3.5 h-3.5" /></button>
            <span className="w-6 text-center text-[13px] font-[700]">{cartItem.quantity}</span>
            <button onClick={() => updateQuantity(item.id, cartItem.quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D]"><Plus className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={() => addItem({ product_id: item.id, product_type: 'restaurant', restaurant_id: restaurantId, name: item.name, image_url: item.image, price: item.price, quantity: 1 })}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#16A34A] text-white text-[13px] font-[600] rounded-xl hover:bg-[#15803D] active:scale-95 transition-all shadow-[0_2px_8px_rgba(22,163,74,0.3)]">
            <Plus className="w-3.5 h-3.5" /> ADD
          </button>
        )}
      </div>
    </div>
  )
}

export default function RestaurantDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menu, setMenu] = useState<MenuSection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [search, setSearch] = useState('')
  const [wishlist, setWishlist] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, name, slug, cuisine, description, cover_url, logo_url, address, delivery_time, min_order, delivery_fee, is_open, rating')
        .eq('slug', slug)
        .single()
      setRestaurant(rest as Restaurant ?? null)

      if (rest) {
        const [{ data: cats }, { data: prods }] = await Promise.all([
          supabase.from('restaurant_categories').select('id, name').eq('restaurant_id', rest.id).order('sort_order'),
          supabase.from('restaurant_products').select('*, restaurant_categories(name)').eq('restaurant_id', rest.id).eq('is_available', true),
        ])

        const toMenuItem = (p: Record<string, unknown>): MenuItem => ({
          id: p.id as string,
          name: p.name as string,
          desc: (p.description as string | null) ?? '',
          price: Number(p.price),
          image: (p.image_url as string | null) ?? PLACEHOLDER_IMAGE,
          isVeg: p.is_veg as boolean,
          isBestseller: p.is_bestseller as boolean,
          rating: Number(p.rating ?? 4),
        })

        const sections: MenuSection[] = (cats ?? [])
          .map((c) => ({ category: c.name, items: (prods ?? []).filter((p) => p.category_id === c.id).map(toMenuItem) }))
          .filter((s) => s.items.length > 0)

        const uncategorized = (prods ?? []).filter((p) => !p.category_id).map(toMenuItem)
        if (uncategorized.length > 0) sections.push({ category: 'Other', items: uncategorized })

        setMenu(sections)
        setActiveCategory(sections[0]?.category ?? '')
      }
      setLoading(false)
    }
    load()
  }, [slug])

  function scrollToCategory(category: string) {
    setActiveCategory(category)
    // Deferred a frame so this runs after the re-render from setActiveCategory settles —
    // calling scrollIntoView in the same tick could get its animation cut short by the reflow.
    requestAnimationFrame(() => {
      document.getElementById(`category-${category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const filteredMenu = menu.map((section) => ({
    ...section,
    items: section.items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
  })).filter((s) => s.items.length > 0)

  const cover = restaurant?.cover_url ?? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=500&fit=crop'
  const logo  = restaurant?.logo_url  ?? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'

  if (loading) return (
    <>
      <Navbar /><CartSidebar />
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" />
      </div>
    </>
  )

  if (!restaurant) return (
    <>
      <Navbar /><CartSidebar />
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <p className="text-[16px] font-semibold text-[#374151]">Restaurant not found</p>
        <Link href="/restaurants" className="text-[13px] text-[#16A34A]">← Back to restaurants</Link>
      </div>
    </>
  )

  return (
    <>
      <Navbar />
      <CartSidebar />
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Hero */}
        <div className="relative h-64 lg:h-80 bg-[#F8FAFC] overflow-hidden">
          <Image src={cover} alt={restaurant.name} fill unoptimized className={cn('object-cover', !restaurant.is_open && 'grayscale')} priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="flex items-end gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <Image src={logo} alt="" width={64} height={64} unoptimized className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-[24px] font-[800] text-white tracking-tight">{restaurant.name}</h1>
                <p className="text-[13px] text-white/80">{(restaurant.cuisine ?? []).join(' • ')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWishlist(!wishlist)} className="w-9 h-9 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/35 transition-all">
                <Heart className={cn('w-4 h-4', wishlist && 'fill-red-400 text-red-400')} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/35 transition-all">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="bg-white border-b border-[#E5E7EB]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-4">
            <div className="flex items-center gap-2 text-[12.5px] text-[#6B7280] mb-4">
              <Link href="/" className="hover:text-[#16A34A]">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/restaurants" className="hover:text-[#16A34A]">Restaurants</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#111827]">{restaurant.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#6B7280]">
              <span className="flex items-center gap-1.5 font-semibold text-[#D97706]">
                <Star className="w-4 h-4 fill-[#D97706]" />{restaurant.rating ?? 4.5}
              </span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{restaurant.delivery_time}–{restaurant.delivery_time + 10} min</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{restaurant.address}</span>
              <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold', restaurant.is_open ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F3F4F6] text-[#6B7280]')}>
                {restaurant.is_open ? '● Open now' : '○ Closed'}
              </span>
              <span className="text-[#16A34A] font-medium">{restaurant.delivery_fee === 0 ? 'Free delivery' : `₹${restaurant.delivery_fee} delivery`}</span>
              <span>Min ₹{restaurant.min_order}</span>
            </div>
            {!restaurant.is_open && (
              <div className="mt-3 px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#B91C1C] font-medium">
                This restaurant is currently unavailable and not accepting orders right now.
              </div>
            )}
          </div>
        </div>

        {/* Category filter bar — mobile/tablet, where the sidebar below is hidden */}
        {menu.length > 0 && (
          <div className="lg:hidden sticky top-[64px] z-10 bg-white border-b border-[#E5E7EB] px-4 py-3">
            <div className="flex gap-2 overflow-x-auto">
              {menu.map((section) => (
                <button key={section.category} onClick={() => scrollToCategory(section.category)}
                  className={cn('px-4 py-1.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-all shrink-0',
                    activeCategory === section.category ? 'bg-[#16A34A] text-white shadow-[0_2px_6px_rgba(22,163,74,0.3)]' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                  {section.category}
                  <span className="ml-1.5 text-[10.5px] opacity-70">({section.items.length})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          <div className="flex gap-8">
            {/* Category sidebar */}
            <aside className="hidden lg:block w-52 shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-zippy-sm">
                <div className="p-3">
                  {menu.map((section) => (
                    <button key={section.category} onClick={() => scrollToCategory(section.category)}
                      className={cn('w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all mb-1',
                        activeCategory === section.category ? 'bg-[#DCFCE7] text-[#16A34A] font-semibold' : 'text-[#374151] hover:bg-[#F8FAFC]')}>
                      {section.category}
                      <span className="ml-1.5 text-[11px] text-[#9CA3AF]">({section.items.length})</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Menu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#16A34A] mb-6 transition-all">
                <Search className="w-4 h-4 text-[#9CA3AF]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu..."
                  className="bg-transparent text-[14px] outline-none flex-1 placeholder:text-[#9CA3AF]" />
              </div>
              {filteredMenu.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] py-16 text-center">
                  <p className="text-[14px] font-medium text-[#374151]">
                    {menu.length === 0 ? 'This restaurant hasn’t added any menu items yet.' : 'No items match your search.'}
                  </p>
                </div>
              ) : (
                filteredMenu.map((section) => (
                  <div key={section.category} id={`category-${section.category}`} className="mb-8 scroll-mt-40">
                    <h2 className="text-[18px] font-[800] text-[#111827] mb-1">{section.category}</h2>
                    <p className="text-[12.5px] text-[#9CA3AF] mb-4">{section.items.length} items</p>
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] px-6">
                      {section.items.map((item) => <MenuItemRow key={item.id} item={item} restaurantId={restaurant.id} disabled={!restaurant.is_open} />)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
