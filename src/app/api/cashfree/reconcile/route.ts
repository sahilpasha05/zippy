import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { getCashfreeOrderStatus } from '@/lib/cashfree'

// Backstop for missed payment updates.
//
// An order is marked paid by one of two things: Cashfree's webhook hitting
// /api/cashfree/callback, or the browser calling /api/cashfree/status when the
// checkout modal closes. The browser path fails whenever the customer closes
// the tab, loses signal, or switches to a UPI app and never returns — which
// leaves the webhook as the only backstop, and if that isn't reaching this
// server the money arrives with nothing recording it.
//
// This re-asks Cashfree about every order still marked unpaid and settles the
// ones that actually went through, so a missed webhook self-heals.
//
// Auth: an admin session, or an x-reconcile-key header matching RECONCILE_SECRET
// (for a cron job). Without RECONCILE_SECRET set, only an admin session works.
const LOOKBACK_DAYS = 7
const MAX_ORDERS = 500

async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.RECONCILE_SECRET
  if (secret && req.headers.get('x-reconcile-key') === secret) return true

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function POST(req: NextRequest) {
  if (!await authorize(req)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: orders, error } = await admin
    .from('orders')
    .select('id, online_amount, cod_amount, payment_status')
    .gt('online_amount', 0)
    .not('payment_status', 'in', '(paid,partially_paid)')
    .gte('placed_at', since)
    .order('placed_at', { ascending: false })
    .limit(MAX_ORDERS)

  if (error) {
    return NextResponse.json({ error: 'Could not load orders' }, { status: 502 })
  }

  const settled: { id: string; amount: number }[] = []
  let stillPending = 0
  let failed = 0
  let unreachable = 0

  for (const o of orders ?? []) {
    try {
      const result = await getCashfreeOrderStatus(o.id)

      if (result.order_status === 'PAID') {
        const newPaymentStatus = (o.cod_amount ?? 0) > 0 ? 'partially_paid' : 'paid'
        await admin
          .from('orders')
          .update({ payment_status: newPaymentStatus, status: 'confirmed', cf_order_id: result.cf_order_id ?? undefined })
          .eq('id', o.id)
          // Never downgrade an order somebody already settled.
          .not('payment_status', 'in', '(paid,partially_paid)')
        settled.push({ id: o.id, amount: Number(o.online_amount) })
      } else if (result.order_status === 'ACTIVE') {
        stillPending++
      } else {
        failed++
        await admin.from('orders').update({ payment_status: 'failed' }).eq('id', o.id)
      }
    } catch {
      // Cashfree unreachable for this one — leave it untouched and try next run.
      unreachable++
    }
  }

  return NextResponse.json({
    checked: orders?.length ?? 0,
    settled: settled.length,
    settledAmount: settled.reduce((s, x) => s + x.amount, 0),
    stillPending,
    failed,
    unreachable,
  })
}
