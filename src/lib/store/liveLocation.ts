'use client'

import { create } from 'zustand'
import { getCurrentPosition } from '@/lib/reverseGeocode'

// The customer's live GPS position, fetched when they continue from the cart
// and again at checkout. Deliberately not persisted: a stale position from an
// earlier visit must never decide the delivery area or fee.
type Status = 'idle' | 'loading' | 'granted' | 'denied'

interface LiveLocationStore {
  coords: { lat: number; lng: number } | null
  status: Status
  error: string
  // Set when location is blocked/unavailable and the customer chooses to carry
  // on with a typed address. Only offered for addresses inside the town, and
  // checkout makes the customer confirm that before ordering.
  manualMode: boolean
  request: () => Promise<boolean>
  continueManually: () => void
}

let inflight: Promise<boolean> | null = null

export const useLiveLocation = create<LiveLocationStore>()((set) => ({
  coords: null,
  status: 'idle',
  error: '',
  manualMode: false,

  continueManually: () => set({ manualMode: true }),

  request: () => {
    // A second tap while a request is still running waits for it instead of failing silently.
    if (inflight) return inflight
    inflight = (async () => {
    set({ status: 'loading', error: '' })
    try {
      const pos = await getCurrentPosition()
      set({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, status: 'granted', error: '', manualMode: false })
      return true
    } catch (err) {
      set({ coords: null, status: 'denied', error: err instanceof Error ? err.message : 'Could not get your location' })
      return false
    } finally {
      inflight = null
    }
    })()
    return inflight
  },
}))
