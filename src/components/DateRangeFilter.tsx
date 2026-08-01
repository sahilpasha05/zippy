'use client'

import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DateRange = { from: string; to: string }

// Must be the LOCAL calendar date, not the UTC one. toISOString() would return
// the UTC day, which in IST is still "yesterday" until 05:30 — while every
// consumer turns these strings back into instants with `new Date(from +
// 'T00:00:00')`, which parses as local time. That mismatch shifted the whole
// window by the UTC offset and hid the day's most recent orders.
function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function presetRange(days: number | 'all'): DateRange {
  const to = new Date()
  if (days === 'all') return { from: '2020-01-01', to: toDateInput(to) }
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  return { from: toDateInput(from), to: toDateInput(to) }
}

const PRESETS: { label: string; days: number | 'all' }[] = [
  { label: 'Today', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All time', days: 'all' },
]

export default function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.days)
    return r.from === value.from && r.to === value.to
  })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-[#6B7280]">
        <Calendar className="w-4 h-4" />
        <span className="text-[12.5px] font-medium hidden sm:inline">Date range</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input type="date" value={value.from} max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#7C3AED] transition-all" />
        <span className="text-[#9CA3AF] text-[12px]">to</span>
        <input type="date" value={value.to} min={value.from} max={toDateInput(new Date())}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[12.5px] outline-none focus:border-[#7C3AED] transition-all" />
      </div>
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => onChange(presetRange(p.days))}
            className={cn('px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-all',
              activePreset?.label === p.label ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
