import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree'

// Configure this exact URL in the Cashfree Merchant Dashboard → Developers → Webhooks.
export async function POST(req: NextRequest) {
  // Must read the raw text BEFORE any JSON parsing — the signature is computed over the
  // exact request bytes, and parsing first can reformat decimals and break verification.
  const rawBody = await req.text()
  const timestamp = req.headers.get('x-webhook-timestamp')
  const signature = req.headers.get('x-webhook-signature')

  if (!verifyCashfreeWebhookSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  const orderId: string | undefined = body?.data?.order?.order_id
  const cfOrderId: string | undefined = body?.data?.order?.cf_order_id
  const paymentStatus: string | undefined = body?.data?.payment?.payment_status
  if (!orderId) return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })

  const admin = createAdminClient()

  if (paymentStatus === 'SUCCESS') {
    const { data: existing } = await admin.from('orders').select('cod_amount').eq('id', orderId).single()
    const newPaymentStatus = (existing?.cod_amount ?? 0) > 0 ? 'partially_paid' : 'paid'
    await admin
      .from('orders')
      .update({ payment_status: newPaymentStatus, status: 'confirmed', cf_order_id: cfOrderId ?? null })
      .eq('id', orderId)
      .not('payment_status', 'in', '(paid,partially_paid)')
  } else if (paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED') {
    await admin.from('orders').update({ payment_status: 'failed' }).eq('id', orderId)
  }
  // Refund events are not handled yet — no refund flow exists in the app.

  return NextResponse.json({ received: true })
}
