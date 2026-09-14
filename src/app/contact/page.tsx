import Link from 'next/link'
import { ChevronRight, Mail, MessageCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import SiteFooter from '@/components/layout/SiteFooter'

export const metadata = { title: 'Contact Us — Zippy' }

const WHATSAPP_NUMBER = '8277802605'

const ROWS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'zippytarikere@gmail.com',
    href: 'mailto:zippytarikere@gmail.com',
    note: null,
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: `+91 ${WHATSAPP_NUMBER}`,
    href: `https://wa.me/91${WHATSAPP_NUMBER}`,
    note: 'WhatsApp calls and messages only — this number does not take regular calls or SMS.',
  },
]

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-[12.5px] text-[#6B7280] mb-6">
            <Link href="/" className="hover:text-[#16A34A]">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#111827]">Contact Us</span>
          </div>

          <h1 className="text-[28px] font-[800] text-[#111827] mb-2">Contact Us</h1>
          <p className="text-[14px] text-[#6B7280] mb-8">
            Have a question about an order? Reach us either way below and we&apos;ll get back to you.
          </p>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
            {ROWS.map(({ icon: Icon, label, value, href, note }) => (
              <div key={label} className="flex items-start gap-4 p-5">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-[#16A34A]" />
                </div>
                <div>
                  <p className="text-[12px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-0.5">{label}</p>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-[14.5px] font-[600] text-[#16A34A] hover:underline"
                  >
                    {value}
                  </a>
                  {note && <p className="text-[12.5px] text-[#6B7280] mt-1 leading-relaxed">{note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <SiteFooter />
      </div>
    </>
  )
}
