'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  total: () => number
  count: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const existing = get().items.find((i) => i.product_id === item.product_id)
        if (existing) {
          set((s) => ({
            items: s.items.map((i) =>
              i.product_id === item.product_id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          }))
        } else {
          set((s) => ({
            items: [
              ...s.items,
              { ...item, id: Math.random().toString(36).slice(2) },
            ],
          }))
        }
      },

      removeItem: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.product_id !== productId) })),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((s) => ({
          items: s.items.map((i) =>
            i.product_id === productId ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'zippy-cart', skipHydration: true }
  )
)
