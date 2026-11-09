// Forgiving product search: tolerates typos ("buis", "busicts") and everyday words that are not in a
// product's name ("biscuits" finds Marie Gold, Parle-G, cookies).

// Everyday word -> words that appear in product names/brands. A product matches the word if its text has any of them.
const ALIASES: Record<string, string[]> = {
  biscuit: ['biscuit', 'cookie', 'marie', 'parle', 'glucose', 'bourbon', 'cracker', 'good day', 'hide & seek', 'oreo', 'monaco', 'krackjack', 'digestive'],
  milk: ['milk', 'nandini', 'dudh', 'toned'],
  curd: ['curd', 'dahi', 'yogurt', 'yoghurt'],
  bread: ['bread', 'bun', 'pav', 'rusk'],
  chips: ['chips', 'lays', 'kurkure', 'wafers', 'namkeen', 'bingo', 'nachos'],
  chocolate: ['chocolate', 'cadbury', 'dairy milk', 'silk', 'kitkat', 'perk', 'munch', 'five star'],
  icecream: ['ice cream', 'icecream', 'kulfi', 'cone'],
  cold: ['cola', 'coke', 'pepsi', 'sprite', 'fanta', 'thums', 'soda', 'energy', 'red bull', 'monster', 'drink'],
  cooldrink: ['cola', 'coke', 'pepsi', 'sprite', 'fanta', 'thums', 'soda', 'energy', 'red bull', 'monster', 'drink'],
  juice: ['juice', 'frooti', 'maaza', 'slice', 'real', 'tropicana'],
  noodles: ['noodles', 'maggi', 'yippee', 'pasta'],
  rice: ['rice', 'basmati', 'sona masoori', 'biryani'],
  atta: ['atta', 'flour', 'maida', 'aashirvaad', 'wheat'],
  oil: ['oil', 'ghee', 'refined'],
  tea: ['tea', 'chai', 'coffee', 'nescafe', 'bru'],
  sugar: ['sugar', 'jaggery', 'bella', 'sakkare'],
  soap: ['soap', 'shampoo', 'handwash', 'bath'],
  egg: ['egg', 'mutta'],
  sweet: ['sweet', 'mithai', 'peda', 'ladoo', 'burfi', 'jalebi', 'mysore pak', 'halwa'],
}
const CANONICAL = Object.keys(ALIASES)

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

// "buis" is not close to "biscuit" by edit distance, but its letters appear in order from the same start.
function isSubsequence(w: string, k: string): boolean {
  let i = 0
  for (const c of k) if (c === w[i]) i++
  return i === w.length
}

// Most of the typed letters are in the word (counting repeats), e.g. "buis" / "busicts" for "biscuit".
function mostLettersShared(w: string, k: string): boolean {
  if (w.length < 4 || Math.abs(w.length - k.length) > 3) return false
  const pool = k.split('')
  let shared = 0
  for (const c of w) {
    const i = pool.indexOf(c)
    if (i !== -1) { shared++; pool.splice(i, 1) }
  }
  return shared >= w.length - 1
}

function sounds(w: string, k: string): boolean {
  if (w.length < 3 || w[0] !== k[0]) return false
  if (k.startsWith(w)) return true
  if (w.length >= 4 && isSubsequence(w, k) && w.length >= k.length - 4) return true
  if (mostLettersShared(w, k)) return true
  const allowed = k.length >= 7 ? 3 : k.length >= 5 ? 2 : 1
  return distance(w, k) <= allowed
}

// The everyday word a typed word most likely means, if any ("busicts" -> "biscuit").
function canonicalFor(word: string): string | null {
  let best: string | null = null
  let bestScore = Infinity
  for (const w of new Set([word, word.replace(/s$/, '')])) {
    if (CANONICAL.includes(w)) return w
    for (const k of CANONICAL) {
      if (!sounds(w, k)) continue
      const score = distance(w, k)
      if (score < bestScore) { best = k; bestScore = score }
    }
  }
  return best
}

export function matchesSearchQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = fields.filter(Boolean).join(' ').toLowerCase()
  const tokens = haystack.split(/[^a-z0-9]+/).filter(Boolean)
  return q.split(/\s+/).every((word) => {
    if (haystack.includes(word)) return true
    const canon = canonicalFor(word)
    if (canon && ALIASES[canon].some((a) => haystack.includes(a))) return true
    // A small typo in a real word ("kurkre", "nandni")
    if (word.length >= 5) {
      const allowed = word.length >= 8 ? 2 : 1
      return tokens.some((t) => Math.abs(t.length - word.length) <= allowed && distance(word, t) <= allowed)
    }
    return false
  })
}
