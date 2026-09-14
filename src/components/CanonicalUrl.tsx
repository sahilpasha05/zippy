'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const SITE_URL = 'https://www.zippytarikere.com'

// Nearly every page in this app is a Client Component, so the normal
// per-page `export const metadata = { alternates: { canonical } }` (which
// requires a Server Component) isn't available. This does the same job at
// runtime instead: one canonical <link> per route, kept in sync on
// navigation, so Google has a single authoritative URL per page instead of
// treating trailing-slash/www/query-string variants as duplicate content.
export default function CanonicalUrl() {
  const pathname = usePathname()

  useEffect(() => {
    const href = pathname === '/' ? SITE_URL : `${SITE_URL}${pathname.replace(/\/+$/, '')}`
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = href
  }, [pathname])

  return null
}
