'use client'

import { useEffect } from 'react'
import { useDeliveryZones } from '@/lib/deliveryZones'

// Loads the admin-drawn delivery zones once when the site opens, so the cart and checkout
// price the delivery from them.
export default function DeliveryZonesLoader() {
  useEffect(() => { void useDeliveryZones.getState().load() }, [])
  return null
}
