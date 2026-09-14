'use client'

import { Clock, X } from 'lucide-react'

// Two distinct reasons a category can be un-orderable, with different copy
// and a different primary action:
// - 'coming_soon': category is browsable in the admin but not open to
//   customers yet (is_active gate). Nothing to do but wait.
// - 'paused': an admin has temporarily closed this specific category
//   (available = false), e.g. the store is shut for the day. The catalog is
//   still browsable — the customer can place an order now that gets first
//   priority the moment the category reopens.
export default function CategoryComingSoon({
  categoryName,
  reason = 'coming_soon',
  onClose,
  onSchedule,
}: {
  categoryName: string | null
  reason?: 'coming_soon' | 'paused'
  onClose: () => void
  onSchedule?: () => void
}) {
  if (!categoryName) return null
  const isPaused = reason === 'paused'

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
          {isPaused ? `${categoryName} is closed right now` : categoryName}
        </h2>
        <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">
          {isPaused
            ? "We're not taking orders in this category at the moment. You can still schedule your order — it'll get first priority the moment we reopen."
            : <>We&apos;re currently unavailable in this category — we&apos;ll be opening it soon.
              Restaurant food is available to order right now.</>}
        </p>
        {isPaused ? (
          <button
            onClick={onSchedule}
            className="w-full py-2.5 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] transition-all"
            style={{ fontWeight: 700 }}
          >
            Schedule My Order
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] transition-all"
            style={{ fontWeight: 700 }}
          >
            Got it
          </button>
        )}
      </div>
    </div>
  )
}
