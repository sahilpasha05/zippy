import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import CategoryPageClient from './CategoryPageClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Shared between generateMetadata and the page itself so an invalid slug
// (stale link, typo, old pre-rebuild URL) hits the DB once and gets a real
// HTTP 404 — the previous all-client-rendered page returned 200 for every
// slug with near-identical markup, which is what Google flagged as
// "Duplicate without user-selected canonical".
const getCategory = cache(async (slug: string) => {
  const { data } = await supabase
    .from('grocery_categories')
    .select('name, group_name')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data
})

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) return {}

  return {
    title: `${category.name} — Order Online | Zippy`,
    description: `Shop the best ${category.name.toLowerCase()} online with Zippy — handpicked quality, honest pricing, and delivery in minutes, right to your door in Tarikere.`,
    alternates: { canonical: `/essentials/${slug}` },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) notFound()

  return <CategoryPageClient />
}
