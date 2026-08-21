'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Trash2, ToggleLeft, ToggleRight, Loader2, CheckCircle, AlertCircle, Bike, Copy, Star, Package2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createClient()

type Partner = {
  id: string; name: string; slug: string; phone: string | null
  vehicle_type: string | null; vehicle_number: string | null
  is_active: boolean; is_available: boolean; rating: number | null; total_deliveries: number | null
}

const EMPTY_FORM = { name: '', phone: '', vehicle_type: 'motorcycle', vehicle_number: '' }

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminDeliveryPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState('')

  const load = useCallback(async () => {
    const { data: parts } = await supabase.from('delivery_partners')
      .select('id, name, slug, phone, vehicle_type, vehicle_number, is_active, is_available, rating, total_deliveries')
      .order('created_at', { ascending: false })
    setPartners((parts as Partner[]) ?? [])

    const { data: ords } = await supabase.from('orders').select('delivery_partner_id').not('delivery_partner_id', 'is', null)
    const counts: Record<string, number> = {}
    for (const o of ords ?? []) {
      const id = (o as { delivery_partner_id: string }).delivery_partner_id
      counts[id] = (counts[id] ?? 0) + 1
    }
    setOrderCounts(counts)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function addPartner(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { setError('Name is required'); return }
    setSaving(true); setError('')
    const slug = slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6)
    const { error: err } = await supabase.from('delivery_partners').insert({
      name: form.name,
      slug,
      phone: form.phone || null,
      vehicle_type: form.vehicle_type || null,
      vehicle_number: form.vehicle_number || null,
      is_active: true,
      is_available: true,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowModal(false)
    setForm(EMPTY_FORM)
    load()
  }

  async function toggleActive(p: Partner) {
    await supabase.from('delivery_partners').update({ is_active: !p.is_active }).eq('id', p.id)
    setPartners((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
  }

  async function deletePartner(id: string) {
    if (!confirm('Remove this delivery partner? Any orders assigned to them will become unassigned.')) return
    await supabase.from('delivery_partners').delete().eq('id', id)
    setPartners((prev) => prev.filter((x) => x.id !== id))
  }

  function copyLink(p: Partner) {
    const url = `${window.location.origin}/delivery/${p.slug}/orders`
    navigator.clipboard.writeText(url)
    setCopiedId(p.id)
    setTimeout(() => setCopiedId(''), 2000)
  }

  const filtered = partners.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Delivery Partners</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{partners.length} riders · {partners.filter((p) => p.is_active).length} active</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#7C3AED] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search riders..."
                  className="bg-transparent text-[13px] outline-none w-40 placeholder:text-[#9CA3AF]" />
              </div>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
                <Plus className="w-4 h-4" /> Add Delivery Partner
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl border border-[#E5E7EB] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[#9CA3AF]">
              <Bike className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No delivery partners yet</p>
              <button onClick={() => setShowModal(true)} className="text-[13px] text-[#7C3AED] font-medium">+ Add your first rider</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className={cn('bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-zippy-sm', !p.is_active && 'opacity-60')}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[#F5F3FF] flex items-center justify-center shrink-0">
                      <Bike className="w-5 h-5 text-[#7C3AED]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-[700] text-[#111827] truncate">{p.name}</h3>
                      <p className="text-[12px] text-[#9CA3AF]">{p.phone ?? 'No phone on file'}</p>
                    </div>
                    <button onClick={() => toggleActive(p)} title={p.is_active ? 'Active' : 'Inactive'}>
                      {p.is_active ? <ToggleRight className="w-7 h-7 text-[#16A34A]" /> : <ToggleLeft className="w-7 h-7 text-[#D1D5DB]" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11.5px] text-[#6B7280] mb-3">
                    <span className="capitalize">{p.vehicle_type ?? '—'}{p.vehicle_number ? ` · ${p.vehicle_number}` : ''}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[#F8FAFC] rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-0.5 text-[13px] font-[700] text-[#111827]">
                        <Star className="w-3 h-3 text-[#D97706] fill-[#D97706]" />{p.rating ?? '—'}
                      </div>
                      <div className="text-[10px] text-[#9CA3AF]">Rating</div>
                    </div>
                    <div className="bg-[#F8FAFC] rounded-lg p-2 text-center">
                      <div className="text-[13px] font-[700] text-[#111827]">{orderCounts[p.id] ?? 0}</div>
                      <div className="text-[10px] text-[#9CA3AF]">Assigned</div>
                    </div>
                    <div className="bg-[#F8FAFC] rounded-lg p-2 text-center">
                      <div className="text-[13px] font-[700] text-[#111827]">{p.total_deliveries ?? 0}</div>
                      <div className="text-[10px] text-[#9CA3AF]">Delivered</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => copyLink(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E7EB] rounded-lg text-[12px] font-medium text-[#374151] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                      {copiedId === p.id ? <CheckCircle className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === p.id ? 'Copied!' : 'Copy Portal Link'}
                    </button>
                    <button onClick={() => deletePartner(p.id)} className="text-[#DC2626] hover:bg-[#FEF2F2] p-2 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <h2 className="text-[17px] font-[800] text-[#111827] mb-5 flex items-center gap-2">
              <Package2 className="w-5 h-5 text-[#7C3AED]" /> Add Delivery Partner
            </h2>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#DC2626] mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <form className="space-y-4" onSubmit={addPartner}>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Full Name *</label>
                <input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="e.g. Ravi Kumar" required
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Phone Number</label>
                <input value={form.phone} onChange={(e) => setF('phone', e.target.value)} placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Vehicle</label>
                  <select value={form.vehicle_type} onChange={(e) => setF('vehicle_type', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] bg-white transition-all">
                    <option value="bicycle">Bicycle</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="car">Car</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Vehicle No.</label>
                  <input value={form.vehicle_number} onChange={(e) => setF('vehicle_number', e.target.value)} placeholder="KA-01-AB-1234"
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#6D28D9] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
