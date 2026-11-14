'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const MAX_PER_PAGE_LOAD = 5
// Noise that says nothing about Zippy itself.
const IGNORE = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection|AbortError|Load failed|NetworkError when attempting/i

// Reports uncaught browser errors to public.app_errors so Admin > System Health can list them.
export default function ErrorReporter() {
  useEffect(() => {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return // our own testing is not customer data
    let sent = 0
    const seen = new Set<string>()
    function report(message: string, details?: string) {
      const msg = (message || 'Unknown error').slice(0, 600)
      if (sent >= MAX_PER_PAGE_LOAD || seen.has(msg) || IGNORE.test(msg)) return
      seen.add(msg); sent += 1
      void supabase.from('app_errors').insert({
        source: 'client', message: msg, url: location.href.slice(0, 300),
        user_agent: navigator.userAgent.slice(0, 300), details: details?.slice(0, 1500) ?? null,
      }).then(() => {}, () => {})
    }
    const onError = (e: ErrorEvent) => report(e.message, e.error?.stack)
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason
      report(typeof r === 'string' ? r : r?.message ?? 'Unhandled promise rejection', r?.stack)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection) }
  }, [])
  return null
}
