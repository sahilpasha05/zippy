'use client'

import { CloudRain } from 'lucide-react'
import { useRain } from '@/lib/store/rain'

// One line in the cart and at checkout while it is raining.
export default function RainNote({ className = '' }: { className?: string }) {
  const on = useRain((s) => s.on)
  const message = useRain((s) => s.message)
  if (!on) return null
  return (
    <div className={`flex items-center gap-2 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-2.5 ${className}`}>
      <CloudRain className="h-4 w-4 shrink-0 text-[#1D4ED8]" strokeWidth={2} />
      <p className="text-[12px] font-medium text-[#1E3A8A]">{message}</p>
    </div>
  )
}
