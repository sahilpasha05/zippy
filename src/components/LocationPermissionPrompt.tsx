'use client'

import { useEffect, useState } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'
import { getCurrentPosition } from '@/lib/reverseGeocode'
import { isWithinDeliveryZone, OUT_OF_ZONE_MESSAGE } from '@/lib/deliveryZone'

const DISMISS_KEY = 'zippy-location-prompt-seen'

// Replaces the old auto-opening sign-in modal. Asking for location up front is
// what this app actually needs first — the delivery area is checked from GPS,
// and browsers only raise the permission dialog from a user gesture, so this
// gives them something to tap.
export default function LocationPermissionPrompt() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return
    let cancelled = false

    async function decide() {
      // Already granted (or the browser can't tell us) — don't nag.
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
          if (status.state === 'granted') return
        } catch {
          // Permissions API unavailable — fall through and ask.
        }
      }
      if (!cancelled) setShow(true)
    }

    const timer = setTimeout(decide, 1200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  async function allow() {
    setBusy(true); setError('')
    try {
      const pos = await getCurrentPosition()
      const { latitude, longitude } = pos.coords
      if (!isWithinDeliveryZone(latitude, longitude)) {
        setError(OUT_OF_ZONE_MESSAGE)
        setBusy(false)
        return
      }
      dismiss()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not get your location')
    } finally {
      setBusy(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl z-10 p-5">
        <button onClick={dismiss} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
          <X className="w-4 h-4 text-[#6B7280]" />
        </button>
        <div className="w-11 h-11 bg-[#DCFCE7] rounded-2xl flex items-center justify-center mb-3">
          <MapPin className="w-5 h-5 text-[#16A34A]" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-[800] text-[#111827] mb-1.5" style={{ fontWeight: 800 }}>
          Allow your location
        </h2>
        <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">
          Zippy delivers across Tarikere. Sharing your location lets us confirm we reach you and
          fill in your address automatically.
        </p>
        {error && <p className="text-[12.5px] text-[#DC2626] leading-relaxed mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={dismiss}
            className="flex-1 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] font-[600] text-[#374151] hover:bg-[#F8FAFC] transition-all">
            Not now
          </button>
          <button onClick={allow} disabled={busy}
            className="flex-1 py-2.5 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ fontWeight: 700 }}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Locating...' : 'Allow location'}
          </button>
        </div>
      </div>
    </div>
  )
}
