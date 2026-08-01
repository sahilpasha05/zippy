import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Next.js 16 renamed middleware.ts -> proxy.ts (exports `proxy`, runs on Node.js runtime).
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Checkout used to be rewritten to a "coming soon" splash before launch.
  // Ordering is open now, so the only thing this proxy still guards is /admin.

  if (!path.startsWith('/admin') || path === '/admin/login') {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request: req })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/checkout/:path*'],
}
