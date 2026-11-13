// Diet Coke / water bottle are offered in every restaurant cart as Zippy's own add-ons: grocery
// items riding on a restaurant order. They belong on the customer's bill, the rider's panel and the
// admin's order list, but never in the restaurant's own orders, revenue or settlements.
type Line = { price: number; quantity: number; product_type?: string | null }

export const isAddOnLine = (i: { product_type?: string | null }) => i.product_type === 'grocery'

// What a restaurant should see of its own order: no add-on lines, and a total without them.
export function stripAddOns<T extends { total: number; order_items?: (Line & object)[] | null }>(orders: T[]): T[] {
  return orders.map((o) => {
    const items = Array.isArray(o.order_items) ? o.order_items : []
    const addOns = items.filter(isAddOnLine)
    if (addOns.length === 0) return o
    const addOnTotal = addOns.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
    return { ...o, total: Math.max(0, Number(o.total) - addOnTotal), order_items: items.filter((i) => !isAddOnLine(i)) }
  })
}
