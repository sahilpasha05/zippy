'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bike } from 'lucide-react'

const COLORS = ['#16A34A', '#F97316', '#FACC15', '#3B82F6', '#EC4899', '#8B5CF6']

// Deterministic 0..1 value so the confetti layout is stable without Math.random.
const seeded = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const PIECES = Array.from({ length: 36 }, (_, i) => ({
  x: (seeded(i, 1) - 0.5) * 520,
  y: 140 + seeded(i, 2) * 260,
  rotate: (seeded(i, 3) - 0.5) * 720,
  size: 6 + seeded(i, 4) * 6,
  color: COLORS[i % COLORS.length],
  delay: seeded(i, 5) * 0.2,
}))

export default function FreeDeliveryPopup({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-6" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative bg-white rounded-3xl px-8 py-7 text-center shadow-2xl w-full max-w-[320px]"
      >
        {PIECES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/3 rounded-sm"
            style={{ width: p.size, height: p.size * 0.6, backgroundColor: p.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: [0, -90, p.y], opacity: [1, 1, 0], rotate: p.rotate }}
            transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
          />
        ))}
        <div className="w-16 h-16 mx-auto bg-[#DCFCE7] rounded-full flex items-center justify-center">
          <Bike className="w-8 h-8 text-[#16A34A]" />
        </div>
        <h3 className="mt-4 text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Free delivery unlocked! 🎉</h3>
        <p className="mt-1 text-[13px] text-[#6B7280]">You&apos;ve saved on delivery for this order.</p>
      </motion.div>
    </div>
  )
}
