import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cashfreeEnvironment, listCashfreeSettlements, type CashfreeSettlement } from '@/lib/cashfree'

// Admin-only money overview: what customers paid online (from our own orders),
// and what Cashfree has settled, is settling, or failed to settle (from
// Cashfree's settlements API). Dates are India days.
const DAY_MS = 24 * 60 * 60 * 1000
const IST_MS = 5.5 * 60 * 60 * 1000
const PAGE = 1000

type PaidOrder = { id: string; placed_at: string; online_amount: number }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? supabase : null
}

const istDay = (iso: string) => new Date(new Date(iso).getTime() + IST_MS).toISOString().slice(0, 10)
const round2 = (n: number) => Math.round(n * 100) / 100

export async function GET(req: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Not authorised' }, { status: 401 })

  const from = req.nextUrl.searchParams.get('from') ?? ''
  const to = req.nextUrl.searchParams.get('to') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 })
  }
  const rangeStart = new Date(`${from}T00:00:00+05:30`)
  const rangeEnd = new Date(`${to}T23:59:59.999+05:30`)
  const now = new Date()

  async function paidOrders(sinceISO: string, untilISO: string): Promise<PaidOrder[]> {
    const rows: PaidOrder[] = []
    for (let f = 0; ; f += PAGE) {
      const { data, error } = await supabase!
        .from('orders')
        .select('id, placed_at, online_amount')
        .gt('online_amount', 0)
        .in('payment_status', ['paid', 'partially_paid'])
        .gte('placed_at', sinceISO).lte('placed_at', untilISO)
        .order('placed_at').order('id')
        .range(f, f + PAGE - 1)
      if (error) throw new Error('Could not load orders')
      rows.push(...((data ?? []) as PaidOrder[]))
      if (!data || data.length < PAGE) break
    }
    return rows
  }

  try {
    // Settlements: the chosen range, plus enough history to see what is in
    // progress and what the last payout covered.
    const settlementSince = new Date(Math.min(rangeStart.getTime(), now.getTime() - 45 * DAY_MS))
    const allSettlements = await listCashfreeSettlements(settlementSince.toISOString(), new Date(now.getTime() + DAY_MS).toISOString())
    const when = (s: CashfreeSettlement) => s.settledOn ?? s.initiatedOn
    const inRange = allSettlements.filter((s) => {
      const t = when(s)
      return t ? new Date(t) >= rangeStart && new Date(t) <= rangeEnd : false
    })
    const inProgress = allSettlements.filter((s) => s.status !== 'PAID' && s.status !== 'FAILED' && s.status !== 'SUCCESS')
    const isPaid = (s: CashfreeSettlement) => s.status === 'PAID' || s.status === 'SUCCESS'
    const paid = allSettlements.filter(isPaid).sort((a, b) => (when(b) ?? '').localeCompare(when(a) ?? ''))
    const lastPaid = paid[0] ?? null

    // Typical gap between a payout's payment cut-off and the money landing.
    const lags = paid.slice(0, 15)
      .map((s) => (s.settledOn && s.paymentTill ? (new Date(s.settledOn).getTime() - new Date(s.paymentTill).getTime()) / DAY_MS : null))
      .filter((v): v is number => v !== null && v >= 0)
      .sort((a, b) => a - b)
    const typicalLagDays = lags.length ? round2(lags[Math.floor(lags.length / 2)]) : null

    // Day-wise online collections from our own paid orders.
    const orders = await paidOrders(rangeStart.toISOString(), rangeEnd.toISOString())
    const days = new Map<string, { date: string; orders: number; collected: number; settled: number }>()
    const ensure = (d: string) => { if (!days.has(d)) days.set(d, { date: d, orders: 0, collected: 0, settled: 0 }); return days.get(d)! }
    for (const o of orders) { const d = ensure(istDay(o.placed_at)); d.orders += 1; d.collected += Number(o.online_amount) }
    for (const s of inRange.filter(isPaid)) { const t = when(s); if (t) ensure(istDay(t)).settled += s.amountSettled }

    // Collected after the last settled cut-off and not yet paid out (estimate),
    // split into the daily settlement cycles Cashfree will pay them out in.
    // Cut-offs fall every 24h after the last paid cut-off; each payout then
    // lands about the usual lag after its cut-off.
    let unsettled = { amount: 0, orders: 0, since: lastPaid?.paymentTill ?? null }
    type Cycle = { cutoff: string; expectedOn: string; orders: number; amount: number; cutoffPassed: boolean; overdue: boolean }
    let upcoming: Cycle[] = []
    if (lastPaid?.paymentTill) {
      const lastCut = new Date(lastPaid.paymentTill).getTime()
      const after = await paidOrders(new Date(lastCut).toISOString(), now.toISOString())
      unsettled = { amount: round2(after.reduce((a, o) => a + Number(o.online_amount), 0)), orders: after.length, since: lastPaid.paymentTill }

      const lagMs = (typicalLagDays ?? 1) * DAY_MS
      const lastK = Math.max(1, Math.floor((now.getTime() - lastCut) / DAY_MS) + 1)
      for (let k = 1; k <= Math.min(lastK, 6); k++) {
        const cutoff = lastCut + k * DAY_MS
        const lo = lastCut + (k - 1) * DAY_MS
        const inCycle = after.filter((o) => { const t = new Date(o.placed_at).getTime(); return t > lo && t <= cutoff })
        const expectedOn = cutoff + lagMs
        upcoming.push({
          cutoff: new Date(cutoff).toISOString(),
          expectedOn: new Date(expectedOn).toISOString(),
          orders: inCycle.length,
          amount: round2(inCycle.reduce((a, o) => a + Number(o.online_amount), 0)),
          cutoffPassed: cutoff <= now.getTime(),
          overdue: expectedOn < now.getTime(),
        })
      }
      upcoming = upcoming.filter((c) => c.orders > 0 || !c.cutoffPassed)
    }

    const sum = (list: CashfreeSettlement[], k: 'amountSettled' | 'paymentAmount' | 'charges') => round2(list.reduce((a, s) => a + s[k], 0))
    // A failed payout is not lost: Cashfree folds its payments into the next
    // successful settlement. It counts as recovered when a later PAID
    // settlement's payment window starts no later and ends no earlier.
    const recoveredBy = (f: CashfreeSettlement) => paid.find((p) =>
      p.paymentFrom && p.paymentTill && f.paymentFrom && f.paymentTill &&
      new Date(p.paymentFrom) <= new Date(f.paymentFrom) && new Date(p.paymentTill) >= new Date(f.paymentTill))
    const failedAll = inRange.filter((s) => s.status === 'FAILED').map((s) => ({ s, rec: recoveredBy(s) }))
    const failedInRange = failedAll.filter((x) => !x.rec).map((x) => x.s)
    const recoveredInRange = failedAll.filter((x) => x.rec)

    return NextResponse.json({
      environment: cashfreeEnvironment(),
      range: { from, to },
      generatedAt: now.toISOString(),
      totals: {
        collected: round2(orders.reduce((a, o) => a + Number(o.online_amount), 0)),
        paidOrders: orders.length,
        settled: sum(inRange.filter(isPaid), 'amountSettled'),
        settlements: inRange.filter(isPaid).length,
        fees: sum(inRange.filter(isPaid), 'charges'),
        failed: failedInRange.length,
        failedAmount: sum(failedInRange, 'paymentAmount'),
        recovered: recoveredInRange.length,
        recoveredAmount: sum(recoveredInRange.map((x) => x.s), 'paymentAmount'),
        recoveredOn: recoveredInRange[0]?.rec?.settledOn ?? null,
      },
      inProgress: { count: inProgress.length, amount: sum(inProgress, 'paymentAmount') },
      unsettled,
      upcoming,
      lastSettlement: lastPaid && { amount: lastPaid.amountSettled, on: lastPaid.settledOn, utr: lastPaid.utr, paymentTill: lastPaid.paymentTill },
      typicalLagDays,
      days: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)).map((d) => ({ ...d, collected: round2(d.collected), settled: round2(d.settled) })),
      settlements: inRange
        .sort((a, b) => (when(b) ?? '').localeCompare(when(a) ?? ''))
        .map((s) => ({ ...s, on: when(s), recoveredOn: s.status === 'FAILED' ? recoveredBy(s)?.settledOn ?? null : null })),
      inProgressList: inProgress.map((s) => ({ ...s, on: when(s) })),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not load Cashfree data' }, { status: 502 })
  }
}
