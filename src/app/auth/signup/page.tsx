'use client'

import { useState } from 'react'
import { Eye, EyeOff, Zap, ArrowRight, Mail, Lock, User, Phone } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, phone: form.phone } },
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 2000)
    }
  }

  const fields = [
    { key: 'name', label: 'Full name', placeholder: 'Rahul Sharma', type: 'text', icon: User },
    { key: 'email', label: 'Email address', placeholder: 'you@example.com', type: 'email', icon: Mail },
    { key: 'phone', label: 'Phone number', placeholder: '+91 9876543210', type: 'tel', icon: Phone },
  ] as const

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-gradient-to-br from-[#14532D] to-[#16A34A] p-12 relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-[20px] font-[800] text-white" style={{ fontWeight: 800 }}>Zippy</span>
        </Link>

        <div className="relative z-10 space-y-4">
          <p className="text-[26px] font-[800] text-white leading-tight" style={{ fontWeight: 800 }}>
            India's fastest grocery<br />& food delivery. 🚀
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: '⚡', value: 'Fast', label: 'Avg delivery' },
              { emoji: '🛒', value: '5,000+', label: 'Products' },
              { emoji: '🍽️', value: '500+', label: 'Restaurants' },
              { emoji: '⭐', value: '4.8★', label: 'Rating' },
            ].map(({ emoji, value, label }) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
                <div className="text-xl mb-1">{emoji}</div>
                <div className="text-[16px] font-[800] text-white" style={{ fontWeight: 800 }}>{value}</div>
                <div className="text-[11px] text-white/60">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -left-8 -bottom-16 w-80 h-80 bg-white/5 rounded-full pointer-events-none" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#16A34A] rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Zippy</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-[32px] font-[900] text-[#111827] tracking-tight mb-2" style={{ fontWeight: 900 }}>Create account</h1>
            <p className="text-[15px] text-[#6B7280]">Join 2 million+ happy Zippy customers</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl">{error}</div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-[13px] rounded-xl font-medium">
              Account created! Check your email to confirm, redirecting…
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ key, label, placeholder, type, icon: Icon }) => (
              <div key={key}>
                <label className="block text-[13px] font-[600] text-[#374151] mb-2" style={{ fontWeight: 600 }}>{label}</label>
                <div className="flex items-center gap-3 px-4 py-3.5 border border-[#E5E7EB] rounded-xl bg-white focus-within:border-[#16A34A] focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] transition-all">
                  <Icon className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    required
                    className="flex-1 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none"
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-[13px] font-[600] text-[#374151] mb-2" style={{ fontWeight: 600 }}>Password</label>
              <div className="flex items-center gap-3 px-4 py-3.5 border border-[#E5E7EB] rounded-xl bg-white focus-within:border-[#16A34A] focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] transition-all">
                <Lock className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="flex-1 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[12px] text-[#9CA3AF] leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="#" className="text-[#16A34A] hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="#" className="text-[#16A34A] hover:underline">Privacy Policy</Link>.
            </p>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#16A34A] text-white text-[15px] font-[700] rounded-2xl hover:bg-[#15803D] active:scale-[0.98] disabled:opacity-60 transition-all shadow-[0_4px_16px_rgba(22,163,74,0.35)]"
              style={{ fontWeight: 700 }}
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <> Create account <ArrowRight className="w-4 h-4" /> </>
              }
            </button>
          </form>

          <p className="text-center text-[13.5px] text-[#6B7280] mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#16A34A] font-[600] hover:text-[#15803D] transition-colors" style={{ fontWeight: 600 }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
