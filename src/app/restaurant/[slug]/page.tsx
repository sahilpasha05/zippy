import { redirect } from 'next/navigation'

export default function RestaurantSlugRoot({ params }: { params: { slug: string } }) {
  redirect(`/restaurant/${params.slug}/dashboard`)
}
