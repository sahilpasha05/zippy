'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { AlertTriangle } from 'lucide-react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

export type Ring = [number, number][] // [lng, lat] corners, not repeated at the end

export type MapZone = {
  id: string
  name: string
  color: string
  polygon: Ring | null
  fee: number
  active: boolean
}

type Props = {
  zones: MapZone[]                       // drawn in this order: later ones sit on top
  selectedId: string | null
  satellite: boolean
  drawing: boolean                       // placing the corners of a new zone
  draft: Ring                            // the corners placed so far
  testing: boolean                       // tapping the map checks a location
  testPoint: { lat: number; lng: number } | null
  onSelect: (id: string | null) => void
  onRingChange: (id: string, ring: Ring) => void
  onDraftChange: (ring: Ring) => void
  onTestPoint: (lat: number, lng: number) => void
  className?: string
}

const DEFAULT_CENTER: [number, number] = [75.813, 13.7023]

function closed(ring: Ring): Ring {
  return ring.length > 0 ? [...ring, ring[0]] : ring
}

function centroid(ring: Ring): [number, number] {
  const n = ring.length
  return [ring.reduce((a, p) => a + p[0], 0) / n, ring.reduce((a, p) => a + p[1], 0) / n]
}

function vertexEl(color: string) {
  const el = document.createElement('div')
  el.style.cssText = `width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid ${color};box-shadow:0 1px 5px rgba(0,0,0,.45);cursor:grab;`
  el.title = 'Drag to move this corner. Double-click to remove it.'
  return el
}

function midEl(color: string) {
  const el = document.createElement('div')
  el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};opacity:.75;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35);cursor:copy;`
  el.title = 'Click to add a corner here'
  return el
}

function dotEl(color: string) {
  const el = document.createElement('div')
  el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);`
  return el
}

function pinEl() {
  const el = document.createElement('div')
  el.style.cssText = 'width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#7C3AED;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);'
  return el
}

