import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhonePeOrderStatus } from '@/lib/phonepe'

// Polled by the client after PayPage closes, and used as a fallback when the
// webhook can't reach this server (e.g. local dev). Idempotent — safe to call repeatedly.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  try {
    const result = await getPhonePeOrderStatus(orderId)
    const admin = createAdminClient()

    if (result.state === 'COMPLETED') {
      await admin
        .from('orders')
        .update({ payment_status: 'paid', status: 'confirmed', phonepe_order_id: result.orderId })
        .eq('id', orderId)
        .neq('payment_status', 'paid')
    } else if (result.state === 'FAILED') {
      await admin
        .from('orders')
        .update({ payment_status: 'failed', phonepe_order_id: result.orderId })
        .eq('id', orderId)
    }

    return NextResponse.json({ state: result.state })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to check payment status'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
