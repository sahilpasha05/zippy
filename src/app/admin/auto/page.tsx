'use client'

import AdminSidebar from '@/components/admin/AdminSidebar'
import AutoBookingsSection from '@/components/admin/AutoBookingsSection'
import AutoPricingSection from '@/components/admin/AutoPricingSection'

// Zippy Auto: ride bookings, auto partners (drivers) and per-km pricing.
export default function AdminAutoPage() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <AutoBookingsSection />
        <AutoPricingSection />
      </main>
    </div>
  )
}
