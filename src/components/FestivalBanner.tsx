'use client'

import { FREE_DELIVERY_ACTIVE } from '@/lib/cartPricing'

const MESSAGE = '🎉 Ganesh Chaturthi Special — FREE Delivery Today! No delivery charges on all orders above ₹100 🪔  •  🎉 Ganesh Chaturthi Special — FREE Delivery Today! No delivery charges on all orders above ₹100 🪔  •  '

export default function FestivalBanner() {
  if (!FREE_DELIVERY_ACTIVE) return null

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] py-2 sticky top-0 z-[60]">
      <div className="flex whitespace-nowrap animate-[marquee_18s_linear_infinite]">
        <span className="text-[13px] font-semibold text-[#78350F] pr-8">{MESSAGE}</span>
        <span className="text-[13px] font-semibold text-[#78350F] pr-8">{MESSAGE}</span>
      </div>
    </div>
  )
}
