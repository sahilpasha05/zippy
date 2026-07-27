import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sun, Leaf, Sparkles, Home } from 'lucide-react'

const collections = [
  {
    title: 'Breakfast Essentials',
    subtitle: 'Start your day right',
    icon: Sun,
    items: ['Bread', 'Eggs', 'Milk', 'Butter'],
    gradient: 'from-[#FEF3C7] via-[#FDE68A]/60 to-[#FEF9C3]',
    ring: '#F59E0B',
    badge: '23 items',
    href: '/essentials/bakery',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=400&fit=crop',
  },
  {
    title: 'Healthy & Organic',
    subtitle: 'Clean eating made easy',
    icon: Leaf,
    items: ['Quinoa', 'Chia Seeds', 'Almonds', 'Oats'],
    gradient: 'from-[#DCFCE7] via-[#BBF7D0]/60 to-[#F0FDF4]',
    ring: '#16A34A',
    badge: '47 items',
    href: '/essentials/organic-healthy',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
  },
  {
    title: 'Party Supplies',
    subtitle: 'Everything for your gathering',
    icon: Sparkles,
    items: ['Chips', 'Soda', 'Ice Cream', 'Cake'],
    gradient: 'from-[#F3E8FF] via-[#E9D5FF]/60 to-[#FDF4FF]',
    ring: '#9333EA',
    badge: '35 items',
    href: '/essentials/snacks',
    image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
  },
  {
    title: 'Household Basics',
    subtitle: 'Keep your home running',
    icon: Home,
    items: ['Detergent', 'Soap', 'Tissue', 'Cleaner'],
    gradient: 'from-[#DBEAFE] via-[#BFDBFE]/60 to-[#EFF6FF]',
    ring: '#2563EB',
    badge: '62 items',
    href: '/essentials/home-care',
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop',
  },
]

export default function CategoryGrid() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[22px] font-[800] text-[#111827] tracking-tight" style={{ fontWeight: 800 }}>
          Featured collections
        </h2>
        <Link href="/essentials" className="text-[13.5px] font-[600] text-[#16A34A] hover:text-[#15803D] transition-colors">
          All collections →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {collections.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.title}
              href={c.href}
              className={`group relative rounded-3xl bg-gradient-to-br ${c.gradient} p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]`}
            >
              {/* Product photo — soft circle peeking from the corner */}
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full overflow-hidden ring-4 ring-white/60 shadow-lg opacity-90">
                <Image src={c.image} alt="" width={144} height={144} className="w-full h-full object-cover" />
              </div>

              {/* Icon chip */}
              <div className="relative w-11 h-11 rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                <Icon className="w-5.5 h-5.5" style={{ color: c.ring, width: 22, height: 22 }} strokeWidth={2} />
              </div>

              <span className="relative inline-block text-[10.5px] font-[700] tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/70 backdrop-blur-sm mb-2" style={{ color: c.ring }}>
                {c.badge}
              </span>

              <h3 className="relative text-[16.5px] font-[800] text-[#111827] mb-0.5" style={{ fontWeight: 800 }}>{c.title}</h3>
              <p className="relative text-[12.5px] text-[#4B5563] mb-4">{c.subtitle}</p>

              {/* Item chips */}
              <div className="relative flex flex-wrap gap-1.5 mb-5">
                {c.items.map((item) => (
                  <span key={item} className="text-[11px] font-[600] text-[#374151] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                    {item}
                  </span>
                ))}
              </div>

              {/* CTA pill */}
              <span
                className="relative inline-flex items-center gap-1.5 text-[12.5px] font-[700] text-white px-4 py-2 rounded-xl shadow-md group-hover:gap-2.5 group-hover:shadow-lg transition-all duration-200"
                style={{ backgroundColor: c.ring }}
              >
                Shop now <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
