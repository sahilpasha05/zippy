'use client'

import { useState } from 'react'
import { Bell, Send } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function send() {
    if (!window.confirm(phone.trim() ? `Send this to ${phone.trim()} only?` : 'Send this to ALL customers with the app?')) return
    setBusy(true)
    setResult(null)
    const res = await fetch('/api/admin/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, phone }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setResult({ ok: false, text: j.error ?? 'Could not send.' }); return }
    setResult({ ok: true, text: j.total === 0 ? j.note : `Sent to ${j.sent} of ${j.total} phone${j.total === 1 ? '' : 's'}.` })
    if (j.sent > 0) { setTitle(''); setMessage('') }
  }

  const input = 'mt-1 w-full px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13.5px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30'

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Notifications</h1>
          <p className="text-[12.5px] text-[#9CA3AF]">Send an offer or announcement to customers&apos; phones.</p>
        </div>
        <div className="p-6 max-w-xl space-y-4">
          {result && (
            <div className={`px-4 py-2.5 rounded-xl text-[13px] ${result.ok ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{result.text}</div>
          )}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
            <p className="flex items-center gap-2 text-[14px] font-[700] text-[#111827]"><Bell className="w-4 h-4 text-[#7C3AED]" /> New notification</p>
            <label className="block text-[11.5px] font-[600] text-[#6B7280]">Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Flat ₹50 off today" className={input} /></label>
            <label className="block text-[11.5px] font-[600] text-[#6B7280]">Message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={240} rows={3} placeholder="Use code ZIPPY50 on orders above ₹249." className={input} /></label>
            <label className="block text-[11.5px] font-[600] text-[#6B7280]">Send to one customer (optional)
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="10-digit phone — leave empty to send to everyone" className={input} /></label>
            <button onClick={send} disabled={busy || !title.trim() || !message.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#7C3AED] text-white text-[13px] font-[600] hover:bg-[#6D28D9] disabled:opacity-50">
              <Send className="w-4 h-4" /> {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
          <p className="text-[12px] text-[#9CA3AF]">Only customers who have logged in and allowed notifications on the app will receive it.</p>
        </div>
      </main>
    </div>
  )
}
