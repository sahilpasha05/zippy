'use client'

import { Bike } from 'lucide-react'

export type RiderCollectionSummary = {
  name: string
  phone: string | null
  collectedAmount: number
  collectedCount: number
  onlineAmount: number
  onlineCount: number
  pendingAmount: number
  pendingCount: number
}

// One rider in Delivery Collections. On a phone the name sits on top and the three
// amounts (cash / online / pending) share a line underneath; from sm up it is a
// single row, so nothing can overlap on a narrow screen.
export default function RiderCollectionRow({ r, onClick }: { r: RiderCollectionSummary; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex flex-col gap-3 px-4 py-4 text-left transition-all hover:bg-[#F8FAFC] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center shrink-0">
          <Bike className="w-4.5 h-4.5 text-[#7C3AED]" />
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-[700] text-[#111827] truncate">{r.name}</p>
          <p className="text-[11.5px] text-[#9CA3AF] truncate">{r.phone ?? 'No phone on file'}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#F8FAFC] px-3 py-2 sm:flex sm:shrink-0 sm:items-center sm:gap-6 sm:bg-transparent sm:p-0">
        <div className="sm:text-right">
          <p className="text-[13px] font-[700] text-[#16A34A]">₹{r.collectedAmount.toLocaleString()}</p>
          <p className="text-[10.5px] text-[#9CA3AF]">{r.collectedCount} cash</p>
        </div>
        <div className="sm:text-right">
          <p className="text-[13px] font-[700] text-[#1D4ED8]">₹{r.onlineAmount.toLocaleString()}</p>
          <p className="text-[10.5px] text-[#9CA3AF]">{r.onlineCount} online</p>
        </div>
        <div className="sm:min-w-[80px] sm:text-right">
          <p className="text-[13px] font-[700]" style={{ color: r.pendingAmount > 0 ? '#D97706' : '#9CA3AF' }}>₹{r.pendingAmount.toLocaleString()}</p>
          <p className="text-[10.5px] text-[#9CA3AF]">{r.pendingCount} pending</p>
        </div>
      </div>
    </button>
  )
}
