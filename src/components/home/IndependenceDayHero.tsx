// Independence Day (15 Aug) seasonal hero. Delete this file, its one import
// in page.tsx, and public/banners/independence-hero.jpg once the season's over.

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function AshokaChakra({ className }: { className?: string }) {
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15)
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ animation: 'chakra-spin 14s linear infinite' }} aria-hidden>
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
      {spokes.map((deg) => (
        <line key={deg} x1="50" y1="50" x2="50" y2="8" stroke="currentColor" strokeWidth="1.5" transform={`rotate(${deg} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="5" fill="currentColor" />
    </svg>
  )
}

// Fixed values, not Math.random() — random per render would mismatch between
// server and client markup on hydration. left%/delay/duration/rotate/color
// are just hand-picked to look scattered.
const CONFETTI = [
  { left: '2%',  delay: '0s',    duration: '5.5s', color: '#FF9933', rotate: '10deg' },
  { left: '8%',  delay: '2.6s',  duration: '6s',   color: '#FFFFFF', rotate: '30deg' },
  { left: '11%', delay: '1.2s',  duration: '6.5s', color: '#138808', rotate: '-15deg' },
  { left: '15%', delay: '3.1s',  duration: '5.4s', color: '#FF9933', rotate: '-22deg' },
  { left: '19%', delay: '0.4s',  duration: '5s',   color: '#FFFFFF', rotate: '25deg' },
  { left: '23%', delay: '1.8s',  duration: '6.9s', color: '#138808', rotate: '8deg' },
  { left: '27%', delay: '2s',    duration: '7s',   color: '#FF9933', rotate: '-8deg' },
  { left: '31%', delay: '0.6s',  duration: '5.7s', color: '#138808', rotate: '20deg' },
  { left: '35%', delay: '0.8s',  duration: '5.8s', color: '#138808', rotate: '18deg' },
  { left: '39%', delay: '2.9s',  duration: '6.3s', color: '#FFFFFF', rotate: '-16deg' },
  { left: '44%', delay: '1.6s',  duration: '6.2s', color: '#FFFFFF', rotate: '-20deg' },
  { left: '48%', delay: '0.1s',  duration: '5.2s', color: '#FF9933', rotate: '14deg' },
  { left: '53%', delay: '0.2s',  duration: '5.3s', color: '#FF9933', rotate: '12deg' },
  { left: '57%', delay: '2.3s',  duration: '6.7s', color: '#138808', rotate: '-9deg' },
  { left: '61%', delay: '2.4s',  duration: '6.8s', color: '#138808', rotate: '-10deg' },
  { left: '65%', delay: '1.1s',  duration: '5.6s', color: '#FFFFFF', rotate: '26deg' },
  { left: '69%', delay: '1s',    duration: '5.6s', color: '#FFFFFF', rotate: '22deg' },
  { left: '73%', delay: '3.3s',  duration: '6.1s', color: '#FF9933', rotate: '-24deg' },
  { left: '77%', delay: '0.6s',  duration: '6s',   color: '#FF9933', rotate: '-18deg' },
  { left: '81%', delay: '1.4s',  duration: '5.9s', color: '#138808', rotate: '16deg' },
  { left: '85%', delay: '1.8s',  duration: '7.2s', color: '#138808', rotate: '15deg' },
  { left: '89%', delay: '0.5s',  duration: '5.1s', color: '#FFFFFF', rotate: '-28deg' },
  { left: '93%', delay: '0.3s',  duration: '5.9s', color: '#FFFFFF', rotate: '-12deg' },
  { left: '97%', delay: '2.1s',  duration: '6.4s', color: '#FF9933', rotate: '19deg' },
]

function Confetti() {
  return (
    // Fixed height, not inset-0 — the section also contains the banner image
    // below, and inset-0 let confetti drift down past it into empty space.
    // Capping the height keeps it confined to the text/button area above.
    <div className="absolute inset-x-0 top-0 h-[420px] overflow-hidden pointer-events-none" aria-hidden>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="absolute w-[7px] h-[12px] rounded-[1px]"
          style={{
            left: c.left,
            background: c.color,
            border: c.color === '#FFFFFF' ? '1px solid #E5E7EB' : undefined,
            animation: `confetti-fall ${c.duration} linear ${c.delay} infinite`,
            // Custom property, not a fixed px transform — read by the
            // keyframes below so each piece keeps its own tilt while `top`
            // (a container-relative percentage) carries it the full height.
            ['--tilt' as string]: c.rotate,
          }}
        />
      ))}
    </div>
  )
}

export default function IndependenceDayHero() {
  return (
    <section className="relative overflow-hidden">
      <style>{`
        @keyframes chakra-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes confetti-fall {
          0%   { top: -6%; opacity: 0; transform: rotate(var(--tilt)); }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 104%; opacity: 0; transform: rotate(calc(var(--tilt) + 360deg)); }
        }
      `}</style>
      {/* Large faint watermark chakra, like the reference — decorative, not a focal element */}
      <AshokaChakra className="absolute -right-16 -top-16 w-64 h-64 sm:w-80 sm:h-80 text-[#0B3D91]/[0.06] pointer-events-none" />
      <Confetti />

      <div className="relative flex flex-col items-center text-center gap-3 py-6 sm:py-8">
        <span className="text-[12.5px] sm:text-[14px] font-[700] px-3.5 py-2 rounded-full bg-[#DCFCE7] text-[#16A34A] uppercase tracking-wide">
          ⚡ Now Delivering in Tarikere
        </span>

        <h2 className="text-[30px] sm:text-[46px] font-[900] text-[#111827] leading-[1.15] tracking-tight max-w-2xl" style={{ fontWeight: 900 }}>
          This Independence Day,<br />
          <span className="text-[#16A34A]">Celebrate Freedom with Zippy 🇮🇳</span>
        </h2>

        <p className="text-[14px] sm:text-[16.5px] text-[#6B7280] max-w-lg">
          Freedom to choose. Freedom to order.<br className="hidden sm:block" /> Your favourite food &amp; groceries, delivered fast.
        </p>

        <div className="flex items-center gap-3 mt-2">
          <Link href="/restaurants"
            className="flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#16A34A] text-white text-[14px] sm:text-[15px] font-[800] uppercase tracking-wide hover:bg-[#15803D] transition-all">
            Order Now <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#offers"
            className="px-6 py-3 rounded-full border border-[#E5E7EB] bg-white text-[#111827] text-[14px] sm:text-[15px] font-[800] uppercase tracking-wide hover:border-[#D1D5DB] transition-all">
            Explore Offers
          </a>
        </div>

        <div className="relative w-full max-w-3xl mt-10 rounded-3xl overflow-hidden">
          <Image
            src="/banners/independence-hero.jpg"
            alt="Zippy delivery partner on a scooter with fresh groceries, Independence Day theme"
            width={1536}
            height={864}
            className="w-full h-auto"
            priority
          />
          <a href="#offers"
            className="absolute left-3 bottom-3 sm:left-6 sm:bottom-6 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-left shadow-zippy-lg hover:bg-white transition-all max-w-[220px] sm:max-w-[260px]">
            <span className="text-[10px] sm:text-[11px] font-[800] text-[#FF9933] uppercase tracking-wide">
              🇮🇳 Independence Day Special
            </span>
            <p className="text-[15px] sm:text-[18px] font-[900] text-[#111827] leading-tight mt-1" style={{ fontWeight: 900 }}>
              Celebrate More. Save More.
            </p>
            <p className="text-[11px] sm:text-[12.5px] text-[#6B7280] mt-1">
              Special offers available today →
            </p>
          </a>
        </div>
      </div>
    </section>
  )
}
