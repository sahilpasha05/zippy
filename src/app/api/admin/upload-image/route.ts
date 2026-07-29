import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024

// Uses the service-role client since no real admin auth session exists yet to
// authorize a direct client-side Storage upload — see restaurant owner auth gap.
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File is too large (max 5MB)' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('restaurant-images')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 502 })

  const { data } = admin.storage.from('restaurant-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
