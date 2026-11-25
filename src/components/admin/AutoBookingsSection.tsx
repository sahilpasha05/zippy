'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, Search, Car, MapPin, Plus, Trash2, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import TimeAgo from '@/components/TimeAgo'

const supabase = createClient()

type Booking = {
  id: string
  status: string
  ride_type: string
  pickup_address: string
  drop_address: string
  fare: number
  tip: number
  total: number
  payment_method: string
  payment_status: string
  customer_name: string | null
  customer_phone: string | null
  source: string
  created_at: string
  partner_id: string | null
  assigned_at: string | null
}

type Partner = {
  id: string
  name: string
  phone: string
  vehicle_number: string | null
  is_active: boolean
}

const STATUSES = ['requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'] as const
const LABEL: Record<string, string> = {
  requested: 'Requested',
  accepted: 'Accepted',
  arrived: 'Driver arrived',
  in_progress: 'On the way',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
const COLOR: Record<string, string> = {
  requested: 'bg-[#FEF3C7] text-[#B45309]',
  accepted: 'bg-[#DBEAFE] text-[#1D4ED8]',
  arrived: 'bg-[#E0E7FF] text-[#4338CA]',
  in_progress: 'bg-[#F3E8FF] text-[#7C3AED]',
  completed: 'bg-[#DCFCE7] text-[#15803D]',
  cancelled: 'bg-[#FEE2E2] text-[#B91C1C]',
}
const TABS = ['All', 'Active', 'Completed', 'Cancelled'] as const

export default function AutoBookingsSection() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Active')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])
  const [showPartners, setShowPartners] = useState(false)
  const [pName, setPName] = useState('')
  const [pPhone, setPPhone] = useState('')
  const [pVehicle, setPVehicle] = useState('')
  const [savingPartner, setSavingPartner] = useState(false)

  const loadPartners = useCallback(async () => {
    const { data } = await supabase
      .from('auto_partners')
      .select('id, name, phone, vehicle_number, is_active')
      .order('name')
    setPartners((data as Partner[]) ?? [])
  }, [])

  async function addPartner() {
    const phone = pPhone.replace(/\D/g, '').slice(-10)
    if (!pName.trim() || phone.length !== 10) { setError('Enter the partner name and a 10-digit phone number.'); return }
    setSavingPartner(true)
    const { error: err } = await supabase.from('auto_partners').insert({
      name: pName.trim(), phone: `91${phone}`, vehicle_number: pVehicle.trim().toUpperCase() || null,
    })
    setSavingPartner(false)
    if (err) { setError('Could not add the partner.'); return }
    setError(''); setPName(''); setPPhone(''); setPVehicle('')
    loadPartners()
  }

  async function togglePartner(p: Partner) {
    setPartners((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)))
    const { error: err } = await supabase.from('auto_partners').update({ is_active: !p.is_active }).eq('id', p.id)
    if (err) { setError('Could not update the partner.'); loadPartners() }
  }

  async function removePartner(p: Partner) {
    if (!window.confirm(`Remove ${p.name}? Their past bookings stay, but become unassigned.`)) return
    const { error: err } = await supabase.from('auto_partners').delete().eq('id', p.id)
    if (err) { setError('Could not remove the partner.'); return }
    loadPartners(); load()
  }

  async function assignPartner(b: Booking, partnerId: string) {
    const patch: Record<string, unknown> = {
      partner_id: partnerId || null,
      assigned_at: partnerId ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    // Handing a waiting booking to a partner accepts it.
    if (partnerId && b.status === 'requested') patch.status = 'accepted'
    setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...patch } as Booking : x)))
    const { error: err } = await supabase.from('auto_bookings').update(patch).eq('id', b.id)
    if (err) { setError('Could not assign the partner.'); load() }
  }

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('auto_bookings')
      .select('id, status, ride_type, pickup_address, drop_address, fare, tip, total, payment_method, payment_status, customer_name, customer_phone, source, created_at, partner_id, assigned_at')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (err) setError('Could not load bookings. Make sure you are signed in as an admin.')
    else setError('')
    setBookings((data as Booking[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    loadPartners()
    const channel = supabase
      .channel('admin-auto-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auto_bookings' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load, loadPartners])

  async function setStatus(id: string, status: string) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
    const { error: err } = await supabase
      .from('auto_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) { setError('Could not update the booking.'); load() }
  }

  const isActive = (s: string) => !['completed', 'cancelled'].includes(s)
  const q = search.trim().toLowerCase()
  const shown = bookings.filter((b) => {
    const matchTab =
      tab === 'All' ? true :
      tab === 'Active' ? isActive(b.status) :
      tab === 'Completed' ? b.status === 'completed' :
      b.status === 'cancelled'
    const matchSearch = !q ||
      (b.customer_name ?? '').toLowerCase().includes(q) ||
      (b.customer_phone ?? '').toLowerCase().includes(q) ||
      b.pickup_address.toLowerCase().includes(q) ||
      b.drop_address.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    return matchTab && matchSearch
  })
  const activeCnt = bookings.filter((b) => isActive(b.status)).length
  const todayRevenue = bookings
    .filter((b) => b.status === 'completed' && new Date(b.created_at).toDateString() === new Date().toDateString())
    .reduce((s, b) => s + Number(b.total), 0)

  return (
    <section id="auto-bookings" className="mt-8">
        <div className="bg-white border-y border-[#E5E7EB] px-6 py-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Auto Bookings</h2>
              <p className="text-[12.5px] text-[#9CA3AF]">
                {loading ? 'Loading…' : `${bookings.length} total · ${activeCnt} active · ₹${todayRevenue} completed today`}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, place…"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F3F4F6] text-[13px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-4 py-1.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-all',
                  tab === t ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                {t}
                {t === 'Active' && activeCnt > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-[#EF4444] text-white text-[10px] rounded-full">{activeCnt}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
            <button onClick={() => setShowPartners((v) => !v)} className="w-full flex items-center justify-between">
              <span className="flex items-center gap-2 text-[14px] font-[700] text-[#111827]">
                <UserCheck className="w-4 h-4 text-[#7C3AED]" /> Auto partners
                <span className="text-[12px] font-normal text-[#9CA3AF]">
                  {partners.filter((p) => p.is_active).length} active · {partners.length} total
                </span>
              </span>
              <span className="text-[12px] font-[600] text-[#7C3AED]">{showPartners ? 'Hide' : 'Manage'}</span>
            </button>

            {showPartners && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-2 sm:grid-cols-4">
                  <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Driver name"
                    className="px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                  <input value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="Phone (10 digits)" inputMode="numeric"
                    className="px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                  <input value={pVehicle} onChange={(e) => setPVehicle(e.target.value)} placeholder="Auto number (KA 18 …)"
                    className="px-3 py-2 rounded-xl bg-[#F3F4F6] text-[13px] outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                  <button onClick={addPartner} disabled={savingPartner}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[13px] font-[600] hover:bg-[#6D28D9] disabled:opacity-50">
                    <Plus className="w-4 h-4" /> {savingPartner ? 'Adding…' : 'Add partner'}
                  </button>
                </div>

                {partners.length === 0 ? (
                  <p className="text-[12.5px] text-[#9CA3AF]">No auto partners yet. Add your first driver above.</p>
                ) : (
                  <div className="divide-y divide-[#F3F4F6] border border-[#F3F4F6] rounded-xl">
                    {partners.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-[600] text-[#111827]">{p.name}</p>
                          <p className="text-[12px] text-[#6B7280]">+{p.phone}{p.vehicle_number ? ` · ${p.vehicle_number}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => togglePartner(p)}
                            className={cn('px-3 py-1 rounded-full text-[11.5px] font-[700]',
                              p.is_active ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F3F4F6] text-[#6B7280]')}>
                            {p.is_active ? 'Active' : 'Off duty'}
                          </button>
                          <button onClick={() => removePartner(p)} className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2]"
                            aria-label={`Remove ${p.name}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <div className="px-4 py-2.5 rounded-xl bg-[#FEE2E2] text-[#B91C1C] text-[13px]">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#7C3AED] animate-spin" /></div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 bg-white rounded-2xl border border-[#E5E7EB]">
              <Car className="w-8 h-8 text-[#D1D5DB]" />
              <p className="text-[14px] font-[600] text-[#374151]">No auto bookings found</p>
            </div>
          ) : (
            shown.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-mono text-[#6B7280]">{b.id.slice(0, 8).toUpperCase()}</span>
                    <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-[700]', COLOR[b.status] ?? 'bg-[#F3F4F6] text-[#6B7280]')}>
                      {LABEL[b.status] ?? b.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-[700] bg-[#DBEAFE] text-[#1D4ED8]">
                      {b.source === 'app' ? 'App' : b.source === 'website' ? 'Website' : b.source}
                    </span>
                  </div>
                  <span className="text-[12px] text-[#9CA3AF]"><TimeAgo date={b.created_at} /></span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10.5px] font-[700] text-[#10B981] uppercase tracking-wider">Pickup</p>
                        <p className="text-[13.5px] text-[#111827]">{b.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10.5px] font-[700] text-[#D97706] uppercase tracking-wider">Drop-off</p>
                        <p className="text-[13.5px] text-[#111827]">{b.drop_address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[13px]">
                    <p className="text-[#111827] font-[600]">{b.customer_name ?? 'Customer'}</p>
                    {b.customer_phone && (
                      <a href={`tel:+${b.customer_phone}`} className="inline-flex items-center gap-1.5 text-[#7C3AED] hover:underline">
                        <Phone className="w-3.5 h-3.5" /> +{b.customer_phone}
                      </a>
                    )}
                    <p className="text-[#6B7280]">
                      Fare ₹{Number(b.fare)} + tip ₹{Number(b.tip)} = <strong className="text-[#111827]">₹{Number(b.total)}</strong>
                    </p>
                    <p className="text-[#6B7280]">
                      Pay: {b.payment_method === 'cod' ? 'Cash / UPI to driver' : b.payment_method.toUpperCase()} · {b.payment_status}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F3F4F6] flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] text-[#9CA3AF]">Auto partner</span>
                  <select value={b.partner_id ?? ''} onChange={(e) => assignPartner(b, e.target.value)}
                    disabled={['completed', 'cancelled'].includes(b.status)}
                    className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] text-[12.5px] font-[600] outline-none disabled:opacity-60">
                    <option value="">Unassigned</option>
                    {partners.filter((p) => p.is_active || p.id === b.partner_id).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.vehicle_number ? ` · ${p.vehicle_number}` : ''}{p.is_active ? '' : ' (off duty)'}</option>
                    ))}
                  </select>
                  {b.partner_id && (() => {
                    const p = partners.find((x) => x.id === b.partner_id)
                    return p ? (
                      <a href={`tel:+${p.phone}`} className="inline-flex items-center gap-1 text-[12px] text-[#7C3AED] hover:underline">
                        <Phone className="w-3 h-3" /> +{p.phone}
                      </a>
                    ) : null
                  })()}
                  <span className="text-[12px] text-[#9CA3AF] ml-2">Status</span>
                  <select value={b.status} onChange={(e) => setStatus(b.id, e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] text-[12.5px] font-[600] outline-none">
                    {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
    </section>
  )
}
