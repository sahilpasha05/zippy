'use client'

import { create } from 'zustand'
import { getCurrentPosition } from '@/lib/reverseGeocode'

// The customer's live GPS position, fetched when they continue from the cart
// and again at checkout. Deliberately not persisted: a stale position from an
// earlier visit must never decide the delivery area or fee.
type Status = 'idle' | 'loading' | 'granted' | 'denied'

// Our own pop-ups around the browser's permission prompt (see LocationDialog):
//   ask   - explains why we need it, then the browser's real prompt opens
//   retry - the customer said no once; we ask one more time
//   help  - the browser won't prompt any more (blocked): steps to switch it on
export type LocationDialog = null | 'ask' | 'retry' | 'help'

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown'

export async function geolocationPermission(): Promise<PermissionState> {
  try {
    if (!navigator.permissions) return 'unknown'
    const r = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return r.state
  } catch {
    return 'unknown'
  }
}

interface LiveLocationStore {
  coords: { lat: number; lng: number } | null
  status: Status
  error: string
  // Set when location is blocked/unavailable and the customer chooses to carry
  // on with a typed address. Only offered for addresses inside the town, and
  // checkout makes the customer confirm that before ordering.
  manualMode: boolean
  dialog: LocationDialog
  // Raw request to the browser. Never shows our own pop-ups.
  request: () => Promise<boolean>
  // Start to finish: explains, asks, asks once more after a "no", and shows how
  // to unblock it. Resolves true once a position has been obtained.
  ensure: () => Promise<boolean>
  // "Allow" / "Ask again" buttons in the dialog (a tap, so the browser may prompt).
  confirmAsk: () => Promise<void>
  // "Check again" after the customer changed the browser setting.
  recheck: () => Promise<void>
  dismissDialog: () => void
  continueManually: () => void
}

let resolver: ((ok: boolean) => void) | null = null
let nativeDenials = 0

function settle(ok: boolean) {
  resolver?.(ok)
  resolver = null
}

export const useLiveLocation = create<LiveLocationStore>()((set, get) => ({
  coords: null,
  status: 'idle',
  error: '',
  manualMode: false,
  dialog: null,

  continueManually: () => {
    set({ manualMode: true, dialog: null })
    settle(false)
  },

  request: async () => {
    if (get().status === 'loading') return false
    set({ status: 'loading', error: '' })
    try {
      const pos = await getCurrentPosition()
      nativeDenials = 0
      set({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, status: 'granted', error: '', manualMode: false })
      return true
    } catch (err) {
      set({ coords: null, status: 'denied', error: err instanceof Error ? err.message : 'Could not get your location' })
      return false
    }
  },

  ensure: async () => {
    const s = get()
    if (s.status === 'loading' || s.dialog) return false
    if (s.status === 'granted' && s.coords) return true
    const perm = await geolocationPermission()
    if (perm === 'granted') return get().request()
    return new Promise<boolean>((resolve) => {
      resolver = resolve
      // Already blocked in the browser: it will not prompt, so go straight to the steps.
      set({ dialog: perm === 'denied' ? 'help' : 'ask' })
    })
  },

  confirmAsk: async () => {
    const ok = await get().request()
    if (ok) { set({ dialog: null }); settle(true); return }
    nativeDenials += 1
    // One more ask after the first "no" (some browsers prompt again, e.g. Safari
    // on a new visit); after the second, show how to unblock it.
    set({ dialog: nativeDenials === 1 ? 'retry' : 'help' })
  },

  recheck: async () => {
    const ok = await get().request()
    if (ok) { set({ dialog: null }); settle(true) }
  },

  dismissDialog: () => {
    // "Not now": leave the screens in their "location needed" state (with the
    // Try again button) rather than as if we were still waiting for it.
    const s = get()
    set({
      dialog: null,
      ...(s.status === 'granted' ? {} : { status: 'denied' as const, error: s.error || 'Location access is off.' }),
    })
    settle(false)
  },
}))
