'use client'

import { useEffect, useState } from 'react'
import { useAddressStore } from '@/lib/store/address'
import LocationPicker from '@/components/LocationPicker'

// Shows the location picker automatically ~1.5s after the home page loads,
// same as Blinkit/Zepto's first-run "enable location" prompt — but only if
// the customer hasn't already got a saved delivery address.
export default function HomeLocationPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    useAddressStore.persist.rehydrate()
    const timer = setTimeout(() => {
      const { addresses, selectedId } = useAddressStore.getState()
      const hasAddress = addresses.some((a) => a.id === selectedId)
      if (!hasAddress) setShow(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null
  return <LocationPicker onClose={() => setShow(false)} />
}
