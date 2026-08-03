import type { CartItem } from '@/types'

// A margin applied on top of every stored product/menu price, computed at
// display and cart-add time rather than written into the database — so it
// shows consistently everywhere (product card, cart, checkout) and can be
// changed or removed in one place without touching stored data.
const PRICE_MARKUP = 1.05

export function applyPriceMarkup(price: number): number {
  return Math.round(price * PRICE_MARKUP * 100) / 100
}

// Once the cart's base subtotal reaches this amount, every item gets a flat
// per-unit surcharge added to its displayed/charged price (small-order cost
// recovery — baked into the price shown, not a separate line item).
const SURCHARGE_THRESHOLD = 100
const PER_ITEM_SURCHARGE = 3

// Flat delivery charge applied to every order, regardless of cart size.
export const DELIVERY_FEE: number = 29

// Platform fee, banded by cart subtotal (before discount and delivery).
// Bands are inclusive of their lower bound: up to ₹100 → ₹2, ₹100 up to
// ₹500 → ₹5, ₹500 and above → ₹9.
const PLATFORM_FEE_BANDS: ReadonlyArray<{ upTo: number; fee: number }> = [
  { upTo: 100, fee: 2 },
  { upTo: 500, fee: 5 },
  { upTo: Infinity, fee: 9 },
]

export function getPlatformFee(orderValue: number): number {
  return PLATFORM_FEE_BANDS.find((b) => orderValue < b.upTo)!.fee
}

// "Order above ₹200 from Smiley Cafe and the French Fries are free."
// The reward is derived from the cart rather than sold as a ₹0 menu item —
// a zero-priced SKU could be added to any order, free of the threshold.
export const FREE_FRIES_OFFER = {
  restaurantId: 'd18abfca-6e63-41bd-a605-0883ef42bd33', // Smiley cafe
  threshold: 200,
  reward: 'French Fries',
  // Points at Smiley's real "Salted Fries" row so the kitchen sees a product
  // it recognises on the ticket, just billed at zero.
  rewardProductId: 'e23dbaf6-bead-479c-b1a7-43790a3db423',
  rewardImageUrl: 'https://bpxyweqryjshpclshzzp.supabase.co/storage/v1/object/public/restaurant-images/smiley-salted_fries.png',
} as const

export type FreeFriesProgress = {
  spend: number
  unlocked: boolean
  remaining: number
}

// Spend is measured with the same adjusted unit prices the customer sees on
// each line, so the progress bar agrees with the subtotal above it.
export function getFreeFriesProgress(items: CartItem[]): FreeFriesProgress {
  const baseTotal = getCartBaseTotal(items)
  const spend = items
    .filter((i) => i.restaurant_id === FREE_FRIES_OFFER.restaurantId)
    .reduce((sum, i) => sum + getAdjustedUnitPrice(i, baseTotal) * i.quantity, 0)

  return {
    spend,
    unlocked: spend >= FREE_FRIES_OFFER.threshold,
    remaining: Math.max(0, FREE_FRIES_OFFER.threshold - spend),
  }
}

export function getCartBaseTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0)
}

export function surchargeApplies(baseTotal: number): boolean {
  return baseTotal >= SURCHARGE_THRESHOLD
}

// The per-unit price to display/charge for one item, given the cart's base subtotal.
export function getAdjustedUnitPrice(item: Pick<CartItem, 'price'>, baseTotal: number): number {
  return item.price + (surchargeApplies(baseTotal) ? PER_ITEM_SURCHARGE : 0)
}

export function getCartAdjustedTotal(items: CartItem[]): number {
  const baseTotal = getCartBaseTotal(items)
  const apply = surchargeApplies(baseTotal)
  return items.reduce((sum, i) => sum + (i.price + (apply ? PER_ITEM_SURCHARGE : 0)) * i.quantity, 0)
}
