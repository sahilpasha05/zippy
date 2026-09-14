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
    // Browsers expose geolocation only on secure origins, so it's simply absent
    // when the app is opened over plain http on a LAN address (e.g. testing on a
    // phone via http://192.168.x.x:3000) — worth naming, since it looks
    // identical to a denied permission from the user's side.
    if (!navigator.geolocation) {
      reject(new Error(
        window.isSecureContext
          ? 'Geolocation is not supported on this device'
          : 'Location needs a secure connection — open the site over https, or use localhost when testing'
      ))
      return
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      // GeolocationPositionError is not an Error instance, so callers doing
      // `err instanceof Error` would otherwise lose the reason entirely.
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? 'Location permission is blocked. Allow location access for this site in your browser settings and try again.'
          : err.code === err.POSITION_UNAVAILABLE
            ? 'Your location could not be determined. Check that device location/GPS is switched on.'
            : err.code === err.TIMEOUT
              ? 'Timed out finding your location. Move somewhere with a clearer signal and try again.'
              : err.message || 'Could not get your location'
      )),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  })
}
