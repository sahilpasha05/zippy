'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const EVERY_MS = 15_000

// Tells Admin > System Health that someone is on the site and which page they are on. One small
// call every 15 s, only while the tab is visible. The admin panel itself is not counted.
export default function VisitorPing() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    let session = ''
    try {
      session = sessionStorage.getItem('zippy-visitor') ?? ''
      if (!session) { session = crypto.randomUUID(); sessionStorage.setItem('zippy-visitor', session) }
    } catch { session = '' }
    if (!session) return
    const device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    function ping() {
      if (document.visibilityState !== 'visible') return
      void supabase.rpc('ping_visitor', { p_session: session, p_path: pathname, p_device: device }).then(() => {}, () => {})
    }
    ping()
    const t = setInterval(ping, EVERY_MS)
    document.addEventListener('visibilitychange', ping)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', ping) }
  }, [pathname])
  return null
}
