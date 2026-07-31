'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, Package, BarChart3, Zap, ChevronRight, Bell, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type PartnerInfo = { name: string; slug?: string } | null

function buildNav(slug: string) {
  return [
    { href: `/store/${slug}/orders`,    label: 'Orders',    icon: ShoppingBag },
    { href: `/store/${slug}/products`,  label: 'Products',  icon: Package },
    { href: `/store/${slug}/analytics`, label: 'Analytics', icon: BarChart3 },
  ]
}

export default function StorePartnerSidebar({ partner }: { partner?: PartnerInfo }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = partner?.name ?? 'My Store'
  const initial = displayName[0]?.toUpperCase() ?? 'S'
  const slug = partner?.slug ?? ''
  const NAV = slug ? buildNav(slug) : []

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#E5E7EB]">
        <div className="w-8 h-8 bg-[#16A34A] rounded-xl flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <div>
          <div className="text-[14px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Zippy</div>
          <div className="text-[10.5px] text-[#6B7280] font-medium">Store Partner Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all',
                active
                  ? 'bg-[#DCFCE7] text-[#15803D] font-[600]'
                  : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#374151]'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-[#16A34A]' : '')} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#16A34A]" />}
            </Link>
          )
        })}
      </nav>

      {/* Partner info */}
      <div className="px-3 pb-3 border-t border-[#E5E7EB] pt-3">
        <div className="flex items-center gap-3 px-3 py-3 bg-[#F8FAFC] rounded-xl">
          <div className="w-9 h-9 bg-[#16A34A] rounded-xl flex items-center justify-center text-white text-[13px] font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-[600] text-[#111827] truncate">{displayName}</div>
            <div className="text-[11px] text-[#9CA3AF]">Store Partner</div>
          </div>
          <Link href="/" className="text-[#9CA3AF] hover:text-[#EF4444] transition-colors ml-auto">
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-[#E5E7EB] h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#16A34A] rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="text-[14px] font-[800] text-[#111827]">{displayName}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative text-[#6B7280]">
            <Bell className="w-5 h-5" />
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-[#374151]">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-white h-full shadow-xl">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}
