'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, AlertTriangle, CheckCircle2, Database, Loader2, RefreshCw, Users, Trash2, XCircle } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'

const supabase = createClient()

type Level = 'ok' | 'warn' | 'bad'
type Health = {
  db_size_bytes: number; connections: number; active_queries: number; idle_in_transaction: number
  max_connections: number; cache_hit_pct: number | null
  slow_queries: { pid: number; seconds: number; query: string }[]
  tables: { name: string; rows: number; bytes: number }[]
}
type Check = { key: string; label: string; hint: string; count: number; level: Level; rows: string[] }
type Visitor = { path: string; device: string | null; last_seen: string }
type AppError = { id: number; created_at: string; message: string; url: string | null; user_agent: string | null; details: string | null }

const OPEN = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']
const mins = (n: number) => new Date(Date.now() - n * 60_000).toISOString()
const bytes = (n: number) => n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`
}
const short = (id: string) => id.slice(0, 8)

const LEVEL_STYLE: Record<Level, { box: string; icon: typeof CheckCircle2; color: string }> = {
  ok: { box: 'border-[#BBF7D0] bg-[#F0FDF4]', icon: CheckCircle2, color: '#16A34A' },
  warn: { box: 'border-[#FDE68A] bg-[#FFFBEB]', icon: AlertTriangle, color: '#D97706' },
  bad: { box: 'border-[#FECACA] bg-[#FEF2F2]', icon: XCircle, color: '#DC2626' },
}

export default function AdminHealthPage() {
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<Health | null>(null)
  const [healthErr, setHealthErr] = useState('')
  const [checks, setChecks] = useState<Check[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [visitors24, setVisitors24] = useState(0)
  const [errors, setErrors] = useState<AppError[]>([])
  const [errCount24, setErrCount24] = useState(0)
  const [updated, setUpdated] = useState<Date | null>(null)
  const [openCheck, setOpenCheck] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [h, unassigned, stuck, failedPay, pendingPay, riders, today, errs, errN, vis] = await Promise.all([
      supabase.rpc('admin_db_health'),
      supabase.from('orders').select('id, placed_at, status').in('status', ['pending', 'confirmed', 'preparing', 'ready']).is('delivery_partner_id', null).lt('placed_at', mins(10)).gt('placed_at', mins(24 * 60)).limit(50),
      supabase.from('orders').select('id, placed_at, status').in('status', OPEN).lt('placed_at', mins(120)).gt('placed_at', mins(24 * 60)).limit(50),
      supabase.from('orders').select('id, placed_at, total').eq('payment_status', 'failed').neq('status', 'cancelled').gt('placed_at', mins(24 * 60)).limit(50),
      supabase.from('orders').select('id, placed_at, online_amount').eq('payment_status', 'pending').gt('online_amount', 0).in('status', OPEN).lt('placed_at', mins(30)).gt('placed_at', mins(24 * 60)).limit(50),
      supabase.from('delivery_partners').select('name, last_location_at').eq('is_available', true).eq('is_active', true).or(`last_location_at.is.null,last_location_at.lt.${mins(15)}`).limit(50),
      supabase.from('orders').select('status').gte('placed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()).limit(2000),
      supabase.from('app_errors').select('id, created_at, message, url, user_agent, details').gt('created_at', mins(24 * 60)).order('created_at', { ascending: false }).limit(40),
      supabase.from('app_errors').select('*', { count: 'exact', head: true }).gt('created_at', mins(24 * 60)),
    supabase.from('site_visitors').select('path, device, last_seen').gt('last_seen', mins(24 * 60)).limit(5000),
      ])

    if (h.error) { setHealthErr(h.error.message); setHealth(null) } else { setHealthErr(''); setHealth(h.data as Health) }

    type O = { id: string; placed_at: string; status?: string; total?: number; online_amount?: number }
    const orderRows = (d: unknown, extra: (o: O) => string) => ((d as O[] | null) ?? []).map((o) => `#${short(o.id)} · ${ago(o.placed_at)}${extra(o)}`)
    const un = orderRows(unassigned.data, (o) => ` · ${o.status}`)
    const st = orderRows(stuck.data, (o) => ` · ${o.status}`)
    const fp = orderRows(failedPay.data, (o) => ` · ₹${Math.round(o.total ?? 0)}`)
    const pp = orderRows(pendingPay.data, (o) => ` · ₹${Math.round(o.online_amount ?? 0)} online`)
    const rd = ((riders.data as { name: string | null; last_location_at: string | null }[] | null) ?? [])
      .map((r) => `${r.name ?? 'Rider'} · ${r.last_location_at ? `last seen ${ago(r.last_location_at)}` : 'no location yet'}`)
    const todayRows = (today.data as { status: string }[] | null) ?? []
    const cancelledToday = todayRows.filter((o) => o.status === 'cancelled').length
    const cancelPct = todayRows.length >= 8 ? Math.round((cancelledToday / todayRows.length) * 100) : 0

    setChecks([
      { key: 'unassigned', label: 'Orders waiting for a rider', hint: 'Open orders older than 10 min with no rider assigned', count: un.length, level: un.length === 0 ? 'ok' : un.length < 3 ? 'warn' : 'bad', rows: un },
      { key: 'stuck', label: 'Stuck orders', hint: 'Still not delivered 2 hours after being placed', count: st.length, level: st.length === 0 ? 'ok' : 'bad', rows: st },
      { key: 'failedpay', label: 'Failed payments (24 h)', hint: 'Online payment failed and the order is still live', count: fp.length, level: fp.length === 0 ? 'ok' : fp.length < 4 ? 'warn' : 'bad', rows: fp },
      { key: 'pendingpay', label: 'Payments not confirmed', hint: 'Online amount pending for over 30 min', count: pp.length, level: pp.length === 0 ? 'ok' : 'warn', rows: pp },
      { key: 'riders', label: 'Riders online but silent', hint: 'Marked available but no location for 15+ min', count: rd.length, level: rd.length === 0 ? 'ok' : 'warn', rows: rd },
      { key: 'cancel', label: 'Cancellations today', hint: `${cancelledToday} of ${todayRows.length} orders today (flag above 40%)`, count: cancelledToday, level: cancelPct > 40 ? 'bad' : cancelPct > 25 ? 'warn' : 'ok', rows: [] },
    ])
    setErrors((errs.data as AppError[]) ?? [])
    setErrCount24(errN.count ?? 0)
    const allVis = (vis.data as Visitor[] | null) ?? []
    setVisitors24(allVis.length)
    setVisitors(allVis.filter((v) => new Date(v.last_seen).getTime() > Date.now() - 2 * 60_000))
    setUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void load() })
    const t = setInterval(() => { void load() }, 60_000)
    return () => clearInterval(t)
  }, [load])

  async function clearErrors() {
    if (!confirm('Delete all logged errors?')) return
    await supabase.from('app_errors').delete().gt('id', 0)
    void load()
  }

  const connPct = health ? Math.round((health.connections / health.max_connections) * 100) : 0
  const dbLevel: Level = !health ? 'bad' : connPct > 80 || health.slow_queries.length > 3 ? 'bad' : connPct > 50 || health.slow_queries.length > 0 || health.idle_in_transaction > 5 ? 'warn' : 'ok'
  const errLevel: Level = errCount24 === 0 ? 'ok' : errCount24 < 10 ? 'warn' : 'bad'
  const overall: Level = [dbLevel, errLevel, ...checks.map((c) => c.level)].includes('bad') ? 'bad'
    : [dbLevel, errLevel, ...checks.map((c) => c.level)].includes('warn') ? 'warn' : 'ok'
  const OverallIcon = LEVEL_STYLE[overall].icon

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-[800] text-[#111827] flex items-center gap-2" style={{ fontWeight: 800 }}><Activity className="w-5 h-5 text-[#7C3AED]" /> System Health</h1>
            <p className="text-[12.5px] text-[#9CA3AF]">Refreshes every minute{updated ? ` · updated ${updated.toLocaleTimeString()}` : ''}</p>
          </div>
          <button onClick={() => void load()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] text-[12.5px] font-[600] text-[#374151] hover:bg-[#F9FAFB]">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check now
          </button>
        </div>

        <div className="p-6 space-y-6 max-w-5xl">
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${LEVEL_STYLE[overall].box}`}>
            <OverallIcon className="w-6 h-6" style={{ color: LEVEL_STYLE[overall].color }} />
            <div>
              <p className="text-[15px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>
                {overall === 'ok' ? 'All good' : overall === 'warn' ? 'Needs a look' : 'Something needs attention now'}
              </p>
              <p className="text-[12px] text-[#6B7280]">Server CPU / RAM / disk are not shown here (they appear once the database moves to your own server).</p>
            </div>
          </div>

          {/* Live visitors */}
          <section>
            <h2 className="text-[14px] font-[700] text-[#111827] mb-2 flex items-center gap-1.5" style={{ fontWeight: 700 }}><Users className="w-4 h-4 text-[#7C3AED]" /> Live visitors</h2>
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { l: 'On the site now', v: visitors.length },
                  { l: 'On mobile', v: visitors.filter((v) => v.device === 'mobile').length },
                  { l: 'Visitors in 24 h', v: visitors24 },
                ].map((s) => (
                  <div key={s.l} className="bg-[#F9FAFB] rounded-xl py-2.5">
                    <p className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{s.v}</p>
                    <p className="text-[11px] text-[#6B7280]">{s.l}</p>
                  </div>
                ))}
              </div>
              {visitors.length === 0 ? (
                <p className="mt-3 text-[12px] text-[#9CA3AF]">Nobody on the site in the last 2 minutes.</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {Object.entries(visitors.reduce<Record<string, number>>((m, v) => { m[v.path] = (m[v.path] ?? 0) + 1; return m }, {}))
                    .sort((a, b) => b[1] - a[1]).map(([path, n]) => (
                      <li key={path} className="flex justify-between text-[12.5px] border-t border-[#F3F4F6] pt-1">
                        <span className="text-[#111827] truncate">{path}</span><span className="font-[700] text-[#7C3AED]">{n}</span>
                      </li>
                    ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-[#9CA3AF]">Counted when someone has a page open and visible; a person is dropped after 2 minutes of no activity. Admin pages are not counted.</p>
            </div>
          </section>

          {/* Order & payment problems */}
          <section>
            <h2 className="text-[14px] font-[700] text-[#111827] mb-2" style={{ fontWeight: 700 }}>Orders &amp; payments</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {checks.map((c) => {
                const st = LEVEL_STYLE[c.level]; const Icon = st.icon
                return (
                  <div key={c.key} className={`rounded-2xl border p-3.5 ${st.box}`}>
                    <button className="w-full flex items-start gap-2.5 text-left" disabled={!c.rows.length} onClick={() => setOpenCheck(openCheck === c.key ? null : c.key)}>
                      <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: st.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>{c.label}</p>
                        <p className="text-[11.5px] text-[#6B7280]">{c.hint}</p>
                      </div>
                      <span className="text-[20px] font-[800]" style={{ color: st.color, fontWeight: 800 }}>{c.count}</span>
                    </button>
                    {openCheck === c.key && c.rows.length > 0 && (
                      <ul className="mt-2 pt-2 border-t border-black/5 space-y-0.5 text-[12px] text-[#374151] max-h-40 overflow-auto">
                        {c.rows.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Database */}
          <section>
            <h2 className="text-[14px] font-[700] text-[#111827] mb-2 flex items-center gap-1.5" style={{ fontWeight: 700 }}><Database className="w-4 h-4 text-[#7C3AED]" /> Database load</h2>
            {healthErr ? (
              <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-[12.5px] text-[#92400E]">Could not read database stats: {healthErr}</div>
            ) : health && (
              <div className={`rounded-2xl border p-4 ${LEVEL_STYLE[dbLevel].box}`}>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  {[
                    { l: 'Connections', v: `${health.connections}/${health.max_connections}` },
                    { l: 'Running now', v: String(health.active_queries) },
                    { l: 'Stuck in transaction', v: String(health.idle_in_transaction) },
                    { l: 'Cache hit', v: health.cache_hit_pct == null ? '–' : `${health.cache_hit_pct}%` },
                    { l: 'Database size', v: bytes(health.db_size_bytes) },
                  ].map((s) => (
                    <div key={s.l} className="bg-white/70 rounded-xl py-2.5">
                      <p className="text-[17px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{s.v}</p>
                      <p className="text-[11px] text-[#6B7280]">{s.l}</p>
                    </div>
                  ))}
                </div>
                {health.slow_queries.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[12px] font-[700] text-[#B45309]">Slow queries right now</p>
                    {health.slow_queries.map((q) => <p key={q.pid} className="text-[11.5px] text-[#374151] font-mono truncate">{q.seconds}s · {q.query}</p>)}
                  </div>
                )}
                <details className="mt-3">
                  <summary className="text-[12px] font-[600] text-[#6B7280] cursor-pointer">Biggest tables</summary>
                  <table className="mt-2 w-full text-[12px]">
                    <tbody>
                      {health.tables.map((t) => (
                        <tr key={t.name} className="border-t border-black/5">
                          <td className="py-1 text-[#111827]">{t.name}</td>
                          <td className="py-1 text-right text-[#6B7280]">{t.rows.toLocaleString('en-IN')} rows</td>
                          <td className="py-1 text-right text-[#6B7280]">{bytes(t.bytes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </div>
            )}
          </section>

          {/* App errors */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[14px] font-[700] text-[#111827] flex items-center gap-1.5" style={{ fontWeight: 700 }}>
                <AlertTriangle className="w-4 h-4 text-[#7C3AED]" /> App errors (last 24 h): {errCount24}
              </h2>
              {errors.length > 0 && <button onClick={clearErrors} className="flex items-center gap-1 text-[12px] font-[600] text-[#DC2626]"><Trash2 className="w-3.5 h-3.5" /> Clear</button>}
            </div>
            {errors.length === 0 ? (
              <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5 text-[12.5px] text-[#166534]">No errors reported from customers&apos; phones in the last 24 hours.</div>
            ) : (
              <div className="space-y-2">
                {errors.map((e) => (
                  <details key={e.id} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                    <summary className="cursor-pointer text-[12.5px] text-[#111827]"><span className="text-[#9CA3AF]">{ago(e.created_at)} · </span>{e.message}</summary>
                    <div className="mt-2 text-[11.5px] text-[#6B7280] space-y-1">
                      {e.url && <p>Page: {e.url}</p>}
                      {e.user_agent && <p className="break-all">Device: {e.user_agent}</p>}
                      {e.details && <pre className="whitespace-pre-wrap break-all bg-[#F9FAFB] rounded-lg p-2 max-h-40 overflow-auto">{e.details}</pre>}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
