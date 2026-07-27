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

// Fallback menu until a menu_items table is wired up
const FALLBACK_MENU = [
  {
    category: 'Mains', items: [
      { id: 'f1', name: 'Special Thali', desc: 'Chef special with dal, sabzi, rice & roti. Wholesome meal.', price: 199, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop', isVeg: true,  isBestseller: true,  rating: 4.8 },
      { id: 'f2', name: 'Paneer Butter Masala', desc: 'Rich creamy paneer curry with butter naan.', price: 219, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&h=200&fit=crop', isVeg: true,  isBestseller: false, rating: 4.6 },
      { id: 'f3', name: 'Chicken Curry', desc: 'Home-style chicken in tomato onion masala.', price: 249, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&h=200&fit=crop', isVeg: false, isBestseller: false, rating: 4.5 },
    ]
  },
  {
    category: 'Starters', items: [
      { id: 'f4', name: 'Veg Manchurian', desc: 'Crispy veggie balls in manchurian sauce.', price: 149, image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200&h=200&fit=crop', isVeg: true,  isBestseller: true,  rating: 4.7 },
      { id: 'f5', name: 'Chicken 65', desc: 'Spicy deep-fried chicken with curry leaves.', price: 189, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&h=200&fit=crop', isVeg: false, isBestseller: false, rating: 4.6 },
    ]
  },
  {
    category: 'Drinks', items: [
      { id: 'f6', name: 'Sweet Lassi', desc: 'Chilled yoghurt drink with cardamom.', price: 79, image: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=200&h=200&fit=crop', isVeg: true,  isBestseller: false, rating: 4.5 },
    ]
  },
]

type MenuItem = typeof FALLBACK_MENU[0]['items'][0]

function MenuItemRow({ item, restaurantId }: { item: MenuItem; restaurantId: string }) {
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
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB]">
          <Image src={item.image} alt={item.name} width={96} height={96} className="w-full h-full object-cover" />
        </div>
        {cartItem ? (
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
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(FALLBACK_MENU[0].category)
  const [search, setSearch] = useState('')
  const [wishlist, setWishlist] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, slug, cuisine, description, cover_url, logo_url, address, delivery_time, min_order, delivery_fee, is_open, rating')
        .eq('slug', slug)
        .single()
      setRestaurant(data as Restaurant ?? null)
      setLoading(false)
    }
    load()
  }, [slug])

  const MENU = FALLBACK_MENU
  const filteredMenu = MENU.map((section) => ({
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
          <Image src={cover} alt={restaurant.name} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="flex items-end gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg">
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
              <span className="text-[#16A34A] font-medium">{restaurant.delivery_fee === 0 ? 'Free delivery' : `₹${restaurant.delivery_fee} delivery`}</span>
              <span>Min ₹{restaurant.min_order}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          <div className="flex gap-8">
            {/* Category sidebar */}
            <aside className="hidden lg:block w-52 shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-zippy-sm">
                <div className="p-3">
                  {MENU.map((section) => (
                    <button key={section.category} onClick={() => setActiveCategory(section.category)}
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
              {filteredMenu.map((section) => (
                <div key={section.category} className="mb-8">
                  <h2 className="text-[18px] font-[800] text-[#111827] mb-1">{section.category}</h2>
                  <p className="text-[12.5px] text-[#9CA3AF] mb-4">{section.items.length} items</p>
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] px-6">
                    {section.items.map((item) => <MenuItemRow key={item.id} item={item} restaurantId={restaurant.id} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
