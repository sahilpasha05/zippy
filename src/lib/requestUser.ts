import type { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createSessionClient } from '@/lib/supabase/server'

// Who is calling this API route? The website sends a login cookie; the mobile app sends its
// Supabase access token as "Authorization: Bearer …". Either way the answer is the real,
// verified user (or null).
export async function getRequestUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (token) {
    const sb = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await sb.auth.getUser(token)
    return data.user ?? null
  }
  const session = await createSessionClient()
  const { data } = await session.auth.getUser()
  return data.user ?? null
}
