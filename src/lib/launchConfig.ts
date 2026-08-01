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
