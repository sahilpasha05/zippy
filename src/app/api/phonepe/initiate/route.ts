import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPhonePeOrder } from '@/lib/phonepe'

export async function POST(req: NextRequest) {
  const { orderId } = await req.json()
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  // Auth check: the order must belong to the requesting user (regular RLS-scoped client)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, total, payment_status')
    .eq('id', orderId)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.user_id && order.user_id !== user?.id) {
    return NextResponse.json({ error: 'Not authorized for this order' }, { status: 403 })
  }
  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Order is already paid' }, { status: 409 })
  }

  const amountPaise = Math.round(Number(order.total) * 100)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const redirectUrl = `${appUrl}/checkout/complete?orderId=${orderId}`

  try {
    const phonepeOrder = await createPhonePeOrder({
      merchantOrderId: orderId,
      amountPaise,
      redirectUrl,
    })

    // Record PhonePe's own orderId for traceability (service role — customers can't update orders)
    const admin = createAdminClient()
    await admin.from('orders').update({ phonepe_order_id: phonepeOrder.orderId }).eq('id', orderId)

    return NextResponse.json({ redirectUrl: phonepeOrder.redirectUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to start payment'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
