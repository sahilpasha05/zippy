import { Zap } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative bg-white overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F0FDF4] via-white to-[#F8FAFC] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#DCFCE7] rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="relative max-w-[1440px] mx-auto px-6 lg:px-10 pt-12 pb-10">
        <div className="max-w-3xl mx-auto text-center">
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
      </div>
    </section>
  )
}
