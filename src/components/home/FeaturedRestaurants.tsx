import { Star, Clock, MapPin, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const restaurants = [
  {
    id: '1',
    name: 'The Biryani House',
    cuisine: ['Biryani', 'Mughlai', 'North Indian'],
    rating: 4.7,
    ratingCount: 2840,
    distance: 1.2,
    deliveryTime: 28,
    isOpen: true,
    cover: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=300&fit=crop',
    logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop',
    minOrder: 149,
    offer: '40% OFF up to ₹80',
  },
  {
    id: '2',
    name: 'Boba & Beyond',
    cuisine: ['Bubble Tea', 'Desserts', 'Beverages'],
    rating: 4.8,
    ratingCount: 1240,
    distance: 0.8,
    deliveryTime: 20,
    isOpen: true,
    cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=300&fit=crop',
    logo: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=80&h=80&fit=crop',
    minOrder: 99,
    offer: 'Free delivery',
  },
  {
    id: '3',
    name: 'Masala Mantra',
    cuisine: ['South Indian', 'Breakfast', 'Thali'],
    rating: 4.5,
    ratingCount: 3120,
    distance: 2.1,
    deliveryTime: 35,
    isOpen: true,
    cover: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&h=300&fit=crop',
    logo: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=80&h=80&fit=crop',
    minOrder: 129,
    offer: '20% OFF',
  },
  {
    id: '4',
    name: 'Pizza Perfecto',
    cuisine: ['Pizza', 'Italian', 'Pasta'],
    rating: 4.6,
    ratingCount: 4200,
    distance: 1.5,
    deliveryTime: 30,
    isOpen: false,
    cover: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=300&fit=crop',
    logo: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=80&h=80&fit=crop',
    minOrder: 199,
    offer: 'Buy 1 Get 1',
  },
]

function RestaurantCard({ r }: { r: typeof restaurants[0] }) {
  return (
    <Link href={`/restaurants/${r.id}`} className="group bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-zippy hover:border-[#D1D5DB] transition-all duration-200 hover:-translate-y-0.5 block">
      {/* Cover */}
      <div className="relative h-40 bg-[#F8FAFC] overflow-hidden">
        <Image
          src={r.cover}
          alt={r.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* Offer badge */}
        {r.offer && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-[#16A34A] text-white text-[11px] font-[700] rounded-lg" style={{ fontWeight: 700 }}>
            {r.offer}
          </div>
        )}
        {/* Open/closed badge */}
        <div className={cn(
          'absolute top-3 right-3 px-2 py-1 rounded-full text-[10.5px] font-semibold',
          r.isOpen ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F3F4F6] text-[#6B7280]'
        )}>
          {r.isOpen ? '● Open' : '○ Closed'}
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB] shrink-0">
            <Image src={r.logo} alt={r.name} width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-[700] text-[#111827] truncate" style={{ fontWeight: 700 }}>{r.name}</h3>
            <p className="text-[12px] text-[#6B7280] truncate">{r.cuisine.join(', ')}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[12px] text-[#6B7280]">
          <span className="flex items-center gap-1 text-[#D97706] font-semibold">
            <Star className="w-3 h-3 fill-[#D97706]" />
            {r.rating}
            <span className="text-[#9CA3AF] font-normal">({r.ratingCount.toLocaleString()})</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {r.deliveryTime} min
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {r.distance} km
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function FeaturedRestaurants() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-[800] text-[#111827] tracking-tight" style={{ fontWeight: 800 }}>
            Top restaurants nearby
          </h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">500+ restaurants delivering to you</p>
        </div>
        <Link href="/restaurants" className="flex items-center gap-1 text-[13.5px] font-[600] text-[#16A34A] hover:text-[#15803D] transition-colors" style={{ fontWeight: 600 }}>
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {restaurants.map((r) => (
          <RestaurantCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  )
}
