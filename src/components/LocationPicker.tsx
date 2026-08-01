'use client'

import { useEffect, useRef, useState } from 'react'
import { X, LocateFixed, MapPin, Plus, Loader2, Check, Home, Briefcase, Star } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'
import { cn } from '@/lib/utils'
import { useAddresses } from '@/lib/hooks/useAddresses'
import { getCurrentPosition, reverseGeocode } from '@/lib/reverseGeocode'
import { isWithinDeliveryZone, OUT_OF_ZONE_MESSAGE } from '@/lib/deliveryZone'
import { auth } from '@/lib/firebase'
import LiveTrackingMap from '@/components/LiveTrackingMap'

const LABELS = [
  { key: 'Home', icon: Home },
  { key: 'Work', icon: Briefcase },
  { key: 'Other', icon: Star },
]

type Step = 'list' | 'confirm' | 'manual'

const INPUT = 'w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] transition-all'

export default function LocationPicker({ onClose }: { onClose: () => void }) {
  const { addresses, selectedId, addAddress, selectAddress, removeAddress } = useAddresses()
  const [step, setStep] = useState<Step>('list')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [detectedArea, setDetectedArea] = useState('')
  const [houseNo, setHouseNo] = useState('')
  const [areaLine, setAreaLine] = useState('')
  const [landmark, setLandmark] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [draftLabel, setDraftLabel] = useState('Home')
  const [draftCoords, setDraftCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [otpSentFor, setOtpSentFor] = useState<string | null>(null)
  const [otpVerifiedFor, setOtpVerifiedFor] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
  const confirmationResultRef = useRef<ConfirmationResult | null>(null)

  const isValidPhone = /^\d{10}$/.test(contactPhone)
  const isOtpSentForCurrent = otpSentFor === contactPhone
  const isPhoneVerified = otpVerifiedFor === contactPhone

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
    setOtpError(''); setOtpSending(true)
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
    setOtpError(''); setOtpVerifying(true)
    try {
      await confirmationResultRef.current.confirm(otpCode.trim())
      setOtpVerifiedFor(contactPhone)
      await auth?.signOut()
    } catch (err: unknown) {
      setOtpError(mapFirebaseError(err))
    } finally {
      setOtpVerifying(false)
    }
  }

  async function handleUseCurrentLocation() {
    setLocating(true); setError('')
    try {
      const pos = await getCurrentPosition()
      const { latitude, longitude } = pos.coords
      if (!isWithinDeliveryZone(latitude, longitude)) {
        setError(OUT_OF_ZONE_MESSAGE)
        setLocating(false)
        return
      }
      const address = await reverseGeocode(latitude, longitude)
      setDraftCoords({ lat: latitude, lng: longitude })
      setDetectedArea(address ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      setAreaLine(address ?? '')
      setHouseNo(''); setLandmark(''); setContactName(''); setContactPhone(''); setDraftLabel('Home')
      setOtpSentFor(null); setOtpVerifiedFor(null); setOtpCode(''); setOtpError(''); confirmationResultRef.current = null
      setStep('confirm')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not get your location')
    } finally {
      setLocating(false)
    }
  }

  // Opening the form asks for live location first: GPS is the only reliable way
  // to confirm the delivery area here, and it also saves the customer typing
  // their area by hand. If they decline we still open the form and explain at
  // save time why the location is needed.
  async function openManual() {
    setDetectedArea(''); setHouseNo(''); setAreaLine(''); setLandmark(''); setContactName(''); setContactPhone(''); setDraftCoords(null); setDraftLabel('Home'); setError('')
    setOtpSentFor(null); setOtpVerifiedFor(null); setOtpCode(''); setOtpError(''); confirmationResultRef.current = null

    setLocating(true)
    try {
      const pos = await getCurrentPosition()
      const { latitude, longitude } = pos.coords
      if (!isWithinDeliveryZone(latitude, longitude)) {
        setError(OUT_OF_ZONE_MESSAGE)
        setLocating(false)
        return // stay on the list — there is nothing to add an address for
      }
      const address = await reverseGeocode(latitude, longitude)
      setDraftCoords({ lat: latitude, lng: longitude })
      setDetectedArea(address ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      setAreaLine(address ?? '')
    } catch {
      // Declined or unavailable — saveDraft explains what's needed.
    } finally {
      setLocating(false)
    }
    setStep('manual')
  }

  async function saveDraft() {
    if (!houseNo.trim() || !areaLine.trim()) { setError('Please fill in the house/flat number and area'); return }
    if (!contactName.trim()) { setError('Please enter a name for this address'); return }
    if (!/^\d{10}$/.test(contactPhone.trim())) { setError('Please enter a valid 10-digit mobile number'); return }
    if (otpVerifiedFor !== contactPhone) { setError('Please verify your mobile number with the OTP sent to it'); return }
    const fullAddress = [houseNo.trim(), areaLine.trim(), landmark.trim() ? `near ${landmark.trim()}` : null].filter(Boolean).join(', ')

    // Forward-geocoding a typed street was tried and abandoned: Mapbox has no
    // reliable street data for Tarikere and resolved real local addresses to
    // Tumakuru and Shivamogga, which rejected genuine customers. Device GPS is
    // the only trustworthy signal, so that is what the zone check runs on.
    const coords = draftCoords
    if (!coords) {
      setError('We need your location to confirm you’re inside our delivery area. Please tap “Use current location” above and allow access.')
      return
    }
    if (!isWithinDeliveryZone(coords.lat, coords.lng)) { setError(OUT_OF_ZONE_MESSAGE); return }

    try {
      const saved = await addAddress({
        label: draftLabel, address: fullAddress, lat: coords.lat, lng: coords.lng,
        contactName: contactName.trim(), contactPhone: `+91${contactPhone.trim()}`,
      })
      await selectAddress(saved.id)
      onClose()
    } catch {
      setError('Could not save this address. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl z-10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white">
          <h2 className="text-[16px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>
            {step === 'list' ? 'Select delivery location' : step === 'confirm' ? 'Confirm your location' : 'Add new address'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        {step === 'list' && (
          <div className="p-4">
            {error && <p className="text-[12.5px] text-[#DC2626] mb-3">{error}</p>}
            <button onClick={handleUseCurrentLocation} disabled={locating}
              className="w-full flex items-center gap-3 p-3.5 border-2 border-[#DCFCE7] bg-[#F0FDF4] rounded-xl mb-4 hover:border-[#16A34A] transition-all disabled:opacity-70">
              <div className="w-9 h-9 bg-[#16A34A] rounded-xl flex items-center justify-center shrink-0">
                {locating ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <LocateFixed className="w-4 h-4 text-white" />}
              </div>
              <span className="text-[13.5px] font-[700] text-[#15803D]">{locating ? 'Getting your location...' : 'Use current location'}</span>
            </button>

            {addresses.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-[11px] font-[600] text-[#9CA3AF] uppercase tracking-wide px-1">Saved addresses</p>
                {addresses.map((a) => {
                  const LabelIcon = LABELS.find((l) => l.key === a.label)?.icon ?? MapPin
                  return (
                    <div key={a.id} role="button" tabIndex={0}
                      onClick={() => { selectAddress(a.id); onClose() }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { selectAddress(a.id); onClose() } }}
                      className={cn('w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer',
                        selectedId === a.id ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-[#E5E7EB] hover:border-[#D1D5DB]')}>
                      <div className="w-9 h-9 bg-[#F3F4F6] rounded-xl flex items-center justify-center shrink-0">
                        <LabelIcon className="w-4 h-4 text-[#6B7280]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-[700] text-[#111827]">{a.label}</span>
                          {selectedId === a.id && <Check className="w-3.5 h-3.5 text-[#16A34A]" />}
                        </div>
                        <p className="text-[12px] text-[#6B7280] line-clamp-2">{a.address}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeAddress(a.id) }}
                        className="text-[11px] text-[#DC2626] hover:underline shrink-0">Remove</button>
                    </div>
                  )
                })}
              </div>
            )}

            <button onClick={openManual}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#D1D5DB] rounded-xl text-[13.5px] font-medium text-[#16A34A] hover:border-[#16A34A] hover:bg-[#F0FDF4] transition-all">
              <Plus className="w-4 h-4" /> Add new address
            </button>
          </div>
        )}

        {(step === 'confirm' || step === 'manual') && (
          <div className="p-4 space-y-4">
            {error && <p className="text-[12.5px] text-[#DC2626]">{error}</p>}

            {step === 'confirm' && draftCoords && (
              <>
                <LiveTrackingMap riderLocation={null} dropLocation={draftCoords} className="h-40" showRiderStatus={false} />
                <div className="flex items-start gap-2 px-3 py-2.5 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-[#16A34A] mt-0.5 shrink-0" />
                  <p className="text-[12px] text-[#15803D]">Detected: {detectedArea}</p>
                </div>
              </>
            )}

            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">House / Flat / Block No. *</label>
              <input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} placeholder="e.g. Flat 302, Block B"
                className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Apartment / Road / Area *</label>
              <input value={areaLine} onChange={(e) => setAreaLine(e.target.value)} placeholder="e.g. MG Road, Koramangala"
                className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Landmark <span className="text-[#9CA3AF] font-normal">(optional)</span></label>
              <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Near Apollo Pharmacy"
                className={INPUT} />
            </div>

            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Your Name *</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Priya Sharma"
                className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Mobile Number *</label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl focus-within:border-[#16A34A] transition-all">
                <span className="text-[13.5px] font-[600] text-[#6B7280] shrink-0">+91</span>
                <input
                  value={contactPhone}
                  onChange={(e) => {
                    setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                    setOtpCode(''); setOtpError('')
                  }}
                  placeholder="98765 43210"
                  inputMode="numeric"
                  type="tel"
                  className="flex-1 bg-transparent text-[13.5px] outline-none min-w-0"
                />
                {isValidPhone && !isPhoneVerified && (
                  <button type="button" onClick={sendOtp} disabled={otpSending}
                    className="shrink-0 px-4 py-2 bg-[#16A34A] text-white rounded-lg text-[13px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60">
                    {otpSending ? 'Sending...' : isOtpSentForCurrent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                )}
                {isPhoneVerified && (
                  <span className="shrink-0 flex items-center gap-1 text-[12px] font-[700] text-[#16A34A]">
                    <Check className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>

              {isValidPhone && isOtpSentForCurrent && !isPhoneVerified && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-[13px] outline-none focus:border-[#16A34A] transition-all"
                  />
                  <button type="button" onClick={verifyOtp} disabled={otpVerifying || otpCode.length !== 6}
                    className="px-3.5 py-2 bg-[#16A34A] text-white rounded-lg text-[12.5px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60">
                    {otpVerifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}

              {otpError && <p className="text-[11.5px] text-[#DC2626] mt-1.5">{otpError}</p>}

              <div ref={recaptchaContainerRef} />
            </div>

            <div>
              <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Save as</label>
              <div className="flex gap-2">
                {LABELS.map(({ key, icon: Icon }) => (
                  <button key={key} onClick={() => setDraftLabel(key)}
                    className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-[600] border-2 transition-all',
                      draftLabel === key ? 'border-[#16A34A] bg-[#F0FDF4] text-[#15803D]' : 'border-[#E5E7EB] text-[#6B7280]')}>
                    <Icon className="w-3.5 h-3.5" /> {key}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('list')} className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all">Back</button>
              <button onClick={saveDraft} disabled={locating || (isValidPhone && !isPhoneVerified)}
                className="flex-1 py-3 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] transition-all disabled:opacity-60 disabled:hover:bg-[#16A34A] flex items-center justify-center gap-2">
                {locating && <Loader2 className="w-4 h-4 animate-spin" />}
                {locating ? 'Finding you...' : 'Save Address'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
