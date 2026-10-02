// Pinned restaurants always list first (by slug), then open restaurants in
// their stored sort_order, then closed ones at the bottom, same order.
const PINNED_SLUGS = ['m'] // My Bite

export function sortRestaurantsForDisplay<T extends { slug: string; is_open: boolean }>(list: T[]): T[] {
  const rank = (r: T) => {
    const pinned = PINNED_SLUGS.indexOf(r.slug)
    if (pinned !== -1) return pinned
    return PINNED_SLUGS.length + (r.is_open ? 0 : 1)
  }
  // Array.prototype.sort is stable, so the incoming sort_order is kept within each group.
  return [...list].sort((a, b) => rank(a) - rank(b))
}
