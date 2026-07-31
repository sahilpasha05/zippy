'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Banner = {
  id: string; title: string; subtitle: string | null
  image_url: string; link: string | null; is_pinned: boolean
}

const ROTATE_MS = 4000

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('banners')
        .select('id, title, subtitle, image_url, link, is_pinned')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('sort_order', { ascending: true })
      setBanners((data as Banner[]) ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setActive((i) => (i + 1) % banners.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [banners.length])

  const prev = () => setActive((i) => (i - 1 + banners.length) % banners.length)
  const next = () => setActive((i) => (i + 1) % banners.length)

  if (banners.length === 0) return null

  return (
    <section>
      <div className="relative rounded-3xl overflow-hidden h-[160px] sm:h-[220px] lg:h-[320px] shadow-zippy-lg group">
        {banners.map((b, i) => {
          const content = (
            <div className="relative h-full w-full">
              <Image src={b.image_url} alt={b.title} fill className="object-cover" priority={i === 0} sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative h-full flex flex-col justify-end px-5 sm:px-10 lg:px-16 pb-4 sm:pb-8 max-w-[80%] sm:max-w-[70%]">
                {b.is_pinned && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white mb-3 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full w-fit">
                    Featured
                  </span>
                )}
                <h2 className="text-[16px] sm:text-[26px] lg:text-[34px] font-[900] text-white leading-[1.15] tracking-[-0.02em] mb-1 sm:mb-2 whitespace-pre-line" style={{ fontWeight: 900 }}>
                  {b.title}
                </h2>
                {b.subtitle && <p className="text-[11px] sm:text-[14px] lg:text-[15px] text-white/85 leading-relaxed line-clamp-2 sm:line-clamp-none mb-2 sm:mb-4">{b.subtitle}</p>}
                {b.link && (
                  <span className="inline-flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-white text-[#111827] text-[11px] sm:text-[13.5px] font-[700] rounded-lg sm:rounded-xl w-fit shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                    Order Now →
                  </span>
                )}
              </div>
            </div>
          )
          return (
            <div
              key={b.id}
              className={cn(
                'absolute inset-0 transition-all duration-700 ease-out',
                i === active ? 'opacity-100 translate-x-0' : i < active ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
              )}
            >
              {b.link ? <a href={b.link} className="block h-full w-full">{content}</a> : content}
            </div>
          )
        })}

        {banners.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/35 transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/35 transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
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
          </>
        )}
      </div>
    </section>
  )
}
