'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowDown, ArrowUp, Crosshair, Layers, Loader2, MapPin, Plus, Save, Trash2, Undo2, X } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import ZoneMapEditor, { type MapZone, type Ring } from '@/components/admin/ZoneMapEditor'
import { normaliseZoneRow, resolveFromZones, type ZoneRow } from '@/lib/deliveryZones'
import { cn } from '@/lib/utils'

const supabase = createClient()

const PALETTE = ['#16A34A', '#F59E0B', '#F97316', '#2563EB', '#7C3AED', '#DB2777', '#0D9488', '#65A30D']

function Switch({ on, onClick, tone = 'bg-[#16A34A]' }: { on: boolean; onClick: () => void; tone?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('relative w-10 h-[22px] rounded-full shrink-0 transition-all duration-200', on ? tone : 'bg-[#D1D5DB]')}>
      <span className={cn('absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-all duration-200', on ? 'translate-x-[18px]' : 'translate-x-0')} />
    </button>
  )
}

function ruleLine(z: Pick<ZoneRow, 'delivery_fee' | 'min_order' | 'cod_only' | 'needs_confirmation'>) {
  const bits = [`₹${z.delivery_fee} delivery`]
  bits.push(z.min_order > 0 ? `min order ₹${z.min_order}` : 'no minimum')
  if (z.cod_only) bits.push('cash only')
  if (z.needs_confirmation) bits.push('executive confirms')
  return bits.join(' · ')
}

