'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBasket, LayoutGrid, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'

// Customer pages that get the bottom bar (mobile only). The admin, rider,
// restaurant-owner and checkout screens are left alone.
export function showsBottomNav(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/orders' ||
    pathname.startsWith('/essentials') ||
    pathname.startsWith('/restaurants')
  )
}

const tabs = [
  { label: 'Home', href: '/', icon: Home, match: (p: string) => p === '/' },
  { label: 'Order Again', href: '/orders', icon: ShoppingBasket, match: (p: string) => p === '/orders' },
  { label: 'Categories', href: '/essentials', icon: LayoutGrid, match: (p: string) => p.startsWith('/essentials') },
  { label: 'Restaurants', href: '/restaurants', icon: UtensilsCrossed, match: (p: string) => p.startsWith('/restaurants') },
]

// Blinkit-style floating bottom bar: Home, Order Again, Categories, Restaurants.
export default function BottomNav() {
  const pathname = usePathname()
  if (!showsBottomNav(pathname)) return null

  return (
    <>
      {/* keeps the end of every page clear of the bar */}
      <div aria-hidden className="h-[76px] lg:hidden" />
      <nav
        aria-label="Main"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none"
      >
        <div className="pointer-events-auto flex w-full max-w-[360px] items-stretch gap-0.5 rounded-[22px] border border-[#EDE7D3] bg-white/95 p-1 shadow-[0_6px_20px_rgba(0,0,0,0.14)] backdrop-blur-md">
          {tabs.map(({ label, href, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-px rounded-[18px] py-1.5 transition-colors',
                  active ? 'bg-[#FDECB8]' : 'active:bg-[#F3F4F6]'
                )}
              >
                <Icon className={cn('h-5 w-5', active ? 'text-[#1F1F1F]' : 'text-[#4B5563]')} strokeWidth={active ? 2.4 : 1.9} />
                <span className={cn('text-[10.5px] leading-tight', active ? 'font-[800] text-[#1F1F1F]' : 'font-[500] text-[#4B5563]')} style={active ? { fontWeight: 800 } : undefined}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
