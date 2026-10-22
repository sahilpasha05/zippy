// Products that are sold at exactly their listed price: the 4% markup that is normally
// added once an item is in the cart (see PRICE_MARKUP in cartPricing.ts) is NOT added to
// these. The cold drinks - Diet Coke, Monster Energy and Red Bull - are the only ones.
export const MARKUP_EXEMPT_PRODUCT_IDS: ReadonlySet<string> = new Set([
  'c27282f0-d3f9-44fe-8b42-2917a0466b74', // Diet Coke
  '82e725a4-3096-4633-824d-f8b068d56a0a', // Monster Energy
  '4cff0e86-8fad-4433-bde9-5603a46aca50', // Red Bull Energy Drink
])

export function isMarkupExempt(productId?: string | null): boolean {
  return !!productId && MARKUP_EXEMPT_PRODUCT_IDS.has(productId)
}
