'use client'

import Image from 'next/image'
import { ChevronRight, ShoppingBag } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import { showsBottomNav } from '@/components/layout/BottomNav'

// Floating pill shown once items are in the cart; tapping it is the only
// thing that opens the cart sidebar (Blinkit-style "View cart" bar).
export default function ViewCartBar() {
  const { items, isOpen, openCart } = useCartStore()
  // On phones the bottom navigation bar sits at the very bottom; the cart pill floats above it.
  const aboveBottomNav = showsBottomNav(usePathname())
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  if (count === 0 || isOpen) return null

  // Up to three overlapping round photos, like Blinkit's cart pill.
  const thumbs = items.slice(0, 3)

  return (
    <div className={`fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none ${aboveBottomNav ? 'bottom-[72px] lg:bottom-4' : 'bottom-4'}`}>
      <button
        onClick={openCart}
        aria-label={`View cart, ${count} item${count !== 1 ? 's' : ''}`}
        className="pointer-events-auto flex items-center gap-3 rounded-full bg-[#16A34A] py-1.5 pl-2 pr-1.5 text-white shadow-[0_8px_24px_rgba(22,163,74,0.4)] hover:bg-[#15803D] active:scale-[0.97] transition-all w-[min(100%,250px)]"
      >
        <div className="flex shrink-0 -space-x-3">
          {thumbs.map((it, i) => (
            <div key={it.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#16A34A] bg-white" style={{ zIndex: thumbs.length - i }}>
              {it.image_url ? (
                <Image src={it.image_url} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#16A34A]"><ShoppingBag className="h-4 w-4" strokeWidth={2} /></div>
              )}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 text-left leading-tight">
          <div className="text-[15px] font-700" style={{ fontWeight: 700 }}>View cart</div>
          <div className="text-[12px] text-white/85">{count} Item{count !== 1 ? 's' : ''}</div>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#14532D]">
          <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
        </span>
      </button>
    </div>
  )
}
