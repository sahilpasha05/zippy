'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, Check, Smartphone } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createClient } from '@/lib/supabase/client'

const INPUT = 'w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all'

export default function PhoneAuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (isNewUser: boolean) => void
}) {
  const [contactPhone, setContactPhone] = useState('')
  const [otpSentFor, setOtpSentFor] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
  const confirmationResultRef = useRef<ConfirmationResult | null>(null)

  const isValidPhone = /^\d{10}$/.test(contactPhone)
  const isOtpSentForCurrent = otpSentFor === contactPhone

  // An invisible reCAPTCHA token is single-use, so a spent verifier has to be
  // torn down and rebuilt before the next send — reusing one makes Firebase
  // reject sendVerificationCode outright.
  function resetRecaptcha() {
    recaptchaVerifierRef.current?.clear()
    recaptchaVerifierRef.current = null
    if (recaptchaContainerRef.current) recaptchaContainerRef.current.innerHTML = ''
  }

  useEffect(() => {
    return () => resetRecaptcha()
  }, [])

  function mapFirebaseError(err: unknown): string {
    const code = (err as { code?: string })?.code ?? ''
    if (code === 'auth/invalid-phone-number') return "That doesn't look like a valid mobile number"
    if (code === 'auth/invalid-verification-code' || code === 'auth/code-expired') return 'Incorrect or expired code — please try again'
    if (code === 'auth/too-many-requests') return 'Too many attempts — please wait a bit and try again'
    // Not a user error: Firebase rejected the reCAPTCHA token, which means this
    // domain isn't authorised in the Firebase project (or the API key is
    // referrer-restricted). Nothing the customer does will fix it.
    if (code === 'auth/invalid-app-credential') return 'Phone verification is not set up for this site yet. Please contact support.'
    return 'Something went wrong verifying your number. Please try again.'
  }

  function getRecaptchaVerifier(activeAuth: NonNullable<typeof auth>) {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(activeAuth, recaptchaContainerRef.current!, { size: 'invisible' })
    }
    return recaptchaVerifierRef.current
  }

  async function sendOtp() {
    if (!isValidPhone) return
    if (!auth) { setOtpError('Phone verification is not available right now. Please try again later.'); return }
    setOtpError(''); setSubmitError(''); setOtpSending(true)
    try {
      const verifier = getRecaptchaVerifier(auth)
      const result = await signInWithPhoneNumber(auth, `+91${contactPhone}`, verifier)
      confirmationResultRef.current = result
      setOtpSentFor(contactPhone)
      setOtpCode('')
    } catch (err: unknown) {
      console.error('[zippy] sendOtp failed', err)
      setOtpError(mapFirebaseError(err))
    } finally {
      // Rebuild the verifier after every attempt, succeeded or not.
      resetRecaptcha()
      setOtpSending(false)
    }
  }

  async function verifyOtp() {
    if (!confirmationResultRef.current || otpCode.trim().length !== 6) return
    setOtpError(''); setSubmitError(''); setOtpVerifying(true)
    try {
      const credential = await confirmationResultRef.current.confirm(otpCode.trim())
      // Get the ID token before signing out — a signed-out user can't mint a fresh one.
      const idToken = await credential.user.getIdToken()
      setOtpVerifying(false)
      setSubmitting(true)

      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const json = await res.json()
      await auth?.signOut()

      if (!res.ok) {
        setSubmitError(json.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      // Adopt the session into the browser's own Supabase client so Navbar (and
      // everything else listening via onAuthStateChange) updates immediately.
      if (json.session) {
        await createClient().auth.setSession({
          access_token: json.session.access_token,
          refresh_token: json.session.refresh_token,
        })
      }

      onSuccess(json.isNewUser)
    } catch (err: unknown) {
      setOtpError(mapFirebaseError(err))
      setOtpVerifying(false)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl z-10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white">
          <h2 className="text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Log in or Sign up</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="w-12 h-12 bg-[#DCFCE7] rounded-2xl flex items-center justify-center mb-1">
            <Smartphone className="w-5 h-5 text-[#16A34A]" strokeWidth={2} />
          </div>
          <p className="text-[13px] text-[#6B7280]">Enter your mobile number — we&apos;ll text you a one-time code to log in or create your Zippy account.</p>

          <div>
            <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Mobile Number</label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl focus-within:border-[#16A34A] transition-all">
              <span className="text-[13.5px] font-[600] text-[#6B7280] shrink-0">+91</span>
              <input
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                  setOtpCode(''); setOtpError(''); setSubmitError('')
                }}
                placeholder="98765 43210"
                inputMode="numeric"
                type="tel"
                className="flex-1 bg-transparent text-[13.5px] outline-none min-w-0"
              />
              {isValidPhone && (
                <button type="button" onClick={sendOtp} disabled={otpSending}
                  className="shrink-0 px-4 py-2 bg-[#16A34A] text-white rounded-lg text-[13px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60">
                  {otpSending ? 'Sending...' : isOtpSentForCurrent ? 'Resend OTP' : 'Send OTP'}
                </button>
              )}
            </div>

            {isValidPhone && isOtpSentForCurrent && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  className={INPUT + ' flex-1'}
                />
                <button type="button" onClick={verifyOtp} disabled={otpVerifying || submitting || otpCode.length !== 6}
                  className="px-4 py-2.5 bg-[#16A34A] text-white rounded-xl text-[13px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60 flex items-center gap-1.5 shrink-0">
                  {otpVerifying || submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {otpVerifying ? 'Verifying...' : submitting ? 'Logging in...' : 'Verify'}
                </button>
              </div>
            )}

            {otpError && <p className="text-[11.5px] text-[#DC2626] mt-1.5">{otpError}</p>}
            {submitError && <p className="text-[11.5px] text-[#DC2626] mt-1.5">{submitError}</p>}

            <div ref={recaptchaContainerRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
