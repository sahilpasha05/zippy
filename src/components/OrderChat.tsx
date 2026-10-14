'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = { id: string; sender_role: 'customer' | 'rider' | 'admin'; body: string; created_at: string }
type Props = {
  orderId: string
  // Riders have no login: the delivery panel passes its own slug as their key.
  riderSlug?: string
  // The side this panel speaks for, used to label and align messages.
  viewer: 'customer' | 'rider' | 'admin'
  className?: string
  onUnread?: (n: number) => void
}

const LABEL: Record<Message['sender_role'], string> = { customer: 'Customer', rider: 'Rider', admin: 'Zippy support' }
const POLL_MS = 4000

// Chat for one order. Messages are fetched through the server (the table is not
// readable from the browser) and refreshed every few seconds while visible.
export default function OrderChat({ orderId, riderSlug, viewer, className, onUnread }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [canPost, setCanPost] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const seenKey = `zippy-chat-seen-${orderId}-${viewer}`

  const url = `/api/orders/${orderId}/messages${riderSlug ? `?rider=${encodeURIComponent(riderSlug)}` : ''}`

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json() as { canPost: boolean; messages: Message[] }
      setMessages(json.messages)
      setCanPost(json.canPost)
    } finally {
      setLoaded(true)
    }
  }, [url])

  useEffect(() => {
    void load()
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load() }, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  // Keep the newest message in view and remember how many have been read.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    try { localStorage.setItem(seenKey, String(messages.length)) } catch { /* storage unavailable */ }
    onUnread?.(0)
  }, [messages.length, seenKey, onUnread])

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setError('')
    try {
      const res = await fetch(url.split('?')[0], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, rider: riderSlug }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not send')
      setMessages((prev) => [...prev, json.message as Message])
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn('flex flex-col bg-white', className)}>
      <div className="flex-1 min-h-[140px] max-h-64 overflow-y-auto px-3 py-3 space-y-2 bg-[#F8FAFC] rounded-xl">
        {!loaded ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-[#9CA3AF] animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center">
            <MessageCircle className="w-6 h-6 text-[#D1D5DB]" />
            <p className="text-[12.5px] text-[#9CA3AF]">{canPost ? 'No messages yet — say hello.' : 'No messages.'}</p>
          </div>
        ) : messages.map((m) => {
          const mine = m.sender_role === viewer
          return (
            <div key={m.id} className={cn('flex flex-col max-w-[85%]', mine ? 'ml-auto items-end' : 'items-start')}>
              <span className="text-[10px] text-[#9CA3AF] mb-0.5">{mine ? 'You' : LABEL[m.sender_role]} · {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
              <div className={cn('px-3 py-2 rounded-2xl text-[13px] leading-snug break-words', mine ? 'bg-[#16A34A] text-white rounded-br-md' : 'bg-white border border-[#E5E7EB] text-[#111827] rounded-bl-md')}>
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {error && <p className="text-[11.5px] text-[#DC2626] mt-1.5">{error}</p>}

      {canPost ? (
        <form onSubmit={(e) => { e.preventDefault(); void send() }} className="flex items-center gap-2 mt-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Type a message…"
            className="flex-1 min-w-0 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] outline-none focus:border-[#16A34A]" />
          <button type="submit" disabled={sending || !text.trim()}
            className="w-10 h-10 shrink-0 flex items-center justify-center bg-[#16A34A] text-white rounded-xl hover:bg-[#15803D] disabled:opacity-50 transition-all" aria-label="Send">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : loaded && (
        <p className="text-[11.5px] text-[#9CA3AF] mt-2">Chat is open while a rider is assigned and the order is on its way.</p>
      )}
    </div>
  )
}
