'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// Launch is 1 Aug 2026, 11:00 AM IST
const LAUNCH_AT = new Date('2026-08-01T11:00:00+05:30').getTime()

function getRemaining() {
  const diff = Math.max(0, LAUNCH_AT - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

export default function ComingSoonOverlay() {
  const [show, setShow] = useState(false)
  const [remaining, setRemaining] = useState(getRemaining())

  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!isLocalhost && !sessionStorage.getItem('zippy-coming-soon-seen')) queueMicrotask(() => setShow(true))
    const timer = setInterval(() => setRemaining(getRemaining()), 1000)
    return () => clearInterval(timer)
  }, [])

  function dismiss() {
    sessionStorage.setItem('zippy-coming-soon-seen', '1')
    setShow(false)
  }

  if (!show) return null

  const units = [
    { label: 'Days', value: remaining.days },
    { label: 'Hours', value: remaining.hours },
    { label: 'Min', value: remaining.minutes },
    { label: 'Sec', value: remaining.seconds },
  ]

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <video
        src="/videos/coming-soon.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />

      <button onClick={dismiss} className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full text-white transition-all z-20">
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[13px] font-[700] tracking-[0.2em] text-[#DCFCE7] uppercase mb-3">Zippy</p>
        <h1 className="text-[32px] sm:text-[44px] font-[900] text-white mb-3 leading-tight" style={{ fontWeight: 900 }}>
          We&apos;re arriving soon!
        </h1>
        <p className="text-[14px] sm:text-[16px] text-white/80 mb-10 max-w-md">
          Something exciting is on its way. Get ready for lightning-fast delivery in your city.
        </p>

        <div className="flex items-center gap-3 sm:gap-5 mb-10">
          {units.map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 min-w-[68px] sm:min-w-[84px]">
              <span className="text-[24px] sm:text-[32px] font-[900] text-white tabular-nums" style={{ fontWeight: 900 }}>
                {String(value).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-[11.5px] text-white/70 uppercase tracking-wide mt-1">{label}</span>
            </div>
          ))}
        </div>

        <button onClick={dismiss} className="px-6 py-3 bg-[#16A34A] text-white text-[14px] font-[700] rounded-2xl hover:bg-[#15803D] transition-all shadow-[0_4px_20px_rgba(22,163,74,0.5)]">
          Continue to site →
        </button>
      </div>
    </div>
  )
}
