import { useEffect, useState } from 'react'

// Pre-launch flag: products/menu items are browsable everywhere, but ordering
// (add to cart, checkout) stays disabled until this flips to true.
export const ORDERING_ENABLED = false

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
