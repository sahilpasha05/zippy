'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import BlinkitProductCard, { type BlinkitProduct } from '@/components/BlinkitProductCard'
import { currentFestival } from '@/lib/festival'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Names matched against grocery_products, in the order they are shown.
const SWEET_WORDS = ['katli', 'burfi', 'barfi', 'mysore pak', 'ladoo', 'laddu', 'peda', 'kunda', 'karda', 'jalebi', 'rasgulla', 'halwa', 'gulab jamun', 'soan papdi', 'milk cake']

// Pixels per second the row drifts at.
const SCROLL_SPEED = 32

type Sweet = BlinkitProduct & { name: string }
type Pic = { id: string; name: string; price: number; image_url: string }

// Fruits shown first in the fruits box (pooja / festival favourites), then the rest.
const FRUIT_WORDS = ['banana', 'pomo', 'apple', 'grape', 'sapota', 'orange', 'mosambi', 'guava', 'pineapple', 'mango', 'kiwi']
function fruitRank(name: string) {
  const n = name.toLowerCase()
  const i = FRUIT_WORDS.findIndex((w) => n.includes(w))
  return i === -1 ? FRUIT_WORDS.length : i
}

// Blinkit-style tile: title, a 2x2 mosaic of real product photos that keeps
// cycling through the catalogue, and a "from" price.
function FestiveBox({ title, subtitle, pics, href, onClick, tone }: {
  title: string; subtitle: string; pics: Pic[]
  href?: string; onClick?: () => void; tone: 'sweet' | 'fruit'
}) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (pics.length <= 4) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setTick((t) => t + 1), 2600)
    return () => clearInterval(id)
  }, [pics.length])

  const sweet = tone === 'sweet'
  const shown = [0, 1, 2, 3].map((k) => pics[(tick * 2 + k) % pics.length])
  const body = (
    <>
      <p className={`text-center text-[16px] leading-tight font-[800] ${sweet ? 'text-[#7A1F0E]' : 'text-[#14532D]'}`} style={{ fontWeight: 800 }}>{title}</p>
      <p className={`mt-0.5 text-center text-[11.5px] ${sweet ? 'text-[#8A5A12]' : 'text-[#2F6F45]'}`}>{subtitle}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {shown.map((p, k) => (
          <div key={`${tick}-${k}`} className="aspect-square overflow-hidden rounded-xl bg-white/85 p-1" style={{ animation: `festive-fade .6s ease both ${k * 70}ms` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-contain" />
          </div>
        ))}
      </div>
      <span className={`mt-2.5 flex items-center justify-center gap-0.5 text-[12.5px] font-[800] ${sweet ? 'text-[#7A1F0E]' : 'text-[#14532D]'}`} style={{ fontWeight: 800 }}>
        Shop now <ChevronRight className="h-4 w-4" />
      </span>
    </>
  )
  const cls = `block min-w-0 rounded-[22px] p-3 text-left shadow-[0_8px_20px_rgba(20,83,45,0.2)] ring-1 ring-white/70 active:scale-[0.98] transition-transform ${sweet ? 'bg-gradient-to-b from-[#FFF3C9] to-[#FFD970]' : 'bg-gradient-to-b from-[#E4F9E9] to-[#9BE0AE]'}`
  return href
    ? <Link href={href} className={cls}>{body}</Link>
    : <button type="button" onClick={onClick} className={`${cls} w-full`}>{body}</button>
}

function rank(name: string) {
  const n = name.toLowerCase()
  const i = SWEET_WORDS.findIndex((w) => n.includes(w))
  return i === -1 ? SWEET_WORDS.length : i
}

export default function FestiveSweets() {
  const [sweets, setSweets] = useState<Sweet[]>([])
  const [fruits, setFruits] = useState<Pic[]>([])
  const [fruitsSlug, setFruitsSlug] = useState<string | null>(null)
  const [festival] = useState(currentFestival)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!festival) return
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('grocery_products')
        .select('id, name, price, mrp, weight, image_url, in_stock')
        .eq('is_active', true)
        .eq('in_stock', true)
        .not('image_url', 'is', null)
        .or(SWEET_WORDS.map((w) => `name.ilike.%${w}%`).join(','))
        .limit(40)
      if (cancelled) return
      setSweets(((data as Sweet[]) ?? []).sort((a, b) => rank(a.name) - rank(b.name) || a.price - b.price))

      const { data: cat } = await supabase.from('grocery_categories').select('id, slug').eq('slug', 'fruits-vegetables').maybeSingle()
      if (cancelled || !cat) return
      const { data: fr } = await supabase
        .from('grocery_products')
        .select('id, name, price, image_url')
        .eq('category_id', cat.id)
        .eq('is_active', true)
        .eq('in_stock', true)
        .not('image_url', 'is', null)
        .limit(60)
      if (cancelled) return
      setFruits(((fr as Pic[]) ?? []).sort((a, b) => fruitRank(a.name) - fruitRank(b.name) || a.price - b.price))
      setFruitsSlug(cat.slug)
    }
    load()
    return () => { cancelled = true }
  }, [festival])

  // The row drifts sideways on its own and loops (the list is rendered twice).
  // It stops while a finger or the mouse is on it and picks up again shortly
  // after; people who prefer reduced motion get a normal scrollable row.
  const count = sweets.length
  useEffect(() => {
    const row = rowRef.current
    if (!row || count < 3) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const loopWidth = () => {
      const first = row.children[0] as HTMLElement | undefined
      const copy = row.children[count] as HTMLElement | undefined
      return first && copy ? copy.offsetLeft - first.offsetLeft : 0
    }
    let pos = row.scrollLeft
    let paused = false
    let resumeTimer: ReturnType<typeof setTimeout> | undefined
    let last = performance.now()
    let raf = 0

    const step = (now: number) => {
      const dt = Math.min(now - last, 64)
      last = now
      const loop = loopWidth()
      if (!paused && loop > 0) {
        pos += (SCROLL_SPEED * dt) / 1000
        if (pos >= loop) pos -= loop
        row.scrollLeft = pos
      }
      raf = requestAnimationFrame(step)
    }
    const hold = () => { paused = true; clearTimeout(resumeTimer) }
    const release = (delay = 1800) => {
      clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => { pos = row.scrollLeft; paused = false }, delay)
    }
    const onScroll = () => {
      // Keep manual scrolling endless too.
      if (!paused) return
      const loop = loopWidth()
      if (loop > 0 && row.scrollLeft >= loop) row.scrollLeft -= loop
      else if (loop > 0 && row.scrollLeft <= 0) row.scrollLeft += loop
    }
    const onEnter = () => hold()
    const onLeave = () => release(600)
    const onTouchEnd = () => release()
    const onWheel = () => { hold(); release() }

    row.addEventListener('touchstart', hold, { passive: true })
    row.addEventListener('touchend', onTouchEnd, { passive: true })
    row.addEventListener('pointerdown', hold)
    row.addEventListener('wheel', onWheel, { passive: true })
    row.addEventListener('mouseenter', onEnter)
    row.addEventListener('mouseleave', onLeave)
    row.addEventListener('scroll', onScroll, { passive: true })
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resumeTimer)
      row.removeEventListener('touchstart', hold)
      row.removeEventListener('touchend', onTouchEnd)
      row.removeEventListener('pointerdown', hold)
      row.removeEventListener('wheel', onWheel)
      row.removeEventListener('mouseenter', onEnter)
      row.removeEventListener('mouseleave', onLeave)
      row.removeEventListener('scroll', onScroll)
    }
  }, [count])

  if (!festival || (sweets.length === 0 && fruits.length === 0)) return null

  // Twice, for the seamless loop; the second copy is skipped by screen readers.
  const loop = [...sweets, ...sweets]
  const sweetPics: Pic[] = sweets.map((p) => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url as string }))
  const fromPrice = (list: { price: number }[]) => Math.round(Math.min(...list.map((p) => Number(p.price))))

  return (
    <section
      className="relative -mx-6 lg:mx-0 lg:rounded-3xl overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0B4A2A 0%, #15803D 26%, #86D49C 58%, #E7F8EC 100%)' }}
    >
      {/* Festoon of marigolds along the top edge */}
      <div aria-hidden className="relative h-7">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[#F5C542]" />
        <div className="absolute inset-x-0 top-[3px] h-5"
          style={{
            backgroundImage:
              'radial-gradient(circle at 14px 8px, #E65100 0 7px, transparent 7.5px), radial-gradient(circle at 14px 8px, #FFB300 0 11px, transparent 11.5px)',
            backgroundSize: '28px 22px',
            backgroundRepeat: 'repeat-x',
          }} />
      </div>

      {/* Soft glows + sparkles */}
      <div aria-hidden className="pointer-events-none absolute -left-16 top-8 w-52 h-52 rounded-full opacity-70" style={{ background: 'radial-gradient(circle, rgba(253,224,71,0.45) 0%, rgba(253,224,71,0) 70%)' }} />
      <div aria-hidden className="pointer-events-none absolute -right-16 top-4 w-56 h-56 rounded-full opacity-70" style={{ background: 'radial-gradient(circle, rgba(134,239,172,0.5) 0%, rgba(134,239,172,0) 70%)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1.4px)', backgroundSize: '18px 18px' }} />

      {/* Banner */}
      <div className="relative px-6 lg:px-10 pt-4 pb-5 text-center">
        <p className="text-[11.5px] font-[700] tracking-[0.3em] text-[#FDE68A] uppercase">
          <span aria-hidden>✦</span> {festival.eyebrow} <span aria-hidden>✦</span>
        </p>
        <h2 className="mt-1.5 flex items-center justify-center gap-2.5 text-[32px] lg:text-[44px] leading-tight font-[900] tracking-tight text-white"
          style={{ fontWeight: 900, textShadow: '0 2px 0 rgba(0,0,0,0.25), 0 0 22px rgba(253,224,71,0.55)' }}>
          <span aria-hidden className="text-[26px] lg:text-[34px]">🪔</span>
          {festival.title}
          <span aria-hidden className="text-[26px] lg:text-[34px]">🪔</span>
        </h2>
        <p className="mt-1.5 text-[13.5px] text-[#DCFCE7]">{festival.subtitle}</p>
      </div>

      {/* Two boxes: sweets and fruits */}
      <div className="relative grid grid-cols-2 gap-3 px-6 lg:px-10 pb-5 lg:max-w-2xl lg:mx-auto">
        {sweetPics.length > 0 && (
          <FestiveBox tone="sweet" title="Festive Sweets" subtitle={`Mithai from ₹${fromPrice(sweets)}`} pics={sweetPics}
            onClick={() => document.getElementById('festive-sweets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
        )}
        {fruits.length > 0 && fruitsSlug && (
          <FestiveBox tone="fruit" title="Fresh Fruits" subtitle={`Fruits from ₹${fromPrice(fruits)}`} pics={fruits} href={`/essentials/${fruitsSlug}`} />
        )}
      </div>

      {/* Sweets */}
      {sweets.length > 0 && (
      <div id="festive-sweets" className="relative pb-6 scroll-mt-[var(--zippy-header-h,170px)]">
        <div className="flex items-center gap-3 mb-4 px-6 lg:px-10">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#14532D]/55" />
          <h3 className="text-[19px] font-[800] text-[#14532D] tracking-tight" style={{ fontWeight: 800 }}>Festive Sweets</h3>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#14532D]/55" />
        </div>

        <div ref={rowRef} className="flex gap-3 overflow-x-auto px-6 lg:px-10 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loop.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              aria-hidden={i >= sweets.length ? true : undefined}
              className="shrink-0 w-[152px] sm:w-[172px] rounded-2xl bg-white p-1.5 ring-1 ring-[#F5C542]/80 shadow-[0_6px_16px_rgba(20,83,45,0.22)]"
            >
              <BlinkitProductCard p={p} />
            </div>
          ))}
        </div>

      </div>
      )}
    </section>
  )
}
