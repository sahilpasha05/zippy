'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useCartStore } from '@/lib/store/cart'
import BlinkitProductCard, { type BlinkitProduct } from '@/components/BlinkitProductCard'
import RestaurantDishCard, { DISH_COLUMNS, toDish, type Dish } from '@/components/RestaurantDishCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// "You might also like": only that restaurant's own dishes for a restaurant cart (bestsellers first),
// and products from across the whole store for a grocery cart. Items already in the cart are left out.
const LEAD = /diet coke|water bottle|bisleri|mineral water/i

export default function YouMightAlsoLike({ compact = false }: { compact?: boolean }) {
  const items = useCartStore((s) => s.items)
  const restaurantId = items.find((i) => i.restaurant_id)?.restaurant_id ?? null
  const ids = useMemo(() => items.map((i) => i.product_id).sort().join(','), [items])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [products, setProducts] = useState<BlinkitProduct[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const inCart = new Set(ids ? ids.split(',') : [])
      if (inCart.size === 0) { setDishes([]); setProducts([]); return }
      if (restaurantId) {
        const { data } = await supabase.from('restaurant_products').select(DISH_COLUMNS)
          .eq('restaurant_id', restaurantId).eq('is_available', true).gt('price', 0).not('image_url', 'is', null).limit(60)
        if (cancelled) return
        const list = ((data as never[]) ?? []).map(toDish).filter((d): d is Dish => !!d && !inCart.has(d.id))
        const best = new Set(((data as { id: string; is_bestseller?: boolean }[]) ?? []).filter((r) => r.is_bestseller).map((r) => r.id))
        list.sort((a, b) => Number(best.has(b.id)) - Number(best.has(a.id)))
        // Every restaurant cart also offers Diet Coke and a water bottle, billed to the customer but
        // kept out of the restaurant's own orders and settlements (see lib/addOns.ts).
        const { data: addOns } = await supabase.from('grocery_products').select('id, name, price, mrp, weight, image_url, in_stock')
          .eq('is_active', true).eq('in_stock', true).or('name.ilike.%diet coke%,name.ilike.%water bottle%,name.ilike.%bisleri%,name.ilike.%mineral water%').limit(6)
        if (cancelled) return
        setProducts(((addOns as BlinkitProduct[]) ?? []).filter((p) => !inCart.has(p.id) && LEAD.test(p.name))
          .sort((a, b) => Number(/diet coke/i.test(b.name)) - Number(/diet coke/i.test(a.name))))
        setDishes(list.slice(0, 10))
      } else {
        // Groceries: suggestions come from the whole store, not just the shelves already in the cart.
        const { data } = await supabase.from('grocery_products').select('id, name, price, mrp, weight, image_url, in_stock')
          .eq('is_active', true).eq('in_stock', true).not('image_url', 'is', null).limit(80)
        if (cancelled) return
        const pool = ((data as BlinkitProduct[]) ?? []).filter((p) => !inCart.has(p.id) && !LEAD.test(p.name))
        // Stable shuffle so the row differs between carts but does not jump around on re-render.
        const seed = [...ids].reduce((n, c) => n + c.charCodeAt(0), 0)
        pool.sort((a, b) => ((a.id.charCodeAt(0) * 31 + seed) % 97) - ((b.id.charCodeAt(0) * 31 + seed) % 97))
        // Diet Coke and a water bottle always lead the row (fetched on their own so they show even if they missed the 80-product sample).
        const { data: pinned } = await supabase.from('grocery_products').select('id, name, price, mrp, weight, image_url, in_stock')
          .eq('is_active', true).eq('in_stock', true).or('name.ilike.%diet coke%,name.ilike.%water bottle%,name.ilike.%bisleri%,name.ilike.%mineral water%').limit(6)
        if (cancelled) return
        const lead = ((pinned as BlinkitProduct[]) ?? []).filter((p) => !inCart.has(p.id) && LEAD.test(p.name))
          .sort((a, b) => Number(/diet coke/i.test(b.name)) - Number(/diet coke/i.test(a.name)))
        setDishes([]); setProducts([...lead, ...pool].slice(0, 12))
      }
    }
    void load()
    return () => { cancelled = true }
  }, [restaurantId, ids])

  if (dishes.length === 0 && products.length === 0) return null

  return (
    <section className="mt-5">
      <h3 className="mb-3 text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>You might also like</h3>
      <div className={`-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        {products.map((p) => <div key={p.id} className={compact ? 'w-[150px] shrink-0' : 'w-[170px] shrink-0'}><BlinkitProductCard p={p} addOn={!!restaurantId} /></div>)}
        {dishes.map((d) => <div key={d.id} className={compact ? 'w-[150px] shrink-0' : 'w-[170px] shrink-0'}><RestaurantDishCard d={d} /></div>)}
      </div>
    </section>
  )
}
