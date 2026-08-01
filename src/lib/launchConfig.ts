import { useEffect, useState } from 'react'

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

// Grocery categories show a "not available yet" popup for customers, but on
// localhost they navigate normally so the aisles can still be worked on.
export function useGroceryGate() {
  // Starts gated so the server render and the first client render agree; the
  // localhost check is deferred a frame so nothing writes state synchronously
  // inside the effect.
  const [gated, setGated] = useState(true)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (isLocalhost) setGated(false)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return gated
}
