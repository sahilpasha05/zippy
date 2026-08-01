'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { load as loadCashfree } from '@cashfreepayments/cashfree-js'
import { MapPin, CreditCard, ChevronRight, Plus, Check, Zap, Gift, Smartphone, Banknote, Loader2, Home, Briefcase, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cart'
import { useAddresses } from '@/lib/hooks/useAddresses'
import { getCartBaseTotal, getAdjustedUnitPrice, getCartAdjustedTotal, getPlatformFee, getFreeFriesProgress, FREE_FRIES_OFFER, DELIVERY_FEE } from '@/lib/cartPricing'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import { isWithinDeliveryZone, OUT_OF_ZONE_MESSAGE } from '@/lib/deliveryZone'
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
  { id: 'upi',  label: 'UPI',                  icon: Smartphone,  desc: 'Pay 50% now via UPI, 50% cash on delivery' },
  { id: 'card', label: 'Credit / Debit Card',   icon: CreditCard,  desc: 'Pay 50% now by card, 50% cash on delivery' },
  { id: 'cod',  label: 'Cash on Delivery',      icon: Banknote,    desc: 'Pay the full amount when delivered' },
]

const LABEL_ICONS: Record<string, typeof Home> = { Home, Work: Briefcase, Other: Star }

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore()
  const { addresses, selectedId, selectAddress, ready: addressesReady } = useAddresses()
  const deliveryEta = useDeliveryEta()
  const [mounted, setMounted] = useState(false)
  const baseTotal = getCartBaseTotal(items)
  const cartTotal = getCartAdjustedTotal(items)
  const [selectedPayment, setSelectedPayment] = useState('upi')
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [placeError, setPlaceError] = useState('')
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  // Hydrate persisted cart store before rendering (addresses handle their own readiness via useAddresses)
  useEffect(() => {
    useCartStore.persist.rehydrate()
    setMounted(true)
  }, [])

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null

  // Last gate before payment. Addresses saved before the zone check existed have
  // no coordinates, so they can't be confirmed as inside the area and are
  // treated the same as out-of-area rather than waved through.
  const addressUnverified = !!selectedAddress && (selectedAddress.lat == null || selectedAddress.lng == null)
  const addressOutOfZone = !!selectedAddress && !addressUnverified
    && !isWithinDeliveryZone(selectedAddress.lat as number, selectedAddress.lng as number)
  // An address with no coordinates (location was denied) is allowed through;
  // only a confirmed out-of-area one is refused.
  const addressBlocked = addressOutOfZone

  const deliveryFee = DELIVERY_FEE
  const platformFee = getPlatformFee(cartTotal)
  const friesProgress = getFreeFriesProgress(items)
  const grandTotal = cartTotal + deliveryFee + platformFee
  const isSplitPayment = selectedPayment === 'upi' || selectedPayment === 'card'
  const onlineAmount = isSplitPayment ? Math.round((grandTotal / 2) * 100) / 100 : 0
  const codAmount = isSplitPayment ? grandTotal - onlineAmount : (selectedPayment === 'cod' ? grandTotal : 0)

  const handlePlace = async () => {
    if (items.length === 0 || !selectedAddress) return

    if (addressBlocked) {
      setPlaceError(addressOutOfZone
        ? OUT_OF_ZONE_MESSAGE
        : 'We can’t confirm this address is inside our delivery area. Please remove it and add it again using “Use current location”.')
      return
    }

    if (selectedPayment !== 'cod') {
      const normalizedPhone = (selectedAddress.contactPhone ?? '').replace(/^\+91/, '').slice(-10)
      if (!/^\d{10}$/.test(normalizedPhone)) {
        setPlaceError('This address is missing a valid 10-digit mobile number. Please edit it and add one before paying online.')
        return
      }
    }

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
          discount: 0,
          online_amount: onlineAmount,
          cod_amount: codAmount,
          address: selectedAddress.address,
          delivery_latitude: selectedAddress.lat,
          delivery_longitude: selectedAddress.lng,
          coupon_code: null,
          payment_method: selectedPayment,
          payment_status: 'pending',
          customer_name: selectedAddress.contactName || user?.user_metadata?.full_name || null,
          customer_phone: selectedAddress.contactPhone || null,
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
        price: getAdjustedUnitPrice(item, baseTotal),
        quantity: item.quantity,
      }))

      // The reward is earned by the cart, never added by the customer, so it is
      // appended here at ₹0 — the threshold is re-checked at the moment of
      // placing rather than trusted from whenever the cart was last touched.
      if (getFreeFriesProgress(items).unlocked) {
        orderItems.push({
          order_id: order.id,
          product_id: FREE_FRIES_OFFER.rewardProductId,
          product_type: 'restaurant',
          name: `${FREE_FRIES_OFFER.reward} (FREE — order above ₹${FREE_FRIES_OFFER.threshold})`,
          image_url: FREE_FRIES_OFFER.rewardImageUrl,
          price: 0,
          quantity: 1,
        })
      }

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
      if (itemsErr) throw itemsErr

      if (selectedPayment === 'cod') {
        setOrderId(order.id)
        clearCart()
        setPlaced(true)
        setPlacing(false)
        return
      }

      // UPI / Card: hand off to Cashfree. Cart is only cleared once payment actually succeeds.
      const initRes = await fetch('/api/cashfree/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) throw new Error(initData.error ?? 'Could not start payment')

      const cashfree = await loadCashfree({ mode: initData.mode })
      if (!cashfree) throw new Error('Could not load Cashfree checkout')

      const result = await cashfree.checkout({
        paymentSessionId: initData.paymentSessionId,
        redirectTarget: '_modal',
      })

      if (result.error) {
        setPlacing(false)
        setPlaceError('Payment was cancelled or failed. Your cart is still saved — you can try again.')
        return
      }

      // Modal closed without an SDK-level error — confirm the real state server-side
      try {
        const statusRes = await fetch(`/api/cashfree/status/${order.id}`)
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
              {isSplitPayment && (
                <div className="mt-4 pt-4 border-t border-[#F3F4F6] text-left space-y-1">
                  <div className="flex justify-between text-[13px] text-[#16A34A] font-medium"><span>Paid online</span><span>₹{onlineAmount.toFixed(0)}</span></div>
                  <div className="flex justify-between text-[13px] text-[#D97706] font-medium"><span>Cash due on delivery</span><span>₹{codAmount.toFixed(0)}</span></div>
                </div>
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

          {/* The place-order button is disabled in this state, so the reason has
              to be visible here or it would look broken for no apparent reason. */}
          {addressBlocked && (
            <div className="mb-6 px-4 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-[13px] text-[#B45309] leading-relaxed">
              {addressOutOfZone
                ? OUT_OF_ZONE_MESSAGE
                : 'We can’t confirm this address is inside our delivery area. Please remove it and add it again using “Use current location”.'}
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

                {!mounted || !addressesReady ? (
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
                          onClick={() => selectAddress(addr.id)}
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
                  Payments for Zippy orders are processed securely via Cashfree.
                </p>
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
                        <p className="text-[13px] font-[700] text-[#111827] shrink-0" style={{ fontWeight: 700 }}>₹{(getAdjustedUnitPrice(item, baseTotal) * item.quantity).toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {friesProgress.spend > 0 && (
                  <div className={cn(
                    'flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-[600] mb-4',
                    friesProgress.unlocked ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FFFBEB] text-[#B45309]'
                  )}>
                    <Gift className="w-4 h-4 shrink-0 mt-px" />
                    <span>
                      {friesProgress.unlocked
                        ? `Free ${FREE_FRIES_OFFER.reward} unlocked — included with this order.`
                        : `Add ₹${friesProgress.remaining.toFixed(0)} more from Smiley Cafe to unlock free ${FREE_FRIES_OFFER.reward}.`}
                    </span>
                  </div>
                )}

                <div className="border-t border-[#E5E7EB] pt-4 space-y-2.5">
                  <div className="flex justify-between text-[13px] text-[#6B7280]"><span>Subtotal</span><span>₹{cartTotal.toFixed(0)}</span></div>
                  <div className="flex justify-between text-[13px] text-[#6B7280]">
                    <span>Delivery fee</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-[#6B7280]">
                    <span>Platform fee</span>
                    <span>₹{platformFee}</span>
                  </div>
                  <div className="flex justify-between text-[16px] font-[800] text-[#111827] pt-2 border-t border-[#E5E7EB]" style={{ fontWeight: 800 }}>
                    <span>Total</span><span>₹{grandTotal.toFixed(0)}</span>
                  </div>
                  {isSplitPayment && (
                    <div className="pt-2 border-t border-dashed border-[#E5E7EB] space-y-1">
                      <div className="flex justify-between text-[12.5px] text-[#16A34A] font-medium"><span>Pay online now</span><span>₹{onlineAmount.toFixed(0)}</span></div>
                      <div className="flex justify-between text-[12.5px] text-[#D97706] font-medium"><span>Cash on delivery</span><span>₹{codAmount.toFixed(0)}</span></div>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-[#DCFCE7] rounded-xl flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#16A34A] fill-[#16A34A]" />
                  <p className="text-[11.5px] text-[#14532D] font-medium">Estimated delivery in <strong>{deliveryEta} minutes</strong></p>
                </div>

                {/* Desktop place order button — mobile uses the fixed bottom bar */}
                <button
                  onClick={handlePlace}
                  disabled={placing || !mounted || items.length === 0 || !selectedAddress || addressBlocked}
                  className="hidden lg:flex w-full mt-5 items-center justify-center gap-2 py-4 bg-[#16A34A] text-white text-[15px] font-[800] rounded-2xl hover:bg-[#15803D] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(22,163,74,0.4)]"
                  style={{ fontWeight: 800 }}
                >
                  {placing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Placing order...</>
                  ) : !selectedAddress ? (
                    <>Select a delivery address</>
                  ) : (
                    <>{isSplitPayment ? `Pay ₹${onlineAmount.toFixed(0)} now • Place Order` : `Place Order • ₹${grandTotal.toFixed(0)}`}</>
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
          disabled={placing || !mounted || items.length === 0 || !selectedAddress || addressBlocked}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#16A34A] text-white text-[15px] font-[800] rounded-2xl active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(22,163,74,0.4)]"
        >
          {placing ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Placing order...</>
          ) : !selectedAddress ? (
            <>Select a delivery address</>
          ) : addressBlocked ? (
            <>Outside our delivery area</>
          ) : (
            <>{isSplitPayment ? `Pay ₹${onlineAmount.toFixed(0)} now • Place Order` : `Place Order • ₹${grandTotal.toFixed(0)}`}</>
          )}
        </button>
      </div>

      {showLocationPicker && <LocationPicker onClose={() => setShowLocationPicker(false)} />}
      <SiteFooter />
    </>
  )
}
