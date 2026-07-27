'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Leaf, UtensilsCrossed, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

const banners = [
  {
    id: 1,
    gradient: 'from-[#14532D] to-[#16A34A]',
    tagIcon: Leaf,
    tagText: 'Fresh Arrivals',
    title: 'Farm to your\ndoor in minutes',
    subtitle: 'Handpicked vegetables, sourced every morning',
    cta: 'Shop Vegetables',
    ctaHref: '/essentials/fruits-vegetables',
    BgIcon: Leaf,
    accentColor: '#22C55E',
  },
  {
    id: 2,
    gradient: 'from-[#1E3A5F] to-[#2563EB]',
    tagIcon: UtensilsCrossed,
    tagText: 'Top Restaurants',
    title: "Your city's best\nrestaurants",
    subtitle: 'Order from 500+ top-rated restaurants near you',
    cta: 'Explore Restaurants',
    ctaHref: '/restaurants',
    BgIcon: UtensilsCrossed,
    accentColor: '#60A5FA',
  },
  {
    id: 3,
    gradient: 'from-[#7C2D12] to-[#EA580C]',
    tagIcon: Tag,
    tagText: 'Hot Deals',
    title: 'Save up to\n50% today',
    subtitle: 'Exclusive offers on groceries and restaurant orders',
    cta: 'View Offers',
    ctaHref: '/offers',
    BgIcon: Tag,
    accentColor: '#FB923C',
  },
]

export default function BannerCarousel() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % banners.length), 4500)
    return () => clearInterval(t)
  }, [])

  const prev = () => setActive((i) => (i - 1 + banners.length) % banners.length)
  const next = () => setActive((i) => (i + 1) % banners.length)

  return (
    <section>
      <div className="relative rounded-3xl overflow-hidden h-[260px] lg:h-[320px] shadow-zippy-lg group">
        {banners.map((b, i) => {
          const TagIcon = b.tagIcon
          const BgIcon = b.BgIcon
          return (
            <div
              key={b.id}
              className={cn(
                'absolute inset-0 bg-gradient-to-r transition-all duration-700 ease-out',
                b.gradient,
                i === active ? 'opacity-100 translate-x-0' : i < active ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
              )}
            >
              {/* Content */}
              <div className="relative h-full flex flex-col justify-center px-10 lg:px-16 max-w-[60%]">
                <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-white/80 mb-4 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full w-fit">
                  <TagIcon className="w-3.5 h-3.5" strokeWidth={2} />
                  {b.tagText}
                </span>
                <h2 className="text-[30px] lg:text-[38px] font-[900] text-white leading-[1.1] tracking-[-0.02em] whitespace-pre-line mb-3" style={{ fontWeight: 900 }}>
                  {b.title}
                </h2>
                <p className="text-[14px] lg:text-[15px] text-white/75 mb-6 leading-relaxed">{b.subtitle}</p>
                <a
                  href={b.ctaHref}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[13.5px] font-[700] rounded-xl hover:opacity-95 active:scale-95 transition-all w-fit shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                  style={{ color: b.accentColor, fontWeight: 700 }}
                >
                  {b.cta} →
                </a>
              </div>

              {/* Decorative large icon */}
              <div className="absolute right-10 lg:right-16 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none select-none">
                <BgIcon className="w-40 h-40 lg:w-52 lg:h-52 text-white" strokeWidth={0.75} />
              </div>

              {/* Decorative circles */}
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-white/5 rounded-full pointer-events-none" />
            </div>
          )
        })}

        {/* Arrows */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/35 transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/35 transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
