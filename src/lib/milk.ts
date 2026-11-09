// Dairy also holds sweets, chocolates and shakes whose names contain "milk" — plain milk only.
const NOT_MILK = ['peda', 'shake', 'dairy milk', 'chocolate', 'silk', 'oreo', 'ice cream', 'lassi']

export function isPlainMilk(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('milk') && !NOT_MILK.some((w) => n.includes(w))
}
