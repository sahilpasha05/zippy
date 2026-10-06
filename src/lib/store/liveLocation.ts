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
  request: () => Promise<boolean>
}

export const useLiveLocation = create<LiveLocationStore>()((set, get) => ({
  coords: null,
  status: 'idle',
  error: '',

  request: async () => {
    if (get().status === 'loading') return false
    set({ status: 'loading', error: '' })
    try {
      const pos = await getCurrentPosition()
      set({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, status: 'granted', error: '' })
      return true
    } catch (err) {
      set({ coords: null, status: 'denied', error: err instanceof Error ? err.message : 'Could not get your location' })
      return false
    }
  },
}))
