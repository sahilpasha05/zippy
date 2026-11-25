'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import SiteFooter from '@/components/layout/SiteFooter'
import TicketList from '@/components/TicketList'

const supabase = createClient()

export default function TicketsPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user))
  }, [])

  return (
    <>
      <Navbar />
      <CartSidebar />
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="mx-auto max-w-[720px] px-4 py-8">
          <nav className="mb-4 flex items-center gap-2 text-[13px] text-[#6B7280]">
            <Link href="/" className="hover:text-[#16A34A]">Home</Link> <span>›</span> <span>My tickets</span>
          </nav>
          <h1 className="text-[22px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>My support tickets</h1>
          <p className="mb-5 text-[13px] text-[#9CA3AF]">Use the help button at the bottom of any page to raise a new ticket. We reply within 24 hours.</p>
          {signedIn === null && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" /></div>}
          {signedIn === false && (
            <p className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-[13.5px] text-[#6B7280]">
              Please sign in from the top of the page to see your tickets.
            </p>
          )}
          {signedIn && <TicketList />}
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
