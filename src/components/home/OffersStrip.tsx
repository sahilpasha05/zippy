import { Tag, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const offers = [
  { code: 'ZIPPY50', text: '50% OFF up to ₹100 on first order', color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
  { code: 'FRESH20', text: '20% OFF on all vegetables & fruits', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  { code: 'BINGE30', text: '30% OFF on restaurant orders above ₹299', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { code: 'FREE100', text: 'FREE delivery on orders above ₹99', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
]

export default function OffersStrip() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[22px] font-[800] text-[#111827] tracking-tight" style={{ fontWeight: 800 }}>
          Best offers for you
        </h2>
        <Link href="/offers" className="text-[13.5px] font-[600] text-[#16A34A] hover:text-[#15803D] transition-colors" style={{ fontWeight: 600 }}>
          All offers →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {offers.map(({ code, text, color, bg, border }) => (
          <div
            key={code}
            className="group flex items-start gap-3 p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-zippy cursor-pointer"
            style={{ backgroundColor: bg, borderColor: border }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/70">
              <Tag className="w-4 h-4" style={{ color }} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-[700] mb-1 font-mono tracking-wide" style={{ color, fontWeight: 700 }}>{code}</div>
              <div className="text-[12px] text-[#374151] leading-tight">{text}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
