import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPhonePeWebhookAuth } from '@/lib/phonepe'

// Configure this exact URL in PhonePe Business Dashboard → Developer Settings → Webhooks
// (Authentication Type: SHA, using PHONEPE_WEBHOOK_USERNAME / PHONEPE_WEBHOOK_PASSWORD below).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!verifyPhonePeWebhookAuth(authHeader)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  const body = await req.json()
  const payload = body?.payload
  const merchantOrderId: string | undefined = payload?.merchantOrderId
  const state: string | undefined = payload?.state
  if (!merchantOrderId) return NextResponse.json({ error: 'Missing merchantOrderId' }, { status: 400 })

  const admin = createAdminClient()

  // Event names vary by product/account config (checkout.order.completed, pg.order.completed, etc.) —
  // per PhonePe's own docs, the root-level payload.state is the authoritative field to key off.
  if (state === 'COMPLETED') {
    await admin
      .from('orders')
      .update({ payment_status: 'paid', status: 'confirmed', phonepe_order_id: payload.orderId })
      .eq('id', merchantOrderId)
      .neq('payment_status', 'paid')
  } else if (state === 'FAILED') {
    await admin
      .from('orders')
      .update({ payment_status: 'failed', phonepe_order_id: payload.orderId })
      .eq('id', merchantOrderId)
  }
  // Refund events are not handled yet — no refund flow exists in the app.

  return NextResponse.json({ received: true })
}
