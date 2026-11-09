'use client'

import Image from 'next/image'
import { Plus, Minus, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useCartStore, conflictsWithCart } from '@/lib/store/cart'
import CartConflictDialog from '@/components/CartConflictDialog'
import { useOrderingEnabled } from '@/lib/launchConfig'
import { cn } from '@/lib/utils'

export type Dish = {
  id: string
  name: string
  price: number
  mrp?: number | null
  image_url: string | null
  is_veg: boolean | null
  restaurant_id: string
  restaurant_name: string
  restaurant_slug: string
  is_open: boolean
}

// Same look as the grocery card, for a restaurant dish: veg/non-veg mark, restaurant name, ADD.
export default function RestaurantDishCard({ d }: { d: Dish }) {
  const { addItem, replaceCartWith, items, updateQuantity } = useCartStore()
  const orderingEnabled = useOrderingEnabled()
  const [askReplace, setAskReplace] = useState(false)
  const cartItem = items.find((i) => i.product_id === d.id)
  const draft = { product_id: d.id, product_type: 'restaurant' as const, restaurant_id: d.restaurant_id, name: d.name, image_url: d.image_url, price: d.price, quantity: 1 }

  function handleAdd() {
    if (conflictsWithCart(items, d.restaurant_id)) { setAskReplace(true); return }
    addItem(draft)
  }

  return (
    <div className="relative flex h-full flex-col rounded-xl border border-[#EAEAEA] bg-white p-2.5 transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-[#F8FAFC]">
        {d.image_url ? (
          <Image src={d.image_url} alt={d.name} fill unoptimized className="object-cover" sizes="(max-width: 640px) 40vw, 15vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><UtensilsCrossed className="h-8 w-8 text-[#D1D5DB]" /></div>
        )}
        {d.is_veg !== null && (
          <span className={cn('absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded border-2 bg-white', d.is_veg ? 'border-[#16A34A]' : 'border-red-500')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', d.is_veg ? 'bg-[#16A34A]' : 'bg-red-500')} />
          </span>
        )}
      </div>
      <p className="line-clamp-2 min-h-[34px] text-[12.5px] font-[600] leading-snug text-[#111827]">{d.name}</p>
      <Link href={`/restaurants/${d.restaurant_slug}`} className="mt-0.5 truncate text-[11px] text-[#6B7280] hover:text-[#16A34A]">{d.restaurant_name}</Link>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="text-[14px] font-[800] text-[#111827]">₹{d.price}</span>
        {!orderingEnabled || !d.is_open ? (
          <span className="text-[11px] font-semibold text-[#9CA3AF]">{d.is_open ? 'Coming soon' : 'Closed'}</span>
        ) : cartItem ? (
          <div className="flex h-8 items-center rounded-lg bg-[#16A34A] text-white">
            <button onClick={() => updateQuantity(d.id, cartItem.quantity - 1)} aria-label="Remove one" className="flex h-8 w-7 items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-4 text-center text-[13px] font-[700]">{cartItem.quantity}</span>
            <button onClick={() => updateQuantity(d.id, cartItem.quantity + 1)} aria-label="Add one" className="flex h-8 w-7 items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <button onClick={handleAdd} className="h-8 rounded-lg border border-[#16A34A] bg-[#F0FDF4] px-4 text-[12.5px] font-[800] text-[#16A34A] transition-all hover:bg-[#DCFCE7] active:scale-95">ADD</button>
        )}
      </div>
      {askReplace && <CartConflictDialog onCancel={() => setAskReplace(false)} onReplace={() => { replaceCartWith(draft); setAskReplace(false) }} />}
    </div>
  )
}

type DishRow = {
  id: string; name: string; price: number; mrp: number | null; image_url: string | null; is_veg: boolean | null; restaurant_id: string; is_bestseller?: boolean | null
  restaurants: { name: string; slug: string; is_open: boolean; is_active: boolean } | { name: string; slug: string; is_open: boolean; is_active: boolean }[] | null
}
export const DISH_COLUMNS = 'id, name, price, mrp, image_url, is_veg, restaurant_id, is_bestseller, restaurants(name, slug, is_open, is_active)'

export function toDish(r: DishRow): Dish | null {
  const rest = Array.isArray(r.restaurants) ? r.restaurants[0] : r.restaurants
  if (!rest || !rest.is_active || !(r.price > 0)) return null
  return { id: r.id, name: r.name, price: Number(r.price), mrp: r.mrp, image_url: r.image_url, is_veg: r.is_veg, restaurant_id: r.restaurant_id, restaurant_name: rest.name, restaurant_slug: rest.slug, is_open: rest.is_open }
}
