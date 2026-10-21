'use client'

import { useEffect, useState } from 'react'

// The current time in ms, refreshed on an interval, so durations like "waiting
// 1 h 5 min" stay exact while a panel is left open.
export function useNow(everyMs = 30000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(id)
  }, [everyMs])
  return now
}
