'use client'

import { ShoppingCart } from 'lucide-react'

// Shown when someone adds an item from a different restaurant (or switches
// between groceries and a restaurant) while the cart still holds the previous
// order. They either keep what they have, or start fresh with the new item.
export default function CartConflictDialog({
  onCancel,
  onReplace,
}: {
  onCancel: () => void
  onReplace: () => void
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl z-10 p-5">
        <div className="w-11 h-11 bg-[#FFFBEB] rounded-2xl flex items-center justify-center mb-3">
          <ShoppingCart className="w-5 h-5 text-[#D97706]" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-[800] text-[#111827] mb-1.5" style={{ fontWeight: 800 }}>
          Start a new order?
        </h2>
        <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">
          Your cart has items from somewhere else. You can only order from one place at a time —
          place this order first, or clear the cart to add this item instead.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] font-[600] text-[#374151] hover:bg-[#F8FAFC] transition-all"
          >
            Keep my cart
          </button>
          <button
            onClick={onReplace}
            className="flex-1 py-2.5 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] transition-all"
            style={{ fontWeight: 700 }}
          >
            Clear &amp; add
          </button>
        </div>
      </div>
    </div>
  )
}
