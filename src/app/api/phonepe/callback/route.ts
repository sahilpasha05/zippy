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
  const event: string = body?.event
  const payload = body?.payload
  const merchantOrderId: string | undefined = payload?.merchantOrderId
  if (!merchantOrderId) return NextResponse.json({ error: 'Missing merchantOrderId' }, { status: 400 })

  const admin = createAdminClient()

  if (event === 'checkout.order.completed') {
    await admin
      .from('orders')
      .update({ payment_status: 'paid', status: 'confirmed', phonepe_order_id: payload.orderId })
      .eq('id', merchantOrderId)
      .neq('payment_status', 'paid')
  } else if (event === 'checkout.order.failed') {
    await admin
      .from('orders')
      .update({ payment_status: 'failed', phonepe_order_id: payload.orderId })
      .eq('id', merchantOrderId)
  }
  // pg.refund.completed / pg.refund.failed are not handled yet — no refund flow exists in the app.

  return NextResponse.json({ received: true })
}
