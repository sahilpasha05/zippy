'use client'

import { Clock } from 'lucide-react'
import { formatDuration } from '@/lib/timeAgo'
import { DELAYED_AFTER_MIN } from '@/lib/delay'

export type DelayedItem = { id: string; name: string; minutes: number }

// A small red strip that lists the delayed orders as customer chips: a round icon
// with the first letter of the name (Ashirwad -> A), the name, and how long the
// order has been open. Tapping a chip jumps to that order.
const SHADES = ['#DC2626', '#EA580C', '#B91C1C', '#C2410C', '#9F1239', '#BE123C']

export default function DelayedStrip({ items, onSelect }: { items: DelayedItem[]; onSelect: (id: string) => void }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2">
      <p className="flex items-center gap-1.5 text-[12px] font-[800] text-[#B91C1C]" style={{ fontWeight: 800 }}>
        <Clock className="w-3.5 h-3.5" />
        {items.length} delayed order{items.length !== 1 ? 's' : ''} · open {DELAYED_AFTER_MIN}+ min
      </p>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => {
          const name = (it.name || 'Customer').trim()
          const initial = (name[0] ?? 'C').toUpperCase()
          const shade = SHADES[initial.charCodeAt(0) % SHADES.length]
          return (
            <button key={it.id} type="button" onClick={() => onSelect(it.id)}
              className="shrink-0 flex items-center gap-2 rounded-full border border-[#FECACA] bg-white py-1 pl-1 pr-3 text-left active:scale-95 transition-transform">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-[800] text-white" style={{ background: shade, fontWeight: 800 }}>{initial}</span>
              <span className="min-w-0 leading-tight">
                <span className="block max-w-[110px] truncate text-[12px] font-[700] text-[#111827]">{name}</span>
                <span className="block text-[10.5px] font-[700] text-[#B91C1C]">{formatDuration(it.minutes)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
