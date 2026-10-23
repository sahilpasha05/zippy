'use client'

import { create } from 'zustand'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import type { Feature, Polygon } from 'geojson'
import { createClient } from '@/lib/supabase/client'
import { getDeliveryTier } from '@/lib/deliveryZone'

// Delivery zones drawn by the admin (Admin > Delivery zones). A customer's live location
// is matched against the active zones in priority order; the first one that contains it
// sets the delivery fee, the minimum order, cash-on-delivery-only and whether an executive
// must confirm. Anywhere outside every zone uses the "outside" rule. If no zones have
// loaded (or none exist, as in a new city), the older built-in rules apply, so pricing
// never breaks.

export type ZoneRow = {
  id: string
  name: string
  kind: 'zone' | 'outside'
  color: string
  polygon: [number, number][] | null   // [lng, lat] corners, not repeated at the end
  delivery_fee: number
  min_order: number
  cod_only: boolean
  needs_confirmation: boolean
  priority: number
  is_active: boolean
}

export type ZoneRule = {
  id: string | null
  name: string
  fee: number
  minOrder: number
  codOnly: boolean
  needsConfirmation: boolean
}

type Store = {
  zones: ZoneRow[] | null      // active drawn zones, by priority; null until loaded (or none exist)
  outside: ZoneRow | null
  version: number              // bumps on every load so components can re-render
  load: () => Promise<void>
}

export function normaliseZoneRow(r: Record<string, unknown>): ZoneRow {
  return {
    id: String(r.id),
    name: String(r.name),
    kind: r.kind === 'outside' ? 'outside' : 'zone',
    color: String(r.color ?? '#16A34A'),
    polygon: Array.isArray(r.polygon) ? (r.polygon as [number, number][]) : null,
    delivery_fee: Number(r.delivery_fee ?? 0),
    min_order: Number(r.min_order ?? 0),
    cod_only: !!r.cod_only,
    needs_confirmation: !!r.needs_confirmation,
    priority: Number(r.priority ?? 100),
    is_active: r.is_active !== false,
  }
}

export const useDeliveryZones = create<Store>()((set) => ({
  zones: null,
  outside: null,
  version: 0,
  load: async () => {
    try {
      const { data, error } = await createClient().from('delivery_zones').select('*').eq('is_active', true).order('priority')
      if (error || !data) return
      const rows = data.map(normaliseZoneRow)
      const zones = rows.filter((z) => z.kind === 'zone' && z.polygon && z.polygon.length >= 3)
      const outside = rows.find((z) => z.kind === 'outside') ?? null
      set((s) => ({ zones: zones.length > 0 ? zones : null, outside, version: s.version + 1 }))
    } catch { /* keep the built-in rules */ }
  },
}))

export function polygonFeature(ring: [number, number][]): Feature<Polygon> {
  const closed = ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ? [...ring, ring[0]] : ring
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closed] } }
}

// The built-in Tarikere rules, used until zones load and in cities with none.
const LEGACY_FEES = { core: 29, extended: 59, outside: 80 }
const LEGACY_OUTSIDE_MIN = 600

function toRule(z: ZoneRow): ZoneRule {
  return { id: z.id, name: z.name, fee: z.delivery_fee, minOrder: z.min_order, codOnly: z.cod_only, needsConfirmation: z.needs_confirmation }
}

// The rule for a place with no coordinates (a typed address): the innermost zone's.
export function defaultZoneRule(): ZoneRule {
  const { zones } = useDeliveryZones.getState()
  if (zones && zones.length > 0) return toRule(zones[0])
  return { id: null, name: 'Standard', fee: LEGACY_FEES.core, minOrder: 0, codOnly: false, needsConfirmation: false }
}

// Which rule applies at a point, given a list of zones (used by the checkout and by the
// admin's "test a location" tool, which tries unsaved edits too). Zones must be in priority order.
export function resolveFromZones(zones: ZoneRow[], outside: ZoneRow | null, lat: number, lng: number): ZoneRule {
  const p = point([lng, lat])
  const hit = zones.find((z) => z.polygon && z.polygon.length >= 3 && booleanPointInPolygon(p, polygonFeature(z.polygon)))
  if (hit) return toRule(hit)
  if (outside) return toRule(outside)
  return { id: null, name: 'Outside our delivery area', fee: LEGACY_FEES.outside, minOrder: LEGACY_OUTSIDE_MIN, codOnly: true, needsConfirmation: true }
}

export function resolveZoneRule(lat: number | null | undefined, lng: number | null | undefined): ZoneRule {
  if (lat == null || lng == null) return defaultZoneRule()
  const { zones, outside } = useDeliveryZones.getState()
  if (zones && zones.length > 0) return resolveFromZones(zones, outside, lat, lng)
  const tier = getDeliveryTier(lat, lng)
  if (tier === 'core') return { id: null, name: 'Standard', fee: LEGACY_FEES.core, minOrder: 0, codOnly: false, needsConfirmation: false }
  if (tier === 'extended') return { id: null, name: 'Outer area', fee: LEGACY_FEES.extended, minOrder: 0, codOnly: false, needsConfirmation: false }
  return { id: null, name: 'Outside our delivery area', fee: LEGACY_FEES.outside, minOrder: LEGACY_OUTSIDE_MIN, codOnly: true, needsConfirmation: true }
}
