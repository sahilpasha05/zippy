'use client'

import { useState } from 'react'
import { Tag, Copy, Check, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import ViewCartBar from '@/components/layout/ViewCartBar'
import SiteFooter from '@/components/layout/SiteFooter'

const OFFERS = [
  { id: '1', code: 'ZIPPY50', title: 'New User Special', description: '50% OFF on your first order, up to ₹100 discount', discount: '50% OFF', minOrder: 99, validTill: '2026-12-31', type: 'grocery', color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0', emoji: '🎉' },
  { id: '2', code: 'FRESH20', title: 'Fresh Vegetables Deal', description: '20% OFF on all fruits and vegetables', discount: '20% OFF', minOrder: 149, validTill: '2026-08-31', type: 'grocery', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', emoji: '🥦' },
  { id: '3', code: 'BINGE30', title: 'Restaurant Fiesta', description: '30% OFF on all restaurant orders above ₹299', discount: '30% OFF', minOrder: 299, validTill: '2026-08-15', type: 'restaurant', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', emoji: '🍽️' },
  { id: '4', code: 'FREE100', title: 'Free Delivery', description: 'Free delivery on all orders above ₹99', discount: 'FREE DELIVERY', minOrder: 99, validTill: '2026-09-30', type: 'all', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', emoji: '🚴' },
  { id: '5', code: 'WEEKEND40', title: 'Weekend Bonanza', description: '40% OFF every Saturday and Sunday', discount: '40% OFF', minOrder: 199, validTill: '2026-12-31', type: 'all', color: '#DB2777', bg: '#FDF2F8', border: '#F9A8D4', emoji: '🎊' },
  { id: '6', code: 'DAIRY15', title: 'Dairy Delight', description: '15% OFF on all dairy products', discount: '15% OFF', minOrder: 79, validTill: '2026-08-20', type: 'grocery', color: '#0369A1', bg: '#EFF6FF', border: '#BFDBFE', emoji: '🥛' },
]

function OfferCard({ offer }: { offer: typeof OFFERS[0] }) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(offer.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden hover:shadow-zippy transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: offer.border }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: offer.bg }}>
        <div className="flex items-start justify-between gap-4">
          <div className="text-4xl">{offer.emoji}</div>
          <div className="px-3 py-1.5 rounded-xl text-[12.5px] font-[800] text-white shadow-sm" style={{ backgroundColor: offer.color, fontWeight: 800 }}>
            {offer.discount}
          </div>
        </div>
        <h3 className="text-[16px] font-[700] text-[#111827] mt-4 mb-1" style={{ fontWeight: 700 }}>{offer.title}</h3>
        <p className="text-[13px] text-[#6B7280]">{offer.description}</p>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: offer.border }}>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-3.5 h-3.5" style={{ color: offer.color }} />
          <span className="text-[12px] text-[#6B7280]">Min order ₹{offer.minOrder}</span>
          <span className="mx-1 text-[#E5E7EB]">•</span>
          <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="text-[12px] text-[#9CA3AF]">Valid till {new Date(offer.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>

        <button
          onClick={copyCode}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-dashed transition-all',
            copied ? 'border-[#16A34A] bg-[#DCFCE7]' : 'hover:border-current'
          )}
          style={{ borderColor: copied ? undefined : offer.color, backgroundColor: copied ? undefined : `${offer.bg}` }}
        >
          <span className="font-mono text-[15px] font-[800] tracking-wider" style={{ color: offer.color, fontWeight: 800 }}>
            {offer.code}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: copied ? '#16A34A' : offer.color }}>
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function OffersPage() {
  const [filter, setFilter] = useState<'all' | 'grocery' | 'restaurant'>('all')

  const filtered = OFFERS.filter((o) => filter === 'all' || o.type === filter || o.type === 'all')

  return (
    <>
      <Navbar />
      <CartSidebar />
      <ViewCartBar />
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Hero */}
        <div className="bg-gradient-to-r from-[#14532D] to-[#16A34A] text-white py-12 px-6 lg:px-10">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-center gap-2 text-[12.5px] text-white/60 mb-4">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">Offers</span>
            </div>
            <h1 className="text-[36px] font-[900] tracking-tight mb-2" style={{ fontWeight: 900 }}>Best deals for you 🎁</h1>
            <p className="text-[16px] text-white/75">Exclusive offers on groceries and restaurant orders</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-[#E5E7EB]">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-4 flex gap-2">
            {(['all', 'grocery', 'restaurant'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('px-4 py-2 rounded-xl text-[13px] font-medium transition-all capitalize', filter === f ? 'bg-[#16A34A] text-white shadow-[0_2px_8px_rgba(22,163,74,0.3)]' : 'bg-[#F8FAFC] text-[#374151] border border-[#E5E7EB] hover:border-[#D1D5DB]')}
              >
                {f === 'all' ? 'All Offers' : f === 'grocery' ? '🛒 Grocery' : '🍽️ Restaurant'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          <p className="text-[13px] text-[#6B7280] mb-6">{filtered.length} offers available</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
