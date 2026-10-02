'use client'

import { Bike, PartyPopper } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FREE_DELIVERY_THRESHOLD } from '@/lib/cartPricing'

// "Add ₹X more for free delivery" bar, switching to a confirmation once the
// subtotal reaches the threshold.
export default function FreeDeliveryProgress({ subtotal, className }: { subtotal: number; className?: string }) {
  const unlocked = subtotal >= FREE_DELIVERY_THRESHOLD
  const remaining = Math.ceil(FREE_DELIVERY_THRESHOLD - subtotal)
  const pct = Math.min(100, Math.max(0, (subtotal / FREE_DELIVERY_THRESHOLD) * 100))

  return (
    <div className={cn(
      'rounded-xl px-3.5 py-3 border',
      unlocked ? 'bg-[#DCFCE7] border-[#86EFAC]' : 'bg-[#FFF7ED] border-[#FED7AA]',
      className,
    )}>
      <div className="flex items-center gap-2 text-[12.5px]">
        {unlocked
          ? <PartyPopper className="w-4 h-4 text-[#16A34A] shrink-0" />
          : <Bike className="w-4 h-4 text-[#EA580C] shrink-0" />}
        <p className={cn('font-medium', unlocked ? 'text-[#14532D]' : 'text-[#9A3412]')}>
          {unlocked
            ? 'Free delivery unlocked!'
            : <>Add <strong>₹{remaining}</strong> more to get free delivery</>}
        </p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/80 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', unlocked ? 'bg-[#16A34A]' : 'bg-[#F97316]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
