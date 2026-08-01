'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Star, Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdminSidebar from '@/components/admin/AdminSidebar'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Rel<T> = T | T[] | null
type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  order_id: string | null
  restaurants: Rel<{ name: string }>
  profiles: Rel<{ full_name: string | null; phone: string | null }>
}

const one = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? r[0] ?? null : r)

function timeAgo(d: string) {
  const m = Math.floor((new Date().getTime() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, order_id, restaurants(name), profiles(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(1000)
    setReviews((data as unknown as Review[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const shown = filter === 'all' ? reviews : reviews.filter((r) => String(r.rating) === filter)
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }))

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Reviews</h1>
          <p className="text-[12.5px] text-[#9CA3AF]">
            {loading ? 'Loading…' : reviews.length === 0
              ? 'No reviews yet'
              : `${reviews.length} review${reviews.length === 1 ? '' : 's'} · ${avg.toFixed(1)} average`}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {!loading && reviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilter('all')}
                className={cn('px-4 py-1.5 rounded-xl text-[12.5px] font-medium transition-all',
                  filter === 'all' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                All ({reviews.length})
              </button>
              {counts.map(({ n, c }) => (
                <button key={n} onClick={() => setFilter(String(n) as typeof filter)}
                  className={cn('flex items-center gap-1 px-4 py-1.5 rounded-xl text-[12.5px] font-medium transition-all',
                    filter === String(n) ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
                  {n} <Star className="w-3 h-3 fill-current" /> ({c})
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#7C3AED] animate-spin" /></div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 bg-white rounded-2xl border border-[#E5E7EB]">
              <MessageSquare className="w-8 h-8 text-[#D1D5DB]" />
              <p className="text-[14px] font-[600] text-[#374151]">
                {reviews.length === 0 ? 'No reviews yet' : 'No reviews with that rating'}
              </p>
              {reviews.length === 0 && (
                <p className="text-[12.5px] text-[#9CA3AF]">Customers can review an order once it has been delivered.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {shown.map((r) => {
                const who = one(r.profiles)
                const rest = one(r.restaurants)
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={cn('w-3.5 h-3.5', n <= r.rating ? 'text-[#D97706] fill-[#D97706]' : 'text-[#E5E7EB]')} />
                          ))}
                          <span className="ml-1 text-[12.5px] font-[700] text-[#111827]">{r.rating}.0</span>
                        </div>
                        <p className="text-[12.5px] text-[#6B7280] truncate">
                          {rest?.name ?? 'Zippy'}
                          {r.order_id && <span className="font-mono text-[#9CA3AF]"> · #{r.order_id.slice(0, 8).toUpperCase()}</span>}
                        </p>
                      </div>
                      <span className="text-[11.5px] text-[#9CA3AF] shrink-0">{timeAgo(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="text-[13px] text-[#374151] leading-relaxed mb-2">{r.comment}</p>}
                    <p className="text-[11.5px] text-[#9CA3AF]">
                      {who?.full_name || 'Customer'}{who?.phone ? ` · ${who.phone}` : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
