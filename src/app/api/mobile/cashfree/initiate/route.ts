import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCashfreeOrder } from '@/lib/cashfree'
import { CITY } from '@/lib/city'

// Mobile-app twin of /api/cashfree/initiate. Same checks, but the customer is
// identified by their Supabase access token (Authorization: Bearer …) instead of
// a browser cookie. Returns a /pay URL the app opens in an in-app browser.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Please log in again' }, { status: 401 })

  let orderId: string | undefined
  try { ({ orderId } = await req.json()) } catch {}
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Please log in again' }, { status: 401 })

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, total, online_amount, payment_status, customer_name, customer_phone')
    .eq('id', orderId)
    .single()
  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  // Unlike the website flow, a mobile order must always belong to the caller.
  if (order.user_id !== user.id) return NextResponse.json({ error: 'Not authorized for this order' }, { status: 403 })
  if (order.payment_status === 'paid' || order.payment_status === 'partially_paid') {
    return NextResponse.json({ error: 'Order is already paid' }, { status: 409 })
  }

  const customerPhone = (order.customer_phone ?? '').replace(/\D/g, '').slice(-10)
  if (!/^\d{10}$/.test(customerPhone)) {
    return NextResponse.json({ error: 'A valid phone number is required to start payment' }, { status: 400 })
  }

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const appUrl = rawAppUrl.startsWith('https://') ? rawAppUrl : CITY.siteUrl
  const returnUrl = `${appUrl}/checkout/complete?orderId=${orderId}`

  try {
    const cfOrder = await createCashfreeOrder({
      orderId,
      orderAmount: Number(order.online_amount) > 0 ? Number(order.online_amount) : Number(order.total),
      customerId: order.user_id,
      customerPhone,
      customerName: order.customer_name ?? undefined,
      returnUrl,
    })

    const admin = createAdminClient()
    await admin.from('orders').update({ cf_order_id: cfOrder.cf_order_id }).eq('id', orderId)

    const mode = process.env.CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production'
    const payUrl = `${appUrl}/pay?s=${encodeURIComponent(cfOrder.payment_session_id)}&m=${mode}`
    return NextResponse.json({ payUrl, mode })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to start payment'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