// An interactive map for drawing delivery zones. Everything is drawn as GeoJSON layers; the
// selected zone gets a draggable round handle on every corner and a small dot in the middle of
// every side (click it to add a corner there). Parents own the data; this only reports edits.
export default function ZoneMapEditor(props: Props) {
  const { className } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)
  const handleMarkers = useRef<mapboxgl.Marker[]>([])
  const draftMarkers = useRef<mapboxgl.Marker[]>([])
  const pinRef = useRef<mapboxgl.Marker | null>(null)
  const fittedRef = useRef(false)
  const propsRef = useRef(props)
  propsRef.current = props

  // ---- create the map once
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: props.satellite ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 12.4,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    const addSourcesAndLayers = () => {
      if (!map.getSource('zones')) {
        map.addSource('zones', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addSource('zone-labels', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addSource('draft', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'selected'], 0.36, ['get', 'inactive'], 0.06, 0.2] } })
        map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 3.5, 1.8], 'line-dasharray': ['case', ['get', 'inactive'], ['literal', [2, 2]], ['literal', [1, 0]]] } })
        map.addLayer({ id: 'zones-label', type: 'symbol', source: 'zone-labels', layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-allow-overlap': false, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'] }, paint: { 'text-color': '#111827', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 } })
        map.addLayer({ id: 'draft-fill', type: 'fill', source: 'draft', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#7C3AED', 'fill-opacity': 0.2 } })
        map.addLayer({ id: 'draft-line', type: 'line', source: 'draft', paint: { 'line-color': '#7C3AED', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } })
      }
      loadedRef.current = true
      syncZones()
      syncDraft()
    }
    map.on('load', addSourcesAndLayers)
    map.on('style.load', () => { if (map.isStyleLoaded() && !map.getSource('zones')) addSourcesAndLayers() })

    map.on('click', (e) => {
      const p = propsRef.current
      if (p.drawing) { p.onDraftChange([...p.draft, [e.lngLat.lng, e.lngLat.lat]]); return }
      if (p.testing) { p.onTestPoint(e.lngLat.lat, e.lngLat.lng); return }
      const hits = map.queryRenderedFeatures(e.point, { layers: ['zones-fill'] })
      // The smallest/top-most zone under the click: features come back top first.
      p.onSelect(hits.length > 0 ? String(hits[0].properties?.id) : null)
    })
    map.on('mouseenter', 'zones-fill', () => { const p = propsRef.current; if (!p.drawing && !p.testing) map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'zones-fill', () => { const p = propsRef.current; map.getCanvas().style.cursor = p.drawing || p.testing ? 'crosshair' : '' })

    return () => {
      handleMarkers.current.forEach((m) => m.remove())
      draftMarkers.current.forEach((m) => m.remove())
      pinRef.current?.remove()
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- the zones, labels and fit
  function syncZones() {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const { zones, selectedId } = propsRef.current
    const withRing = zones.filter((z) => z.polygon && z.polygon.length >= 3)
    ;(map.getSource('zones') as mapboxgl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: withRing.map((z) => ({
        type: 'Feature', properties: { id: z.id, color: z.color, selected: z.id === selectedId, inactive: !z.active },
        geometry: { type: 'Polygon', coordinates: [closed(z.polygon!)] },
      })),
    })
    ;(map.getSource('zone-labels') as mapboxgl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: withRing.map((z) => ({
        type: 'Feature', properties: { label: `${z.name}\n₹${z.fee}` },
        geometry: { type: 'Point', coordinates: centroid(z.polygon!) },
      })),
    })
    if (!fittedRef.current && withRing.length > 0) {
      fittedRef.current = true
      const b = new mapboxgl.LngLatBounds()
      withRing.forEach((z) => z.polygon!.forEach((c) => b.extend(c)))
      map.fitBounds(b, { padding: 50, duration: 0 })
    }
  }

  // ---- corner handles for the selected zone
  function syncHandles() {
    const map = mapRef.current
    if (!map) return
    handleMarkers.current.forEach((m) => m.remove())
    handleMarkers.current = []
    const { zones, selectedId, drawing, testing } = propsRef.current
    const zone = zones.find((z) => z.id === selectedId)
    if (!zone || !zone.polygon || zone.polygon.length < 3 || drawing || testing) return
    const ring = zone.polygon
    const n = ring.length

    ring.forEach((c, i) => {
      const el = vertexEl(zone.color)
      const marker = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat(c).addTo(map)
      marker.on('drag', () => {
        // Live outline while dragging (the parent hears about it when the drag ends).
        const ll = marker.getLngLat()
        const live = ring.map((p, j) => (j === i ? ([ll.lng, ll.lat] as [number, number]) : p))
        ;(map.getSource('zones') as mapboxgl.GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: zones.filter((z) => z.polygon && z.polygon.length >= 3).map((z) => ({
            type: 'Feature', properties: { id: z.id, color: z.color, selected: z.id === zone.id, inactive: !z.active },
            geometry: { type: 'Polygon', coordinates: [closed(z.id === zone.id ? live : z.polygon!)] },
          })),
        })
      })
      marker.on('dragend', () => {
        const ll = marker.getLngLat()
        propsRef.current.onRingChange(zone.id, ring.map((p, j) => (j === i ? ([ll.lng, ll.lat] as [number, number]) : p)))
      })
      el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation()
        if (ring.length <= 3) return
        propsRef.current.onRingChange(zone.id, ring.filter((_, j) => j !== i))
      })
      handleMarkers.current.push(marker)
    })

    // A small dot on the middle of every side: click it to add a corner there.
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n]
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      const el = midEl(zone.color)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        const next = [...ring.slice(0, i + 1), mid, ...ring.slice(i + 1)]
        propsRef.current.onRingChange(zone.id, next)
      })
      handleMarkers.current.push(new mapboxgl.Marker({ element: el }).setLngLat(mid).addTo(map))
    }
  }

  // ---- the shape being drawn
  function syncDraft() {
    const map = mapRef.current
    if (!map) return
    const { draft, drawing } = propsRef.current
    draftMarkers.current.forEach((m) => m.remove())
    draftMarkers.current = []
    const src = map.getSource('draft') as mapboxgl.GeoJSONSource | undefined
    if (!src) return
    if (!drawing || draft.length === 0) { src.setData({ type: 'FeatureCollection', features: [] }); return }
    src.setData({
      type: 'FeatureCollection',
      features: [
        draft.length >= 3
          ? { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closed(draft)] } }
          : { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: draft } },
      ],
    })
    draft.forEach((c) => draftMarkers.current.push(new mapboxgl.Marker({ element: dotEl('#7C3AED') }).setLngLat(c).addTo(map)))
  }

  // ---- react to the parent's data
  useEffect(() => { syncZones(); syncHandles() }) // every render: cheap, and keeps layers and handles in step
  useEffect(() => { syncDraft() }, [props.draft, props.drawing])

  // style switch (street <-> satellite)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    loadedRef.current = false
    map.setStyle(props.satellite ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/streets-v12')
    // style.load handler re-adds the layers
  }, [props.satellite])

  // cursor + test pin
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = props.drawing || props.testing ? 'crosshair' : ''
  }, [props.drawing, props.testing])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    pinRef.current?.remove(); pinRef.current = null
    if (props.testPoint) pinRef.current = new mapboxgl.Marker({ element: pinEl(), anchor: 'bottom' }).setLngLat([props.testPoint.lng, props.testPoint.lat]).addTo(map)
  }, [props.testPoint])

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-8 text-center ${className ?? ''}`}>
        <AlertTriangle className="w-8 h-8 text-[#D97706]" />
        <p className="text-[13.5px] font-semibold text-[#374151]">Map isn&apos;t configured</p>
        <p className="text-[12px] text-[#9CA3AF] max-w-xs">Add NEXT_PUBLIC_MAPBOX_TOKEN to the environment and restart.</p>
      </div>
    )
  }
  return <div ref={containerRef} className={className} />
}
