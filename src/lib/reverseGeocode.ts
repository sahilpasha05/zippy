const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

// Turns GPS coordinates into a human-readable address using Mapbox's geocoding API.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.features?.[0]?.place_name ?? null
  } catch {
    return null
  }
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported on this device')); return }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 })
  })
}
