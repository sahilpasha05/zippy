import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zippy-cyan.vercel.app'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/restaurants`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/essentials`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/offers`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const [{ data: restaurants }, { data: categories }] = await Promise.all([
    supabase.from('restaurants').select('slug').eq('is_active', true),
    supabase.from('grocery_categories').select('slug').eq('is_active', true),
  ])

  const restaurantRoutes: MetadataRoute.Sitemap = (restaurants ?? []).map((r) => ({
    url: `${BASE_URL}/restaurants/${r.slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${BASE_URL}/essentials/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }))

  return [...staticRoutes, ...restaurantRoutes, ...categoryRoutes]
}
