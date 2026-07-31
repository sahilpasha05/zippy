'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAddressStore, type SavedAddress } from '@/lib/store/address'

type DbAddressRow = {
  id: string
  label: string
  full_address: string
  latitude: number | null
  longitude: number | null
  contact_name: string | null
  contact_phone: string | null
  is_default: boolean | null
}

function fromDbRow(row: DbAddressRow): SavedAddress {
  return {
    id: row.id,
    label: row.label,
    address: row.full_address,
    lat: row.latitude,
    lng: row.longitude,
    contactName: row.contact_name ?? '',
    contactPhone: row.contact_phone ?? '',
  }
}

// Logged-in users get addresses stored per-account in Supabase (private, persists
// across devices). Logged-out users keep the existing anonymous localStorage
// behavior (useAddressStore) unchanged — this hook picks the source based on
// auth state so LocationPicker/Navbar/checkout don't need to know which is active.
export function useAddresses() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined) // undefined = not checked yet
  const [dbAddresses, setDbAddresses] = useState<SavedAddress[]>([])
  const [dbSelectedId, setDbSelectedId] = useState<string | null>(null)
  const [dbLoaded, setDbLoaded] = useState(false)
  const [localHydrated, setLocalHydrated] = useState(false)

  const local = useAddressStore()

  const loadDbAddresses = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('addresses')
      .select('id, label, full_address, latitude, longitude, contact_name, contact_phone, is_default')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    const rows = (data as DbAddressRow[] | null) ?? []
    setDbAddresses(rows.map(fromDbRow))
    const def = rows.find((r) => r.is_default) ?? rows[0]
    setDbSelectedId(def?.id ?? null)
    setDbLoaded(true)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) loadDbAddresses(uid)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (uid) loadDbAddresses(uid)
      else { setDbAddresses([]); setDbSelectedId(null); setDbLoaded(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadDbAddresses])

  useEffect(() => {
    if (userId === null) {
      useAddressStore.persist.rehydrate()
      setLocalHydrated(true)
    }
  }, [userId])

  const addAddress = useCallback(async (a: Omit<SavedAddress, 'id'>) => {
    if (userId) {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: userId,
          label: a.label,
          full_address: a.address,
          latitude: a.lat,
          longitude: a.lng,
          contact_name: a.contactName || null,
          contact_phone: a.contactPhone || null,
          is_default: true,
        })
        .select('id, label, full_address, latitude, longitude, contact_name, contact_phone, is_default')
        .single()
      if (error || !data) throw error ?? new Error('Failed to save address')

      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId).neq('id', data.id)

      const saved = fromDbRow(data as DbAddressRow)
      setDbAddresses((prev) => [saved, ...prev])
      setDbSelectedId(saved.id)
      return saved
    }
    return local.addAddress(a)
  }, [userId, local])

  const removeAddress = useCallback(async (id: string) => {
    if (userId) {
      const supabase = createClient()
      await supabase.from('addresses').delete().eq('id', id).eq('user_id', userId)
      setDbAddresses((prev) => {
        const remaining = prev.filter((x) => x.id !== id)
        setDbSelectedId((sel) => (sel === id ? remaining[0]?.id ?? null : sel))
        return remaining
      })
      return
    }
    local.removeAddress(id)
  }, [userId, local])

  const selectAddress = useCallback(async (id: string) => {
    if (userId) {
      const supabase = createClient()
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
      await supabase.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', userId)
      setDbSelectedId(id)
      return
    }
    local.selectAddress(id)
  }, [userId, local])

  if (userId) {
    return { addresses: dbAddresses, selectedId: dbSelectedId, addAddress, removeAddress, selectAddress, ready: dbLoaded }
  }
  return { addresses: local.addresses, selectedId: local.selectedId, addAddress, removeAddress, selectAddress, ready: userId === null && localHydrated }
}
