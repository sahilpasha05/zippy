'use client'

import { useState } from 'react'
import { Loader2, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_CALLS = 2

// "Call" for the delivery partner. The number is fetched from the server on tap, which
// counts the call; after MAX_CALLS the button says so instead of dialling.
export default function CallRiderButton({ orderId, callsUsed, lockedUntilMs, nowMs, variant = 'soft' }: {
  orderId: string
  callsUsed: number
  lockedUntilMs?: number | null   // the earliest time calling is allowed (order time + 20 min)
  nowMs?: number
  variant?: 'soft' | 'solid'
}) {
  const [used, setUsed] = useState(callsUsed)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const remaining = Math.max(0, MAX_CALLS - used)

  const minsLeft = lockedUntilMs && nowMs ? Math.ceil((lockedUntilMs - nowMs) / 60000) : 0
  if (minsLeft > 0) {
    return (
      <span className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] text-[#9CA3AF] rounded-xl text-[12px] font-[600] shrink-0 text-center leading-tight">
        <Phone className="w-3.5 h-3.5 shrink-0" /> Call in {minsLeft} min
      </span>
    )
  }

  async function call() {
    setMessage('')
    if (remaining === 0) { setMessage(`You have exhausted your ${MAX_CALLS} calls for this order. You can still chat with your delivery partner.`); return }
    setBusy(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/call`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (typeof data.used === 'number') setUsed(data.used)
      if (!res.ok) { setMessage(data.error ?? 'Could not start the call. Please try again.'); return }
      window.location.href = `tel:${data.phone}`
    } catch {
      setMessage('Could not start the call. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button onClick={call} disabled={busy}
        className={cn('flex items-center gap-1.5 rounded-xl text-[12.5px] font-[600] transition-all disabled:opacity-60',
          variant === 'solid' ? 'px-3 py-1.5 bg-[#7C3AED] text-white hover:bg-[#6D28D9] text-[12px]' : 'px-3.5 py-2 bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]',
          remaining === 0 && (variant === 'solid' ? '!bg-[#9CA3AF]' : '!bg-[#F3F4F6] !text-[#9CA3AF]'))}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
        Call <span className="opacity-80">({remaining} left)</span>
      </button>
      {message && <p className="mt-1 max-w-[220px] text-[11px] leading-snug text-[#B91C1C]">{message}</p>}
    </div>
  )
}
