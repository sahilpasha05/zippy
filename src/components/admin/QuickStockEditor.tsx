'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, X, Loader2, Check, PackageX, PackageCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

type Row = { id: string; name: string; weight: string | null; price: number; mrp: number | null; in_stock: boolean; image_url: string | null }
type Props = { categorySlug?: string; nameWords?: string[]; onChanged?: () => void }

// The product list: each row has a price box (tick to save) and an Out / Back button.
// Marking an item out of stock hides it from customers straight away.
export function StockPanel({ categorySlug, nameWords, onChanged }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    let q = supabase.from('grocery_products').select('id, name, weight, price, mrp, in_stock, image_url').eq('is_active', true).order('name')
    if (categorySlug) {
      const { data: cat } = await supabase.from('grocery_categories').select('id').eq('slug', categorySlug).maybeSingle()
      if (!cat) { setRows([]); setLoading(false); return }
      q = q.eq('category_id', cat.id)
    } else if (nameWords?.length) {
      q = q.or(nameWords.map((w) => `name.ilike.%${w}%`).join(','))
    }
    const { data, error: err } = await q
    if (err) setError(err.message)
    const list = ((data as Row[]) ?? []).map((r) => ({ ...r, price: Number(r.price), mrp: r.mrp == null ? null : Number(r.mrp) }))
    setRows(list)
    setPrices(Object.fromEntries(list.map((r) => [r.id, String(r.price)])))
    setLoading(false)
  }, [categorySlug, nameWords])

  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  async function savePrice(r: Row) {
    const price = Number(prices[r.id])
    if (!price || price < 0 || price === r.price) return
    setBusy(r.id); setError('')
    // The struck-through MRP must never sit below the selling price.
    const mrp = r.mrp == null || r.mrp < price ? price : r.mrp
    const { error: err } = await supabase.from('grocery_products').update({ price, mrp }).eq('id', r.id)
    if (err) setError(err.message)
    else {
      setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, price, mrp } : x))
      setSaved(r.id); setTimeout(() => setSaved((s) => s === r.id ? null : s), 1600)
      onChanged?.()
    }
    setBusy(null)
  }

  async function toggleStock(r: Row) {
    setBusy(r.id); setError('')
    const { error: err } = await supabase.from('grocery_products').update({ in_stock: !r.in_stock }).eq('id', r.id)
    if (err) setError(err.message)
    else {
      setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, in_stock: !r.in_stock } : x))
      onChanged?.()
    }
    setBusy(null)
  }

  return (
    <>
      {error && <p className="mx-5 mt-3 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#B91C1C]">{error}</p>}
      <div className="px-5 py-2">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" /></div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[#9CA3AF]">No products found.</p>
        ) : rows.map((r) => (
          <div key={r.id} className={`flex items-center gap-3 border-b border-[#F3F4F6] py-3 last:border-0 ${r.in_stock ? '' : 'opacity-60'}`}>
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F8FAFC]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.image_url && <img src={r.image_url} alt="" className="h-full w-full object-contain" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-[600] text-[#111827]">{r.name}</p>
              <p className="text-[11px] text-[#9CA3AF]">{r.weight ?? ''}{r.in_stock ? '' : ' · Out of stock'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-[13px] text-[#6B7280]">₹</span>
              <input type="number" min="0" step="0.5" inputMode="decimal" value={prices[r.id] ?? ''}
                onChange={(e) => setPrices((p) => ({ ...p, [r.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') void savePrice(r) }}
                className="w-[72px] rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-[13px] outline-none focus:border-[#7C3AED]" />
              <button onClick={() => savePrice(r)} disabled={busy === r.id || Number(prices[r.id]) === r.price} aria-label="Save price"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED] text-white disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]">
                {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={() => toggleStock(r)} disabled={busy === r.id}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-[700] ${r.in_stock ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#DCFCE7] text-[#15803D]'}`}>
              {r.in_stock ? <><PackageX className="h-3.5 w-3.5" /> Out</> : <><PackageCheck className="h-3.5 w-3.5" /> Back</>}
            </button>
            {saved === r.id && <span className="text-[11px] font-[700] text-[#16A34A]">Saved</span>}
          </div>
        ))}
      </div>
    </>
  )
}

// A small "Edit prices / stock" button for the admin, shown on the home page rows (cold drinks,
// festive sweets). Customers never see it: it only appears when the signed-in account is an admin.
export default function QuickStockEditor({ title, ...panel }: Props & { title: string }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || cancelled) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      if (!cancelled && profile?.role === 'admin') setIsAdmin(true)
    })
    return () => { cancelled = true }
  }, [])

  if (!isAdmin) return null

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#7C3AED] bg-white/90 px-3 py-1.5 text-[12px] font-[700] text-[#7C3AED] shadow-sm hover:bg-[#F5F3FF]">
        <Pencil className="h-3.5 w-3.5" /> Edit prices / stock
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
              <div>
                <h3 className="text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{title}</h3>
                <p className="text-[12px] text-[#6B7280]">Change a price and tap the tick, or mark an item out of stock. It hides from customers straight away.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151]"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><StockPanel {...panel} /></div>
          </div>
        </div>
      )}
    </>
  )
}
