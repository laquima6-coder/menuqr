import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase as sb } from '../lib/supabase.js'

const TOMTOM_KEY   = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TOMTOM_KEY) || 'NP2gPszMkFrVccT95vTeaMrsWfZ0ORLU'
const G  = '#e8a020'
const GA = 'rgba(232,160,32,'

// ── TomTom CDN loader ────────────────────────────────────────────────────────
let _ttState = 'idle', _ttCbs = []
function loadTT(cb) {
  if (window.tt) { cb(); return }
  _ttCbs.push(cb)
  if (_ttState !== 'idle') return
  _ttState = 'loading'
  const l = document.createElement('link'); l.rel = 'stylesheet'
  l.href = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css'
  document.head.appendChild(l)
  const s = document.createElement('script')
  s.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js'
  s.onload = () => { _ttState = 'ready'; _ttCbs.forEach(f => f()); _ttCbs = [] }
  s.onerror = () => { _ttState = 'idle'; _ttCbs = [] }
  document.head.appendChild(s)
}

export default function TrackingPage() {
  const { slug } = useParams()

  // Read URL params: ?dir=ADDRESS&nombre=NAME
  const params  = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const destDir  = params.get('dir')  || ''
  const destNombre = params.get('nombre') || ''

  const [active,  setActive]  = useState(false)
  const [pos,     setPos]     = useState(null)
  const [error,   setError]   = useState(null)
  const [updates, setUpdates] = useState(0)
  const channelRef  = useRef(null)
  const watchRef    = useRef(null)
  const mapRef      = useRef(null)
  const mapContRef  = useRef(null)
  const markerRef   = useRef(null)
  const destMarkerRef = useRef(null)
  const routeDrawn  = useRef(false)

  const stopTracking = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'stopped', payload: {} }).catch(() => {})
      sb.removeChannel(channelRef.current); channelRef.current = null
    }
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    markerRef.current = null; destMarkerRef.current = null; routeDrawn.current = false
    setActive(false); setPos(null); setUpdates(0)
  }

  // Draw route from current pos to destination on map
  const drawRoute = (map, fromLat, fromLon, toLat, toLon) => {
    if (!map || routeDrawn.current) return
    routeDrawn.current = true
    fetch(`https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${TOMTOM_KEY}&routeType=fastest&traffic=false`)
      .then(r => r.json()).then(data => {
        const pts = data?.routes?.[0]?.legs?.[0]?.points
        if (!pts) return
        const coords = pts.map(p => [p.longitude, p.latitude])
        const geo = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }
        try {
          if (map.getSource('route')) { map.getSource('route').setData(geo) }
          else {
            map.addSource('route', { type: 'geojson', data: geo })
            map.addLayer({ id: 'route', type: 'line', source: 'route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': G, 'line-width': 5, 'line-opacity': 0.8 } })
          }
          const b = new window.tt.LngLatBounds()
          coords.forEach(c => b.extend(c))
          map.fitBounds(b, { padding: 60, maxZoom: 16 })
        } catch (e) { console.warn('route:', e) }
      }).catch(() => {})
  }

  const startTracking = async () => {
    if (!navigator.geolocation) { setError('Este dispositivo no tiene GPS'); return }
    setError(null)
    const ch = sb.channel(`tracking:${slug}`)
    await ch.subscribe()
    channelRef.current = ch

    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lon, accuracy } = coords
        setPos({ lat, lon, acc: Math.round(accuracy) })
        ch.send({ type: 'broadcast', event: 'location', payload: { lat, lon, ts: Date.now() } })
        setUpdates(u => u + 1)
        if (markerRef.current) markerRef.current.setLngLat([lon, lat])
        if (mapRef.current && !destMarkerRef.current) mapRef.current.setCenter([lon, lat])
      },
      err => setError('Error GPS: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )
    setActive(true)

    loadTT(() => {
      if (!mapContRef.current || mapRef.current) return
      const map = window.tt.map({ key: TOMTOM_KEY, container: mapContRef.current, zoom: 16 })
      mapRef.current = map
      map.on('load', async () => {
        // Driver marker
        const m = new window.tt.Marker({ color: G }).addTo(map)
        markerRef.current = m

        // If we have a destination address, geocode and show it
        if (destDir) {
          try {
            const res = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(destDir)}.json?key=${TOMTOM_KEY}&limit=1`)
            const data = await res.json()
            const result = data?.results?.[0]
            if (result) {
              const { lat: dLat, lon: dLon } = result.position
              new window.tt.Marker({ color: '#ff4444' }).setLngLat([dLon, dLat]).addTo(map)
              destMarkerRef.current = { lat: dLat, lon: dLon }
              // Get current position then draw route
              navigator.geolocation.getCurrentPosition(({ coords }) => {
                drawRoute(map, coords.latitude, coords.longitude, dLat, dLon)
              }, () => {
                map.setCenter([dLon, dLat]); map.setZoom(15)
              })
            }
          } catch (e) { console.warn('geocode:', e) }
        }
      })
    })
  }

  useEffect(() => () => stopTracking(), [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'DM Sans',sans-serif", display: 'flex', flexDirection: 'column' }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=DM+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box}body{margin:0;background:#0a0a0a}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Header */}
      <div style={{ background: 'rgba(12,12,12,.97)', padding: '16px', borderBottom: `1px solid ${GA}0.2)`, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 28 }}>🛵</span>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>Tracking Repartidor</div>
          <div style={{ fontSize: 12, color: G, fontFamily: "'IBM Plex Mono',monospace" }}>{slug}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 8px #4CAF50', animation: 'pulse 1.5s infinite' }} />}
          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: active ? '#4CAF50' : 'rgba(255,255,255,.35)', letterSpacing: 1 }}>
            {active ? 'EN VIVO' : 'INACTIVO'}
          </span>
        </div>
      </div>

      {/* Destination info */}
      {destDir && (
        <div style={{ margin: '12px 16px 0', background: `${GA}0.07)`, border: `1px solid ${GA}0.2)`, borderRadius: 14, padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: G, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1.5, marginBottom: 5 }}>DESTINO</div>
          {destNombre && <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3 }}>👤 {destNombre}</div>}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>📍 {destDir}</div>
        </div>
      )}

      {/* Map */}
      {active && (
        <div style={{ flex: 1, minHeight: 320, position: 'relative', margin: '12px 0 0' }}>
          <div ref={mapContRef} style={{ width: '100%', height: '100%', minHeight: 320 }} />
          {!pos && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,.7)' }}>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Obteniendo GPS...</div>
            </div>
          )}
          {destDir && (
            <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <span style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: '3px 10px', fontSize: 10, color: G }}>🛵 Vos</span>
              <span style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: '3px 10px', fontSize: 10, color: '#ff7070' }}>📍 Destino</span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{ background: 'rgba(255,68,68,.1)', border: '1px solid rgba(255,68,68,.3)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#ff7070' }}>
            ⚠️ {error}
          </div>
        )}

        {pos && (
          <div style={{ background: `${GA}.07)`, border: `1px solid ${GA}.2)`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: G, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1 }}>POSICION GPS</span>
              <span style={{ fontSize: 10, color: `${GA}.6)`, fontFamily: "'IBM Plex Mono',monospace" }}>{updates} envios</span>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#fff' }}>
              {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>Precision: ±{pos.acc}m</div>
          </div>
        )}

        {!active ? (
          <button onClick={startTracking}
            style={{ background: G, color: '#1a0d00', border: 'none', borderRadius: 14, padding: 18, fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, cursor: 'pointer', width: '100%' }}>
            📍 {destDir ? 'Retiré el pedido — Iniciar tracking' : 'Iniciar tracking'}
          </button>
        ) : (
          <>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.45)', fontFamily: "'DM Sans',sans-serif" }}>
              Los clientes ven tu posicion en tiempo real
            </div>
            <button onClick={stopTracking}
              style={{ background: 'rgba(255,68,68,.12)', border: '1px solid rgba(255,68,68,.3)', color: '#ff7070', borderRadius: 14, padding: 16, fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              ⏹ Detener tracking
            </button>
          </>
        )}

        <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,.3)', textAlign: 'center', lineHeight: 1.7 }}>
          Manten esta pantalla abierta durante el reparto
        </div>
      </div>
    </div>
  )
}
