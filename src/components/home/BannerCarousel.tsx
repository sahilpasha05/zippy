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
  image_url: string; link: string | null
}

const ROTATE_MS = 4000

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('banners')
        .select('id, title, subtitle, image_url, link')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      setBanners((data as Banner[]) ?? [])
    }
    load()
  }, [])

  // Timer is keyed on `active`, not set once — a shared interval keeps its own
  // cadence, so a slide reached by the arrows (or the wrap back to the first)
  // inherited whatever was left of the previous tick and could flip almost
  // immediately. Restarting per slide gives every one the full ROTATE_MS.
  useEffect(() => {
    if (banners.length < 2) return
    const t = setTimeout(() => setActive((i) => (i + 1) % banners.length), ROTATE_MS)
    return () => clearTimeout(t)
  }, [banners.length, active])

  const prev = () => setActive((i) => (i - 1 + banners.length) % banners.length)
  const next = () => setActive((i) => (i + 1) % banners.length)

  if (banners.length === 0) return null

  return (
    <section>
      {/* Banner creatives are complete designs (own headline, own CTA), so the
          slide shows the artwork alone — `title` is the admin-side label and the
          alt text, not an overlay. The 7:5 frame sits between the poster aspects
          in use (3:2 and 4:3) so object-cover fills the box edge to edge while
          trimming only ~3% off the margins, well clear of the offer text. */}
      <div className="relative mx-auto max-w-[900px] rounded-3xl overflow-hidden aspect-[7/5] bg-[#111827] shadow-zippy-lg group">
        {banners.map((b, i) => {
          const content = (
            <div className="relative h-full w-full">
              {/* `priority` is deprecated in Next 16 — the docs point to
                  loading/fetchPriority instead. The first slide is the LCP
                  candidate, so it loads eagerly and the rest stay lazy. */}
              <Image
                src={b.image_url}
                alt={b.title}
                fill
                className="object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                sizes="(max-width: 900px) 100vw, 900px"
              />
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
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/35 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/35 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 z-10"
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
