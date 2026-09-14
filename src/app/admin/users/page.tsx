'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, UserCheck, UserX, Shield, Store, KeyRound, X, Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createClient()

type Profile = { id: string; full_name: string | null; email: string | null; role: string | null; created_at: string }
type Restaurant = { owner_id: string | null; name: string }

function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [resetTarget, setResetTarget] = useState<Profile | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }),
        supabase.from('restaurants').select('owner_id, name').not('owner_id', 'is', null),
      ])
      setProfiles((p as Profile[]) ?? [])
      setRestaurants((r as Restaurant[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase()
    return !q || (p.full_name ?? '').toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q)
  })

  function getRestaurant(userId: string) {
    return restaurants.find((r) => r.owner_id === userId)
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Users</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{profiles.length} registered users</p>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#7C3AED] transition-all">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="bg-transparent text-[13px] outline-none w-44 placeholder:text-[#9CA3AF]" />
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-[#E5E7EB] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-24 gap-3 text-[#9CA3AF]">
              <p className="text-[15px] font-semibold text-[#374151]">No users found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-x-auto shadow-zippy-sm">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {['User', 'Email', 'Role', 'Restaurant', 'Joined', ''].map((h) => (
                      <th key={h} className="text-left text-[11.5px] font-[600] text-[#9CA3AF] px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFC]">
                  {filtered.map((u) => {
                    const rest = getRestaurant(u.id)
                    const isAdmin = u.role === 'admin'
                    return (
                      <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-[12px] font-bold shrink-0', isAdmin ? 'bg-[#7C3AED]' : 'bg-[#16A34A]')}>
                              {(u.full_name ?? u.email ?? '?')[0].toUpperCase()}
                            </div>
                            <span className="text-[13px] font-[600] text-[#111827]">{u.full_name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12.5px] text-[#6B7280]">{u.email ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn('flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1 rounded-full w-fit',
                            isAdmin ? 'bg-[#F5F3FF] text-[#7C3AED]' : 'bg-[#F3F4F6] text-[#6B7280]')}>
                            {isAdmin ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            {u.role ?? 'user'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {rest ? (
                            <span className="flex items-center gap-1 text-[12px] text-[#16A34A] font-medium">
                              <Store className="w-3 h-3" /> {rest.name}
                            </span>
                          ) : (
                            <span className="text-[12px] text-[#9CA3AF] flex items-center gap-1">
                              <UserX className="w-3 h-3" /> No restaurant
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF]">{timeAgo(u.created_at)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => { setResetTarget(u); setNewPassword(''); setResetError(''); setResetDone(false) }}
                            className="flex items-center gap-1.5 text-[12px] font-medium text-[#7C3AED] hover:underline ml-auto">
                            <KeyRound className="w-3.5 h-3.5" /> Reset password
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResetTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-[800] text-[#111827]">Reset password</h2>
              <button onClick={() => setResetTarget(null)} className="text-[#9CA3AF] hover:text-[#374151]"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[12.5px] text-[#6B7280] mb-4">
              For <span className="font-[600] text-[#111827]">{resetTarget.email}</span>
            </p>

            {resetDone ? (
              <div className="px-4 py-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-[13px] text-[#15803D] mb-4">
                Password updated.
              </div>
            ) : (
              <>
                {resetError && <p className="text-[12.5px] text-[#DC2626] mb-3">{resetError}</p>}
                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all mb-4" />
              </>
            )}

            <div className="flex gap-3">
              <button onClick={() => setResetTarget(null)}
                className="flex-1 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all">
                {resetDone ? 'Close' : 'Cancel'}
              </button>
              {!resetDone && (
                <button
                  disabled={resetting}
                  onClick={async () => {
                    setResetting(true)
                    setResetError('')
                    try {
                      const res = await fetch('/api/admin/update-user-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: resetTarget.id, password: newPassword }),
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error ?? 'Failed to reset password')
                      setResetDone(true)
                    } catch (err: unknown) {
                      setResetError(err instanceof Error ? err.message : 'Failed to reset password')
                    } finally {
                      setResetting(false)
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#7C3AED] text-white rounded-xl text-[13px] font-[700] hover:bg-[#6D28D9] transition-all disabled:opacity-60">
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
