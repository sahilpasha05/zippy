'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PhoneLoginModal from '@/components/PhoneLoginModal'

// Shown 4s after landing to anyone not signed in. Signing in early is
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled && !user) setShow(true)
    }, 4000)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  function dismiss() {
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
