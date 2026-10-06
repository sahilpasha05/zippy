import type { CartItem } from '@/types'
import { getDeliveryTier } from '@/lib/deliveryZone'

// A margin applied once an item is in the cart — the product/menu card still
// shows the plain stored price, but every cart-facing number (unit price,
// subtotal, and what actually gets charged/stored on the order) is 4% higher.
export const PRICE_MARKUP = 1.04

function applyPriceMarkup(price: number): number {
  return Math.round(price * PRICE_MARKUP * 100) / 100
}

// Inverse of applyPriceMarkup — recovers the restaurant's actual menu price
// from a stored order_items.price, for anywhere (restaurant/admin analytics)
// that needs to show what the restaurant is owed, not what the customer paid.
export function removePriceMarkup(markedUpPrice: number): number {
  return Math.round((markedUpPrice / PRICE_MARKUP) * 100) / 100
}

// Delivery charge by area (see deliveryZone.ts): ₹29 inside the inner zone,
// ₹59 between the inner and outer boundaries, and ₹80 outside the outer one —
// those orders also need ₹600 of food and an executive's confirmation. An
// address with no coordinates can't be placed, so it gets the standard fee.
export const DELIVERY_FEE: number = 29
export const OUTER_DELIVERY_FEE: number = 59
export const OUTSIDE_DELIVERY_FEE: number = 80
export const OUTSIDE_MIN_ORDER: number = 600

export function getDeliveryFee(lat: number | null | undefined, lng: number | null | undefined): number {
  if (lat == null || lng == null) return DELIVERY_FEE
  const tier = getDeliveryTier(lat, lng)
  return tier === 'core' ? DELIVERY_FEE : tier === 'extended' ? OUTER_DELIVERY_FEE : OUTSIDE_DELIVERY_FEE
}

// Minimum cart value (items, before fees) — only outside the outer boundary.
export function getMinOrderValue(lat: number | null | undefined, lng: number | null | undefined): number {
  if (lat == null || lng == null) return 0
  return getDeliveryTier(lat, lng) === 'outside' ? OUTSIDE_MIN_ORDER : 0
}

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

export function getCartBaseTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + applyPriceMarkup(i.price) * i.quantity, 0)
}

// The per-unit price to display/charge for one item.
export function getAdjustedUnitPrice(item: Pick<CartItem, 'price'>): number {
  return applyPriceMarkup(item.price)
}
