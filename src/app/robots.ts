import type { MetadataRoute } from 'next'

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zippytarikere.com').replace(/\/+$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // No /auth entry — there's no /auth/* page route in this app (only
      // /api/auth, already covered by /api below). Blocking a dead path just
      // stops Google from ever seeing it 404 and dropping it from the index.
      disallow: ['/admin', '/api', '/checkout', '/orders', '/restaurant/', '/delivery/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
