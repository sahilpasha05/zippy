'use client'

import { useEffect, useState } from 'react'
import { Loader2, MapPin, ShieldAlert } from 'lucide-react'
import { geolocationPermission, useLiveLocation } from '@/lib/store/liveLocation'
import { CITY } from '@/lib/city'

// Pop-ups around the browser's own location prompt. A browser never re-opens its
// prompt once it has been denied, so a "Try again" button alone looks dead. This
// explains why we need it, asks a second time after a "no", and when the browser
// is blocking it, shows the steps and notices by itself when it has been switched on.

function platformSteps(): { where: string; steps: string[] } {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return {
      where: 'On your iPhone',
      steps: [
        'Tap the "AA" icon in the address bar, then "Website Settings".',
        'Set Location to "Allow".',
        'Come back here: we will pick it up automatically.',
      ],
    }
  }
  if (/Android/i.test(ua)) {
    return {
      where: 'On your Android phone',
      steps: [
        'Tap the lock icon next to the address bar, then "Permissions".',
        'Turn Location on (set it to "Allow").',
        'Come back here: we will pick it up automatically.',
      ],
    }
  }
  return {
    where: 'In your browser',
    steps: [
      'Click the lock icon at the left of the address bar.',
      'Set Location to "Allow" (or open Site settings > Location).',
      'Come back to this tab: we will pick it up automatically.',
    ],
  }
}

export default function LocationDialog() {
  const dialog = useLiveLocation((s) => s.dialog)
  const status = useLiveLocation((s) => s.status)
  const [stillBlocked, setStillBlocked] = useState(false)
  const busy = status === 'loading'

  // While the "blocked" steps are on screen, notice the moment it is switched on
  // (setting changed, or the customer returns from the settings screen).
  useEffect(() => {
    if (dialog !== 'help') return
    let cancelled = false
    let permission: PermissionStatus | null = null
    const check = async () => {
      if ((await geolocationPermission()) === 'granted' && !cancelled) void useLiveLocation.getState().recheck()
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void check() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    try {
      navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((p) => {
        if (cancelled) return
        permission = p
        p.onchange = () => { void check() }
      })
    } catch { /* older browsers: the focus/visibility checks still work */ }
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
      if (permission) permission.onchange = null
    }
  }, [dialog])

  if (!dialog) return null

  const { confirmAsk, recheck, dismissDialog, continueManually } = useLiveLocation.getState()
  const help = platformSteps()

  async function checkAgain() {
    setStillBlocked(false)
    await recheck()
    if (useLiveLocation.getState().dialog === 'help') setStillBlocked(true)
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full rounded-t-3xl bg-white p-6 sm:max-w-sm sm:rounded-3xl">
        {dialog === 'help' ? (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF3C7]">
            <ShieldAlert className="h-6 w-6 text-[#B45309]" />
          </div>
        ) : (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCFCE7]">
            <MapPin className="h-6 w-6 text-[#16A34A]" />
          </div>
        )}

        {dialog === 'ask' && (
          <>
            <h2 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Allow location access</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#4B5563]">
              Zippy needs your live location to work out the exact delivery charge and to send the rider to your door.
              Your browser will ask next: please tap <b>Allow</b>.
            </p>
          </>
        )}
        {dialog === 'retry' && (
          <>
            <h2 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>We really need your location</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#4B5563]">
              Without it we can&apos;t price your order or deliver it to the right place. Let&apos;s try once more: please tap <b>Allow</b> on the next pop-up.
            </p>
          </>
        )}
        {dialog === 'help' && (
          <>
            <h2 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Location is blocked</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#4B5563]">
              Your browser is not letting us ask again, so it has to be switched on in settings. <b>{help.where}:</b>
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-[#374151]">
              {help.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            {stillBlocked && (
              <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-[12.5px] text-[#B91C1C]">It still looks blocked. Switch it on in settings, then tap &quot;Check again&quot;.</p>
            )}
          </>
        )}

        <div className="mt-5 space-y-2">
          {dialog === 'help' ? (
            <button onClick={checkAgain} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-[14px] font-[700] text-white disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} I switched it on: check again
            </button>
          ) : (
            <button onClick={() => { void confirmAsk() }} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-[14px] font-[700] text-white disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {dialog === 'ask' ? 'Allow location' : 'Ask again'}
            </button>
          )}
          {dialog === 'help' && (
            <button onClick={continueManually} className="w-full rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] py-3 text-[13.5px] font-[700] text-[#14532D]">
              Use my typed address instead ({CITY.name} town only)
            </button>
          )}
          <button onClick={dismissDialog} className="w-full py-2 text-[13px] font-[600] text-[#6B7280]">Not now</button>
        </div>
      </div>
    </div>
  )
}
