'use client'

import AdminSidebar from '@/components/admin/AdminSidebar'
import { StockPanel } from '@/components/admin/QuickStockEditor'

// Quick edit for the Drinks category (cold drinks, energy drinks): change a price, or mark an
// item out of stock so it disappears from the home page and the Drinks shelf, and bring it back.
export default function AdminColdDrinksPage() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Cold Drinks</h1>
          <p className="text-[12.5px] text-[#9CA3AF]">Edit prices and mark drinks out of stock. Changes show to customers straight away.</p>
        </div>
        <div className="p-6">
          <div className="max-w-2xl bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-sm">
            <StockPanel categorySlug="drinks" />
          </div>
        </div>
      </main>
    </div>
  )
}
