'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Loader2, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Phone-only sign-in: no OTP is sent and the number is not verified. Whoever
// types a number is signed into that account — restore the OTP step in
// src/app/api/auth/phone/route.ts to close that off.
export default function PhoneLoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (isNewUser: boolean) => void
}) {
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isValid = /^[6-9]\d{9}$/.test(phone)

  async function submit() {
    if (!isValid || !agreed || submitting) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Could not sign you in. Please try again.'); setSubmitting(false); return }

      if (json.session) {
        await createClient().auth.setSession({
          access_token: json.session.access_token,
          refresh_token: json.session.refresh_token,
        })
      }
      onSuccess(json.isNewUser)
    } catch {
      setError('Could not reach the server. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
          <h2 className="text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Log in or Sign up</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="w-12 h-12 bg-[#DCFCE7] rounded-2xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-[#16A34A]" strokeWidth={2} />
          </div>
          <p className="text-[13px] text-[#6B7280]">
            Enter your mobile number to log in or create your Zippy account.
          </p>

          <div>
            <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Mobile Number</label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl focus-within:border-[#16A34A] transition-all">
              <span className="text-[13.5px] font-[600] text-[#6B7280] shrink-0">+91</span>
              <input
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                placeholder="98765 43210"
                inputMode="numeric"
                type="tel"
                autoFocus
                className="flex-1 bg-transparent text-[13.5px] outline-none min-w-0"
              />
            </div>
            {error && <p className="text-[11.5px] text-[#DC2626] mt-1.5">{error}</p>}
          </div>

          <label className="flex items-start gap-2.5 text-[12px] text-[#6B7280] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#D1D5DB] text-[#16A34A] focus:ring-[#16A34A] shrink-0"
            />
            <span>
              I agree to Zippy&apos;s{' '}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#16A34A] hover:underline">Terms &amp; Conditions</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#16A34A] hover:underline">Privacy Policy</Link>, and consent to my data being processed as described.
            </span>
          </label>

          <button
            onClick={submit}
            disabled={!isValid || !agreed || submitting}
            className="w-full py-3 bg-[#16A34A] text-white rounded-xl text-[14px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ fontWeight: 700 }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Signing in...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
