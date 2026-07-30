import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zippy-cyan.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/checkout', '/orders', '/restaurant/', '/delivery/', '/auth'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
