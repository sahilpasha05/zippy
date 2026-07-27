'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { MapPin, CreditCard, Tag, ChevronRight, Plus, Check, Zap, Smartphone, Banknote, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cart'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ADDRESSES = [
  { id: '1', label: 'Home', address: 'No. 12, 5th Cross, 4th Block, Koramangala, Bangalore - 560034', isDefault: true },
  { id: '2', label: 'Work', address: 'WeWork Galaxy, 43 Residency Rd, Ashok Nagar, Bangalore - 560025', isDefault: false },
]

const PAYMENT_METHODS = [
  { id: 'upi',  label: 'UPI',                  icon: Smartphone,  desc: 'Pay via any UPI app' },
  { id: 'card', label: 'Credit / Debit Card',   icon: CreditCard,  desc: 'Visa, Mastercard, Rupay' },
  { id: 'cod',  label: 'Cash on Delivery',      icon: Banknote,    desc: 'Pay when delivered' },
]

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const deliveryEta = useDeliveryEta()
  const [mounted, setMounted] = useState(false)
  const cartTotal = total()
  const [selectedAddress, setSelectedAddress] = useState('1')
  const [selectedPayment, setSelectedPayment] = useState('upi')
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [placeError, setPlaceError] = useState('')

  // Hydrate cart from localStorage before rendering
  useEffect(() => {
    useCartStore.persist.rehydrate()
    setMounted(true)
  }, [])

  const discount = couponApplied ? Math.min(cartTotal * 0.1, 100) : 0
  const deliveryFee = cartTotal > 199 ? 0 : 29
  const grandTotal = cartTotal - discount + deliveryFee

  const handlePlace = async () => {
    if (items.length === 0) return
    setPlacing(true)
    setPlaceError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Derive restaurant_id from cart items (restaurant orders have it set)
      const restaurantId = items.find((i) => i.restaurant_id)?.restaurant_id ?? null
      const address = ADDRESSES.find((a) => a.id === selectedAddress)?.address ?? ''

      // Create the order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id ?? null,
          restaurant_id: restaurantId,
          order_type: restaurantId ? 'restaurant' : 'grocery',
          status: 'confirmed',
          total: grandTotal,
          delivery_fee: deliveryFee,
          discount,
          address,
          coupon_code: couponApplied ? coupon : null,
          payment_method: selectedPayment,
          payment_status: selectedPayment === 'cod' ? 'pending' : 'paid',
          customer_name: user?.user_metadata?.full_name ?? null,
          placed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (orderErr || !order) throw orderErr ?? new Error('Failed to create order')

      // Insert order items — only include base columns that exist in the schema
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_type: item.product_type,
        name: item.name,
        image_url: item.image_url ?? null,
        price: item.price,
        quantity: item.quantity,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
      if (itemsErr) throw itemsErr

      setOrderId(order.id)
      clearCart()
      setPlaced(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Something went wrong.'
      setPlaceError(msg)
      console.error(err)
    } finally {
      setPlacing(false)
    }
  }

  if (placed) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-10 max-w-md w-full text-center shadow-zippy-lg">
            <div className="w-20 h-20 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-[#16A34A]" strokeWidth={2.5} />
            </div>
            <h2 className="text-[24px] font-[800] text-[#111827] mb-2" style={{ fontWeight: 800 }}>Order Placed!</h2>
            <p className="text-[14px] text-[#6B7280] mb-2">Your order has been confirmed and will arrive in</p>
            <div className="flex items-center justify-center gap-2 text-[28px] font-[900] text-[#16A34A] mb-4" style={{ fontWeight: 900 }}>
              <Zap className="w-7 h-7 fill-[#16A34A]" /> {deliveryEta} minutes
            </div>
            {orderId && (
              <p className="text-[11.5px] text-[#9CA3AF] font-mono mb-6">Order ID: {orderId.slice(0, 8).toUpperCase()}</p>
            )}
            <div className="space-y-3">
              <Link href="/orders">
                <button className="w-full py-3.5 bg-[#16A34A] text-white font-[700] rounded-2xl hover:bg-[#15803D] transition-colors shadow-[0_4px_16px_rgba(22,163,74,0.35)]" style={{ fontWeight: 700 }}>
                  Track your order
                </button>
              </Link>
              <Link href="/">
                <button className="w-full py-3 text-[#6B7280] text-[14px] hover:text-[#374151] transition-colors">Continue shopping →</button>
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <CartSidebar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-6">
            <Link href="/" className="hover:text-[#16A34A]">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#111827] font-medium">Checkout</span>
          </div>

          <h1 className="text-[28px] font-[800] text-[#111827] mb-8" style={{ fontWeight: 800 }}>Checkout</h1>

          {placeError && (
            <div className="mb-6 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[13px] text-[#DC2626]">
              {placeError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Delivery Address */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-[#DCFCE7] rounded-xl flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#16A34A]" strokeWidth={2} />
                  </div>
                  <h3 className="text-[16px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>Delivery Address</h3>
                </div>
                <div className="space-y-3">
                  {ADDRESSES.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedAddress(addr.id)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all',
                        selectedAddress === addr.id
                          ? 'border-[#16A34A] bg-[#F0FDF4]'
                          : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
                      )}
                    >
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all', selectedAddress === addr.id ? 'border-[#16A34A] bg-[#16A34A]' : 'border-[#D1D5DB]')}>
                        {selectedAddress === addr.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>{addr.label}</span>
                          {addr.isDefault && <span className="text-[10.5px] bg-[#DCFCE7] text-[#16A34A] px-2 py-0.5 rounded-full font-medium">Default</span>}
                        </div>
                        <p className="text-[12.5px] text-[#6B7280] leading-relaxed">{addr.address}</p>
                      </div>
                    </button>
                  ))}
                  <button className="w-full flex items-center gap-2 py-3 text-[13.5px] font-medium text-[#16A34A] hover:text-[#15803D] transition-colors">
                    <Plus className="w-4 h-4" /> Add new address
                  </button>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-[#DCFCE7] rounded-xl flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-[#16A34A]" strokeWidth={2} />
                  </div>
                  <h3 className="text-[16px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>Payment Method</h3>
                </div>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedPayment(id)}
                      className={cn('w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all', selectedPayment === id ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-[#E5E7EB] hover:border-[#D1D5DB]')}
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', selectedPayment === id ? 'bg-[#DCFCE7]' : 'bg-[#F3F4F6]')}>
                        <Icon className={cn('w-5 h-5', selectedPayment === id ? 'text-[#16A34A]' : 'text-[#6B7280]')} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13.5px] font-[600] text-[#111827]" style={{ fontWeight: 600 }}>{label}</p>
                        <p className="text-[12px] text-[#9CA3AF]">{desc}</p>
                      </div>
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', selectedPayment === id ? 'border-[#16A34A] bg-[#16A34A]' : 'border-[#D1D5DB]')}>
                        {selectedPayment === id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coupon */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-[#DCFCE7] rounded-xl flex items-center justify-center">
                    <Tag className="w-4 h-4 text-[#16A34A]" strokeWidth={2} />
                  </div>
                  <h3 className="text-[16px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>Coupon Code</h3>
                </div>
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code (try ZIPPY50)"
                    className="flex-1 px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-colors placeholder:text-[#9CA3AF] font-mono"
                    disabled={couponApplied}
                  />
                  <button
                    onClick={() => { if (coupon) setCouponApplied(!couponApplied) }}
                    className={cn('px-5 py-3 rounded-xl text-[13px] font-[700] transition-all', couponApplied ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#16A34A] text-white hover:bg-[#15803D]')}
                    style={{ fontWeight: 700 }}
                  >
                    {couponApplied ? '✓ Applied' : 'Apply'}
                  </button>
                </div>
                {couponApplied && (
                  <div className="mt-3 flex items-center gap-2 text-[12.5px] text-[#16A34A]">
                    <Check className="w-3.5 h-3.5" />
                    Coupon applied! You save ₹{discount.toFixed(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sticky top-24">
                <h3 className="text-[16px] font-[700] text-[#111827] mb-5" style={{ fontWeight: 700 }}>Order Summary</h3>

                {!mounted ? (
                  <div className="space-y-3 mb-5">
                    {[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-[#F3F4F6] rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-3 mb-5 max-h-64 overflow-y-auto pr-1">
                    {items.length === 0 ? (
                      <p className="text-[13px] text-[#9CA3AF] text-center py-4">Your cart is empty</p>
                    ) : items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB] shrink-0">
                          {item.image_url ? (
                            <Image src={item.image_url} alt={item.name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#DCFCE7] flex items-center justify-center">
                              <Zap className="w-4 h-4 text-[#16A34A]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-[600] text-[#111827] truncate" style={{ fontWeight: 600 }}>{item.name}</p>
                          <p className="text-[11.5px] text-[#6B7280]">×{item.quantity}</p>
                        </div>
                        <p className="text-[13px] font-[700] text-[#111827] shrink-0" style={{ fontWeight: 700 }}>₹{(item.price * item.quantity).toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-[#E5E7EB] pt-4 space-y-2.5">
                  <div className="flex justify-between text-[13px] text-[#6B7280]"><span>Subtotal</span><span>₹{cartTotal.toFixed(0)}</span></div>
                  {couponApplied && <div className="flex justify-between text-[13px] text-[#16A34A]"><span>Coupon discount</span><span>−₹{discount.toFixed(0)}</span></div>}
                  <div className="flex justify-between text-[13px] text-[#6B7280]">
                    <span>Delivery fee</span>
                    <span className={deliveryFee === 0 ? 'text-[#16A34A] font-medium' : ''}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between text-[16px] font-[800] text-[#111827] pt-2 border-t border-[#E5E7EB]" style={{ fontWeight: 800 }}>
                    <span>Total</span><span>₹{grandTotal.toFixed(0)}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-[#DCFCE7] rounded-xl flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#16A34A] fill-[#16A34A]" />
                  <p className="text-[11.5px] text-[#14532D] font-medium">Estimated delivery in <strong>{deliveryEta} minutes</strong></p>
                </div>

                <button
                  onClick={handlePlace}
                  disabled={placing || !mounted || items.length === 0}
                  className="w-full mt-5 flex items-center justify-center gap-2 py-4 bg-[#16A34A] text-white text-[15px] font-[800] rounded-2xl hover:bg-[#15803D] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(22,163,74,0.4)]"
                  style={{ fontWeight: 800 }}
                >
                  {placing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Placing order...</>
                  ) : (
                    <>Place Order • ₹{grandTotal.toFixed(0)}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