export default function AdminZonesPage() {
  const [rows, setRows] = useState<ZoneRow[]>([])
  const [edits, setEdits] = useState<Record<string, ZoneRow>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [satellite, setSatellite] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [draft, setDraft] = useState<Ring>([])
  const [testing, setTesting] = useState(false)
  const [testPoint, setTestPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('delivery_zones').select('*').order('priority')
    if (error) { setLoadError(error.message); setLoading(false); return }
    setRows((data ?? []).map(normaliseZoneRow))
    setLoading(false)
  }, [])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  // The working copy: saved rows with any unsaved edits applied, plus unsaved new zones.
  const working = useMemo(() => {
    const saved = rows.map((r) => edits[r.id] ?? r)
    const fresh = Object.values(edits).filter((e) => !rows.some((r) => r.id === e.id))
    return [...saved, ...fresh]
  }, [rows, edits])
  const zones = useMemo(() => working.filter((z) => z.kind === 'zone').sort((a, b) => a.priority - b.priority), [working])
  const outside = working.find((z) => z.kind === 'outside') ?? null
  const selected = working.find((z) => z.id === selectedId) ?? null

  const isDirty = (id: string) => {
    const e = edits[id]
    if (!e) return false
    const base = rows.find((r) => r.id === id)
    return !base || JSON.stringify(base) !== JSON.stringify(e)
  }
  const isNew = (id: string) => !rows.some((r) => r.id === id)

  function patch(id: string, p: Partial<ZoneRow>) {
    const base = working.find((z) => z.id === id)
    if (!base) return
    setEdits((prev) => ({ ...prev, [id]: { ...base, ...p } }))
  }

  // ---- drawing a new zone
  function startDrawing() { setSelectedId(null); setTesting(false); setTestPoint(null); setDrawing(true); setDraft([]); setMessage(null) }
  function cancelDrawing() { setDrawing(false); setDraft([]) }
  function finishDrawing() {
    if (draft.length < 3) return
    const id = `new-${Date.now()}`
    const maxPriority = zones.reduce((m, z) => Math.max(m, z.priority), 0)
    const zone: ZoneRow = {
      id, name: 'New zone', kind: 'zone', color: PALETTE[zones.length % PALETTE.length], polygon: draft,
      delivery_fee: 59, min_order: 0, cod_only: false, needs_confirmation: false, priority: maxPriority + 10, is_active: true,
    }
    setEdits((prev) => ({ ...prev, [id]: zone }))
    setSelectedId(id)
    setDrawing(false)
    setDraft([])
  }

  // ---- saving
  async function save(id: string) {
    const z = working.find((w) => w.id === id)
    if (!z) return
    if (!z.name.trim()) { setMessage({ kind: 'err', text: 'Give the zone a name first.' }); return }
    if (z.kind === 'zone' && (!z.polygon || z.polygon.length < 3)) { setMessage({ kind: 'err', text: 'A zone needs at least 3 corners.' }); return }
    setBusy(true); setMessage(null)
    const body = {
      name: z.name.trim(), color: z.color, polygon: z.kind === 'zone' ? z.polygon : null,
      delivery_fee: Number(z.delivery_fee) || 0, min_order: Number(z.min_order) || 0,
      cod_only: z.cod_only, needs_confirmation: z.needs_confirmation, priority: z.priority, is_active: z.is_active,
      updated_at: new Date().toISOString(),
    }
    const res = isNew(id)
      ? await supabase.from('delivery_zones').insert({ ...body, kind: z.kind }).select('*').single()
      : await supabase.from('delivery_zones').update(body).eq('id', id).select('*').single()
    setBusy(false)
    if (res.error || !res.data) {
      setMessage({ kind: 'err', text: res.error?.message?.includes('row-level security') ? 'Saving needs an admin login. Sign in as admin and try again.' : `Could not save: ${res.error?.message ?? 'unknown error'}` })
      return
    }
    const saved = normaliseZoneRow(res.data)
    setRows((prev) => (isNew(id) ? [...prev, saved] : prev.map((r) => (r.id === id ? saved : r))))
    setEdits((prev) => { const n = { ...prev }; delete n[id]; return n })
    setSelectedId(saved.id)
    setMessage({ kind: 'ok', text: 'Saved. Customers use the new zone straight away.' })
  }

  function discard(id: string) {
    setEdits((prev) => { const n = { ...prev }; delete n[id]; return n })
    if (isNew(id)) setSelectedId(null)
    setMessage(null)
  }

  async function remove(id: string) {
    if (isNew(id)) { discard(id); return }
    if (!window.confirm('Delete this zone? Addresses inside it will use the next zone that contains them, or the "outside" rule.')) return
    setBusy(true)
    const { error } = await supabase.from('delivery_zones').delete().eq('id', id)
    setBusy(false)
    if (error) { setMessage({ kind: 'err', text: `Could not delete: ${error.message}` }); return }
    setRows((prev) => prev.filter((r) => r.id !== id))
    setEdits((prev) => { const n = { ...prev }; delete n[id]; return n })
    setSelectedId(null)
  }

  // Zones higher in the list win where they overlap: swap priorities with the neighbour.
  async function move(id: string, dir: -1 | 1) {
    const saved = rows.filter((r) => r.kind === 'zone').sort((a, b) => a.priority - b.priority)
    const i = saved.findIndex((z) => z.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= saved.length) return
    const a = saved[i], b = saved[j]
    setBusy(true)
    const [r1, r2] = await Promise.all([
      supabase.from('delivery_zones').update({ priority: b.priority }).eq('id', a.id),
      supabase.from('delivery_zones').update({ priority: a.priority }).eq('id', b.id),
    ])
    setBusy(false)
    if (r1.error || r2.error) { setMessage({ kind: 'err', text: 'Could not reorder. Sign in as admin and try again.' }); return }
    setRows((prev) => prev.map((r) => (r.id === a.id ? { ...r, priority: b.priority } : r.id === b.id ? { ...r, priority: a.priority } : r)))
  }

  // ---- test a location
  const testResult = useMemo(() => {
    if (!testPoint) return null
    const live = zones.filter((z) => z.is_active)
    return resolveFromZones(live, outside && outside.is_active ? outside : outside, testPoint.lat, testPoint.lng)
  }, [testPoint, zones, outside])

  const mapZones: MapZone[] = useMemo(
    () => [...zones].sort((a, b) => b.priority - a.priority).map((z) => ({ id: z.id, name: z.name, color: z.color, polygon: z.polygon as Ring | null, fee: z.delivery_fee, active: z.is_active })),
    [zones],
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-5 py-4 sticky top-0 z-10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Delivery zones</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">Draw areas on the map and set the price for each. Customers pay the fee of the zone their location is in.</p>
            </div>
            <button onClick={() => { setTesting((t) => !t); setDrawing(false); setDraft([]); setTestPoint(null) }}
              className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[12.5px] font-[600] transition-all', testing ? 'bg-[#F5F3FF] border-[#7C3AED] text-[#6D28D9]' : 'border-[#E5E7EB] text-[#374151] hover:border-[#7C3AED]')}>
              <Crosshair className="w-4 h-4" /> Test a location
            </button>
            <button onClick={() => setSatellite((s) => !s)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-[12.5px] font-[600] text-[#374151] hover:border-[#7C3AED] transition-all">
              <Layers className="w-4 h-4" /> {satellite ? 'Street map' : 'Satellite'}
            </button>
            <button onClick={startDrawing} disabled={drawing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[12.5px] font-[700] hover:bg-[#6D28D9] disabled:opacity-60 transition-all">
              <Plus className="w-4 h-4" /> Add zone
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" /></div>
        ) : loadError ? (
          <p className="p-8 text-[13px] text-[#B91C1C]">Could not load the zones: {loadError}. Has the delivery_zones table been created?</p>
        ) : (
          <div className="flex flex-col xl:flex-row gap-4 p-4">
            {/* Map */}
            <div className="relative flex-1 min-w-0">
              <ZoneMapEditor
                className="h-[56vh] xl:h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden border border-[#E5E7EB]"
                zones={mapZones} selectedId={selectedId} satellite={satellite}
                drawing={drawing} draft={draft} testing={testing} testPoint={testPoint}
                onSelect={setSelectedId}
                onRingChange={(id, ring) => patch(id, { polygon: ring })}
                onDraftChange={setDraft}
                onTestPoint={(lat, lng) => setTestPoint({ lat, lng })}
              />
              {drawing && (
                <div className="absolute left-3 right-3 top-3 sm:right-auto sm:max-w-sm rounded-xl bg-white/95 backdrop-blur border border-[#DDD6FE] shadow-lg p-3">
                  <p className="text-[13px] font-[700] text-[#5B21B6]">Drawing a new zone</p>
                  <p className="text-[12px] text-[#6B7280] mt-0.5">Tap the map to place each corner, going around the area. You can add corners on every side. {draft.length} placed{draft.length < 3 ? ' (need 3)' : ''}.</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={finishDrawing} disabled={draft.length < 3} className="px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-[12px] font-[700] disabled:opacity-40">Finish shape</button>
                    <button onClick={() => setDraft((d) => d.slice(0, -1))} disabled={draft.length === 0} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] font-[600] text-[#374151] disabled:opacity-40"><Undo2 className="w-3.5 h-3.5" /> Undo corner</button>
                    <button onClick={cancelDrawing} className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] font-[600] text-[#374151]">Cancel</button>
                  </div>
                </div>
              )}
              {testing && (
                <div className="absolute left-3 right-3 top-3 sm:right-auto sm:max-w-sm rounded-xl bg-white/95 backdrop-blur border border-[#DDD6FE] shadow-lg p-3">
                  <p className="text-[13px] font-[700] text-[#5B21B6]">Test a location</p>
                  {testResult ? (
                    <div className="mt-1 text-[12.5px] text-[#111827]">
                      <p><b>{testResult.name}</b></p>
                      <p className="text-[#6B7280]">₹{testResult.fee} delivery · {testResult.minOrder > 0 ? `minimum order ₹${testResult.minOrder}` : 'no minimum'}{testResult.codOnly || testResult.needsConfirmation ? ' · cash only' : ''}{testResult.needsConfirmation ? ' · an executive confirms the order' : ''}</p>
                    </div>
                  ) : <p className="text-[12px] text-[#6B7280] mt-0.5">Tap anywhere on the map to see which zone and price a customer there would get.</p>}
                </div>
              )}
            </div>

            {/* Side panel */}
            <div className="xl:w-[380px] shrink-0 space-y-4">
              {message && (
                <div className={cn('rounded-xl border px-3.5 py-2.5 text-[12.5px]', message.kind === 'ok' ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]')}>{message.text}</div>
              )}

              {selected ? (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: selected.color }} />
                    <h2 className="text-[14px] font-[800] text-[#111827] truncate" style={{ fontWeight: 800 }}>{selected.kind === 'outside' ? 'Outside every zone' : selected.name || 'Zone'}</h2>
                    {isDirty(selected.id) && <span className="ml-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10.5px] font-[700] text-[#B45309]">unsaved</span>}
                    <button onClick={() => setSelectedId(null)} className="ml-auto text-[#9CA3AF] hover:text-[#374151]"><X className="w-4 h-4" /></button>
                  </div>

                  {selected.kind === 'zone' && (
                    <>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <div>
                          <label className="block text-[11.5px] font-[600] text-[#374151] mb-1">Name</label>
                          <input value={selected.name} onChange={(e) => patch(selected.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl text-[13px] outline-none focus:border-[#7C3AED]" />
                        </div>
                        <div>
                          <label className="block text-[11.5px] font-[600] text-[#374151] mb-1">Colour</label>
                          <input type="color" value={selected.color} onChange={(e) => patch(selected.id, { color: e.target.value })}
                            className="h-[38px] w-12 rounded-xl border border-[#E5E7EB] bg-white p-1" />
                        </div>
                      </div>
                      <p className="rounded-lg bg-[#F5F3FF] px-3 py-2 text-[11.5px] leading-relaxed text-[#5B21B6]">
                        {(selected.polygon?.length ?? 0)} corners. <b>Drag a white corner</b> to move it · <b>click the small dot</b> in the middle of a side to add a corner there · <b>double-click a corner</b> to remove it.
                      </p>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11.5px] font-[600] text-[#374151] mb-1">Delivery fee (₹)</label>
                      <input type="number" min={0} value={selected.delivery_fee} onChange={(e) => patch(selected.id, { delivery_fee: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl text-[13px] outline-none focus:border-[#7C3AED]" />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-[600] text-[#374151] mb-1">Minimum order (₹)</label>
                      <input type="number" min={0} value={selected.min_order} onChange={(e) => patch(selected.id, { min_order: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl text-[13px] outline-none focus:border-[#7C3AED]" />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-[12.5px] font-[600] text-[#111827]">Cash on delivery only</p><p className="text-[11px] text-[#9CA3AF]">No online payment for addresses here.</p></div>
                      <Switch on={selected.cod_only} onClick={() => patch(selected.id, { cod_only: !selected.cod_only })} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-[12.5px] font-[600] text-[#111827]">Executive must confirm</p><p className="text-[11px] text-[#9CA3AF]">Orders are held until an executive calls and confirms. Always cash only.</p></div>
                      <Switch on={selected.needs_confirmation} tone="bg-[#DC2626]" onClick={() => patch(selected.id, { needs_confirmation: !selected.needs_confirmation })} />
                    </div>
                    {selected.kind === 'zone' && (
                      <div className="flex items-center justify-between gap-3">
                        <div><p className="text-[12.5px] font-[600] text-[#111827]">Active</p><p className="text-[11px] text-[#9CA3AF]">Turn off to stop using this zone without deleting it.</p></div>
                        <Switch on={selected.is_active} onClick={() => patch(selected.id, { is_active: !selected.is_active })} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button onClick={() => save(selected.id)} disabled={busy || !isDirty(selected.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] text-white text-[12.5px] font-[700] hover:bg-[#15803D] disabled:opacity-50 transition-all">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                    {isDirty(selected.id) && (
                      <button onClick={() => discard(selected.id)} className="px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-[12.5px] font-[600] text-[#374151]">Discard</button>
                    )}
                    {selected.kind === 'zone' && (
                      <button onClick={() => remove(selected.id)} disabled={busy} className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl border border-[#FECACA] text-[12.5px] font-[600] text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-4 text-[12.5px] text-[#6B7280]">
                  Tap a zone on the map or in the list to edit its corners and price. Use <b>Add zone</b> to draw a new one.
                </div>
              )}

              <div className="bg-white rounded-2xl border border-[#E5E7EB]">
                <div className="px-4 py-3 border-b border-[#F3F4F6]">
                  <h2 className="text-[13.5px] font-[700] text-[#111827]">Zones</h2>
                  <p className="text-[11.5px] text-[#9CA3AF]">Where zones overlap, the one higher in this list wins.</p>
                </div>
                <div className="divide-y divide-[#F3F4F6]">
                  {zones.map((z, i) => (
                    <div key={z.id} className={cn('flex items-center gap-2.5 px-4 py-3 cursor-pointer transition-all', selectedId === z.id ? 'bg-[#F5F3FF]' : 'hover:bg-[#F8FAFC]', !z.is_active && 'opacity-55')} onClick={() => setSelectedId(z.id)}>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: z.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-[700] text-[#111827] truncate">{z.name}{isNew(z.id) && <span className="ml-1.5 text-[10.5px] font-[700] text-[#B45309]">new</span>}</p>
                        <p className="text-[11.5px] text-[#6B7280] truncate">{ruleLine(z)}</p>
                      </div>
                      <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <button disabled={busy || i === 0 || isNew(z.id)} onClick={() => move(z.id, -1)} className="text-[#9CA3AF] hover:text-[#7C3AED] disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button disabled={busy || i === zones.length - 1 || isNew(z.id)} onClick={() => move(z.id, 1)} className="text-[#9CA3AF] hover:text-[#7C3AED] disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  {zones.length === 0 && <p className="px-4 py-6 text-center text-[12.5px] text-[#9CA3AF]">No zones yet. Use Add zone to draw the first one.</p>}
                  {outside && (
                    <div className={cn('flex items-center gap-2.5 px-4 py-3 cursor-pointer', selectedId === outside.id ? 'bg-[#FEF2F2]' : 'hover:bg-[#F8FAFC]')} onClick={() => setSelectedId(outside.id)}>
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#DC2626]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-[700] text-[#111827]">Outside every zone</p>
                        <p className="text-[11.5px] text-[#6B7280] truncate">{ruleLine(outside)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
