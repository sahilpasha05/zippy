import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendExpoPush } from '@/lib/expoPush'

// Admin-only: send a notification to everyone, or to one customer by phone number.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  let body: { title?: string; message?: string; phone?: string; orderId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const title = (body.title ?? '').trim().slice(0, 80)
  const message = (body.message ?? '').trim().slice(0, 240)
  if (!title || !message) return NextResponse.json({ error: 'Add a title and a message' }, { status: 400 })

  const admin = createAdminClient()
  let userId: string | null = null
  const phoneDigits = (body.phone ?? '').replace(/\D/g, '').slice(-10)
  if (phoneDigits) {
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) return NextResponse.json({ error: 'Enter a valid 10-digit phone number' }, { status: 400 })
    const { data: p } = await admin.from('profiles').select('id').eq('phone', `91${phoneDigits}`).maybeSingle()
    if (!p) return NextResponse.json({ error: 'No customer with that number' }, { status: 404 })
    userId = p.id
  }

  const query = admin.from('push_tokens').select('token')
  const { data: rows, error } = await (userId ? query.eq('user_id', userId) : query)
  if (error) return NextResponse.json({ error: 'Could not read customers' }, { status: 502 })
  const tokens = [...new Set((rows ?? []).map((r) => r.token))]
  if (tokens.length === 0) {
    return NextResponse.json({ sent: 0, total: 0, note: 'No phones have notifications turned on yet.' })
  }

  const { sent, dead } = await sendExpoPush(
    tokens.map((to) => ({ to, title, body: message, data: body.orderId ? { orderId: body.orderId } : undefined }))
  )
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead)
  return NextResponse.json({ sent, total: tokens.length })
}
