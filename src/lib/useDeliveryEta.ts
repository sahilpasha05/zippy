'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Single app-wide subscription shared by every useDeliveryEta() caller, so having
// many product cards mounted at once doesn't spawn a realtime channel each.
let currentMinutes = 10
let initialized = false
const listeners = new Set<(minutes: number) => void>()

function notify(minutes: number) {
  currentMinutes = minutes
  listeners.forEach((l) => l(minutes))
}

function ensureInitialized() {
  if (initialized) return
  initialized = true

  supabase
    .from('platform_settings')
    .select('delivery_minutes')
    .eq('id', 1)
    .single()
    .then(({ data }) => {
      if (data?.delivery_minutes) notify(data.delivery_minutes)
    })

  supabase
    .channel('platform-settings-eta')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platform_settings' }, (payload) => {
      const next = (payload.new as { delivery_minutes?: number })?.delivery_minutes
      if (next) notify(next)
    })
    .subscribe()
}

// Admin-configured delivery ETA (minutes) from platform_settings. Defaults to 10.
// Updates live everywhere the moment an admin saves a new value.
export function useDeliveryEta() {
  const [minutes, setMinutes] = useState<number>(currentMinutes)

  useEffect(() => {
    ensureInitialized()
    listeners.add(setMinutes)
    setMinutes(currentMinutes)
    return () => { listeners.delete(setMinutes) }
  }, [])

  return minutes
}
