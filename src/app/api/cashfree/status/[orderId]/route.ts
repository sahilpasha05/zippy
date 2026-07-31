import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCashfreeOrderStatus } from '@/lib/cashfree'

// Polled by the client after the checkout modal closes, and usable as a manual fallback
// if the webhook can't reach this server. Idempotent — safe to call repeatedly.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  try {
    const result = await getCashfreeOrderStatus(orderId)
    const admin = createAdminClient()

    let state: 'PENDING' | 'COMPLETED' | 'FAILED'
    if (result.order_status === 'PAID') {
      state = 'COMPLETED'
      const { data: existing } = await admin.from('orders').select('cod_amount').eq('id', orderId).single()
      const newPaymentStatus = (existing?.cod_amount ?? 0) > 0 ? 'partially_paid' : 'paid'
      await admin
        .from('orders')
        .update({ payment_status: newPaymentStatus, status: 'confirmed', cf_order_id: result.cf_order_id ?? undefined })
        .eq('id', orderId)
        .not('payment_status', 'in', '(paid,partially_paid)')
    } else if (result.order_status === 'ACTIVE') {
      state = 'PENDING'
    } else {
      state = 'FAILED'
      await admin.from('orders').update({ payment_status: 'failed' }).eq('id', orderId)
    }

    return NextResponse.json({ state })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to check payment status'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
