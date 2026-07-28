'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, UserPlus, UserCheck, UserX, Save, Copy, ExternalLink, Trash2, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Restaurant = {
  id: string; name: string; slug: string; cuisine: string[]; description: string
  cover_url: string | null; logo_url: string | null; address: string
  delivery_time: number; min_order: number; delivery_fee: number
  is_open: boolean; is_active: boolean; owner_id: string | null
}

export default function ManageRestaurantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerLookupMsg, setOwnerLookupMsg] = useState('')
  const [copied, setCopied] = useState(false)
  // Delete flow
  const [deleteStep, setDeleteStep] = useState(0) // 0 = closed, 1..5 = steps
  const [deleteNameInput, setDeleteNameInput] = useState('')
  const [deleteWordInput, setDeleteWordInput] = useState('')
  const [deleteAck, setDeleteAck] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('restaurants').select('*').eq('id', id).single()
      if (data) {
        setRestaurant(data as Restaurant)
        if (data.owner_id) {
          const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', data.owner_id).single()
          if (profile) { setOwnerEmail(profile.email ?? ''); setOwnerName(profile.full_name ?? '') }
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function lookupOwner() {
    if (!ownerEmail) return
    setOwnerLookupMsg('Looking up...')
    const { data } = await supabase.from('profiles').select('id, full_name').eq('email', ownerEmail).single()
    if (data) {
      setRestaurant((r) => r ? { ...r, owner_id: data.id } : r)
      setOwnerName(data.full_name ?? ownerEmail)
      setOwnerLookupMsg(`Found: ${data.full_name ?? ownerEmail}`)
    } else {
      setOwnerLookupMsg('No user found with that email.')
    }
  }

  async function removeOwner() {
    setRestaurant((r) => r ? { ...r, owner_id: null } : r)
    setOwnerEmail(''); setOwnerName(''); setOwnerLookupMsg('')
  }

  async function save() {
    if (!restaurant) return
    setSaving(true); setError('')
    const { error: err } = await supabase.from('restaurants').update({
      name: restaurant.name, slug: restaurant.slug, description: restaurant.description,
      cuisine: restaurant.cuisine, cover_url: restaurant.cover_url, logo_url: restaurant.logo_url,
      address: restaurant.address, delivery_time: restaurant.delivery_time,
      min_order: restaurant.min_order, delivery_fee: restaurant.delivery_fee,
      is_open: restaurant.is_open, is_active: restaurant.is_active, owner_id: restaurant.owner_id,
    }).eq('id', id)
    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setSaving(false)
  }

  function setField(field: keyof Restaurant, value: unknown) {
    setRestaurant((r) => r ? { ...r, [field]: value } : r)
  }

  function closeDelete() {
    setDeleteStep(0); setDeleteNameInput(''); setDeleteWordInput(''); setDeleteAck(false); setDeleteError('')
  }

  async function executeDelete() {
    if (!restaurant) return
    setDeleting(true); setDeleteError('')
    // Detach orders first so the FK doesn't block the delete
    await supabase.from('orders').update({ restaurant_id: null }).eq('restaurant_id', restaurant.id)
    const { error: err } = await supabase.from('restaurants').delete().eq('id', restaurant.id)
    setDeleting(false)
    if (err) { setDeleteError(err.message); return }
    router.push('/admin/restaurants')
  }

  if (loading) return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
      </main>
    </div>
  )

  if (!restaurant) return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-[15px] text-[#374151]">Restaurant not found</p>
        <Link href="/admin/restaurants" className="text-[#7C3AED] text-[13px]">← Back to restaurants</Link>
      </main>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/restaurants">
                <button className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E7EB] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div>
                <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>{restaurant.name}</h1>
                <p className="text-[12.5px] text-[#9CA3AF]">Edit restaurant details</p>
              </div>
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)] disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[13px] text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Basic */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <h2 className="text-[14px] font-[700] text-[#111827]">Basic Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Restaurant Name</label>
                <input value={restaurant.name} onChange={(e) => setField('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Slug</label>
                <input value={restaurant.slug} onChange={(e) => setField('slug', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all font-mono" />
              </div>
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Address</label>
                <input value={restaurant.address ?? ''} onChange={(e) => setField('address', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Description</label>
                <textarea value={restaurant.description ?? ''} onChange={(e) => setField('description', e.target.value)}
                  rows={2} className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all resize-none" />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <h2 className="text-[14px] font-[700] text-[#111827]">Delivery Settings</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Delivery Time (min)</label>
                <input type="number" value={restaurant.delivery_time} onChange={(e) => setField('delivery_time', +e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Min Order (₹)</label>
                <input type="number" value={restaurant.min_order} onChange={(e) => setField('min_order', +e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Delivery Fee (₹)</label>
                <input type="number" value={restaurant.delivery_fee} onChange={(e) => setField('delivery_fee', +e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={restaurant.is_open} onChange={(e) => setField('is_open', e.target.checked)} className="w-4 h-4 accent-[#7C3AED]" />
                <span className="text-[13px] text-[#374151]">Open now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={restaurant.is_active} onChange={(e) => setField('is_active', e.target.checked)} className="w-4 h-4 accent-[#7C3AED]" />
                <span className="text-[13px] text-[#374151]">Active (visible on app)</span>
              </label>
            </div>
          </div>

          {/* Owner Assignment */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-[14px] font-[700] text-[#111827]">Restaurant Owner</h2>
            </div>

            {restaurant.owner_id ? (
              <div className="flex items-center gap-3 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl">
                <div className="w-9 h-9 bg-[#16A34A] rounded-xl flex items-center justify-center text-white font-bold">
                  {ownerName ? ownerName[0].toUpperCase() : '?'}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-[600] text-[#111827]">{ownerName || 'Owner'}</p>
                  <p className="text-[11.5px] text-[#6B7280]">{ownerEmail}</p>
                </div>
                <UserCheck className="w-4 h-4 text-[#16A34A]" />
                <button onClick={removeOwner} className="text-[11.5px] text-[#DC2626] hover:text-[#B91C1C] font-medium ml-2">Remove</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
                <UserX className="w-4 h-4 text-[#DC2626]" />
                <p className="text-[12.5px] text-[#DC2626]">No owner assigned — restaurant won't appear in restaurant portal</p>
              </div>
            )}

            <div className="flex gap-2">
              <input value={ownerEmail} onChange={(e) => { setOwnerEmail(e.target.value); setOwnerLookupMsg('') }}
                placeholder="owner@example.com" type="email"
                className="flex-1 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              <button type="button" onClick={lookupOwner}
                className="px-4 py-2.5 bg-[#F5F3FF] text-[#7C3AED] text-[13px] font-[600] rounded-xl hover:bg-[#EDE9FE] transition-all border border-[#DDD6FE]">
                Lookup &amp; Assign
              </button>
            </div>
            {ownerLookupMsg && (
              <p className={`text-[12px] font-medium ${restaurant.owner_id ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{ownerLookupMsg}</p>
            )}
            <p className="text-[11.5px] text-[#9CA3AF]">User must have signed up on Zippy before they can be assigned as an owner.</p>
          </div>

          {/* Portal Link */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-[14px] font-[700] text-[#111827]">Restaurant Portal Link</h2>
            </div>
            <p className="text-[12.5px] text-[#6B7280]">
              Share this link with the restaurant owner. They log in with their account and this portal shows their restaurant automatically.
            </p>
            <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
              <span className="flex-1 text-[12.5px] font-mono text-[#374151] truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}/restaurant/{restaurant.slug}/dashboard
              </span>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/restaurant/${restaurant.slug}/dashboard`
                  navigator.clipboard.writeText(url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7C3AED] text-white text-[12px] font-[600] rounded-lg hover:bg-[#6D28D9] transition-all shrink-0">
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a
              href={`/restaurant/${restaurant.slug}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-[#7C3AED] font-medium hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Open portal in new tab
            </a>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-[#FECACA] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
              <h2 className="text-[14px] font-[700] text-[#DC2626]">Danger Zone</h2>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13.5px] font-[600] text-[#111827]">Delete this restaurant</p>
                <p className="text-[12px] text-[#6B7280]">Permanently removes the restaurant from the platform. This cannot be undone.</p>
              </div>
              <button onClick={() => setDeleteStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#FECACA] text-[#DC2626] text-[12.5px] font-[600] rounded-xl hover:bg-[#FEF2F2] transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* Multi-step delete confirmation */}
        {deleteStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDelete} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
                <h2 className="text-[16px] font-[800] text-[#DC2626]">Delete &quot;{restaurant.name}&quot;</h2>
              </div>
              <p className="text-[11.5px] text-[#9CA3AF] mb-5">Confirmation step {deleteStep} of 5</p>

              {deleteError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#DC2626] mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {deleteError}
                </div>
              )}

              {deleteStep === 1 && (
                <>
                  <p className="text-[13.5px] text-[#374151] mb-5 leading-relaxed">
                    Are you absolutely sure? Deleting <strong>{restaurant.name}</strong> removes it from the customer app, the admin panel, and the owner&apos;s portal — permanently.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={closeDelete} className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC]">Cancel</button>
                    <button onClick={() => setDeleteStep(2)} className="flex-1 py-3 bg-[#DC2626] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#B91C1C]">Yes, continue</button>
                  </div>
                </>
              )}

              {deleteStep === 2 && (
                <>
                  <p className="text-[13.5px] text-[#374151] mb-3">Type the restaurant name exactly to continue:</p>
                  <p className="text-[13px] font-mono font-bold text-[#111827] bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-3 py-2 mb-3 select-none">{restaurant.name}</p>
                  <input value={deleteNameInput} onChange={(e) => setDeleteNameInput(e.target.value)}
                    placeholder="Restaurant name" autoFocus
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#DC2626] transition-all mb-4" />
                  <div className="flex gap-3">
                    <button onClick={closeDelete} className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC]">Cancel</button>
                    <button onClick={() => setDeleteStep(3)} disabled={deleteNameInput !== restaurant.name}
                      className="flex-1 py-3 bg-[#DC2626] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed">Continue</button>
                  </div>
                </>
              )}

              {deleteStep === 3 && (
                <>
                  <p className="text-[13.5px] text-[#374151] mb-4">Now type <span className="font-mono font-bold text-[#DC2626]">DELETE</span> in capital letters:</p>
                  <input value={deleteWordInput} onChange={(e) => setDeleteWordInput(e.target.value)}
                    placeholder="DELETE" autoFocus
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#DC2626] transition-all mb-4 font-mono" />
                  <div className="flex gap-3">
                    <button onClick={closeDelete} className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC]">Cancel</button>
                    <button onClick={() => setDeleteStep(4)} disabled={deleteWordInput !== 'DELETE'}
                      className="flex-1 py-3 bg-[#DC2626] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed">Continue</button>
                  </div>
                </>
              )}

              {deleteStep === 4 && (
                <>
                  <label className="flex items-start gap-3 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl mb-4 cursor-pointer">
                    <input type="checkbox" checked={deleteAck} onChange={(e) => setDeleteAck(e.target.checked)} className="w-4 h-4 accent-[#DC2626] mt-0.5" />
                    <span className="text-[12.5px] text-[#7F1D1D] leading-relaxed">
                      I understand that <strong>{restaurant.name}</strong> and its portal access will be permanently deleted, its past orders will be detached, and this action cannot be undone.
                    </span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={closeDelete} className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC]">Cancel</button>
                    <button onClick={() => setDeleteStep(5)} disabled={!deleteAck}
                      className="flex-1 py-3 bg-[#DC2626] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed">Continue</button>
                  </div>
                </>
              )}

              {deleteStep === 5 && (
                <>
                  <p className="text-[13.5px] text-[#374151] mb-5 leading-relaxed">
                    Final confirmation. This is your last chance to back out. Click the button below to permanently delete <strong>{restaurant.name}</strong>.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={closeDelete} className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC]">Cancel</button>
                    <button onClick={executeDelete} disabled={deleting}
                      className="flex-1 py-3 bg-[#DC2626] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#B91C1C] disabled:opacity-60 flex items-center justify-center gap-2">
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Delete Forever
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
