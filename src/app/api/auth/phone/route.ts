import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

function generatePassword(): string {
  return randomBytes(24).toString('base64url') // random, never stored/shown to the user
}

// NOTE: the phone number is NOT verified. Firebase OTP was removed for launch,
// so whoever types a number is signed straight into that account. Restore the
// idToken check here to close that off.
export async function POST(req: NextRequest) {
  let body: { phone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Accept 10-digit Indian numbers with or without a +91 / 91 prefix.
  const digits = (body.phone ?? '').replace(/\D/g, '')
  const local = digits.length > 10 ? digits.slice(-10) : digits
  if (!/^[6-9]\d{9}$/.test(local)) {
    return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 })
  }
  // Supabase stores/matches phone numbers without the leading "+".
  const phone = `91${local}`

  const admin = createAdminClient()
  const password = generatePassword()

  const { data: existingProfile, error: lookupErr } = await admin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json({ error: 'Could not look up account. Please try again.' }, { status: 502 })
  }

  let userId: string
  let isNewUser: boolean

  if (existingProfile) {
    const { error: updateErr } = await admin.auth.admin.updateUserById(existingProfile.id, { password })
    if (updateErr) {
      return NextResponse.json({ error: 'Could not sign you in. Please try again.' }, { status: 502 })
    }
    userId = existingProfile.id
    isNewUser = false
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      password,
    })

    if (createErr) {
      // Race: someone else grabbed this phone between our lookup and createUser
      // (auth.users enforces phone uniqueness for confirmed identities).
      const isUniqueViolation =
        (createErr as { code?: string }).code === 'phone_exists' ||
        createErr.message?.toLowerCase().includes('already registered') ||
        createErr.message?.toLowerCase().includes('duplicate') ||
        (createErr as { code?: string }).code === '23505'

      if (!isUniqueViolation) {
        return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 502 })
      }

      const { data: retryProfile, error: retryErr } = await admin
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()

      if (retryErr || !retryProfile) {
        return NextResponse.json(
          { error: 'This phone number is already in use. Please try again in a moment.' },
          { status: 409 }
        )
      }

      const { error: rotateErr } = await admin.auth.admin.updateUserById(retryProfile.id, { password })
      if (rotateErr) {
        return NextResponse.json({ error: 'Could not sign you in. Please try again.' }, { status: 502 })
      }
      userId = retryProfile.id
      isNewUser = false
    } else {
      userId = created.user.id
      isNewUser = true
      // handle_new_user trigger auto-creates the profiles row with phone populated.
    }
  }

  // Mints a real Supabase session — the cookie-aware server client persists it
  // into the response automatically via src/lib/supabase/server.ts's setAll.
  const supabase = await createServerSupabaseClient()
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ phone, password })

  if (signInErr || !signInData.session) {
    return NextResponse.json(
      { error: 'Signed you up, but could not start your session. Please try logging in again.' },
      { status: 502 }
    )
  }

  // The cookies above are only visible to the browser's own Supabase client after a
  // hard navigation. Returning the tokens lets the client adopt the session immediately
  // via supabase.auth.setSession(), which fires onAuthStateChange right away.
  return NextResponse.json({
    success: true,
    isNewUser,
    userId,
    session: {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    },
  })
}
