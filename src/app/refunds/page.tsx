import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import SiteFooter from '@/components/layout/SiteFooter'

export const metadata = { title: 'Refunds & Cancellations — Zippy' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[17px] font-[700] text-[#111827] mb-2">{title}</h2>
      <div className="text-[14px] text-[#4B5563] leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

export default function RefundsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-[12.5px] text-[#6B7280] mb-6">
            <Link href="/" className="hover:text-[#16A34A]">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#111827]">Refunds &amp; Cancellations</span>
          </div>

          <h1 className="text-[28px] font-[800] text-[#111827] mb-2">Refunds &amp; Cancellations</h1>
          <p className="text-[13px] text-[#9CA3AF] mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8">
            <Section title="Order cancellations">
              <p>You can cancel an order free of charge before the restaurant or store begins preparing it. Once preparation has started, the order can no longer be cancelled, since ingredients/items have already been committed.</p>
              <p>To cancel an eligible order, contact us via the <Link href="/contact" className="text-[#16A34A] hover:underline">Contact page</Link> with your Order ID as soon as possible.</p>
            </Section>

            <Section title="Refund eligibility">
              <p>You&apos;re eligible for a full refund if:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>An order is cancelled before preparation begins.</li>
                <li>An order is not delivered due to an error on our end (e.g. no delivery partner available, restaurant/store closed unexpectedly).</li>
                <li>An item arrives damaged, spoiled, or significantly different from what was ordered.</li>
                <li>A payment was deducted but the order failed to place on our system.</li>
              </ul>
              <p>Refunds are not offered for change-of-mind cancellations after preparation has started, or for delays caused by factors outside our control (traffic, weather, incorrect address provided by the customer).</p>
            </Section>

            <Section title="How refunds are processed">
              <p>Approved refunds are issued to the original payment method used at checkout, via our payment processor <strong>Cashfree</strong>. Cash on Delivery orders that are cancelled before dispatch simply aren&apos;t charged — there&apos;s nothing to refund.</p>
              <p>Refunds typically reflect in your account within 5-7 business days, depending on your bank or payment provider.</p>
            </Section>

            <Section title="Requesting a refund">
              <p>To request a refund, reach out via the <Link href="/contact" className="text-[#16A34A] hover:underline">Contact page</Link> with your Order ID and the reason for the request. We aim to respond within 24-48 hours.</p>
            </Section>
          </div>
        </div>
        <SiteFooter />
      </div>
    </>
  )
}
