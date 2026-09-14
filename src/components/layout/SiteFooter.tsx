import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function SiteFooter() {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] mt-16">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#16A34A] rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-[14px] font-[800] text-[#111827]">Zippy</span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[#6B7280]">
            <Link href="/privacy" className="hover:text-[#16A34A] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#16A34A] transition-colors">Terms &amp; Conditions</Link>
            <Link href="/refunds" className="hover:text-[#16A34A] transition-colors">Refunds &amp; Cancellations</Link>
            <Link href="/contact" className="hover:text-[#16A34A] transition-colors">Contact Us</Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-[#F3F4F6] text-[12px] text-[#9CA3AF] leading-relaxed">
          <p>© {new Date().getFullYear()} Zippy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
