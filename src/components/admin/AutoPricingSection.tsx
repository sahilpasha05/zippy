'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, IndianRupee } from 'lucide-react'
import { cn } from '@/lib/utils'

const supabase = createClient()

type RideType = {
  id: string
  name: string
  badge: string | null
  description: string | null
  seats: number
  base_fare: number
  base_km: number
  per_km: number
  min_fare: number
  hike_after_km: number | null
  hike_per_km: number | null
  is_active: boolean
  sort_order: number
}

// Same formula the app uses: fixed base fare for the first `base_km`, then per-km, then (optionally)
// a steeper rate after `hike_after_km`; never below the minimum fare.
export function rideFare(r: Pick<RideType, 'base_fare' | 'base_km' | 'per_km' | 'min_fare' | 'hike_after_km' | 'hike_per_km'>, km: number) {
  const base = Number(r.base_fare), baseKm = Number(r.base_km), perKm = Number(r.per_km)
  const hikeAt = r.hike_after_km != null && r.hike_per_km != null ? Math.max(Number(r.hike_after_km), baseKm) : Infinity
  const normalKm = Math.max(0, Math.min(km, hikeAt) - baseKm)
  const hikeKm = hikeAt === Infinity ? 0 : Math.max(0, km - hikeAt)
  return Math.max(Number(r.min_fare), Math.round(base + normalKm * perKm + hikeKm * Number(r.hike_per_km ?? perKm)))
}

const FIELDS: { key: keyof RideType; label: string; hint: string }[] = [
  { key: 'base_fare', label: 'Base fare (₹)', hint: 'Charged for the first km block' },
  { key: 'base_km', label: 'Included km', hint: 'Covered by the base fare' },
  { key: 'per_km', label: 'Per km (₹)', hint: 'After the included km' },
  { key: 'min_fare', label: 'Minimum fare (₹)', hint: 'A ride never costs less' },
]

