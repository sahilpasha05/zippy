import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid, Milk, IceCreamCone, Cookie, CupSoda, Candy, Wheat, Droplets } from 'lucide-react'

// Blinkit-style entry points: a scrollable tab strip along the top, and big pastel tiles below the banner.
const TABS = [
  { label: 'All', href: '/essentials', icon: LayoutGrid },
  { label: 'Milk', href: '#daily-milk', icon: Milk },
  { label: 'Ice cream', href: '/essentials/ice-creams-more', icon: IceCreamCone },
  { label: 'Biscuits', href: '/essentials?q=biscuit', icon: Cookie },
  { label: 'Cold drinks', href: '/essentials/drinks', icon: CupSoda },
  { label: 'Sweets', href: '#festive-sweets', icon: Candy },
  { label: 'Atta & dal', href: '/essentials/atta-rice-dal', icon: Wheat },
  { label: 'Oil & masala', href: '/essentials/masala-oil', icon: Droplets },
]

export function ShopTabs() {
  return (
    <nav aria-label="Shop by type" className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-1 border-b border-[#E5E7EB]">
        {TABS.map(({ label, href, icon: Icon }, i) => (
          <Link key={label} href={href}
            className={`flex w-[78px] shrink-0 flex-col items-center gap-1.5 border-b-[3px] px-1 pb-2 pt-1.5 text-[12px] font-[700] transition-colors ${i === 0 ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}>
            <Icon className="h-6 w-6" strokeWidth={2} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

// Grocery tiles use shelf pictures; restaurant tiles open a particular restaurant and show a dish photo.
const TILES: { title: string; href: string; img: string; bg: string; photo?: boolean }[] = [
  { title: 'Fresh Milk', href: '#daily-milk', img: '/products/nandini-milk.jpeg', bg: 'from-white to-white border border-[#E5E7EB]' },
  { title: 'Ice Creams', href: '/essentials/ice-creams-more', img: '/categories/cat-ice-creams-more.jpg', bg: 'from-white to-white border border-[#E5E7EB]' },
  { title: 'Pizza', href: '/restaurants/golden-cafe', img: '/products/pizza-tile.jpg', bg: 'from-[#FFE3C7] to-[#FBB98A]', photo: true },
  { title: 'Biryani', href: '/restaurants/jai-hind-restaurant', img: '/products/tile-biryani.jpg', bg: 'from-[#FFF0C9] to-[#FCD97A]', photo: true },
  { title: 'Kebabs & Grill', href: '/restaurants/jai-hind-restaurant', img: '/products/tile-kebab.jpg', bg: 'from-[#FFDCD0] to-[#F9AE97]', photo: true },
  { title: 'Rolls & Shawarma', href: '/restaurants/jai-hind-restaurant', img: '/products/tile-roll.jpg', bg: 'from-[#E4F5D8] to-[#B7E19A]', photo: true },
]

export function ShopTiles() {
  return (
    <section aria-label="Shop by craving">
      <h2 className="mb-3 text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>What are you craving?</h2>
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {TILES.map((t) => (
          <Link key={t.title} href={t.href}
            className={`group relative flex aspect-[0.9] flex-col items-center overflow-hidden rounded-2xl bg-gradient-to-b ${t.bg} px-2 pt-3 shadow-sm transition-transform active:scale-95 hover:-translate-y-0.5 hover:shadow-md`}>
            <span className="z-10 text-center text-[13px] font-[800] leading-tight text-[#1F2937]" style={{ fontWeight: 800 }}>{t.title}</span>
            <span className={`relative mt-1 w-full flex-1 ${t.photo ? 'mb-3 overflow-hidden rounded-xl' : ''}`}>
              <Image src={t.img} alt="" fill unoptimized sizes="(max-width: 1024px) 30vw, 15vw"
                className={t.photo ? 'object-cover transition-transform duration-300 group-hover:scale-105' : 'object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105'} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
