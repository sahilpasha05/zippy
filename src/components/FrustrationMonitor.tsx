'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const MAX_PER_PAGE_LOAD = 6

function describe(el: Element) {
  const label = (el.getAttribute('aria-label') ?? (el as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
  const tag = el.tagName.toLowerCase()
  return `${tag}${label ? ` "${label}"` : el.id ? `#${el.id}` : ''}`
}

// Reports three signs of a frustrated customer to public.app_errors so Admin > System Health can
// list them by page:  rage_click (4+ fast clicks on one spot),  dead_click (a button/link that did
// nothing),  quick_back (opened a page and went straight back).
export default function FrustrationMonitor() {
  const pathname = usePathname()
  const sent = useRef(0)
  const seen = useRef(new Set<string>())
  const trail = useRef<{ path: string; at: number }[]>([])

  function report(source: 'rage_click' | 'dead_click' | 'quick_back', message: string, path: string) {
    const key = `${source}|${path}|${message}`
    if (sent.current >= MAX_PER_PAGE_LOAD || seen.current.has(key)) return
    seen.current.add(key); sent.current += 1
    void supabase.from('app_errors').insert({
      source, message: message.slice(0, 600), url: path.slice(0, 300), user_agent: navigator.userAgent.slice(0, 300),
    }).then(() => {}, () => {})
  }

  // Quick back: A -> B -> A with B open for under 4 seconds.
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return // our own testing is not customer data
    const now = Date.now()
    const t = trail.current
    t.push({ path: pathname, at: now })
    if (t.length >= 3) {
      const [a, b, c] = t.slice(-3)
      if (a.path === c.path && b.path !== a.path && c.at - b.at < 4000) report('quick_back', `Opened ${b.path} and went straight back`, b.path)
    }
    if (t.length > 5) t.shift()
  }, [pathname])

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return // our own testing is not customer data
    const clicks: { t: number; x: number; y: number }[] = []

    function onClick(e: MouseEvent) {
      if (!e.isTrusted || !(e.target instanceof Element)) return
      const path = location.pathname
      const now = Date.now()

      // Rage click
      clicks.push({ t: now, x: e.clientX, y: e.clientY })
      while (clicks.length && now - clicks[0].t > 1000) clicks.shift()
      const near = clicks.filter((c) => Math.hypot(c.x - e.clientX, c.y - e.clientY) < 50)
      if (near.length >= 4) {
        report('rage_click', `Rage click on ${describe(e.target)}`, path)
        clicks.length = 0
        return
      }

      // Dead click: a button/link that caused no visible change and no navigation.
      const el = e.target.closest('button, a[href], [role="button"], summary')
      if (!el) return
      const a = el as HTMLAnchorElement
      if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return
      if (a.tagName === 'A' && (a.target === '_blank' || /^(tel|mailto|sms|whatsapp):/i.test(a.getAttribute('href') ?? '') || a.hasAttribute('download'))) return
      if ((el as HTMLButtonElement).type === 'submit') return
      const startUrl = location.href
      const startScroll = window.scrollY
      let changed = false
      const mark = () => { changed = true }
      const mo = new MutationObserver(mark)
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
      // Scrolling to a section (the Milk / Sweets tabs) and a page that is still loading are not dead clicks.
      window.addEventListener('scroll', mark, { capture: true, passive: true })
      window.addEventListener('popstate', mark)
      const goesToAnotherPage = a.tagName === 'A' && (a.getAttribute('href') ?? '').startsWith('/')
      const desc = describe(el)
      setTimeout(() => {
        mo.disconnect()
        window.removeEventListener('scroll', mark, true)
        window.removeEventListener('popstate', mark)
        if (!changed && location.href === startUrl && window.scrollY === startScroll && document.visibilityState === 'visible') report('dead_click', `Dead click on ${desc}`, path)
      }, goesToAnotherPage ? 5000 : 1500)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])

  return null
}
