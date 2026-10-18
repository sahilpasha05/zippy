import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import type { Feature, Polygon } from 'geojson'
import { CITY } from '@/lib/city'

// Two hand-drawn boundaries over Tarikere, Karnataka, traced from a Google
// Maps screenshot (pixel positions converted using the map's centre and scale
// bar). Approximate — a few hundred metres of tolerance on any edge. Re-trace
// in Mapbox Studio / geojson.io if you need tighter edges.
//
//   inside DELIVERY_ZONE (black line)         → standard delivery fee
//   between the two lines (inside OUTER_ZONE) → higher delivery fee
//   outside OUTER_ZONE (red line)             → order is accepted but must be
//                                               confirmed by an executive call
export const DELIVERY_ZONE: Feature<Polygon> = {
  type: 'Feature',
  properties: { name: 'Zippy Delivery Zone' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [75.793493, 13.716512],
        [75.793876, 13.71571],
        [75.794424, 13.714104],
        [75.795244, 13.712231],
        [75.796065, 13.711001],
        [75.79705, 13.710626],
        [75.79787, 13.710358],
        [75.79798, 13.709021],
        [75.799348, 13.708218],
        [75.802357, 13.707415],
        [75.804272, 13.705275],
        [75.805913, 13.703402],
        [75.807554, 13.700726],
        [75.809743, 13.69805],
        [75.812478, 13.696177],
        [75.81494, 13.695214],
        [75.816855, 13.695107],
        [75.817676, 13.694304],
        [75.819591, 13.692699],
        [75.821506, 13.691254],
        [75.825062, 13.690666],
        [75.827251, 13.691629],
        [75.828454, 13.693502],
        [75.828782, 13.69591],
        [75.828892, 13.699121],
        [75.827251, 13.701261],
        [75.827032, 13.703937],
        [75.826703, 13.706077],
        [75.82643, 13.708485],
        [75.824241, 13.708753],
        [75.820685, 13.709984],
        [75.816308, 13.711429],
        [75.813573, 13.711964],
        [75.811384, 13.713034],
        [75.808649, 13.714372],
        [75.805366, 13.71571],
        [75.802083, 13.717048],
        [75.799348, 13.71785],
        [75.797159, 13.718064],
        [75.795518, 13.717583],
        [75.793876, 13.71678],
        [75.793493, 13.716512]
      ],
    ],
  },
}

export const OUTER_ZONE: Feature<Polygon> = {
  type: 'Feature',
  properties: { name: 'Zippy Outer Zone' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [75.791141, 13.727697],
        [75.780417, 13.720847],
        [75.780417, 13.713569],
        [75.780417, 13.706077],
        [75.78184, 13.699121],
        [75.788952, 13.69591],
        [75.793876, 13.695375],
        [75.799895, 13.693769],
        [75.802083, 13.689488],
        [75.80646, 13.685207],
        [75.813025, 13.681996],
        [75.818497, 13.679535],
        [75.825062, 13.676324],
        [75.832175, 13.67322],
        [75.836552, 13.673434],
        [75.841476, 13.675575],
        [75.845852, 13.678786],
        [75.849135, 13.681996],
        [75.852965, 13.686813],
        [75.856248, 13.693234],
        [75.858764, 13.699656],
        [75.860625, 13.703937],
        [75.862047, 13.708218],
        [75.862813, 13.713569],
        [75.862266, 13.71892],
        [75.860625, 13.722131],
        [75.854606, 13.725128],
        [75.850229, 13.726947],
        [75.846947, 13.728553],
        [75.841476, 13.729195],
        [75.83491, 13.729837],
        [75.827251, 13.729944],
        [75.817402, 13.730051],
        [75.813573, 13.730693],
        [75.811931, 13.730479],
        [75.809743, 13.72973],
        [75.804272, 13.729409],
        [75.797706, 13.728981],
        [75.792782, 13.728339],
        [75.791141, 13.727697]
      ],
    ],
  },
}

