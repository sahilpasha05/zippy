import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import SiteFooter from '@/components/layout/SiteFooter'

export const metadata = { title: 'Terms & Conditions — Zippy' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[17px] font-[700] text-[#111827] mb-2">{title}</h2>
      <div className="text-[14px] text-[#4B5563] leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-[12.5px] text-[#6B7280] mb-6">
            <Link href="/" className="hover:text-[#16A34A]">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#111827]">Terms &amp; Conditions</span>
          </div>

          <h1 className="text-[28px] font-[800] text-[#111827] mb-2">Terms &amp; Conditions</h1>
          <p className="text-[13px] text-[#9CA3AF] mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8">
            <Section title="Operator">
              <p>By placing an order through Zippy (this website and app), you agree to these Terms &amp; Conditions.</p>
            </Section>

            <Section title="Orders">
              <p>All orders placed through Zippy are subject to product/restaurant availability and delivery area coverage. We reserve the right to refuse or cancel any order at our discretion, including in cases of suspected fraud or error in pricing.</p>
            </Section>

            <Section title="Payments">
              <p>Payments for orders placed through Zippy are processed securely via <strong>Cashfree</strong>. See our <Link href="/refunds" className="text-[#16A34A] hover:underline">Refunds &amp; Cancellations</Link> policy for details on eligible refunds.</p>
            </Section>

            <Section title="Delivery">
              <p>Estimated delivery times shown on Zippy are estimates only and may vary due to traffic, weather, restaurant preparation time, or delivery partner availability.</p>
            </Section>

            <Section title="Cancellations & refunds">
              <p>Orders may be cancelled before a restaurant or store begins preparing them. Once preparation has started, cancellation may not be possible. Refunds for eligible cancellations or order issues are processed to the original payment method.</p>
            </Section>

            <Section title="Delivery partners">
              <p>Delivery partners on Zippy may share their live location with customers and the platform solely to enable order tracking. This location sharing is used only for the duration of an active delivery.</p>
            </Section>

            <Section title="Limitation of liability">
              <p>CloudByte is not liable for indirect or consequential losses arising from delays, unavailability of items, or third-party service disruptions beyond our reasonable control.</p>
            </Section>

            <Section title="Governing law">
              <p>These terms are governed by the laws of India.</p>
            </Section>

            <Section title="Contact">
              <p>For questions about these terms, see our <Link href="/contact" className="text-[#16A34A] hover:underline">Contact page</Link>.</p>
            </Section>
          </div>
        </div>
        <SiteFooter />
      </div>
    </>
  )
}
