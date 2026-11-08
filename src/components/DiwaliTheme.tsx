'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import './DiwaliTheme.css'

// Diwali look for the customer-facing pages (admin and partner panels keep their normal colours).
// It is a pure look-and-feel layer: remove this component from layout.tsx to switch it off.
const PANELS = ['/admin', '/restaurant/', '/delivery', '/grocery/', '/store/', '/dairy/']

function isCustomerPage(pathname: string) {
  return !PANELS.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p))
}

const COLORS = ['#FF4D4D', '#FFC83D', '#4DD2FF', '#7CFF6B', '#FF7AD9', '#FF9A3D']

export default function DiwaliTheme() {
  const pathname = usePathname()
  const on = isCustomerPage(pathname)

  useEffect(() => {
    document.documentElement.classList.toggle('diwali', on)
    return () => document.documentElement.classList.remove('diwali')
  }, [on])

  if (!on) return null

  // Bulbs spread evenly across the width; each twinkles on its own beat.
  const bulbs = Array.from({ length: 44 }, (_, i) => ({
    left: `${(i / 44) * 100 + 1}%`,
    color: COLORS[i % COLORS.length],
    delay: `${((i * 0.37) % 1.8).toFixed(2)}s`,
  }))

  return (
    <div className="diwali-lights" aria-hidden>
      {bulbs.map((b, i) => (
        <span key={i} style={{ left: b.left, ['--c' as string]: b.color, ['--d' as string]: b.delay }} />
      ))}
    </div>
  )
}
