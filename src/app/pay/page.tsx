'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { load as loadCashfree } from '@cashfreepayments/cashfree-js'

// Opened by the Zippy mobile app (in an in-app browser) to take a UPI / card
// payment: it hands the payment session to Cashfree, which then redirects to
// /checkout/complete when the customer is done.
export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PayInner />
    </Suspense>
  )
}

function PayInner() {
  const params = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const session = params.get('s')
    const mode = params.get('m') === 'sandbox' ? 'sandbox' : 'production'
    if (!session) { queueMicrotask(() => setError('This payment link is not valid.')); return }
    loadCashfree({ mode })
      .then((cashfree) => {
        if (!cashfree) throw new Error('no sdk')
        return cashfree.checkout({ paymentSessionId: session, redirectTarget: '_self' })
      })
      .catch(() => setError('Could not open the payment page. Go back to the app and try again.'))
  }, [params])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
      {error ? (
        <p className="text-[15px] text-[#B91C1C]">{error}</p>
      ) : (
        <>
          <div className="h-8 w-8 rounded-full border-4 border-[#16A34A] border-t-transparent animate-spin" />
          <p className="text-[15px] text-[#374151]">Opening secure payment…</p>
        </>
      )}
    </div>
  )
}
