import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import SiteFooter from '@/components/layout/SiteFooter'

export const metadata = { title: 'Privacy Policy — Zippy' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[17px] font-[700] text-[#111827] mb-2">{title}</h2>
      <div className="text-[14px] text-[#4B5563] leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-[12.5px] text-[#6B7280] mb-6">
            <Link href="/" className="hover:text-[#16A34A]">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#111827]">Privacy Policy</span>
          </div>

          <h1 className="text-[28px] font-[800] text-[#111827] mb-2">Privacy Policy</h1>
          <p className="text-[13px] text-[#9CA3AF] mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8">
            <Section title="Who operates this website">
              <p>This website is operated by <strong>CloudByte</strong> under the brand name <strong>Zippy</strong>. Any reference to &quot;Zippy&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot; in this policy refers to CloudByte.</p>
            </Section>

            <Section title="Information we collect">
              <p>When you use Zippy, we may collect: your name, phone number, and email address; delivery addresses and, where you choose to share it, your live device location; order and payment history; and technical information such as device type and IP address.</p>
            </Section>

            <Section title="How we use your information">
              <p>We use your information to process and deliver your orders, provide live order tracking, communicate order updates, improve our service, and comply with legal obligations.</p>
            </Section>

            <Section title="Location data">
              <p>If you choose to share your current location at checkout, or if a delivery partner enables live location sharing, that location data is used solely to enable accurate delivery and real-time order tracking on a map. It is not sold or used for advertising.</p>
            </Section>

            <Section title="Third-party services">
              <p>We use trusted third-party providers to operate Zippy, including cloud database and hosting infrastructure, mapping services for live delivery tracking, and payment processing partners. These providers only receive the data necessary to perform their function.</p>
            </Section>

            <Section title="Data retention">
              <p>We retain order and account data for as long as necessary to provide our services and meet legal, accounting, or reporting requirements.</p>
            </Section>

            <Section title="Your rights">
              <p>You may request access to, correction of, or deletion of your personal data by contacting us using the details on our <Link href="/contact" className="text-[#16A34A] hover:underline">Contact page</Link>.</p>
            </Section>

            <Section title="Contact us">
              <p>Questions about this Privacy Policy can be sent to <a href="mailto:support@zippy.app" className="text-[#16A34A] hover:underline">support@zippy.app</a>, or see our <Link href="/contact" className="text-[#16A34A] hover:underline">Contact page</Link> for full business details.</p>
            </Section>
          </div>
        </div>
        <SiteFooter />
      </div>
    </>
  )
}
