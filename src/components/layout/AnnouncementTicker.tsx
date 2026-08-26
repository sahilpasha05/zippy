// Scrolling announcement strip pinned above the main nav. Content is
// duplicated back-to-back so the marquee loops seamlessly — animating a
// single copy from 0% to -100% leaves a visible gap before it restarts.
export default function AnnouncementTicker({ text }: { text: string }) {
  return (
    <div className="h-8 bg-[#D97706] overflow-hidden flex items-center">
      <div className="flex whitespace-nowrap animate-marquee">
        {[0, 1].map((i) => (
          <span key={i} className="flex items-center text-white text-[12.5px] font-[600] px-6" aria-hidden={i === 1}>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}
