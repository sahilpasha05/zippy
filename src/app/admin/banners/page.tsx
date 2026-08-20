'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle, ImageIcon, X, Edit2, Pin } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import ImageUploadField from '@/components/admin/ImageUploadField'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Banner = {
  id: string; title: string; subtitle: string | null; image_url: string
  link: string | null; sort_order: number; is_pinned: boolean; is_active: boolean
}

const EMPTY_FORM = { title: '', subtitle: '', link: '', sort_order: '0' }

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Banner | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formImage, setFormImage] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [formPinned, setFormPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('banners').select('*').order('is_pinned', { ascending: false }).order('sort_order')
    setBanners((data as Banner[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormImage(null)
    setFormPinned(false)
    setError('')
    setEditItem(null)
    setShowModal(true)
  }

  function openEdit(b: Banner) {
    setForm({ title: b.title, subtitle: b.subtitle ?? '', link: b.link ?? '', sort_order: String(b.sort_order) })
    setFormImage(b.image_url)
    setFormPinned(b.is_pinned)
    setError('')
    setEditItem(b)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditItem(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !formImage) { setError('Title and image are required'); return }
    setSaving(true); setError('')

    const payload = {
      title: form.title,
      subtitle: form.subtitle || null,
      image_url: formImage,
      link: form.link || null,
      sort_order: Number(form.sort_order) || 0,
      is_pinned: formPinned,
    }

    if (editItem) {
      const { error: err } = await supabase.from('banners').update(payload).eq('id', editItem.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('banners').insert({ ...payload, is_active: true })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    closeModal()
    load()
  }

  async function toggleActive(b: Banner) {
    await supabase.from('banners').update({ is_active: !b.is_active }).eq('id', b.id)
    setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, is_active: !b.is_active } : x))
  }

  async function deleteBanner(id: string) {
    if (!confirm('Delete this banner?')) return
    await supabase.from('banners').delete().eq('id', id)
    setBanners((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Home Banners</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{banners.length} banners · {banners.filter((b) => b.is_active).length} active</p>
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
              <Plus className="w-4 h-4" /> Add Banner
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-white rounded-2xl border border-[#E5E7EB] animate-pulse" />)}
            </div>
          ) : banners.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[#9CA3AF]">
              <ImageIcon className="w-12 h-12" strokeWidth={1} />
              <p className="text-[15px] font-semibold text-[#374151]">No banners yet</p>
              <button onClick={openAdd} className="text-[13px] text-[#7C3AED] font-medium">+ Add your first banner</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {banners.map((b) => (
                <div key={b.id} className={cn('bg-white rounded-2xl border overflow-hidden shadow-zippy-sm', b.is_active ? 'border-[#E5E7EB]' : 'border-[#E5E7EB] opacity-60')}>
                  <div className="h-32 bg-[#F8FAFC] relative">
                    <Image src={b.image_url} alt={b.title} fill className="object-cover" sizes="300px" />
                    {b.is_pinned && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-[700] bg-[#7C3AED] text-white px-2 py-0.5 rounded-full">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h3 className="text-[13px] font-[700] text-[#111827] leading-snug line-clamp-1">{b.title}</h3>
                    <p className="text-[11px] text-[#9CA3AF] mb-2 line-clamp-1">{b.link ?? 'No link'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6B7280]">Order: {b.sort_order}</span>
                      <button onClick={() => toggleActive(b)} title={b.is_active ? 'Live' : 'Hidden'}>
                        {b.is_active ? <ToggleRight className="w-7 h-7 text-[#16A34A]" /> : <ToggleLeft className="w-7 h-7 text-[#D1D5DB]" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F3F4F6]">
                      <button onClick={() => openEdit(b)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => deleteBanner(b.id)} className="flex items-center justify-center gap-1.5 py-2 px-4 border border-[#FEE2E2] rounded-xl text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white z-10">
              <h2 className="text-[16px] font-[800] text-[#111827]">{editItem ? 'Edit Banner' : 'Add New Banner'}</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
            <div className="p-6">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[12.5px] text-[#DC2626] mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <ImageUploadField label="Banner Image" value={formImage} onChange={setFormImage} onUploadingChange={setImageUploading} />
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Title</label>
                  <input value={form.title} onChange={(e) => setF('title', e.target.value)} placeholder="e.g. Pharmacy at your doorstep!"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Subtitle</label>
                  <input value={form.subtitle} onChange={(e) => setF('subtitle', e.target.value)} placeholder="e.g. Cough syrups, pain relief sprays & more"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Link (where it goes when clicked)</label>
                  <input value={form.link} onChange={(e) => setF('link', e.target.value)} placeholder="/restaurants/j or /essentials/pharma-wellness"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Sort Order</label>
                    <input type="number" value={form.sort_order} onChange={(e) => setF('sort_order', e.target.value)}
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formPinned} onChange={(e) => setFormPinned(e.target.checked)} className="w-4 h-4 accent-[#7C3AED]" />
                      <span className="text-[12.5px] text-[#374151] font-medium">Pinned (shown first)</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all">Cancel</button>
                  <button type="submit" disabled={saving || imageUploading}
                    className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#6D28D9] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {(saving || imageUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                    {imageUploading ? 'Uploading photo...' : editItem ? 'Save Changes' : 'Add Banner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
