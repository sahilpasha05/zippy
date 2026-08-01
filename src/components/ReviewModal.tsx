'use client'

import { useState } from 'react'
import { X, Star, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ReviewModal({
  orderId,
  restaurantId,
  restaurantName,
  onClose,
  onSaved,
}: {
  orderId: string
  restaurantId: string | null
  restaurantName: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!rating || saving) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Please sign in again to leave a review.'); setSaving(false); return }

    const { error: err } = await supabase.from('reviews').insert({
      user_id: user.id,
      order_id: orderId,
      restaurant_id: restaurantId,
      rating,
      comment: comment.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl z-10 p-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
          <X className="w-4 h-4 text-[#6B7280]" />
        </button>

        <h2 className="text-[16px] font-[800] text-[#111827] mb-1" style={{ fontWeight: 800 }}>
          Rate your order
        </h2>
        <p className="text-[12.5px] text-[#6B7280] mb-4">
          {restaurantName ?? 'Your order'} · #{orderId.slice(0, 8).toUpperCase()}
        </p>

        <div className="flex items-center gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              className="p-0.5"
            >
              <Star
                className={`w-8 h-8 transition-colors ${(hover || rating) >= n ? 'text-[#D97706] fill-[#D97706]' : 'text-[#D1D5DB]'}`}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Anything you'd like to tell us? (optional)"
          className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] resize-none"
        />

        {error && <p className="text-[11.5px] text-[#DC2626] mt-2">{error}</p>}

        <button
          onClick={submit}
          disabled={!rating || saving}
          className="w-full mt-4 py-3 bg-[#16A34A] text-white rounded-xl text-[14px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ fontWeight: 700 }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Sending...' : 'Submit review'}
        </button>
      </div>
    </div>
  )
}
