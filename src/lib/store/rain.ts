'use client'

import { create } from 'zustand'

export const DEFAULT_RAIN_MESSAGE = 'Due to the rain, your order may be delayed.'

// Whether rain mode is on right now, and the notice text (set by <RainMode/>, read by
// the cart, checkout and order pages).
export const useRain = create<{ on: boolean; message: string; set: (on: boolean, message?: string) => void }>()((set) => ({
  on: false,
  message: DEFAULT_RAIN_MESSAGE,
  set: (on, message) => set((s) => ({ on, message: message?.trim() ? message.trim() : s.message })),
}))
