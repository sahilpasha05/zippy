'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SavedAddress = {
  id: string
  label: string // 'Home' | 'Work' | 'Other' | custom
  address: string
  lat: number | null
  lng: number | null
  contactName: string
  contactPhone: string
}

interface AddressStore {
  addresses: SavedAddress[]
  selectedId: string | null
  addAddress: (a: Omit<SavedAddress, 'id'>) => SavedAddress
  removeAddress: (id: string) => void
  selectAddress: (id: string) => void
  getSelected: () => SavedAddress | null
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedId: null,

      addAddress: (a) => {
        const saved: SavedAddress = { ...a, id: Math.random().toString(36).slice(2) }
        set((s) => ({ addresses: [...s.addresses, saved], selectedId: saved.id }))
        return saved
      },

      removeAddress: (id) =>
        set((s) => ({
          addresses: s.addresses.filter((a) => a.id !== id),
          selectedId: s.selectedId === id ? (s.addresses.find((a) => a.id !== id)?.id ?? null) : s.selectedId,
        })),

      selectAddress: (id) => set({ selectedId: id }),

      getSelected: () => get().addresses.find((a) => a.id === get().selectedId) ?? null,
    }),
    { name: 'zippy-addresses', skipHydration: true }
  )
)
