'use client'

import { useEffect, useState } from 'react'
import { Loader2, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TICKET_STATUS, ticketCode, topicLabel, type Ticket } from '@/lib/supportTickets'
import TimeAgo from '@/components/TimeAgo'

const supabase = createClient()

// The signed-in customer's own tickets (row-level security limits the query to them).
export default function TicketList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (!cancelled) setTickets((data as Ticket[]) ?? []) })
    return () => { cancelled = true }
  }, [refreshKey])

  if (tickets === null) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" /></div>
  }
  if (tickets.length === 0) {
    return (
      <div className="text-center py-10">
        <MessageSquare className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
        <p className="text-[13.5px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>No tickets yet</p>
        <p className="text-[12.5px] text-[#9CA3AF]">Tickets you raise will show up here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => {
        const st = TICKET_STATUS[t.status]
        return (
          <div key={t.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[12px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{ticketCode(t.ticket_no)}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ color: st.color, background: st.bg }}>{st.label}</span>
            </div>
            <p className="text-[12.5px] font-semibold text-[#374151]">{topicLabel(t.category)}</p>
            <p className="text-[12.5px] text-[#6B7280] mt-0.5 whitespace-pre-wrap break-words">{t.message}</p>
            {t.admin_reply && (
              <div className="mt-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-2">
                <p className="text-[11px] font-semibold text-[#16A34A] mb-0.5">Reply from Zippy</p>
                <p className="text-[12.5px] text-[#166534] whitespace-pre-wrap break-words">{t.admin_reply}</p>
              </div>
            )}
            <p className="text-[11px] text-[#9CA3AF] mt-2"><TimeAgo date={t.created_at} /></p>
          </div>
        )
      })}
    </div>
  )
}
