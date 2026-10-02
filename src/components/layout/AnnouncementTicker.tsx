// Two scrolling strips pinned above the main nav (each h-7, 56px combined —
// keep the Navbar spacer and the sticky offsets in sync if this changes).
// Each message is repeated 6 times and the track slides by half its width, so
// the loop is seamless and fills wide screens too.
const WHATSAPP_NUMBER = '918277802605'

function Strip({ children, className, href }: { children: string; className: string; href?: string }) {
  const track = (
    <div className="flex whitespace-nowrap animate-marquee">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="flex items-center text-white text-[12px] font-[600] px-6" aria-hidden={i > 0}>
          {children}
          <span className="ml-12 opacity-60">•</span>
        </span>
      ))}
    </div>
  )
  const base = `h-7 overflow-hidden flex items-center ${className}`
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} block`}>{track}</a>
    : <div className={base}>{track}</div>
}

export default function AnnouncementTicker() {
  return (
    <>
      <Strip
        className="bg-[#16A34A]"
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi Zippy, I need help with an order.')}`}
      >
        Any complaints or missed refunds? Drop a message on WhatsApp: +91 82778 02605 (tap here)
      </Strip>
      <Strip className="bg-[#D97706]">
        Due to high demand in your area, delivery is slightly delayed. Thanks for your patience!
      </Strip>
    </>
  )
}
