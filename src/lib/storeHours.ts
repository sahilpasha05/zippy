'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Hours = { enabled: boolean; open: string; close: string; forceClosed: boolean }
export type StoreStatus = { closed: boolean; comeBack: string }

// Admin sets these under Settings -> Store hours. Starts as "no restriction" until the first fetch lands,
// so a slow connection never flashes the store shut.
let hours: Hours = { enabled: false, open: '10:30', close: '21:30', forceClosed: false }
let initialized = false
const listeners = new Set<(h: Hours) => void>()

function notify(h: Hours) { hours = h; listeners.forEach((l) => l(h)) }

function toHours(row: Record<string, unknown> | null | undefined): Hours | null {
  if (!row || typeof row.store_hours_enabled !== 'boolean') return null
  return {
    enabled: row.store_hours_enabled,
    open: String(row.store_open_time ?? '10:30'),
    close: String(row.store_close_time ?? '21:30'),
    forceClosed: !!row.store_force_closed,
  }
}

function ensureInitialized() {
  if (initialized) return
  initialized = true
  supabase.from('platform_settings').select('store_hours_enabled, store_open_time, store_close_time, store_force_closed').eq('id', 1).single()
    .then(({ data }) => { const h = toHours(data); if (h) notify(h) })
  supabase.channel('platform-settings-store-hours')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platform_settings' }, (payload) => {
      const h = toHours(payload.new as Record<string, unknown>); if (h) notify(h)
    })
    .subscribe()
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
export function formatClock(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

// Tarikere runs on IST regardless of where the phone's clock says it is.
function nowMinutesIST() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return (get('hour') % 24) * 60 + get('minute')
}

export function computeStoreStatus(h: Hours): StoreStatus {
  if (!h.enabled && !h.forceClosed) return { closed: false, comeBack: '' }
  const now = nowMinutesIST(), o = toMin(h.open), c = toMin(h.close)
  const withinHours = o <= c ? now >= o && now < c : now >= o || now < c
  if (withinHours && !h.forceClosed) return { closed: false, comeBack: '' }
  if (withinHours) return { closed: true, comeBack: 'soon' }
  return { closed: true, comeBack: `at ${formatClock(h.open)} ${now < o ? 'today' : 'tomorrow'}` }
}

// Groceries only: restaurants keep their own open/closed switch.
export function useStoreStatus(): StoreStatus {
  const [h, setH] = useState<Hours>(hours)
  const [status, setStatus] = useState<StoreStatus>(() => computeStoreStatus(hours))

  useEffect(() => {
    ensureInitialized()
    listeners.add(setH)
    queueMicrotask(() => setH(hours))
    return () => { listeners.delete(setH) }
  }, [])

  useEffect(() => {
    const tick = () => setStatus((prev) => {
      const next = computeStoreStatus(h)
      return prev.closed === next.closed && prev.comeBack === next.comeBack ? prev : next
    })
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [h])

  return status
}
