'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MapPin, Plus, Search, Trash2, LocateFixed } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdminSidebar from '@/components/admin/AdminSidebar'

const supabase = createClient()
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

type Place = {
  id: string
  name: string
  kind: string
  area: string | null
  keywords: string | null
  latitude: number
  longitude: number
  is_active: boolean
}

const KINDS = ['Landmark', 'Gully / Street', 'Shop', 'Hospital', 'School / College', 'Temple / Mosque', 'Bus stand', 'Bank / ATM', 'Hotel / Lodge', 'Petrol pump', 'Area / Village']

// Map maths (Mapbox static images use 512px tiles). Click on the picture -> coordinates.
const ZOOM = 16
const WORLD = 512 * 2 ** ZOOM
const W = 640
const H = 380
const toX = (lng: number) => ((lng + 180) / 360) * WORLD
const toY = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180)
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD
}
const toLng = (x: number) => (x / WORLD) * 360 - 180
const toLat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / WORLD))) * 180) / Math.PI

const TOWN = { lat: 13.7092, lng: 75.8157 }

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  const [name, setName] = useState('')
  const [kind, setKind] = useState(KINDS[0])
  const [area, setArea] = useState('')
  const [keywords, setKeywords] = useState('')
  const [center, setCenter] = useState(TOWN)
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)
  const [query, setQuery] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('tarikere_places').select('*').order('created_at', { ascending: false })
    setPlaces((data as Place[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const mapUrl = useMemo(
    () => `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${center.lng},${center.lat},${ZOOM},0/${W}x${H}@2x?access_token=${TOKEN}`,
    [center]
  )

  // Where the pin sits inside the picture (if it is inside the visible area).
  const pinXY = pin ? { x: W / 2 + (toX(pin.lng) - toX(center.lng)), y: H / 2 + (toY(pin.lat) - toY(center.lat)) } : null

  function onMapClick(e: React.MouseEvent<HTMLImageElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const py = ((e.clientY - r.top) / r.height) * H
    setPin({ lat: toLat(toY(center.lat) + (py - H / 2)), lng: toLng(toX(center.lng) + (px - W / 2)) })
  }

  async function findOnMap() {
    if (!query.trim() || !TOKEN) return
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ' Tarikere')}.json?access_token=${TOKEN}&country=in&limit=1&proximity=${TOWN.lng},${TOWN.lat}&bbox=75.74,13.66,75.90,13.78`
    )
    const j = await res.json()
    const f = j.features?.[0]
    if (!f) { setMsg('Nothing found for that search — click the map instead.'); return }
    setCenter({ lat: f.center[1], lng: f.center[0] })
    setPin({ lat: f.center[1], lng: f.center[0] })
    setMsg('')
  }

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition(
      (p) => { const c = { lat: p.coords.latitude, lng: p.coords.longitude }; setCenter(c); setPin(c) },
      () => setMsg('Could not read your location.')
    )
  }

  async function save() {
    if (!name.trim()) { setMsg('Give the place a name.'); return }
    if (!pin) { setMsg('Click the map to drop the pin on the exact spot.'); return }
    setSaving(true)
    const { error } = await supabase.from('tarikere_places').insert({
      name: name.trim(), kind, area: area.trim() || null, keywords: keywords.trim() || null,
      latitude: pin.lat, longitude: pin.lng,
    })
    setSaving(false)
    if (error) { setMsg('Could not save the place.'); return }
    setMsg(`Added ${name.trim()}. It shows in the app's search straight away.`)
    setName(''); setArea(''); setKeywords(''); setPin(null)
    load()
  }

  async function toggle(p: Place) {
    setPlaces((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)))
    const { error } = await supabase.from('tarikere_places').update({ is_active: !p.is_active }).eq('id', p.id)
    if (error) { setMsg('Could not update.'); load() }
  }

  async function remove(p: Place) {
    if (!window.confirm(`Delete "${p.name}"?`)) return
    const { error } = await supabase.from('tarikere_places').delete().eq('id', p.id)
    if (error) setMsg('Could not delete.'); else load()
  }

  const shown = places.filter((p) => !filter.trim() || `${p.name} ${p.kind} ${p.area ?? ''}`.toLowerCase().includes(filter.toLowerCase()))
  const input = 'mt-1 w-full px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30'

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Tarikere Places</h1>
          <p className="text-[12.5px] text-[#9CA3AF]">Gullies, shops and landmarks that riders can search for when booking an auto. Add each one once, on the exact spot.</p>
        </div>

        <div className="p-6 space-y-4">
          {msg && <div className="px-4 py-2.5 rounded-xl bg-[#F3E8FF] text-[#6D28D9] text-[13px]">{msg}</div>}

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[14px] font-[700] text-[#111827]"><Plus className="w-4 h-4 text-[#7C3AED]" /> Add a place</p>
              <label className="block text-[11.5px] font-[600] text-[#6B7280]">Name (what riders will type)
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gandhi Nagar 2nd Cross" className={input} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[11.5px] font-[600] text-[#6B7280]">Type
                  <select value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
                    {KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
                <label className="block text-[11.5px] font-[600] text-[#6B7280]">Area (optional)
                  <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Near Town Hall" className={input} /></label>
              </div>
              <label className="block text-[11.5px] font-[600] text-[#6B7280]">Other names riders might type (optional)
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="gandhi nagar, 2nd cross" className={input} /></label>
              <p className="text-[12px] text-[#6B7280]">
                {pin ? <>Pin set at <span className="font-mono">{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span></> : 'No pin yet — click the map on the right.'}
              </p>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#7C3AED] text-white text-[13px] font-[600] hover:bg-[#6D28D9] disabled:opacity-50">
                {saving ? 'Saving…' : 'Save place'}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && findOnMap()}
                  placeholder="Jump the map to a street or area…" className="flex-1 px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13px] outline-none" />
                <button onClick={findOnMap} className="px-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB]" aria-label="Find on map"><Search className="w-4 h-4" /></button>
                <button onClick={useMyLocation} className="px-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB]" aria-label="Use my location" title="Use my location (stand at the spot)"><LocateFixed className="w-4 h-4" /></button>
              </div>
              {TOKEN ? (
                <div className="relative rounded-xl overflow-hidden border border-[#E5E7EB] cursor-crosshair select-none" style={{ aspectRatio: `${W}/${H}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={imgRef} src={mapUrl} alt="Map of Tarikere" onClick={onMapClick} draggable={false} className="w-full h-full object-cover" />
                  {pinXY && pinXY.x > 0 && pinXY.x < W && pinXY.y > 0 && pinXY.y < H && (
                    <MapPin className="absolute w-8 h-8 text-[#EF4444] fill-[#EF4444]/30 pointer-events-none"
                      style={{ left: `${(pinXY.x / W) * 100}%`, top: `${(pinXY.y / H) * 100}%`, transform: 'translate(-50%, -100%)' }} />
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[#B91C1C]">Set NEXT_PUBLIC_MAPBOX_TOKEN to use the map.</p>
              )}
              <p className="text-[11.5px] text-[#9CA3AF]">Search to jump near the place, then click the exact spot. Standing there? Use the locate button.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[14px] font-[700] text-[#111827]">{places.length} place{places.length === 1 ? '' : 's'} added</p>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-[13px] outline-none" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-[#7C3AED] animate-spin" /></div>
          ) : shown.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center text-[13px] text-[#9CA3AF]">No places yet. The app still finds hospitals, banks, temples and the bus stand from its built-in list.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
              {shown.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-[600] text-[#111827] truncate">{p.name} <span className="ml-1.5 text-[11px] font-normal text-[#7C3AED]">{p.kind}</span></p>
                    <p className="text-[12px] text-[#6B7280] truncate">{p.area ? `${p.area} · ` : ''}{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggle(p)} className={cn('px-3 py-1 rounded-full text-[11.5px] font-[700]', p.is_active ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F3F4F6] text-[#6B7280]')}>
                      {p.is_active ? 'Showing' : 'Hidden'}
                    </button>
                    <button onClick={() => remove(p)} className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2]" aria-label={`Delete ${p.name}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
