'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PhoneLoginModal from '@/components/PhoneLoginModal'

const DISMISS_KEY = 'zippy-signin-prompt-seen'

// Shown once per session to visitors who aren't signed in. Signing in early is
// what lets the rest of the app work: the number goes onto the delivery address
// automatically, and order history, tracking and reviews all hang off the
// account rather than off whatever was typed at checkout.
export default function HomeSignInPrompt() {
  const [show, setShow] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const timer = setTimeout(async () => {
      if (sessionStorage.getItem(DISMISS_KEY)) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled && !user) setShow(true)
    }, 1200)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <PhoneLoginModal
      onClose={dismiss}
      onSuccess={() => { dismiss(); router.refresh() }}
    />
  )
}
