import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import RestaurantDetailClient from './RestaurantDetailClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Shared between generateMetadata and the page itself so an invalid slug
// (stale link, typo, old pre-rebuild URL) hits the DB once and gets a real
// HTTP 404 — the previous all-client-rendered page returned 200 for every
// slug with near-identical markup, which is what Google flagged as
// "Duplicate without user-selected canonical".
const getRestaurant = cache(async (slug: string) => {
  const { data } = await supabase
    .from('restaurants')
    .select('name, description, cuisine')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data
})

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: slug } = await params
  const restaurant = await getRestaurant(slug)
  if (!restaurant) return {}

  const cuisineLine = restaurant.cuisine?.length ? ` — ${restaurant.cuisine.join(', ')}` : ''
  return {
    title: `${restaurant.name} — Order Online | Zippy`,
    description: restaurant.description || `Order from ${restaurant.name}${cuisineLine} on Zippy. Fast delivery in Tarikere.`,
    alternates: { canonical: `/restaurants/${slug}` },
  }
}

export default async function RestaurantDetailPage({ params }: Props) {
  const { id: slug } = await params
  const restaurant = await getRestaurant(slug)
  if (!restaurant) notFound()

  return <RestaurantDetailClient />
}
