'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import { X, ShoppingCart, Plus, Minus, Trash2, Zap, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import { getCartBaseTotal, getAdjustedUnitPrice, getPlatformFee, getDeliveryFee, getMinOrderValue, DELIVERY_FEE } from '@/lib/cartPricing'
import { useLiveLocation } from '@/lib/store/liveLocation'
import { ALLOW_LOCATION_MESSAGE } from '@/lib/deliveryZone'

export default function CartSidebar() {
  const { items, isOpen, closeCart, updateQuantity, removeItem } = useCartStore()
  const cartTotal = getCartBaseTotal(items)
  const platformFee = getPlatformFee(cartTotal)
  // Live location is compulsory to continue. It's asked for here, when the
  // customer taps Proceed, and the delivery fee reflects where they actually are.
  const router = useRouter()
  const liveCoords = useLiveLocation((s) => s.coords)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const deliveryFee = getDeliveryFee(liveCoords?.lat, liveCoords?.lng)
  const minOrder = getMinOrderValue(liveCoords?.lat, liveCoords?.lng)
  const belowMinOrder = minOrder > 0 && cartTotal < minOrder

  async function handleProceed() {
    setLocationError('')
    setLocating(true)
    const ok = await useLiveLocation.getState().request()
    setLocating(false)
    if (!ok) {
      setLocationError(`${ALLOW_LOCATION_MESSAGE} ${useLiveLocation.getState().error}`.trim())
      return
    }
    const coords = useLiveLocation.getState().coords
    const needed = getMinOrderValue(coords?.lat, coords?.lng)
    if (needed > 0 && cartTotal < needed) {
      setLocationError(`Your location is outside our regular delivery area. The minimum order there is ₹${needed} — add ₹${Math.ceil(needed - cartTotal)} more to continue.`)
      return
    }
    closeCart()
    router.push('/checkout')
  }
  const grandTotal = cartTotal + deliveryFee + platformFee
  const deliveryEta = useDeliveryEta()

  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, [])

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity"
          onClick={closeCart}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-[420px] max-w-full bg-white z-50 flex flex-col transition-transform duration-300 ease-out shadow-[−20px_0_60px_rgba(0,0,0,0.15)]',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#DCFCE7] rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-4.5 h-4.5 text-[#16A34A]" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[16px] font-700 text-[#111827]" style={{ fontWeight: 700 }}>Your Cart</h2>
              <p className="text-[12px] text-[#6B7280]">{items.length} item{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F8FAFC] transition-colors text-[#6B7280] hover:text-[#111827]"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 pb-20">
              <div className="w-20 h-20 bg-[#F8FAFC] rounded-2xl flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-[#D1D5DB]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-600 text-[#374151]" style={{ fontWeight: 600 }}>Your cart is empty</p>
                <p className="text-[13px] text-[#6B7280] mt-1">Add items from Essentials or Restaurants</p>
              </div>
              <button onClick={closeCart} className="mt-2 px-5 py-2.5 bg-[#16A34A] text-white text-[13px] font-600 rounded-xl hover:bg-[#15803D] transition-colors" style={{ fontWeight: 600 }}>
                Browse items
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const unitPrice = getAdjustedUnitPrice(item)
                return (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl group bg-[#F8FAFC]">
                  {/* Image */}
                  <div className="w-14 h-14 bg-white rounded-xl overflow-hidden shrink-0 border border-[#E5E7EB]">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} width={56} height={56} unoptimized className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#DCFCE7] flex items-center justify-center">
                        <Zap className="w-5 h-5 text-[#16A34A]" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-600 text-[#111827] truncate" style={{ fontWeight: 600 }}>{item.name}</p>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">₹{unitPrice} × {item.quantity}</p>
                    <p className="text-[13px] font-700 text-[#16A34A]" style={{ fontWeight: 700 }}>₹{(unitPrice * item.quantity).toFixed(0)}</p>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#E5E7EB] hover:border-[#16A34A] hover:text-[#16A34A] transition-all text-[#374151]"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-7 text-center text-[13px] font-700 text-[#111827]" style={{ fontWeight: 700 }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-[#E5E7EB] bg-white space-y-4">
            {/* Delivery estimate */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#DCFCE7] rounded-xl">
              <Zap className="w-4 h-4 text-[#16A34A]" strokeWidth={2} />
              <p className="text-[12.5px] font-medium text-[#14532D]">Estimated delivery in <strong>{deliveryEta} minutes</strong></p>
            </div>

            {/* Bill Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-[13px] text-[#6B7280]">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[13px] text-[#6B7280]">
                <span>Delivery fee{deliveryFee > DELIVERY_FEE ? ' (outside core area)' : ''}</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between text-[13px] text-[#6B7280]">
                <span>Platform fee</span>
                <span>₹{platformFee}</span>
              </div>
              <div className="flex justify-between text-[15px] font-700 text-[#111827] pt-2 border-t border-[#E5E7EB]" style={{ fontWeight: 700 }}>
                <span>Total</span>
                <span>₹{grandTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            {belowMinOrder && !locationError && (
              <p className="text-[12.5px] text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2 leading-relaxed">Minimum order for your area is ₹{minOrder}. Add ₹{Math.ceil(minOrder - cartTotal)} more to continue.</p>
            )}
            {locationError && (
              <p className="text-[12.5px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2 leading-relaxed">{locationError}</p>
            )}
            <button onClick={handleProceed} disabled={locating}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#16A34A] text-white text-[15px] font-700 rounded-2xl hover:bg-[#15803D] active:scale-[0.98] transition-all disabled:opacity-70 shadow-[0_4px_16px_rgba(22,163,74,0.35)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.45)]" style={{ fontWeight: 700 }}>
              {locating ? 'Getting your live location…' : <>Proceed to Checkout<ArrowRight className="w-4.5 h-4.5" /></>}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
