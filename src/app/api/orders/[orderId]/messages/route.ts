import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createSessionClient } from '@/lib/supabase/server'

// Customer ↔ rider chat for an order. Admins can read and join every thread.
//
// The table has no public access at all (see
// supabase-migration-order-messages.sql); everything runs here with the service
// key after working out WHO is asking:
//   - admin    : signed-in user whose profile role is 'admin'
//   - customer : signed-in user who owns the order
//   - rider    : request carries the slug of the delivery partner assigned to
//                the order (riders have no login; their panel link is their key)
type Role = 'customer' | 'rider' | 'admin'

const MAX_THREAD = 300
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type OrderRow = { id: string; user_id: string | null; status: string; delivery_partner_id: string | null }

async function identify(orderId: string, riderSlug: string | null): Promise<
  { role: Role; order: OrderRow; admin: ReturnType<typeof createAdminClient> } | { error: NextResponse }
> {
  if (!UUID.test(orderId)) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    // Service key not configured on this server.
    return { error: NextResponse.json({ error: 'Chat is not available right now' }, { status: 503 }) }
  }
  const { data: order } = await admin
    .from('orders').select('id, user_id, status, delivery_partner_id').eq('id', orderId).single()
  if (!order) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (user) {
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') return { role: 'admin', order, admin }
    if (order.user_id === user.id) return { role: 'customer', order, admin }
  }

  if (riderSlug && order.delivery_partner_id) {
    const { data: partner } = await admin
      .from('delivery_partners').select('id').eq('slug', riderSlug).single()
    if (partner && partner.id === order.delivery_partner_id) return { role: 'rider', order, admin }
  }
  return { error: NextResponse.json({ error: 'Not authorised' }, { status: 403 }) }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params
  const who = await identify(orderId, req.nextUrl.searchParams.get('rider'))
  if ('error' in who) return who.error

  const { data, error } = await who.admin
    .from('order_messages')
    .select('id, sender_role, body, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
    .limit(MAX_THREAD)
  if (error) return NextResponse.json({ error: 'Could not load messages' }, { status: 502 })

  const canPost = !!who.order.delivery_partner_id && !['delivered', 'cancelled'].includes(who.order.status)
  return NextResponse.json({ role: who.role, canPost, messages: data ?? [] })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params
  let payload: { body?: unknown; rider?: unknown } = {}
  try { payload = await req.json() } catch { /* handled below */ }
  const riderSlug = typeof payload.rider === 'string' ? payload.rider : null
  const who = await identify(orderId, riderSlug)
  if ('error' in who) return who.error

  const body = typeof payload.body === 'string' ? payload.body.trim() : ''
  if (!body || body.length > 1000) {
    return NextResponse.json({ error: 'Message must be 1–1000 characters' }, { status: 400 })
  }
  if (!who.order.delivery_partner_id) {
    return NextResponse.json({ error: 'Chat opens when a rider is assigned' }, { status: 409 })
  }
  if (['delivered', 'cancelled'].includes(who.order.status)) {
    return NextResponse.json({ error: 'This order is closed' }, { status: 409 })
  }

  const { count } = await who.admin.from('order_messages').select('id', { count: 'exact', head: true }).eq('order_id', orderId)
  if ((count ?? 0) >= MAX_THREAD) return NextResponse.json({ error: 'Message limit reached for this order' }, { status: 429 })

  const { data, error } = await who.admin
    .from('order_messages')
    .insert({ order_id: orderId, sender_role: who.role, body })
    .select('id, sender_role, body, created_at')
    .single()
  if (error) return NextResponse.json({ error: 'Could not send' }, { status: 502 })
  return NextResponse.json({ message: data })
}
