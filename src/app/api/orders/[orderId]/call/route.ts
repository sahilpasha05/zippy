import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createSessionClient } from '@/lib/supabase/server'

// A customer phoning the delivery partner on their order. Each order allows
// MAX_CALLS calls (and none in the first 20 minutes): the rider's number is only
// handed out here, and every hand-out is counted on the order.
const MAX_RIDER_CALLS = 2
const CALL_LOCK_MS = 20 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(_req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params
  if (!UUID.test(orderId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to call your delivery partner.' }, { status: 401 })

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch { return NextResponse.json({ error: 'Calling is not available right now' }, { status: 503 }) }

  // Up to a few tries, in case two taps arrive together.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: order } = await admin
      .from('orders')
      .select('id, user_id, status, created_at, delivery_partner_id, rider_calls_used')
      .eq('id', orderId).single()
    if (!order || order.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['delivered', 'cancelled'].includes(order.status)) return NextResponse.json({ error: 'This order is closed.' }, { status: 409 })
    if (!order.delivery_partner_id) return NextResponse.json({ error: 'No delivery partner is assigned yet.' }, { status: 409 })

    const used = Number(order.rider_calls_used ?? 0)
    if (used >= MAX_RIDER_CALLS) {
      return NextResponse.json({ error: `You have exhausted your ${MAX_RIDER_CALLS} calls for this order.`, used, remaining: 0 }, { status: 429 })
    }
    const unlockAt = new Date(order.created_at).getTime() + CALL_LOCK_MS
    if (Date.now() < unlockAt) {
      const mins = Math.ceil((unlockAt - Date.now()) / 60000)
      return NextResponse.json({ error: `You can call your delivery partner in ${mins} min.`, used, remaining: MAX_RIDER_CALLS - used }, { status: 403 })
    }

    // Count it only if nobody else did in the meantime.
    const { data: bumped } = await admin
      .from('orders')
      .update({ rider_calls_used: used + 1 })
      .eq('id', orderId).eq('rider_calls_used', used)
      .select('rider_calls_used')
    if (!bumped || bumped.length === 0) continue

    const { data: rider } = await admin.from('delivery_partners').select('phone').eq('id', order.delivery_partner_id).single()
    if (!rider?.phone) {
      // Nothing to dial: give the call back.
      await admin.from('orders').update({ rider_calls_used: used }).eq('id', orderId)
      return NextResponse.json({ error: 'Your delivery partner has no phone number on file.' }, { status: 409 })
    }
    return NextResponse.json({ phone: rider.phone, used: used + 1, remaining: MAX_RIDER_CALLS - (used + 1) })
  }
  return NextResponse.json({ error: 'Please try again.' }, { status: 409 })
}