export default function AutoPricingSection() {
  const [types, setTypes] = useState<RideType[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [previewKm, setPreviewKm] = useState(5)

  const load = useCallback(async () => {
    const { data } = await supabase.from('auto_ride_types').select('*').order('sort_order').order('created_at')
    setTypes((data as RideType[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const edit = (id: string, patch: Partial<RideType>) =>
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  async function save(t: RideType) {
    if (!t.name.trim()) { setMsg('Give the ride a name.'); return }
    setBusy(t.id)
    const { error } = await supabase.from('auto_ride_types').update({
      name: t.name.trim(), badge: t.badge, description: t.description, seats: Number(t.seats),
      base_fare: Number(t.base_fare), base_km: Number(t.base_km), per_km: Number(t.per_km),
      min_fare: Number(t.min_fare), is_active: t.is_active,
      hike_after_km: t.hike_after_km === null || t.hike_after_km === undefined || String(t.hike_after_km) === '' ? null : Number(t.hike_after_km),
      hike_per_km: t.hike_per_km === null || t.hike_per_km === undefined || String(t.hike_per_km) === '' ? null : Number(t.hike_per_km),
    }).eq('id', t.id)
    setBusy(null)
    setMsg(error ? 'Could not save. Check the numbers and try again.' : `Saved ${t.name}.`)
  }

  async function add() {
    setBusy('new')
    const { error } = await supabase.from('auto_ride_types').insert({ name: 'New auto', sort_order: types.length + 1 })
    setBusy(null)
    if (error) setMsg('Could not add a ride type.'); else load()
  }

  async function remove(t: RideType) {
    if (!window.confirm(`Delete "${t.name}"? Customers will no longer see it.`)) return
    const { error } = await supabase.from('auto_ride_types').delete().eq('id', t.id)
    if (error) setMsg('Could not delete it.'); else load()
  }

  return (
    <section id="auto-pricing" className="mt-8 mb-10">
      <div className="bg-white border-y border-[#E5E7EB] px-6 py-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Auto Names & Pricing</h2>
          <p className="text-[12.5px] text-[#9CA3AF]">Set what each auto charges. The app works the fare out from the distance of every ride.</p>
        </div>
        <button onClick={add} disabled={busy === 'new'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[13px] font-[600] hover:bg-[#6D28D9] disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add auto type
        </button>
      </div>

      <div className="p-6 space-y-3">
        {msg && <div className="px-4 py-2.5 rounded-xl bg-[#F3E8FF] text-[#6D28D9] text-[13px]">{msg}</div>}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#7C3AED] animate-spin" /></div>
        ) : types.length === 0 ? (
          <p className="text-[13px] text-[#9CA3AF] bg-white rounded-2xl border border-[#E5E7EB] p-6">No auto types yet — add one.</p>
        ) : types.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <label className="md:col-span-2 text-[11.5px] font-[600] text-[#6B7280]">Name
                <input value={t.name} onChange={(e) => edit(t.id, { name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13.5px] text-[#111827] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
              </label>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Badge
                <input value={t.badge ?? ''} onChange={(e) => edit(t.id, { badge: e.target.value })} placeholder="3-seater"
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13.5px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
              </label>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Seats
                <input type="number" min={1} value={t.seats} onChange={(e) => edit(t.id, { seats: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13.5px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
              </label>
            </div>

            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
              {FIELDS.map((f) => (
                <label key={f.key} className="text-[11.5px] font-[600] text-[#6B7280]">{f.label}
                  <input type="number" min={0} step="0.5" value={t[f.key] as number}
                    onChange={(e) => edit(t.id, { [f.key]: e.target.value === '' ? 0 : Number(e.target.value) } as Partial<RideType>)}
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13.5px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                  <span className="block mt-0.5 font-normal text-[10.5px] text-[#9CA3AF]">{f.hint}</span>
                </label>
              ))}
            </div>

            <div className="grid gap-2 grid-cols-2 md:grid-cols-4 rounded-xl bg-[#FFF7ED] p-3">
              <p className="col-span-2 md:col-span-4 text-[11px] font-[800] uppercase tracking-wider text-[#C2410C]">Price hike for long rides (optional)</p>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">After (km)
                <input type="number" min={0} step="0.5" value={t.hike_after_km ?? ''} placeholder="e.g. 5"
                  onChange={(e) => edit(t.id, { hike_after_km: e.target.value === '' ? null : Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white text-[13.5px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                <span className="block mt-0.5 font-normal text-[10.5px] text-[#9CA3AF]">Leave empty for no hike</span>
              </label>
              <label className="text-[11.5px] font-[600] text-[#6B7280]">Per km after that (₹)
                <input type="number" min={0} step="0.5" value={t.hike_per_km ?? ''} placeholder="e.g. 18"
                  onChange={(e) => edit(t.id, { hike_per_km: e.target.value === '' ? null : Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white text-[13.5px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                <span className="block mt-0.5 font-normal text-[10.5px] text-[#9CA3AF]">Replaces the normal per-km rate</span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-[#F3F4F6]">
              <div className="flex items-center gap-3 flex-wrap text-[12.5px] text-[#6B7280]">
                <IndianRupee className="w-4 h-4 text-[#7C3AED]" />
                Preview:
                {[2, previewKm, 10].map((km, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-[#F3F4F6] text-[#111827] font-[600]">
                    {km} km = ₹{rideFare(t, km)}
                  </span>
                ))}
                <label className="flex items-center gap-1">
                  try
                  <input type="number" min={0} step="0.5" value={previewKm} onChange={(e) => setPreviewKm(Number(e.target.value) || 0)}
                    className="w-16 px-2 py-1 rounded-lg bg-[#F3F4F6] text-[12.5px] outline-none" /> km
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => edit(t.id, { is_active: !t.is_active })}
                  className={cn('px-3 py-1.5 rounded-full text-[11.5px] font-[700]',
                    t.is_active ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F3F4F6] text-[#6B7280]')}>
                  {t.is_active ? 'Shown to customers' : 'Hidden'}
                </button>
                <button onClick={() => remove(t)} className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2]" aria-label={`Delete ${t.name}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => save(t)} disabled={busy === t.id}
                  className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[13px] font-[600] hover:bg-[#6D28D9] disabled:opacity-50">
                  {busy === t.id ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
