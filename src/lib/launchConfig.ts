'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Launched: ordering is open everywhere. Kept as a flag so it can be pulled
// back to false in one place if orders ever need to be paused.
export const ORDERING_ENABLED = true

// Ordering (and the "Coming soon" labels) is always active on localhost,
// regardless of ORDERING_ENABLED, so it can be developed/tested normally.
export function useOrderingEnabled() {
  const [enabled, setEnabled] = useState(ORDERING_ENABLED)

  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (isLocalhost) setEnabled(true)
  }, [])

  return enabled
}

// Single app-wide subscription shared by every useGroceryGate() caller, same
// pattern as useDeliveryEta. Starts open (available) so a slow first fetch
// doesn't flash every grocery category shut before snapping back.
let groceriesAvailable = true
let groceriesInitialized = false
const groceryListeners = new Set<(available: boolean) => void>()

function notifyGroceries(available: boolean) {
  groceriesAvailable = available
  groceryListeners.forEach((l) => l(available))
}

function ensureGroceriesInitialized() {
  if (groceriesInitialized) return
  groceriesInitialized = true

  supabase
    .from('platform_settings')
    .select('groceries_available')
    .eq('id', 1)
    .single()
    .then(({ data }) => {
      if (data && typeof data.groceries_available === 'boolean') notifyGroceries(data.groceries_available)
    })

  supabase
    .channel('platform-settings-groceries')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platform_settings' }, (payload) => {
      const next = (payload.new as { groceries_available?: boolean })?.groceries_available
      if (typeof next === 'boolean') notifyGroceries(next)
    })
    .subscribe()
}

// Admin-controlled (Settings -> Groceries Available). This is the source of
// truth every grocery surface checks directly — the product grid, the Add
// button, and the category-tile popup all read the same live value, so
// turning it off actually stops ordering everywhere, not just navigation.
export function useGroceriesAvailable() {
  const [available, setAvailable] = useState(groceriesAvailable)

  useEffect(() => {
    ensureGroceriesInitialized()
    groceryListeners.add(setAvailable)
    setAvailable(groceriesAvailable)
    return () => { groceryListeners.delete(setAvailable) }
  }, [])

  return available
}

// Inverted convenience for the category-tile "coming soon" popup.
export function useGroceryGate() {
  return !useGroceriesAvailable()
}
