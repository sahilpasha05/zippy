'use client'

import { create } from 'zustand'
import type { SavedAddress } from './address'

// Shared across every useAddresses() call site (checkout, LocationPicker,
// Navbar, ...) for logged-in users. Plain component-local state here would
// mean an address added/selected inside LocationPicker's own hook instance
// never reaches checkout's — the button stayed locked until a full reload
// re-fetched from the DB. No persistence: this mirrors the DB, not localStorage.
interface DbAddressStore {
  addresses: SavedAddress[]
  selectedId: string | null
  loaded: boolean
}

export const useDbAddressStore = create<DbAddressStore>(() => ({
  addresses: [],
  selectedId: null,
  loaded: false,
}))
