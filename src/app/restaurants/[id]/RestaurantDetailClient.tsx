'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Star, Clock, MapPin, ChevronRight, Plus, Minus, Search, Heart, Share2, Flame, Loader2, UtensilsCrossed, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCartStore, conflictsWithCart } from '@/lib/store/cart'
import CartConflictDialog from '@/components/CartConflictDialog'
import { useOrderingEnabled } from '@/lib/launchConfig'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import ViewCartBar from '@/components/layout/ViewCartBar'
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
  const { addItem, replaceCartWith, items, updateQuantity } = useCartStore()
  const orderingEnabled = useOrderingEnabled()
  const cartItem = items.find((i) => i.product_id === item.id)
  const [askReplace, setAskReplace] = useState(false)

  const draft = { product_id: item.id, product_type: 'restaurant' as const, restaurant_id: restaurantId, name: item.name, image_url: item.image, price: item.price, quantity: 1 }

  function handleAdd() {
    if (conflictsWithCart(items, restaurantId)) { setAskReplace(true); return }
    addItem(draft)
  }

  // ₹0 rows are promo announcements (e.g. "spend ₹X, get a free Y"), not a
  // real purchasable product — no price line, no Add button, just the mention.
  if (item.price === 0) {
    return (
      <div className="flex items-start gap-4 py-5 border-b border-[#F3F4F6] last:border-0 bg-[#FFFBEB] -mx-4 px-4 rounded-xl">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {item.isBestseller && (
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#D97706] bg-white px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3" /> Bestseller
              </span>
            )}
          </div>
          <h4 className="text-[14.5px] font-[700] text-[#111827] mb-1">{item.name}</h4>
          <p className="text-[12.5px] text-[#92400E] leading-relaxed">{item.desc}</p>
        </div>
        <div className="w-32 h-32 rounded-full overflow-hidden bg-white border border-[#FDE68A] shrink-0">
          <Image src={item.image} alt={item.name} width={128} height={128} className="w-full h-full object-cover" />
        </div>
      </div>
    )
  }

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
          {!orderingEnabled && (
            <span className="text-[10.5px] font-semibold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full">
              Coming soon
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
          {/* Combo/offer items reuse a full promo poster as their image — cropping
              a poster to fill a circle cuts off its title or price depending on
              orientation, so those show the whole thing instead of cropping.
              Posters live either as local /banners/ assets or as uploaded
              restaurant-images files named with a "banner-" prefix. */}
          <Image src={item.image} alt={item.name} width={128} height={128}
            className={cn('w-full h-full', /\/banners\/|\/banner-[^/]+$/.test(item.image) ? 'object-contain' : 'object-cover')} />
        </div>
        {!orderingEnabled ? (
          <button disabled className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#F3F4F6] text-[#9CA3AF] text-[12px] font-[600] rounded-xl cursor-not-allowed">
            Coming soon
          </button>
        ) : disabled ? (
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
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#16A34A] text-white text-[13px] font-[600] rounded-xl hover:bg-[#15803D] active:scale-95 transition-all shadow-[0_2px_8px_rgba(22,163,74,0.3)]">
            <Plus className="w-3.5 h-3.5" /> ADD
          </button>
        )}
      </div>
      {askReplace && (
        <CartConflictDialog
          onCancel={() => setAskReplace(false)}
          onReplace={() => { replaceCartWith(draft); setAskReplace(false) }}
        />
      )}
    </div>
  )
}

