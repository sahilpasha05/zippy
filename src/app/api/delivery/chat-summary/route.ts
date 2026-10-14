import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// For the rider panel's chat alerts: how many messages each of this rider's
// active orders has received from the customer, and the newest one. The panel
// compares the counts with what the rider has already seen. The rider is
// identified by their panel slug, the same key their panel link already is.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('rider')
  if (!slug) return NextResponse.json({ error: 'rider is required' }, { status: 400 })

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch {
    return NextResponse.json({ error: 'Chat is not available right now' }, { status: 503 })
  }

  const { data: partner } = await admin.from('delivery_partners').select('id').eq('slug', slug).single()
  if (!partner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: orders } = await admin
    .from('orders')
    .select('id, customer_name')
    .eq('delivery_partner_id', partner.id)
    .not('status', 'in', '(delivered,cancelled)')
    .limit(100)
  const ids = (orders ?? []).map((o) => o.id)
  if (ids.length === 0) return NextResponse.json({ orders: [] })

  const { data: msgs } = await admin
    .from('order_messages')
    .select('order_id, body, created_at')
    .in('order_id', ids)
    .eq('sender_role', 'customer')
    .order('created_at', { ascending: true })

  const byOrder = new Map<string, { count: number; lastBody: string; lastAt: string }>()
  for (const m of msgs ?? []) {
    const cur = byOrder.get(m.order_id)
    byOrder.set(m.order_id, { count: (cur?.count ?? 0) + 1, lastBody: m.body, lastAt: m.created_at })
  }
  const name = new Map((orders ?? []).map((o) => [o.id, o.customer_name as string | null]))
  return NextResponse.json({
    orders: [...byOrder.entries()].map(([orderId, v]) => ({ orderId, customer: name.get(orderId) ?? null, ...v })),
  })
}
