'use client'

import { Clock, X } from 'lucide-react'

// Grocery categories are browsable in the admin but not open to customers yet.
// Tapping one shows this instead of navigating into an empty-feeling aisle.
export default function CategoryComingSoon({
  categoryName,
  onClose,
}: {
  categoryName: string | null
  onClose: () => void
}) {
  if (!categoryName) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl z-10 p-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
          <X className="w-4 h-4 text-[#6B7280]" />
        </button>
        <div className="w-11 h-11 bg-[#F5F3FF] rounded-2xl flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 text-[#7C3AED]" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-[800] text-[#111827] mb-1.5" style={{ fontWeight: 800 }}>
          {categoryName} — coming soon
        </h2>
        <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">
          We&apos;re still stocking this aisle. Groceries open in Tarikere shortly — restaurant
          food is available to order right now.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] transition-all"
          style={{ fontWeight: 700 }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
