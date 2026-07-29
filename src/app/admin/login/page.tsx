'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Shield, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const loginEmail = email.includes('@') ? email : `${email}@zippy.com`
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
    if (authError || !data.user) {
      setError(authError?.message ?? 'Login failed')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      setError('This account does not have admin access.')
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#7C3AED] rounded-2xl flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-[22px] font-[800] text-[#111827]">Admin Login</h1>
          <p className="text-[13px] text-[#6B7280] mt-1">Zippy Admin Panel</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-[600] text-[#374151] mb-2">Email</label>
            <div className="flex items-center gap-3 px-4 py-3.5 border border-[#E5E7EB] rounded-xl bg-white focus-within:border-[#7C3AED] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all">
              <Mail className="w-4 h-4 text-[#9CA3AF] shrink-0" />
              <input type="text" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@zippy.com" required
                className="flex-1 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-[600] text-[#374151] mb-2">Password</label>
            <div className="flex items-center gap-3 px-4 py-3.5 border border-[#E5E7EB] rounded-xl bg-white focus-within:border-[#7C3AED] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all">
              <Lock className="w-4 h-4 text-[#9CA3AF] shrink-0" />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="flex-1 bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#7C3AED] text-white text-[15px] font-[700] rounded-2xl hover:bg-[#6D28D9] active:scale-[0.98] disabled:opacity-60 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.35)] mt-2">
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Sign in <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
