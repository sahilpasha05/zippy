'use client'

import { QRCodeSVG } from 'qrcode.react'
import { X } from 'lucide-react'
import { CITY } from '@/lib/city'
import { upiPayLink } from '@/lib/upi'

// A scannable UPI QR for the exact amount still due on an order. The customer
// scans it with any UPI app (PhonePe, Google Pay, Paytm ...) and the amount is
// already filled in, so nothing can be mistyped.
export default function CollectQrModal({ amount, orderId, customerName, onClose }: {
  amount: number
  orderId: string
  customerName?: string | null
  onClose: () => void
}) {
  const shortId = orderId.slice(0, 8).toUpperCase()
  const link = upiPayLink({ upiId: CITY.upiId, name: CITY.upiName, amount, note: `Zippy order ${shortId}` })

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151]">
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-[700] uppercase tracking-wide text-[#7C3AED]">Scan to pay</p>
        <p className="mt-1 text-[34px] font-[900] leading-none text-[#111827]" style={{ fontWeight: 900 }}>₹{amount.toFixed(2)}</p>
        <p className="mt-1.5 text-[12.5px] text-[#6B7280]">
          {customerName ? `${customerName} · ` : ''}order {shortId}
        </p>

        <div className="mx-auto mt-4 w-fit rounded-2xl border border-[#E5E7EB] bg-white p-3">
          <QRCodeSVG value={link} size={232} level="M" marginSize={1} />
        </div>

        <p className="mt-3 text-[12.5px] font-[700] text-[#111827]">{CITY.upiName}</p>
        <p className="text-[11.5px] text-[#6B7280]">{CITY.upiId}</p>
        <p className="mt-3 rounded-xl bg-[#FFFBEB] px-3 py-2 text-[11.5px] leading-relaxed text-[#92400E]">
          Ask the customer to scan with any UPI app. Choose <b>Online</b> when you deliver only after you see the payment success on their phone.
        </p>
      </div>
    </div>
  )
}