export default function RestaurantDetailClient() {
  const { id: slug } = useParams<{ id: string }>()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menu, setMenu] = useState<MenuSection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  // A dish picked from the site-wide search opens here as ?q=<dish>, so the
  // menu search box starts filled in.
  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('q') ?? ''
  })
  const [wishlist, setWishlist] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const cartCount = useCartStore((st) => st.items.reduce((n, i) => n + i.quantity, 0))
  const cartOpen = useCartStore((st) => st.isOpen)

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
          supabase.from('restaurant_products').select('*, restaurant_categories(name)').eq('restaurant_id', rest.id).eq('is_available', true).order('created_at'),
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

        // Items within each category go cheapest first. The Weekend Offer
        // section is left in its own order.
        const byPrice = (x: MenuItem, y: MenuItem) => x.price - y.price
        const sections: MenuSection[] = (cats ?? [])
          .map((c) => {
            const items = (prods ?? []).filter((p) => p.category_id === c.id).map(toMenuItem)
            return { category: c.name, items: c.name === 'Weekend Offer' ? items : items.sort(byPrice) }
          })
          .filter((s) => s.items.length > 0)

        const uncategorized = (prods ?? []).filter((p) => !p.category_id).map(toMenuItem)
        if (uncategorized.length > 0) sections.push({ category: 'Other', items: uncategorized.sort(byPrice) })

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

  // Keep the highlighted category in step with the section that is at the top
  // of the screen while the customer scrolls.
  const visibleKey = filteredMenu.map((s) => s.category).join('|')
  useEffect(() => {
    if (!visibleKey) return
    const cats = visibleKey.split('|')
    function onScroll() {
      const line = window.innerHeight * 0.28
      let current = cats[0]
      for (const c of cats) {
        const el = document.getElementById(`category-${c}`)
        if (el && el.getBoundingClientRect().top <= line) current = c
      }
      setActiveCategory((prev) => (prev === current ? prev : current))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [visibleKey])

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
      <ViewCartBar />
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Hero */}
        <div className="relative h-64 lg:h-80 bg-[#F8FAFC] overflow-hidden">
          <Image src={cover} alt={restaurant.name} fill className={cn('object-cover', !restaurant.is_open && 'grayscale')} priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="flex items-end gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <Image src={logo} alt="" width={64} height={64} className="w-full h-full object-cover" />
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
              <span>Min ₹{restaurant.min_order}</span>
            </div>
            {!restaurant.is_open && (
              <div className="mt-3 px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#B91C1C] font-medium">
                This restaurant is currently unavailable and not accepting orders right now.
              </div>
            )}
          </div>
        </div>

        {/* Mobile: sticky label showing which category is on screen, plus a floating Menu button (below) */}
        {menu.length > 0 && (
          <div style={{ top: 'var(--zippy-header-h, 168px)' }} className="lg:hidden sticky z-10 bg-white border-b border-[#E5E7EB] px-4 py-2.5">
            <p className="text-[13.5px] font-[800] text-[#111827]">{activeCategory}</p>
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
      {menu.length > 0 && !cartOpen && (
        <div className="lg:hidden">
          {menuOpen && (
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)}>
              <div className="absolute inset-0 bg-black/60" />
              <div
                onClick={(e) => e.stopPropagation()}
                className={cn('absolute right-4 w-[min(78vw,320px)] max-h-[60vh] overflow-y-auto rounded-3xl bg-[#1F2937] p-2 shadow-2xl',
                  cartCount > 0 ? 'bottom-[212px]' : 'bottom-[152px]')}>
                {menu.map((section) => (
                  <button key={section.category}
                    onClick={() => { setMenuOpen(false); scrollToCategory(section.category) }}
                    className={cn('flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px]',
                      activeCategory === section.category ? 'font-[800] text-[#4ADE80]' : 'font-[500] text-white')}>
                    <span>{section.category}</span>
                    <span className={cn('text-[14px]', activeCategory === section.category ? 'font-[800]' : 'text-white/70')}>{section.items.length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Browse menu categories'}
            className={cn('fixed right-4 z-[61] flex items-center gap-2 rounded-full bg-[#1F2937] px-5 py-3 text-[14px] font-[700] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition-all',
              cartCount > 0 ? 'bottom-[140px]' : 'bottom-[84px]')}>
            {menuOpen ? <><X className="h-4 w-4" /> Close</> : <><UtensilsCrossed className="h-4 w-4" /> Menu</>}
          </button>
        </div>
      )}
      <SiteFooter />
    </>
  )
}
