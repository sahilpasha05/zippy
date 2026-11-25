'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdminSidebar from '@/components/admin/AdminSidebar'
import TimeAgo from '@/components/TimeAgo'
import { TICKET_STATUS, ticketCode, topicLabel, type Ticket, type TicketStatus } from '@/lib/supportTickets'

const supabase = createClient()

type Filter = 'active' | TicketStatus | 'all'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'active', label: 'Needs action' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
]

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('active')
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('support_tickets').select('*').order('created_at', { ascending: false }).limit(500)
    if (err) setError('Could not load tickets. Are you signed in as admin?')
    setTickets((data as Ticket[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function update(t: Ticket, patch: Partial<Pick<Ticket, 'status' | 'admin_reply'>>) {
    setSaving(t.id); setError('')
    const { error: err } = await supabase.from('support_tickets').update(patch).eq('id', t.id)
    setSaving(null)
    if (err) { setError('Could not save that change.'); return }
    setTickets((all) => all.map((x) => (x.id === t.id ? { ...x, ...patch } : x)))
  }

  const shown = tickets.filter((t) =>
    filter === 'all' ? true : filter === 'active' ? t.status === 'open' || t.status === 'in_progress' : t.status === filter)
  const openCount = tickets.filter((t) => t.status === 'open').length

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Support Tickets</h1>
          <p className="text-[12.5px] text-[#9CA3AF]">
            {loading ? 'Loading…' : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'} · ${openCount} open`}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cn('px-4 py-1.5 rounded-xl text-[12.5px] font-medium transition-all',
                  filter === f.id ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                {f.label}
              </button>
            ))}
          </div>

          {error && <p className="text-[13px] text-[#DC2626]">{error}</p>}
          {loading && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" /></div>}
          {!loading && shown.length === 0 && <p className="text-[13.5px] text-[#9CA3AF] py-8 text-center">No tickets here.</p>}

          {shown.map((t) => {
            const st = TICKET_STATUS[t.status]
            const reply = replies[t.id] ?? t.admin_reply ?? ''
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[13px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{ticketCode(t.ticket_no)}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                  <span className="text-[12px] text-[#6B7280]">{topicLabel(t.category)}</span>
                  <span className="ml-auto text-[11.5px] text-[#9CA3AF]"><TimeAgo date={t.created_at} /></span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#374151] mb-2">
                  <span className="font-semibold">{t.name}</span>
                  <a href={`tel:+91${t.phone}`} className="flex items-center gap-1 text-[#16A34A] hover:underline"><Phone className="w-3.5 h-3.5" />{t.phone}</a>
                  {t.order_id && <span className="text-[12px] text-[#6B7280]">Order #{t.order_id.slice(0, 6).toUpperCase()}</span>}
                </div>
                <p className="text-[13.5px] text-[#111827] whitespace-pre-wrap break-words rounded-xl bg-[#F8FAFC] border border-[#F3F4F6] p-3">{t.message}</p>

                <textarea
                  value={reply}
                  onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))}
                  rows={2}
                  placeholder="Reply to the customer (shown in their My Tickets)"
                  className="mt-3 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] outline-none focus:border-[#7C3AED] resize-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    disabled={saving === t.id || reply.trim() === (t.admin_reply ?? '')}
                    onClick={() => update(t, { admin_reply: reply.trim() || null, status: t.status === 'open' ? 'in_progress' : t.status })}
                    className="flex items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40">
                    {saving === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save reply
                  </button>
                  <select value={t.status} disabled={saving === t.id}
                    onChange={(e) => update(t, { status: e.target.value as TicketStatus })}
                    className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[12.5px] font-medium text-[#374151]">
                    {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => <option key={s} value={s}>{TICKET_STATUS[s].label}</option>)}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