// Extra area on the north-east side (Upparabasavanahalli / Haliyuru) that is
// charged the standard fee as well. Hand-drawn on a Google Maps screenshot, so
// treat the edges as approximate.
export const NORTH_EAST_CORE_ZONE: Feature<Polygon> = {
  type: 'Feature',
  properties: { name: 'Zippy North-East Standard Area' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [75.823446, 13.71008],
        [75.825569, 13.710375],
        [75.826933, 13.710758],
        [75.827631, 13.711023],
        [75.829511, 13.710316],
        [75.832241, 13.709785],
        [75.834667, 13.709638],
        [75.838306, 13.709579],
        [75.839368, 13.709137],
        [75.839883, 13.708106],
        [75.839974, 13.707222],
        [75.840278, 13.706279],
        [75.839671, 13.705159],
        [75.838609, 13.703686],
        [75.8377, 13.70236],
        [75.83679, 13.701034],
        [75.836032, 13.70015],
        [75.83497, 13.699856],
        [75.833757, 13.699856],
        [75.832392, 13.70015],
        [75.831725, 13.70074],
        [75.831695, 13.701624],
        [75.831483, 13.702508],
        [75.831028, 13.703392],
        [75.830269, 13.704276],
        [75.829208, 13.705307],
        [75.828298, 13.706043],
        [75.826782, 13.706927],
        [75.825569, 13.707664],
        [75.824659, 13.708253],
        [75.824052, 13.708843],
        [75.823749, 13.709432],
        [75.823446, 13.71008],
      ],
    ],
  },
}

export type DeliveryTier = 'core' | 'extended' | 'outside'

// Small areas that are always treated as INSIDE the red line (the ₹59 area:
// normal order, no executive call), even where the traced boundary would put
// them just outside. Circles: centre plus radius in metres. The traced red
// line is approximate, so known villages that are served are listed here.
const ALWAYS_EXTENDED_AREAS: { name: string; lat: number; lng: number; radiusM: number }[] = [
  { name: 'Byrapura', lat: 13.67184, lng: 75.82095, radiusM: 350 },
]

function metresBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(a))
}

// Turf/GeoJSON is [lng, lat] — this helper takes the more natural (lat, lng)
// argument order used throughout the rest of the app (geolocation, reverse-geocode, etc).
export function getDeliveryTier(lat: number, lng: number): DeliveryTier {
  // The traced boundaries above are Tarikere's. A city without its own traced
  // boundaries (Kadur, for now) has one flat delivery area: everything is 'core'
  // until its zones are added here.
  if (CITY.slug !== 'tarikere') return 'core'
  const p = point([lng, lat])
  if (booleanPointInPolygon(p, DELIVERY_ZONE)) return 'core'
  if (booleanPointInPolygon(p, NORTH_EAST_CORE_ZONE)) return 'core'
  if (booleanPointInPolygon(p, OUTER_ZONE)) return 'extended'
  if (ALWAYS_EXTENDED_AREAS.some((a) => metresBetween(lat, lng, a.lat, a.lng) <= a.radiusM)) return 'extended'
  return 'outside'
}

// Shown wherever an address outside the outer boundary is used for an order.
export const NEEDS_CONFIRMATION_MESSAGE =
  'Your order is not confirmed until our executive calls you. We will check whether a delivery partner is available in your area.'

// Shown next to the "continue with manual address" option. That option is
// only for addresses inside the town (the inner boundary), where the fee
// is the standard one and no executive call is needed.
export const MANUAL_ADDRESS_NOTE =
  `Live inside ${CITY.name} town? You can continue with the address you type instead.`

// One wording wherever location is blocked, so the cart, checkout and the
// address form tell the customer the same thing.
export const ALLOW_LOCATION_MESSAGE =
  'Please allow location access so that we can calculate your exact price and delivery charge.'
