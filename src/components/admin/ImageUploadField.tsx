'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'

export default function ImageUploadField({ label, value, onChange, endpoint = '/api/admin/upload-image' }: { label: string; value: string | null; onChange: (url: string | null) => void; endpoint?: string }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(endpoint, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange(data.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  return (
    <div>
      <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">{label}</label>

      {value ? (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#F8FAFC] group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white rounded-lg text-[12px] font-[600] text-[#374151] hover:bg-[#F3F4F6]">Replace</button>
            <button type="button" onClick={() => onChange(null)}
              className="p-1.5 bg-white rounded-lg text-[#DC2626] hover:bg-[#FEF2F2]"><X className="w-3.5 h-3.5" /></button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#7C3AED] animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${dragOver ? 'border-[#7C3AED] bg-[#F5F3FF]' : 'border-[#E5E7EB] hover:border-[#D1D5DB] bg-[#F8FAFC]'}`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-[#7C3AED] animate-spin" />
          ) : (
            <>
              {dragOver ? <Upload className="w-5 h-5 text-[#7C3AED]" /> : <ImageIcon className="w-5 h-5 text-[#9CA3AF]" />}
              <p className="text-[12px] text-[#6B7280]">Drag & drop or click to upload</p>
            </>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = '' }} />

      {error && <p className="text-[11.5px] text-[#DC2626] mt-1.5">{error}</p>}
    </div>
  )
}
