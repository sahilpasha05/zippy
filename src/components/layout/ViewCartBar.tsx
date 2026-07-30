'use client'

import Image from 'next/image'
import { ChevronRight, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'

// Floating pill shown once items are in the cart; tapping it is the only
// thing that opens the cart sidebar (Blinkit-style "View cart" bar).
export default function ViewCartBar() {
  const { items, isOpen, openCart } = useCartStore()
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  if (count === 0 || isOpen) return null

  const firstItem = items[0]

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <button
        onClick={openCart}
        className="pointer-events-auto flex items-center gap-3 pl-2 pr-4 py-2 bg-[#16A34A] text-white rounded-2xl shadow-[0_8px_24px_rgba(22,163,74,0.4)] hover:bg-[#15803D] active:scale-[0.98] transition-all w-full max-w-[420px]"
      >
        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
          {firstItem?.image_url ? (
            <Image src={firstItem.image_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          )}
        </div>
        <div className="flex-1 text-left leading-tight">
          <div className="text-[14.5px] font-700" style={{ fontWeight: 700 }}>View cart</div>
          <div className="text-[12px] text-white/85">{count} Item{count !== 1 ? 's' : ''}</div>
        </div>
        <ChevronRight className="w-4.5 h-4.5" strokeWidth={2.5} />
      </button>
    </div>
  )
}
