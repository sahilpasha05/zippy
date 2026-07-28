'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { MapPin, CreditCard, Tag, ChevronRight, Plus, Check, Zap, Smartphone, Banknote, Loader2, Home, Briefcase, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cart'
import { useAddressStore } from '@/lib/store/address'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import SiteFooter from '@/components/layout/SiteFooter'
import LocationPicker from '@/components/LocationPicker'
import LiveTrackingMap from '@/components/LiveTrackingMap'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PAYMENT_METHODS = [
  { id: 'upi',  label: 'UPI',                  icon: Smartphone,  desc: 'Pay via any UPI app' },
  { id: 'card', label: 'Credit / Debit Card',   icon: CreditCard,  desc: 'Visa, Mastercard, Rupay' },
  { id: 'cod',  label: 'Cash on Delivery',      icon: Banknote,    desc: 'Pay when delivered' },
]

const LABEL_ICONS: Record<string, typeof Home> = { Home, Work: Briefcase, Other: Star }

declare global {
  interface Window {
    PhonePeCheckout?: {
      transact: (opts: { tokenUrl: string; callback?: (response: string) => void; type?: 'IFRAME' }) => void
      closePage: () => void
    }
  }
}

function loadPhonePeScript(): Promise<void> {
  if (window.PhonePeCheckout) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://mercury.phonepe.com/web/bundle/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load PhonePe checkout'))
    document.body.appendChild(script)
  })
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const { addresses, selectedId } = useAddressStore()
  const deliveryEta = useDeliveryEta()
  const [mounted, setMounted] = useState(false)
  const cartTotal = total()
  const [selectedPayment, setSelectedPayment] = useState('upi')
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [placeError, setPlaceError] = useState('')
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  // Hydrate persisted stores before rendering
  useEffect(() => {
    useCartStore.persist.rehydrate()
    useAddressStore.persist.rehydrate()
    setMounted(true)
  }, [])

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null

  const discount = couponApplied ? Math.min(cartTotal * 0.1, 100) : 0
  const deliveryFee = cartTotal > 199 ? 0 : 29
  const grandTotal = cartTotal - discount + deliveryFee

  const handlePlace = async () => {
    if (items.length === 0 || !selectedAddress) return
    setPlacing(true)
    setPlaceError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const restaurantId = items.find((i) => i.restaurant_id)?.restaurant_id ?? null

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id ?? null,
          restaurant_id: restaurantId,
          order_type: restaurantId ? 'restaurant' : 'grocery',
          status: selectedPayment === 'cod' ? 'confirmed' : 'pending',
          total: grandTotal,
          delivery_fee: deliveryFee,
          discount,
          address: selectedAddress.address,
          delivery_latitude: selectedAddress.lat,
          delivery_longitude: selectedAddress.lng,
          coupon_code: couponApplied ? coupon : null,
          payment_method: selectedPayment,
          payment_status: 'pending',
          customer_name: user?.user_metadata?.full_name ?? null,
          placed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (orderErr || !order) throw orderErr ?? new Error('Failed to create order')

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

      if (selectedPayment === 'cod') {
        setOrderId(order.id)
        clearCart()
        setPlaced(true)
        setPlacing(false)
        return
      }

      // UPI / Card: hand off to PhonePe. Cart is only cleared once payment actually succeeds.
      const initRes = await fetch('/api/phonepe/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) throw new Error(initData.error ?? 'Could not start payment')

      await loadPhonePeScript()
      window.PhonePeCheckout!.transact({
        tokenUrl: initData.redirectUrl,
        type: 'IFRAME',
        callback: async (response: string) => {
          if (response === 'USER_CANCEL') {
            setPlacing(false)
            setPlaceError('Payment was cancelled. Your cart is still saved — you can try again.')
            return
          }
          // 'CONCLUDED' (or the iframe closing for any other reason) — confirm the real state server-side
          try {
            const statusRes = await fetch(`/api/phonepe/status/${order.id}`)
            const statusData = await statusRes.json()
            if (statusData.state === 'COMPLETED') {
              setOrderId(order.id)
              clearCart()
              setPlaced(true)
            } else {
              setPlaceError('Payment was not completed. Your cart is still saved — you can try again.')
            }
          } catch {
            setPlaceError('Could not confirm payment status. Please check your orders page before retrying.')
          } finally {
            setPlacing(false)
          }
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Something went wrong.'
      setPlaceError(msg)
      console.error(err)
      setPlacing(false)
    }
  }

  if (placed) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 text-center shadow-zippy-lg mb-5">
              <div className="w-20 h-20 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-6 order-success-pop">
                <Check className="w-10 h-10 text-[#16A34A]" strokeWidth={2.5} />
              </div>
              <h2 className="text-[22px] font-[800] text-[#111827] mb-2" style={{ fontWeight: 800 }}>Order Placed!</h2>
              <p className="text-[13.5px] text-[#6B7280] mb-2">Your order has been confirmed and will arrive in</p>
              <div className="flex items-center justify-center gap-2 text-[26px] font-[900] text-[#16A34A] mb-2" style={{ fontWeight: 900 }}>
                <Zap className="w-6 h-6 fill-[#16A34A]" /> {deliveryEta} minutes
              </div>
              {orderId && (
                <p className="text-[11.5px] text-[#9CA3AF] font-mono">Order ID: {orderId.slice(0, 8).toUpperCase()}</p>
              )}
            </div>

            {/* Live tracking preview — same as Blinkit/Zepto's post-order map */}
            {orderId && (
              <div className="bg-white rounded-3xl border border-[#E5E7EB] p-4 mb-5 shadow-zippy-lg">
                <p className="text-[12.5px] font-[700] text-[#111827] mb-3 px-1">Live Order Tracking</p>
                <LiveTrackingMap
                  riderLocation={null}
                  dropLocation={selectedAddress?.lat && selectedAddress?.lng ? { lat: selectedAddress.lat, lng: selectedAddress.lng } : null}
                  className="h-48"
                />
                <p className="text-[11.5px] text-[#9CA3AF] px-1 mt-2">A delivery partner will be assigned shortly — their live location will appear here.</p>
              </div>
            )}

            <div className="space-y-3">
              <Link href={orderId ? `/orders/${orderId}/track` : '/orders'}>
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
      <div className="min-h-screen bg-[#F8FAFC] pb-28 lg:pb-0">
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

                {!mounted ? (
                  <div className="h-20 bg-[#F3F4F6] rounded-xl animate-pulse" />
                ) : addresses.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[13.5px] text-[#6B7280] mb-4">You haven&apos;t saved a delivery address yet.</p>
                    <button onClick={() => setShowLocationPicker(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] text-white text-[13.5px] font-[600] rounded-xl hover:bg-[#15803D] transition-all">
                      <Plus className="w-4 h-4" /> Add delivery address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => {
                      const LabelIcon = LABEL_ICONS[addr.label] ?? Star
                      return (
                        <button
                          key={addr.id}
                          onClick={() => useAddressStore.getState().selectAddress(addr.id)}
                          className={cn(
                            'w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all',
                            selectedId === addr.id ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
                          )}
                        >
                          <div className="w-9 h-9 bg-[#F3F4F6] rounded-xl flex items-center justify-center shrink-0">
                            <LabelIcon className="w-4 h-4 text-[#6B7280]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-[700] text-[#111827]">{addr.label}</span>
                            <p className="text-[12.5px] text-[#6B7280] leading-relaxed">{addr.address}</p>
                          </div>
                          <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all', selectedId === addr.id ? 'border-[#16A34A] bg-[#16A34A]' : 'border-[#D1D5DB]')}>
                            {selectedId === addr.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </button>
                      )
                    })}
                    <button onClick={() => setShowLocationPicker(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-[13.5px] font-medium text-[#16A34A] hover:text-[#15803D] transition-colors">
                      <Plus className="w-4 h-4" /> Add new address
                    </button>
                  </div>
                )}
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
                <p className="text-[11.5px] text-[#9CA3AF] mt-4">
                  Payments for Zippy orders are processed by CloudByte — your bank statement or payment app may show &quot;CloudByte&quot; as the merchant name.
                </p>
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

                {/* Desktop place order button — mobile uses the fixed bottom bar */}
                <button
                  onClick={handlePlace}
                  disabled={placing || !mounted || items.length === 0 || !selectedAddress}
                  className="hidden lg:flex w-full mt-5 items-center justify-center gap-2 py-4 bg-[#16A34A] text-white text-[15px] font-[800] rounded-2xl hover:bg-[#15803D] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(22,163,74,0.4)]"
                  style={{ fontWeight: 800 }}
                >
                  {placing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Placing order...</>
                  ) : !selectedAddress ? (
                    <>Select a delivery address</>
                  ) : (
                    <>Place Order • ₹{grandTotal.toFixed(0)}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Place Order stays fixed at the bottom, always visible without scrolling */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <button
          onClick={handlePlace}
          disabled={placing || !mounted || items.length === 0 || !selectedAddress}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#16A34A] text-white text-[15px] font-[800] rounded-2xl active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(22,163,74,0.4)]"
        >
          {placing ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Placing order...</>
          ) : !selectedAddress ? (
            <>Select a delivery address</>
          ) : (
            <>Place Order • ₹{grandTotal.toFixed(0)}</>
          )}
        </button>
      </div>

      {showLocationPicker && <LocationPicker onClose={() => setShowLocationPicker(false)} />}
      <SiteFooter />
    </>
  )
}
