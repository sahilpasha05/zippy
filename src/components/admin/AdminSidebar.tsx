'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Star, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Store, Users, ShoppingBag, BarChart3, Settings, Zap, ChevronRight, Bell, LogOut, Menu, X, Shield, Package, Bike, PlusCircle, Wallet, Warehouse, ShoppingBasket, ImageIcon, PiggyBank, HandCoins } from 'lucide-react'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NAV = [
  { href: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/banners',      label: 'Home Banners', icon: ImageIcon },
  { href: '/admin/restaurants',  label: 'Restaurants',  icon: Store },
  { href: '/admin/products',     label: 'Products',     icon: Package },
  { href: '/admin/quick-add',    label: 'Quick Add',    icon: PlusCircle },
  { href: '/admin/orders',       label: 'All Orders',   icon: ShoppingBag },
  { href: '/admin/ledger',       label: 'Ledger',       icon: Wallet },
  { href: '/admin/savings',      label: 'Savings & Expenses', icon: PiggyBank },
  { href: '/admin/delivery',     label: 'Delivery Partners', icon: Bike },
  { href: '/admin/collections',  label: 'Delivery Collections', icon: HandCoins },
  { href: '/admin/grocery-partners', label: 'Grocery Partners', icon: Warehouse },
  { href: '/admin/store-partners', label: 'Store Partners', icon: ShoppingBasket },
  { href: '/admin/reviews',      label: 'Reviews',      icon: Star },
  { href: '/admin/users',        label: 'Users',        icon: Users },
  { href: '/admin/analytics',    label: 'Analytics',    icon: BarChart3 },
  { href: '/admin/settings',     label: 'Settings',     icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  // Remembered so it doesn't spring open again on every page change.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (localStorage.getItem('zippy-admin-sidebar') === 'collapsed') setCollapsed(true)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('zippy-admin-sidebar', next ? 'collapsed' : 'open')
      return next
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const SidebarContent = ({ mini = false }: { mini?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center gap-3 border-b border-[#E5E7EB] py-5', mini ? 'px-3 justify-center' : 'px-6')}>
        <div className="w-8 h-8 bg-[#7C3AED] rounded-xl flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!mini && (
          <div>
            <div className="text-[14px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Zippy</div>
            <div className="text-[10.5px] text-[#6B7280] font-medium">Admin Panel</div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={mini ? label : undefined}
              className={cn(
                'flex items-center gap-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all',
                mini ? 'px-0 justify-center' : 'px-3',
                active
                  ? 'bg-[#F5F3FF] text-[#6D28D9] font-[600]'
                  : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#374151]'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-[#7C3AED]' : '')} strokeWidth={active ? 2.5 : 2} />
              {!mini && label}
              {!mini && active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#7C3AED]" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-3 border-t border-[#E5E7EB] pt-3">
        <div className={cn('flex items-center gap-3 py-3 bg-[#F8FAFC] rounded-xl', mini ? 'px-0 justify-center' : 'px-3')}>
          {!mini && <div className="w-9 h-9 bg-[#7C3AED] rounded-xl flex items-center justify-center text-white text-[13px] font-bold shrink-0">A</div>}
          {!mini && (
            <div className="min-w-0">
              <div className="text-[12.5px] font-[600] text-[#111827] truncate">Admin</div>
              <div className="text-[11px] text-[#9CA3AF] truncate">{email || '...'}</div>
            </div>
          )}
          <button onClick={handleLogout} title="Sign out" className={cn('text-[#9CA3AF] hover:text-[#EF4444] transition-colors', !mini && 'ml-auto')}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className={cn(
        'hidden lg:flex flex-col shrink-0 bg-white border-r border-[#E5E7EB] h-screen sticky top-0 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent mini={collapsed} />
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center text-[#6B7280] hover:text-[#7C3AED] hover:border-[#DDD6FE] transition-all z-10"
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
      </aside>

      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[14px] font-[800] text-[#111827]">Admin</span>
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
