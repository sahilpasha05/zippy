'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Search, UserCheck, UserX, Shield, Store } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { cn } from '@/lib/utils'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
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
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-zippy-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {['User', 'Email', 'Role', 'Restaurant', 'Joined'].map((h) => (
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
