'use client'

import Link from 'next/link'
import { Zap, HeartPulse, PawPrint, Baby } from 'lucide-react'

const promos = [
  {
    title: 'Pharmacy at\nyour doorstep!',
    subtitle: 'Cough syrups, pain relief sprays & more',
    cta: 'Order Now',
    href: '/essentials/pharma-wellness',
    bg: 'bg-gradient-to-br from-[#0D9488] to-[#14B8A6]',
    Icon: HeartPulse,
  },
  {
    title: 'Pet care supplies\nat your door',
    subtitle: 'Food, treats, toys & more',
    cta: 'Order Now',
    href: '/essentials/pet-supplies',
    bg: 'bg-gradient-to-br from-[#F59E0B] to-[#FBBF24]',
    Icon: PawPrint,
  },
  {
    title: 'No time for\na diaper run?',
    subtitle: 'Get baby care essentials',
    cta: 'Order Now',
    href: '/essentials/baby-care',
    bg: 'bg-gradient-to-br from-[#93C5FD] to-[#BFDBFE]',
    Icon: Baby,
    dark: true,
  },
]

export default function HeroSection() {
  return (
    <section className="relative bg-white overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F0FDF4] via-white to-[#F8FAFC] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#DCFCE7] rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="relative max-w-[1440px] mx-auto px-6 lg:px-10 pt-12 pb-10">
        <div className="max-w-3xl mx-auto text-center mb-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#DCFCE7] border border-[#BBF7D0] rounded-full mb-8">
            <Zap className="w-3.5 h-3.5 text-[#16A34A] fill-[#16A34A]" />
            <span className="text-[12.5px] font-semibold text-[#15803D] tracking-wide uppercase">Now delivering in Tarikere</span>
          </div>

          {/* Headline */}
          <h1 className="text-[52px] lg:text-[68px] font-[900] text-[#111827] leading-[1.05] tracking-[-0.03em]">
            Groceries &amp; food,
            <br />
            <span className="text-[#16A34A] relative">
              delivered instantly
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 12" fill="none">
                <path d="M2 8C80 4 160 2 200 2C240 2 320 4 398 8" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
        </div>

        {/* Blinkit-style promo cards */}
        <div className="grid sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {promos.map(({ title, subtitle, cta, href, bg, Icon, dark }) => (
            <Link
              key={href}
              href={href}
              className={`group relative ${bg} rounded-2xl p-6 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-zippy-lg`}
            >
              <Icon className={`absolute -right-4 -bottom-4 w-32 h-32 ${dark ? 'text-[#1E3A5F]/10' : 'text-white/15'}`} strokeWidth={1.5} />
              <div className="relative">
                <h3 className={`text-[20px] font-[800] leading-tight mb-2 whitespace-pre-line ${dark ? 'text-[#1E3A5F]' : 'text-white'}`} style={{ fontWeight: 800 }}>
                  {title}
                </h3>
                <p className={`text-[12.5px] mb-5 ${dark ? 'text-[#1E3A5F]/80' : 'text-white/85'}`}>{subtitle}</p>
                <span className={`inline-block px-4 py-2 rounded-lg text-[13px] font-[700] transition-all group-hover:scale-105 ${dark ? 'bg-[#1E3A5F] text-white' : 'bg-[#111827] text-white'}`}>
                  {cta}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
