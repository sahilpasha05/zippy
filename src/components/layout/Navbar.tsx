'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  MapPin, Search, Bell, User, ChevronDown,
  Zap, Package, UtensilsCrossed, Menu, X, ShoppingBag, LogOut, History
} from 'lucide-react'
import PhoneLoginModal from '@/components/PhoneLoginModal'
import { useAddresses } from '@/lib/hooks/useAddresses'
import { useAddressStore } from '@/lib/store/address'
import { useCartStore } from '@/lib/store/cart'
import { cn } from '@/lib/utils'
import { useDeliveryEta } from '@/lib/useDeliveryEta'
import { createClient } from '@/lib/supabase/client'
import LocationPicker from '@/components/LocationPicker'

const navLinks = [
  { label: 'Essentials', href: '/essentials', icon: Package },
  { label: 'Restaurants', href: '/restaurants', icon: UtensilsCrossed },
]

export default function Navbar() {
  const [showAuth, setShowAuth] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [user, setUser] = useState<{ id: string; phone?: string; email?: string } | null>(null)
  const deliveryEta = useDeliveryEta()
  const { addresses, selectedId, ready: addressesReady } = useAddresses()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await createClient().auth.signOut()
    // Both are anonymous/local-only stores — clear them so a logged-out session
    // doesn't show whatever was cached from this account or earlier testing.
    useCartStore.getState().clearCart()
    useAddressStore.getState().clearAddresses()
    setProfileMenuOpen(false)
    setConfirmingSignOut(false)
    router.refresh()
  }

  function closeProfileMenu() {
    setProfileMenuOpen(false)
    setConfirmingSignOut(false)
  }

  const selectedAddress = addressesReady ? addresses.find((a) => a.id === selectedId) ?? null : null
  const locationLabel = selectedAddress ? selectedAddress.address : 'Tarikere, Karnataka'
  const locationSubLabel = selectedAddress ? selectedAddress.label : 'Set your location'

  const onRestaurantSide = pathname.startsWith('/restaurant')

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_20px_rgba(0,0,0,0.08)] border-b border-[#E5E7EB]'
            : 'bg-white border-b border-[#E5E7EB]'
        )}
      >
        {/* Section switcher — Flipkart style: two apps under one header. Mobile only. */}
        <div className="lg:hidden bg-white px-4 pt-2.5">
          <div className="flex items-center gap-2.5">
            <Link href="/" className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all',
              !onRestaurantSide ? 'bg-[#16A34A] shadow-[0_3px_10px_rgba(22,163,74,0.35)]' : 'bg-[#F3F4F6]'
            )}>
              <ShoppingBag className={cn('w-[18px] h-[18px]', !onRestaurantSide ? 'text-white' : 'text-[#6B7280]')} strokeWidth={2.25} />
              <span className={cn('text-[14px] font-[800]', !onRestaurantSide ? 'text-white' : 'text-[#6B7280]')} style={{ fontWeight: 800 }}>Zippy</span>
            </Link>
            <Link href="/restaurants" className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all',
              onRestaurantSide ? 'bg-[#EA580C] shadow-[0_3px_10px_rgba(234,88,12,0.35)]' : 'bg-[#F3F4F6]'
            )}>
              <UtensilsCrossed className={cn('w-[18px] h-[18px]', onRestaurantSide ? 'text-white' : 'text-[#6B7280]')} strokeWidth={2.25} />
              <span className={cn('text-[14px] font-[800]', onRestaurantSide ? 'text-white' : 'text-[#6B7280]')} style={{ fontWeight: 800 }}>Restaurants</span>
            </Link>
          </div>
        </div>

        {/* Mobile header — Blinkit style */}
        <div className="lg:hidden px-4 pt-3 pb-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <button onClick={() => setShowLocationPicker(true)} className="text-left min-w-0">
              <div className="text-[17px] font-[900] text-[#1F1F1F] leading-tight" style={{ fontWeight: 900 }}>
                Delivery in {deliveryEta} minutes
              </div>
              <div className="flex items-center gap-1 text-[13px] text-[#374151]">
                <span className="truncate max-w-[220px]">{locationLabel}</span>
                <ChevronDown className="w-4 h-4 shrink-0" />
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              {user ? (
                <button onClick={() => setProfileMenuOpen((v) => !v)} className="flex items-center justify-center w-10 h-10">
                  <div className="w-7 h-7 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={2} />
                  </div>
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)} className="flex items-center justify-center w-10 h-10">
                  <User className="w-6 h-6 text-[#1F1F1F]" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
          {/* Full-width search */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#F8F8F8] border border-[#EEEEEE] rounded-xl">
            <Search className="w-4.5 h-4.5 text-[#6B7280] shrink-0" strokeWidth={2} />
            <input
              type="text"
              placeholder='Search "chocolate"'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[14.5px] text-[#111827] placeholder:text-[#9CA3AF] outline-none min-w-0"
            />
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-4 h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <Image
                src="/logo-mark.png"
                alt="Zippy"
                width={40}
                height={33}
                className="h-8 w-auto"
                priority
              />
              <span className="text-[17px] font-800 tracking-tight text-[#111827] leading-none" style={{ fontWeight: 800 }}>
                Zippy
              </span>
            </Link>

            {/* Location */}
            <button onClick={() => setShowLocationPicker(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-[#F8FAFC] transition-colors group shrink-0 max-w-[220px]">
              <MapPin className="w-4 h-4 text-[#16A34A] shrink-0" strokeWidth={2} />
              <div className="text-left min-w-0">
                <div className="text-[12px] font-[800] text-[#111827] leading-none mb-0.5" style={{ fontWeight: 800 }}>
                  Delivery in {deliveryEta} minutes
                </div>
                <div className="text-[11.5px] text-[#6B7280] truncate leading-none">
                  {locationSubLabel === 'Set your location' ? locationLabel : `${locationSubLabel} · ${locationLabel}`}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] shrink-0 group-hover:text-[#16A34A] transition-colors" />
            </button>

            {/* Search */}
            <div className={cn(
              'flex-1 max-w-2xl relative transition-all duration-200',
              searchFocused ? 'max-w-2xl' : 'max-w-xl'
            )}>
              <div className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-200',
                searchFocused
                  ? 'border-[#16A34A] shadow-[0_0_0_3px_rgba(22,163,74,0.12)] bg-white'
                  : 'border-[#E5E7EB] bg-[#F8FAFC] hover:border-[#D1D5DB]'
              )}>
                <Search className="w-4 h-4 text-[#9CA3AF] shrink-0" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search groceries, restaurants, dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="flex-1 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none min-w-0"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Nav Links - Desktop */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ label, href }) => {
                const active = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-[13.5px] font-medium transition-all duration-150',
                      active
                        ? 'bg-[#DCFCE7] text-[#16A34A] font-semibold'
                        : 'text-[#374151] hover:bg-[#F8FAFC] hover:text-[#111827]'
                    )}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>

            {/* Right Icons */}
            <div className="flex items-center gap-1 ml-auto lg:ml-0">
              {/* Notifications */}
              <button className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[#F8FAFC] transition-all group">
                <Bell className="w-5 h-5 text-[#374151] group-hover:text-[#16A34A] transition-colors" strokeWidth={2} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>

              {/* Profile */}
              {user ? (
                <button onClick={() => setProfileMenuOpen((v) => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[#F8FAFC] transition-all ml-1 group">
                  <div className="w-7 h-7 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={2} />
                  </div>
                  <span className="hidden md:block text-[13px] font-medium text-[#374151] group-hover:text-[#111827]">
                    {user.phone ?? user.email}
                  </span>
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[#F8FAFC] transition-all ml-1 group">
                  <div className="w-7 h-7 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={2} />
                  </div>
                  <span className="hidden md:block text-[13px] font-medium text-[#374151] group-hover:text-[#111827]">Sign in</span>
                </button>
              )}

              {/* Mobile menu */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[#F8FAFC] transition-all"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[#E5E7EB] bg-white">
            <div className="px-6 py-4 space-y-1">
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all',
                    pathname.startsWith(href)
                      ? 'bg-[#DCFCE7] text-[#16A34A]'
                      : 'text-[#374151] hover:bg-[#F8FAFC]'
                  )}
                >
                  <Icon className="w-4.5 h-4.5" strokeWidth={2} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Spacer */}
      <div className="h-[168px] lg:h-16" />

      {profileMenuOpen && user && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={closeProfileMenu} />
          <div className="fixed top-16 right-4 z-[100] w-56 bg-white rounded-2xl border border-[#E5E7EB] shadow-zippy-lg p-2">
            <div className="px-3 py-2.5 border-b border-[#F3F4F6] mb-1">
              <p className="text-[12px] text-[#9CA3AF]">Signed in as</p>
              <p className="text-[13.5px] font-[700] text-[#111827] truncate">{user.phone ?? user.email}</p>
            </div>

            {!confirmingSignOut ? (
              <>
                <Link
                  href="/orders"
                  onClick={closeProfileMenu}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-colors"
                >
                  <History className="w-4 h-4" /> Order History
                </Link>
                <button
                  onClick={() => setConfirmingSignOut(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            ) : (
              <div className="px-2 py-1.5">
                <p className="text-[12.5px] text-[#374151] px-1 mb-2">Sign out of Zippy?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingSignOut(false)}
                    className="flex-1 py-2 rounded-xl text-[12.5px] font-medium text-[#374151] border border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex-1 py-2 rounded-xl text-[12.5px] font-[700] text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showLocationPicker && <LocationPicker onClose={() => setShowLocationPicker(false)} />}

      {showAuth && (
        <PhoneLoginModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => { setShowAuth(false); router.refresh() }}
        />
      )}

    </>
  )
}
