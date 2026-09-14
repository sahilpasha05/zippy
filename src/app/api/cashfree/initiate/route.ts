import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCashfreeOrder } from '@/lib/cashfree'

export async function POST(req: NextRequest) {
  const { orderId } = await req.json()
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  // Auth check: the order must belong to the requesting user (regular RLS-scoped client)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, total, online_amount, payment_status, customer_name, customer_phone')
    .eq('id', orderId)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.user_id && order.user_id !== user?.id) {
    return NextResponse.json({ error: 'Not authorized for this order' }, { status: 403 })
  }
  if (order.payment_status === 'paid' || order.payment_status === 'partially_paid') {
    return NextResponse.json({ error: 'Order is already paid' }, { status: 409 })
  }

  const customerPhone = (order.customer_phone ?? '').replace(/^\+91/, '').slice(-10)
  if (!/^\d{10}$/.test(customerPhone)) {
    return NextResponse.json({ error: 'A valid phone number is required to start payment' }, { status: 400 })
  }

  // Cashfree requires an https return_url — local dev servers are always http, so fall
  // back to the production domain there (the in-page checkout modal is what actually
  // resolves the payment locally; this URL only matters for the rare full-page-redirect case).
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const appUrl = rawAppUrl.startsWith('https://') ? rawAppUrl : 'https://www.zippytarikere.com'
  const returnUrl = `${appUrl}/checkout/complete?orderId=${orderId}`

  try {
    const cfOrder = await createCashfreeOrder({
      orderId,
      orderAmount: Number(order.online_amount) > 0 ? Number(order.online_amount) : Number(order.total),
      customerId: order.user_id ?? order.id,
      customerPhone,
      customerName: order.customer_name ?? undefined,
      returnUrl,
    })

    // Record Cashfree's own order id for traceability (service role — customers can't update orders)
    const admin = createAdminClient()
    await admin.from('orders').update({ cf_order_id: cfOrder.cf_order_id }).eq('id', orderId)

    return NextResponse.json({
      paymentSessionId: cfOrder.payment_session_id,
      mode: process.env.CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to start payment'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
