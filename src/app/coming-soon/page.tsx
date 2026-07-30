'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// Launch is 31 Jul 2026, 5:00 PM IST — kept in sync with ComingSoonOverlay's countdown.
const LAUNCH_AT = new Date('2026-07-31T17:00:00+05:30').getTime()

function getRemaining() {
  const diff = Math.max(0, LAUNCH_AT - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

export default function ComingSoonPage() {
  const [remaining, setRemaining] = useState(getRemaining())

  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemaining()), 1000)
    return () => clearInterval(timer)
  }, [])

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

      <Link href="/" className="absolute top-5 left-5 flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 rounded-full text-white text-[13px] font-[600] transition-all z-10">
        <ArrowLeft className="w-4 h-4" /> Home
      </Link>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[13px] font-[700] tracking-[0.2em] text-[#DCFCE7] uppercase mb-3">Zippy</p>
        <h1 className="text-[32px] sm:text-[44px] font-[900] text-white mb-3 leading-tight" style={{ fontWeight: 900 }}>
          We&apos;re arriving soon!
        </h1>
        <p className="text-[14px] sm:text-[16px] text-white/80 mb-10 max-w-md">
          This section isn&apos;t open just yet — we&apos;re putting the finishing touches on it before launch.
        </p>

        <div className="flex items-center gap-3 sm:gap-5">
          {units.map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 min-w-[68px] sm:min-w-[84px]">
              <span className="text-[24px] sm:text-[32px] font-[900] text-white tabular-nums" style={{ fontWeight: 900 }}>
                {String(value).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-[11.5px] text-white/70 uppercase tracking-wide mt-1">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
