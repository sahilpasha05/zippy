'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LifeBuoy, X, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { HELP_TOPICS, ticketCode, type HelpTopic, type Ticket as TicketRow } from '@/lib/supportTickets'
import PhoneLoginModal from '@/components/PhoneLoginModal'
import TicketList from '@/components/TicketList'
import { cn } from '@/lib/utils'

const supabase = createClient()

type View = 'home' | 'answer' | 'form' | 'done' | 'mine'
type RecentOrder = { id: string; created_at: string; total: number; status: string }

// Staff and partner screens have their own tools; the help button is for customers.
const HIDDEN_ON = ['/admin', '/delivery', '/restaurant/']
const BUBBLE_TEXT = 'Need help? Click here'

// Small floating "Need help?" button on every customer screen. It opens a sheet with quick
// answers (refund, late order, taste...) and lets a signed-in customer raise a ticket that
// then shows in their account and in Admin > Support Tickets.
export default function HelpButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('home')
  const [topic, setTopic] = useState<HelpTopic | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orderId, setOrderId] = useState('')
  const [message, setMessage] = useState('')
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<TicketRow | null>(null)
  const [listKey, setListKey] = useState(0)

  // Who is signed in, and prefill the form from their profile.
  const loadUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    setUserId(user?.id ?? null)
    if (!user) return
    const [{ data: profile }, { data: recent }] = await Promise.all([
      supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
      supabase.from('orders').select('id, created_at, total, status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])
    setName((n) => n || profile?.full_name || '')
    setPhone((p) => p || (profile?.phone ?? user.phone ?? '').replace(/\D/g, '').slice(-10))
    setOrders((recent as RecentOrder[]) ?? [])
  }, [])

  useEffect(() => { if (open) void loadUser() }, [open, loadUser])

  // A small "Need help? Click here" bubble above the icon that types itself out, stays a few
  // seconds, then goes away. Starts again on each page load, never while the sheet is open.
  const [typed, setTyped] = useState('')
  const [bubbleGone, setBubbleGone] = useState(false)
  useEffect(() => {
    if (bubbleGone) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let i = 0
    let typing: ReturnType<typeof setInterval> | undefined
    let hide: ReturnType<typeof setTimeout> | undefined
    const start = setTimeout(() => {
      if (reduce) { setTyped(BUBBLE_TEXT) } else {
        typing = setInterval(() => {
          i += 1
          setTyped(BUBBLE_TEXT.slice(0, i))
          if (i >= BUBBLE_TEXT.length) clearInterval(typing)
        }, 55)
      }
      hide = setTimeout(() => setBubbleGone(true), 1200 + BUBBLE_TEXT.length * 55 + 7000)
    }, 1500)
    return () => { clearTimeout(start); clearTimeout(hide); clearInterval(typing) }
  }, [bubbleGone])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (HIDDEN_ON.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p))) return null

  function close() {
    setOpen(false)
    // reopening after a finished ticket starts fresh
    if (view === 'done') { setView('home'); setTopic(null); setMessage(''); setOrderId(''); setCreated(null) }
  }

  function pickTopic(t: HelpTopic) { setTopic(t); setView('answer'); setError('') }

  function startForm() {
    setError('')
    if (!userId) { setShowLogin(true); return }
    setView('form')
  }

  async function submit() {
    if (submitting || !topic) return
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (name.trim().length < 2) return setError('Please enter your name.')
    if (!/^[6-9]\d{9}$/.test(digits)) return setError('Please enter a valid 10-digit mobile number.')
    if (message.trim().length < 10) return setError('Please describe the problem in a few words.')
    setSubmitting(true); setError('')
    const { data, error: err } = await supabase
      .from('support_tickets')
      .insert({
        name: name.trim(), phone: digits, category: topic.id, message: message.trim(),
        order_id: orderId || null,
      })
      .select('*')
      .single()
    setSubmitting(false)
    if (err || !data) { setError('Could not raise the ticket. Please try again.'); return }
    setCreated(data as TicketRow)
    setListKey((k) => k + 1)
    setView('done')
  }

  const back = view === 'answer' ? () => setView('home') : view === 'form' ? () => setView('answer') : view === 'mine' ? () => setView('home') : null

  return (
    <>
      {!open && !bubbleGone && typed && (
        <button
          type="button"
          onClick={() => { setBubbleGone(true); setOpen(true) }}
          aria-hidden
          tabIndex={-1}
          className="fixed right-3 bottom-[148px] lg:bottom-[76px] lg:right-5 z-[60] rounded-2xl rounded-br-md bg-[#111827] px-3 py-2 text-left text-[12.5px] font-[600] leading-tight text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
          style={{ fontWeight: 600 }}
        >
          {typed}
          <span className="ml-0.5 inline-block h-[12px] w-[1.5px] translate-y-[2px] animate-pulse bg-white/80" />
        </button>
      )}
      <button
        type="button"
        onClick={() => { setBubbleGone(true); setOpen(true) }}
        aria-label="Facing an issue? Get help"
        className="group fixed right-3 bottom-[96px] lg:bottom-6 lg:right-5 z-[60] flex h-11 items-center gap-1.5 rounded-full bg-white border border-[#E5E7EB] pl-2.5 pr-2.5 lg:pr-3.5 shadow-[0_4px_14px_rgba(0,0,0,0.16)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.2)] active:scale-95 transition-all"
      >
        <LifeBuoy className="h-5 w-5 text-[#16A34A]" strokeWidth={2.2} />
        <span className="hidden lg:inline text-[12.5px] font-[700] text-[#111827]" style={{ fontWeight: 700 }}>Need help?</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div role="dialog" aria-label="Help" className="relative z-10 flex max-h-[88vh] w-full sm:max-w-[420px] flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-4 py-3.5">
              {back ? (
                <button onClick={back} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
                  <ChevronLeft className="h-4 w-4 text-[#374151]" />
                </button>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DCFCE7]"><LifeBuoy className="h-4 w-4 text-[#16A34A]" /></div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-[800] text-[#111827] leading-tight" style={{ fontWeight: 800 }}>
                  {view === 'mine' ? 'My tickets' : view === 'form' ? 'Raise a ticket' : view === 'done' ? 'Ticket raised' : 'Facing an issue?'}
                </h2>
                {view === 'home' && <p className="text-[12px] text-[#9CA3AF]">We are here. Pick what went wrong.</p>}
              </div>
              <button onClick={close} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
                <X className="h-4 w-4 text-[#6B7280]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {view === 'home' && (
                <div className="space-y-2">
                  {HELP_TOPICS.map((t) => (
                    <button key={t.id} onClick={() => pickTopic(t)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-[#E5E7EB] px-3.5 py-3 text-left hover:border-[#BBF7D0] hover:bg-[#F0FDF4] transition-colors">
                      <span className="text-[18px]">{t.emoji}</span>
                      <span className="flex-1 text-[13.5px] font-medium text-[#111827]">{t.label}</span>
                      <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                    </button>
                  ))}
                  <button onClick={() => (userId ? setView('mine') : setShowLogin(true))}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F3F4F6] py-3 text-[13px] font-[700] text-[#374151] hover:bg-[#E5E7EB]" style={{ fontWeight: 700 }}>
                    <Ticket className="h-4 w-4" /> My tickets
                  </button>
                </div>
              )}

              {view === 'answer' && topic && (
                <div>
                  <p className="text-[14px] font-[800] text-[#111827] mb-2" style={{ fontWeight: 800 }}>{topic.emoji} {topic.label}</p>
                  <p className="rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 text-[13.5px] leading-relaxed text-[#374151]">{topic.answer}</p>
                  <p className="mt-4 text-[12.5px] text-[#6B7280]">Did that solve it? If not, our team can look into it personally.</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">Yes, thanks</button>
                    <button onClick={startForm} className="flex-1 rounded-xl bg-[#16A34A] py-2.5 text-[13px] font-[700] text-white hover:bg-[#15803D]" style={{ fontWeight: 700 }}>Raise a ticket</button>
                  </div>
                </div>
              )}

              {view === 'form' && topic && (
                <div className="space-y-3">
                  <p className="rounded-xl bg-[#F0FDF4] px-3 py-2 text-[12.5px] text-[#166534]">{topic.emoji} {topic.label}</p>
                  <Field label="Your name">
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputCls} placeholder="Full name" />
                  </Field>
                  <Field label="Mobile number">
                    <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" className={inputCls} placeholder="10-digit number" />
                  </Field>
                  {orders.length > 0 && (
                    <Field label={topic.needsOrder ? 'Which order?' : 'Related order (optional)'}>
                      <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputCls}>
                        <option value="">Not about a specific order</option>
                        {orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            #{o.id.slice(0, 6).toUpperCase()} · ₹{o.total} · {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label="What went wrong?">
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1000} className={cn(inputCls, 'resize-none')} placeholder="Tell us the problem so we can fix it fast" />
                  </Field>
                  {error && <p className="text-[12.5px] text-[#DC2626]">{error}</p>}
                  <button onClick={submit} disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-[14px] font-[700] text-white hover:bg-[#15803D] disabled:opacity-60" style={{ fontWeight: 700 }}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit ticket
                  </button>
                </div>
              )}

              {view === 'done' && created && (
                <div className="py-4 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-[#16A34A]" />
                  <p className="mt-3 text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Ticket {ticketCode(created.ticket_no)} raised</p>
                  <p className="mt-1.5 text-[13.5px] text-[#6B7280]">Our team will get back to you within 24 hours.</p>
                  <p className="mt-1 text-[12.5px] text-[#9CA3AF]">You can follow it in My tickets.</p>
                  <div className="mt-5 flex gap-2">
                    <button onClick={() => setView('mine')} className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">My tickets</button>
                    <button onClick={close} className="flex-1 rounded-xl bg-[#16A34A] py-2.5 text-[13px] font-[700] text-white hover:bg-[#15803D]" style={{ fontWeight: 700 }}>Done</button>
                  </div>
                </div>
              )}

              {view === 'mine' && (
                <div>
                  <TicketList refreshKey={listKey} />
                  <Link href="/tickets" onClick={() => setOpen(false)} className="mt-3 block text-center text-[12.5px] font-semibold text-[#16A34A] hover:underline">Open full page</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <PhoneLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => { setShowLogin(false); void loadUser().then(() => setView(topic ? 'form' : 'home')) }}
        />
      )}
    </>
  )
}

const inputCls = 'w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[13.5px] text-[#111827] outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[#6B7280]">{label}</span>
      {children}
    </label>
  )
}
