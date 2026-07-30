'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, X, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { useCartStore } from '@/lib/store/cart'

type State = 'checking' | 'completed' | 'failed'

// Fallback landing page for Cashfree's order_meta.return_url — reached if the checkout
// modal does a full top-level redirect instead of staying in-page (can happen on some
// mobile UPI flows). The in-page modal flow on desktop resolves without ever hitting this page.
export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <CheckoutCompleteInner />
    </Suspense>
  )
}

function CheckoutCompleteInner() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [state, setState] = useState<State>('checking')
  const clearCart = useCartStore((s) => s.clearCart)

  useEffect(() => {
    if (!orderId) { queueMicrotask(() => setState('failed')); return }
    fetch(`/api/cashfree/status/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.state === 'COMPLETED') { clearCart(); setState('completed') }
        else setState('failed')
      })
      .catch(() => setState('failed'))
  }, [orderId, clearCart])

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-[#E5E7EB] p-8 text-center shadow-zippy-lg">
          {state === 'checking' && (
            <>
              <Loader2 className="w-10 h-10 text-[#16A34A] animate-spin mx-auto mb-6" />
              <h2 className="text-[18px] font-[800] text-[#111827] mb-2">Confirming your payment...</h2>
              <p className="text-[13.5px] text-[#6B7280]">This will only take a moment.</p>
            </>
          )}
          {state === 'completed' && (
            <>
              <div className="w-20 h-20 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-[#16A34A]" strokeWidth={2.5} />
              </div>
              <h2 className="text-[20px] font-[800] text-[#111827] mb-4">Payment successful!</h2>
              <Link href={orderId ? `/orders/${orderId}/track` : '/orders'}>
                <button className="w-full py-3.5 bg-[#16A34A] text-white font-[700] rounded-2xl hover:bg-[#15803D] transition-colors">
                  Track your order
                </button>
              </Link>
            </>
          )}
          {state === 'failed' && (
            <>
              <div className="w-20 h-20 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="w-10 h-10 text-[#DC2626]" strokeWidth={2.5} />
              </div>
              <h2 className="text-[20px] font-[800] text-[#111827] mb-2">Payment not completed</h2>
              <p className="text-[13.5px] text-[#6B7280] mb-6">Your cart is still saved — you can try again.</p>
              <Link href="/checkout">
                <button className="w-full py-3.5 bg-[#16A34A] text-white font-[700] rounded-2xl hover:bg-[#15803D] transition-colors">
                  Back to checkout
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}
