// Display order: Golden cafe, My Bite, Jai hind, Smiley cafe, Kohinoor (by
// slug) first, then every other restaurant in its stored sort_order. A closed
// restaurant drops below all the open ones — keeping the same relative order —
// and goes back to its place as soon as it opens again.
const PINNED_SLUGS = ['golden-cafe', 'm', 'jai-hind-restaurant', 'smiley-cafe', 'k']

export function sortRestaurantsForDisplay<T extends { slug: string; is_open: boolean }>(list: T[]): T[] {
  const rank = (r: T) => {
    const pinned = PINNED_SLUGS.indexOf(r.slug)
    return (r.is_open ? 0 : 1000) + (pinned === -1 ? PINNED_SLUGS.length : pinned)
  }
  // Array.prototype.sort is stable, so the incoming sort_order is kept within each group.
  return [...list].sort((a, b) => rank(a) - rank(b))
}
