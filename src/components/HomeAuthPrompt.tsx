'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PhoneAuthModal from '@/components/PhoneAuthModal'

// Shows a login/signup prompt automatically ~1.5s after the home page loads,
// same as Blinkit/Zepto's first-run prompt — but only if the visitor isn't
// already signed in. Dismissible; anonymous browsing still works.
export default function HomeAuthPrompt() {
  const [show, setShow] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const timer = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled && !user) setShow(true)
    }, 1500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  if (!show) return null
  return (
    <PhoneAuthModal
      onClose={() => setShow(false)}
      onSuccess={() => {
        setShow(false)
        router.refresh()
      }}
    />
  )
}
