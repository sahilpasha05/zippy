'use client'

import Image from 'next/image'
import { Plus, Minus, Timer, Package } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import { useDeliveryEta } from '@/lib/useDeliveryEta'

export type BlinkitProduct = {
  id: string
  name: string
  price: number
  mrp?: number | null
  weight?: string | null
  image_url?: string | null
  in_stock?: boolean
}

// Blinkit-style product card: blue OFF ribbon, contained image, "X MINS" chip,
// name, weight, price + green outlined ADD button.
export default function BlinkitProductCard({ p }: { p: BlinkitProduct }) {
  const { addItem, items, updateQuantity } = useCartStore()
  const deliveryEta = useDeliveryEta()
  const cartItem = items.find((i) => i.product_id === p.id)
  const inStock = p.in_stock ?? true
  const mrp = p.mrp ?? p.price
  const discount = mrp > p.price ? Math.round(((mrp - p.price) / mrp) * 100) : 0

  return (
    <div className="relative bg-white rounded-xl border border-[#EAEAEA] p-2.5 flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-200">
      {/* Blue OFF ribbon */}
      {discount > 0 && (
        <div className="absolute top-0 left-3 z-10">
          <div className="bg-[#538CEE] text-white text-[9px] font-[800] leading-tight text-center px-1.5 pt-1 pb-0.5 rounded-b-[4px] w-[34px]"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%)' }}>
            {discount}%<br />OFF
          </div>
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square mb-2">
        {p.image_url ? (
          <Image src={p.image_url} alt={p.name} fill className="object-contain" sizes="(max-width: 640px) 40vw, 15vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#E5E7EB]">
            <Package className="w-10 h-10" strokeWidth={1} />
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="text-[11px] font-semibold text-[#6B7280]">Out of stock</span>
          </div>
        )}
      </div>

      {/* ETA chip */}
      <div className="flex items-center gap-0.5 bg-[#F8F8F8] rounded-[4px] px-1 py-0.5 w-fit mb-1">
        <Timer className="w-2.5 h-2.5 text-[#666]" strokeWidth={2.5} />
        <span className="text-[9px] font-[700] text-[#666] tracking-wide uppercase">{deliveryEta} mins</span>
      </div>

      {/* Name + weight */}
      <h3 className="text-[13px] font-[600] text-[#1F1F1F] leading-snug line-clamp-2 mb-0.5">{p.name}</h3>
      <p className="text-[12px] text-[#666] mb-3">{p.weight ?? ''}</p>

      {/* Price + ADD */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="leading-tight">
          <div className="text-[13px] font-[700] text-[#1F1F1F]">₹{p.price}</div>
          {discount > 0 && <div className="text-[11px] text-[#9CA3AF] line-through">₹{mrp}</div>}
        </div>
        {inStock ? (
          cartItem ? (
            <div className="flex items-center bg-[#318616] rounded-lg overflow-hidden shrink-0">
              <button onClick={() => updateQuantity(p.id, cartItem.quantity - 1)}
                className="px-2 py-1.5 text-white hover:bg-[#25690F] transition-colors"><Minus className="w-3.5 h-3.5" /></button>
              <span className="text-white text-[13px] font-[700] w-5 text-center">{cartItem.quantity}</span>
              <button onClick={() => updateQuantity(p.id, cartItem.quantity + 1)}
                className="px-2 py-1.5 text-white hover:bg-[#25690F] transition-colors"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => addItem({ product_id: p.id, product_type: 'grocery', restaurant_id: null, name: p.name, image_url: p.image_url ?? null, price: p.price, quantity: 1 })}
              className="px-5 py-1.5 border border-[#318616] text-[#318616] bg-[#F7FFF9] text-[13px] font-[700] rounded-lg hover:bg-[#318616] hover:text-white active:scale-95 transition-all shrink-0 uppercase">
              Add
            </button>
          )
        ) : (
          <span className="text-[11px] text-[#9CA3AF] shrink-0">Notify me</span>
        )}
      </div>
    </div>
  )
}
