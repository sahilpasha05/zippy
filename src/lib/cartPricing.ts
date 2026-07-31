import type { CartItem } from '@/types'

// Once the cart's base subtotal reaches this amount, every item gets a flat
// per-unit surcharge added to its displayed/charged price (small-order cost
// recovery — baked into the price shown, not a separate line item).
const SURCHARGE_THRESHOLD = 100
const PER_ITEM_SURCHARGE = 3

// Flat delivery charge applied to every order, regardless of cart size.
export const DELIVERY_FEE: number = 29

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
