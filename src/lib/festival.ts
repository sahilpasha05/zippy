// Festival schedule used by the home page (the festive sweets section). Add the next festival to this list; the first one whose
// `until` date has not passed is the current one, and everything festive
// switches off by itself once the last one is over.
export type Festival = { eyebrow: string; title: string; subtitle: string; until: string }

export const FESTIVALS: Festival[] = [
  { eyebrow: 'Celebrate Vijayadashami', title: 'Happy Dussehra', subtitle: 'Fresh mithai and festive sweets, delivered to your door', until: '2026-10-23' },
  { eyebrow: 'Celebrate the festival of lights', title: 'Happy Diwali', subtitle: 'Gift and share the sweetness, delivered to your door', until: '2026-11-10' },
]

export function currentFestival(): Festival | null {
  const now = new Date()
  return FESTIVALS.find((f) => now <= new Date(`${f.until}T23:59:59`)) ?? null
}
