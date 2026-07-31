'use client'

import { useState } from 'react'
import { Eye, EyeOff, Zap, ArrowRight, Mail, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import PhoneAuthModal from '@/components/PhoneAuthModal'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-gradient-to-br from-[#14532D] to-[#16A34A] p-12 relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-[20px] font-[800] text-white" style={{ fontWeight: 800 }}>Zippy</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            {[
              { emoji: '⚡', text: 'Groceries delivered in minutes' },
              { emoji: '🍽️', text: '500+ restaurants, one tap away' },
              { emoji: '💸', text: 'Best prices, guaranteed' },
              { emoji: '🔒', text: 'Safe & secure payments' },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <span className="text-[14px] text-white/85 font-medium">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-white/50 italic">"Zippy changed the way I shop. I can't imagine going back."<br />— Priya K., Bangalore</p>
        </div>

        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -left-8 -bottom-16 w-80 h-80 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute right-8 bottom-24 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
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
            <h1 className="text-[32px] font-[900] text-[#111827] tracking-tight mb-2" style={{ fontWeight: 900 }}>Welcome back</h1>
            <p className="text-[15px] text-[#6B7280]">Sign in to your Zippy account</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-[600] text-[#374151] mb-2" style={{ fontWeight: 600 }}>Email address</label>
              <div className="flex items-center gap-3 px-4 py-3.5 border border-[#E5E7EB] rounded-xl bg-white focus-within:border-[#16A34A] focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] transition-all">
                <Mail className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="flex-1 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-[600] text-[#374151]" style={{ fontWeight: 600 }}>Password</label>
                <Link href="/auth/forgot-password" className="text-[12.5px] text-[#16A34A] hover:text-[#15803D] font-medium">Forgot password?</Link>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5 border border-[#E5E7EB] rounded-xl bg-white focus-within:border-[#16A34A] focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] transition-all">
                <Lock className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex-1 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#16A34A] text-white text-[15px] font-[700] rounded-2xl hover:bg-[#15803D] active:scale-[0.98] disabled:opacity-60 transition-all shadow-[0_4px_16px_rgba(22,163,74,0.35)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.45)] mt-2"
              style={{ fontWeight: 700 }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <> Sign in <ArrowRight className="w-4 h-4" /> </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-[12px] text-[#9CA3AF]">or continue with</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2.5 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F8FAFC] transition-all">
              <span>🔵</span> Google
            </button>
            <button onClick={() => setShowPhoneModal(true)}
              className="flex items-center justify-center gap-2.5 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F8FAFC] transition-all">
              <span>📱</span> Phone
            </button>
          </div>

          <p className="text-center text-[13.5px] text-[#6B7280] mt-6">
            New to Zippy?{' '}
            <Link href="/auth/signup" className="text-[#16A34A] font-[600] hover:text-[#15803D] transition-colors" style={{ fontWeight: 600 }}>
              Create account →
            </Link>
          </p>
        </div>
      </div>

      {showPhoneModal && (
        <PhoneAuthModal
          onClose={() => setShowPhoneModal(false)}
          onSuccess={() => {
            setShowPhoneModal(false)
            router.push('/')
          }}
        />
      )}
    </div>
  )
}
