'use client'

import { useEffect, useState } from 'react'
import { formatAgo } from '@/lib/timeAgo'

// "1 h 1 min ago" that keeps itself current: it re-reads the clock every 30 seconds,
// so the text moves on without the page having to reload.
export default function TimeAgo({ date }: { date: string | number | Date }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  return <>{formatAgo(date, now)}</>
}
