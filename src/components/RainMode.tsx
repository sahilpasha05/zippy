'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CloudRain } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRain, DEFAULT_RAIN_MESSAGE } from '@/lib/store/rain'

// Rain mode: when the admin switches it on (Admin > Settings), customer pages get a
// falling-rain animation and, once per visit, a pop-up saying orders may be delayed.
// Open any page with ?rain=1 to preview it on your own device without switching it
// on for customers (?rain=0 turns the preview off again).

const PREVIEW_KEY = 'zippy-rain-preview'
const SEEN_KEY = 'zippy-rain-notice-seen'

function isCustomerPage(pathname: string) {
  return pathname === '/' || pathname === '/orders' || pathname === '/checkout' ||
    pathname.startsWith('/essentials') || pathname.startsWith('/restaurants') || pathname.startsWith('/orders/')
}

function RainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    type Drop = { x: number; y: number; len: number; speed: number; w: number; a: number }
    let w = 0, h = 0, drops: Drop[] = []
    const SLANT = 0.28 // sideways drift per unit of fall, like a light wind

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(150, Math.max(50, Math.round(w / 9)))
      drops = Array.from({ length: count }, () => spawn(true))
    }
    const spawn = (anywhere: boolean): Drop => ({
      x: Math.random() * (w + 80) - 40,
      y: anywhere ? Math.random() * h : -30,
      len: 10 + Math.random() * 16,
      speed: 520 + Math.random() * 420, // px per second
      w: 0.8 + Math.random() * 0.9,
      a: 0.28 + Math.random() * 0.3,
    })
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const d of drops) {
        ctx.strokeStyle = `rgba(147, 185, 224, ${d.a})`
        ctx.lineWidth = d.w
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * SLANT, d.y + d.len)
        ctx.stroke()
      }
    }

    resize()
    draw() // one frame straight away, so there is rain even before the first animation tick
    window.addEventListener('resize', resize)
    if (reduced) return () => window.removeEventListener('resize', resize)

    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        d.y += d.speed * dt
        d.x -= d.speed * dt * SLANT
        if (d.y - d.len > h || d.x < -60) drops[i] = spawn(false)
      }
      draw()
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(raf) } else { last = performance.now(); raf = requestAnimationFrame(step) } }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />
}

export default function RainMode() {
  const pathname = usePathname()
  const setRain = useRain((s) => s.set)
  const [adminOn, setAdminOn] = useState(false)
  const [message, setMessage] = useState(DEFAULT_RAIN_MESSAGE)
  const [preview, setPreview] = useState(false)
  const [showNotice, setShowNotice] = useState(false)

  // The admin switch, live (settings are public to read; changes arrive in real time).
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('platform_settings').select('rain_mode, rain_message').eq('id', 1).maybeSingle()
      if (cancelled) return
      setAdminOn(!!data?.rain_mode)
      if (data?.rain_message) setMessage(data.rain_message)
    }
    load()
    const channel = supabase
      .channel('rain-mode')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platform_settings' }, (payload) => {
        const row = payload.new as { rain_mode?: boolean; rain_message?: string }
        if (typeof row.rain_mode === 'boolean') setAdminOn(row.rain_mode)
        if (row.rain_message) setMessage(row.rain_message)
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  // ?rain=1 / ?rain=0 : preview on this device only.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('rain')
      if (q === '1') sessionStorage.setItem(PREVIEW_KEY, '1')
      if (q === '0') { sessionStorage.removeItem(PREVIEW_KEY); sessionStorage.removeItem(SEEN_KEY) }
      const on = sessionStorage.getItem(PREVIEW_KEY) === '1'
      queueMicrotask(() => setPreview(on)) // not during the effect itself, so React is not asked to re-render mid-effect
    } catch { /* storage blocked: no preview */ }
  }, [pathname])

  const on = (adminOn || preview) && isCustomerPage(pathname)

  useEffect(() => { setRain(adminOn || preview, message) }, [adminOn, preview, message, setRain])

  // The notice: once per visit, shortly after the page opens.
  useEffect(() => {
    if (!on) return
    let seen = false
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1' } catch { /* ignore */ }
    if (seen) return
    const t = setTimeout(() => setShowNotice(true), 700)
    return () => clearTimeout(t)
  }, [on])

  function closeNotice() {
    setShowNotice(false)
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
  }

  if (!on) return null

  return (
    <>
      <RainCanvas />
      {showNotice && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm" onClick={closeNotice} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
              <CloudRain className="h-8 w-8 text-[#1D4ED8]" strokeWidth={1.8} />
            </div>
            <h2 className="text-[19px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>It&apos;s raining outside</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#4B5563]">
              {message} Thank you for your patience. Our delivery partners are doing their best to reach you safely.
            </p>
            <button onClick={closeNotice} className="mt-5 w-full rounded-xl bg-[#16A34A] py-3 text-[14px] font-[700] text-white active:scale-[0.98] transition-transform">
              Okay, got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
