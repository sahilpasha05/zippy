import Link from 'next/link'
import { ChevronRight, Mail, MapPin, FileText, Building2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import SiteFooter from '@/components/layout/SiteFooter'

export const metadata = { title: 'Contact Us — Zippy' }

const ROWS = [
  { icon: Building2, label: 'Business Name', value: '[Add your registered business name here]', placeholder: true },
  { icon: FileText,  label: 'GST Number',    value: '[Add your GSTIN here]', placeholder: true },
  { icon: MapPin,    label: 'Business Address', value: '[Add your registered business address here]', placeholder: true },
  { icon: Mail,      label: 'Support Email', value: 'support@zippy.app', href: 'mailto:support@zippy.app' },
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
          <p className="text-[14px] text-[#6B7280] mb-8">Here&apos;s how to reach us.</p>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
            {ROWS.map(({ icon: Icon, label, value, href, placeholder }) => (
              <div key={label} className="flex items-start gap-4 p-5">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-[#16A34A]" />
                </div>
                <div>
                  <p className="text-[12px] font-[600] text-[#9CA3AF] uppercase tracking-wide mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-[14.5px] font-[600] text-[#16A34A] hover:underline">{value}</a>
                  ) : (
                    <p className={placeholder ? 'text-[14.5px] font-[500] text-[#D97706] italic' : 'text-[14.5px] font-[600] text-[#111827]'}>{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-[#9CA3AF] mt-4">
            Fields in orange are placeholders — update them in <code className="font-mono">src/app/contact/page.tsx</code> with your real GST number and registered business address before going live.
          </p>
        </div>
        <SiteFooter />
      </div>
    </>
  )
}
