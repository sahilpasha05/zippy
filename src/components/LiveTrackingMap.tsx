'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { AlertTriangle } from 'lucide-react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

export type LatLng = { lat: number; lng: number }

type Props = {
  riderLocation: LatLng | null
  dropLocation: LatLng | null
  riderStale?: boolean
  className?: string
  showRiderStatus?: boolean // set false when there's no delivery context (e.g. confirming your own address pin)
}

// Simple bike SVG used as the rider's live marker
function riderMarkerEl() {
  const el = document.createElement('div')
  el.innerHTML = `
    <div style="width:34px;height:34px;border-radius:50%;background:#7C3AED;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(124,58,237,0.5);border:2.5px solid white;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
        <path d="M15 6a1 1 0 100-2 1 1 0 000 2zM12 17.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    </div>`
  return el
}

function dropMarkerEl() {
  const el = document.createElement('div')
  el.innerHTML = `
    <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#16A34A;border:2.5px solid white;box-shadow:0 2px 8px rgba(22,163,74,0.5);"></div>`
  return el
}

export default function LiveTrackingMap({ riderLocation, dropLocation, riderStale, className, showRiderStatus = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const dropMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [ready, setReady] = useState(false)

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-8 text-center ${className ?? ''}`}>
        <AlertTriangle className="w-8 h-8 text-[#D97706]" />
        <p className="text-[13.5px] font-semibold text-[#374151]">Map isn&apos;t configured yet</p>
        <p className="text-[12px] text-[#9CA3AF] max-w-xs">Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local and restart the dev server to enable live tracking.</p>
      </div>
    )
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    const initialCenter = riderLocation ?? dropLocation ?? { lat: 12.9716, lng: 77.5946 }
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 13,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current.on('load', () => setReady(true))
    return () => { mapRef.current?.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapRef.current || !ready) return
    const map = mapRef.current

    if (dropLocation) {
      if (!dropMarkerRef.current) {
        dropMarkerRef.current = new mapboxgl.Marker({ element: dropMarkerEl() }).setLngLat([dropLocation.lng, dropLocation.lat]).addTo(map)
      } else {
        dropMarkerRef.current.setLngLat([dropLocation.lng, dropLocation.lat])
      }
    }

    if (riderLocation) {
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = new mapboxgl.Marker({ element: riderMarkerEl() }).setLngLat([riderLocation.lng, riderLocation.lat]).addTo(map)
      } else {
        riderMarkerRef.current.setLngLat([riderLocation.lng, riderLocation.lat])
      }
    }

    const points: [number, number][] = []
    if (riderLocation) points.push([riderLocation.lng, riderLocation.lat])
    if (dropLocation) points.push([dropLocation.lng, dropLocation.lat])
    if (points.length === 2) {
      const bounds = points.reduce((b, p) => b.extend(p), new mapboxgl.LngLatBounds(points[0], points[0]))
      map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 800 })
    } else if (points.length === 1) {
      map.flyTo({ center: points[0], zoom: 14, duration: 800 })
    }
  }, [riderLocation, dropLocation, ready])

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#E5E7EB] ${className ?? ''}`}>
      <div ref={containerRef} className="w-full h-full min-h-[280px]" />
      {showRiderStatus && riderLocation && riderStale && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur rounded-full text-[11.5px] font-medium text-[#D97706] shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5" /> Rider location hasn&apos;t updated recently
        </div>
      )}
      {showRiderStatus && !riderLocation && (
        <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/95 backdrop-blur rounded-full text-[11.5px] font-medium text-[#6B7280] shadow-sm">
          Waiting for rider&apos;s live location...
        </div>
      )}
    </div>
  )
}
