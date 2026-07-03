import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://fwovflsaghnutysjyaus.supabase.co'
const SUPABASE_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3b3ZmbHNhZ2hudXR5c2p5YXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Njc0NzUsImV4cCI6MjA5NjI0MzQ3NX0.HtkD4AK35MSf4o9oNeGTlsooE0zSodjFVZH94ipCUAo'
const TOMTOM_KEY  = import.meta.env.VITE_TOMTOM_KEY

const sb  = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null
const fmt = n => Number(n || 0).toLocaleString('es-AR')

const G  = '#e8a020'
const GA = 'rgba(232,160,32,'

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  bg:       { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'DM Sans',sans-serif" },
  header:   { background: 'rgba(12,12,12,0.97)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${GA}0.15)`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 },
  card:     { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px', marginBottom: 12 },
  goldCard: { background: `${GA}0.05)`, border: `1px solid ${GA}0.22)`, borderRadius: 16, padding: '16px', marginBottom: 12 },
  input:    { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '13px 14px', color: '#fff', fontSize: 15, boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", outline: 'none', transition: 'border-color .2s' },
  label:    { fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', marginBottom: 7, textTransform: 'uppercase', display: 'block' },
  btn:      { width: '100%', background: G, color: '#1a0d00', border: 'none', borderRadius: 14, padding: '15px', fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3, transition: 'opacity .15s' },
  btnGhost: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 14, padding: '15px', fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  mono:     { fontFamily: "'IBM Plex Mono',monospace" },
  outfit:   { fontFamily: "'Outfit',sans-serif" },
  dmsans:   { fontFamily: "'DM Sans',sans-serif" },
  catBtn:   active => ({
    background: active ? `${GA}0.15)` : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? GA + '0.4)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 20, padding: '7px 15px', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: active ? 700 : 400,
    color: active ? G : 'rgba(255,255,255,0.65)', flexShrink: 0,
  }),
}

// ─── Loading / Error / Done screens ──────────────────────────────────────────

function Spinner({ text = 'Cargando...' }) {
  return (
    <div style={{ ...S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: `4px solid ${GA}0.2)`, borderTopColor: G, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <div style={{ ...S.outfit, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{text}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorScreen({ msg }) {
  return (
    <div style={{ ...S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
      <div style={{ fontSize: '3rem' }}>🛵</div>
      <div style={{ ...S.outfit, fontSize: '1.1rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>{msg}</div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DeliveryPage() {
  const { slug } = useParams()

  // Data
  const [local, setLocal]   = useState(null)
  const [cats,  setCats]    = useState([])
  const [prods, setProds]   = useState([])
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState(null)

  // Flow
  const [step,       setStep]       = useState(1)  // 1=carta 2=form 3=resumen+pago
  const [cart,       setCart]       = useState({})
  const [activeCat,  setActiveCat]  = useState('')

  // Step 2 — form
  const [name,  setName]  = useState('')
  const [phone, setPhone] = useState('')
  const [direc, setDirec] = useState('')
  const [piso,  setPiso]  = useState('')
  const [nota,  setNota]  = useState('')

  // Geocoding / zone
  const [direcSugg,   setDirecSugg]  = useState([])
  const [suggLoading, setSuggLoad]   = useState(false)
  const [direcPos,    setDirecPos]   = useState(null)   // {lat, lon}
  const [zoneInfo,    setZoneInfo]   = useState(null)   // {zona, distKm} | {fuera, distKm}
  const [zoneLoading, setZoneLoad]   = useState(false)

  // Step 3 — payment & confirm
  const [payMethod, setPayMethod] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [done,      setDone]      = useState(false)
  const [copied,    setCopied]    = useState('')

  const direcTimer = useRef(null)

  // ── Load restaurant data ──────────────────────────────────────────────────

  useEffect(() => { loadData() }, [slug])

  async function loadData() {
    setLoading(true); setDataError(null)
    if (!sb) { setDataError('Sin conexión a base de datos'); setLoading(false); return }
    try {
      const { data: rest, error: restErr } = await sb.from('restaurantes').select('*').eq('slug', slug).single()
      if (restErr || !rest) { setDataError('Restaurante no encontrado'); setLoading(false); return }

      const [{ data: catsData }, { data: prodsData }] = await Promise.all([
        sb.from('categorias').select('*').eq('restaurante_id', rest.id).order('orden'),
        sb.from('productos').select('*').eq('restaurante_id', rest.id).order('orden'),
      ])

      const cfg = rest.config || {}
      setLocal({
        nombre:                  rest.nombre,
        logo_url:                rest.logo_url || '',
        restauranteId:           rest.id,
        slug,
        delivery_config:         rest.delivery_config || null,
        mp_alias:                cfg.mp_alias     || rest.mp_alias     || '',
        alias_trans:             cfg.alias_trans  || rest.alias_trans  || cfg.mp_alias || rest.mp_alias || '',
        mp_titular:              cfg.mp_titular   || rest.mp_titular   || '',
        mp_mostrar_alias:        cfg.mp_mostrar_alias ?? true,
        // WhatsApp number: check several fields in priority order
        whatsapp_num:            cfg.whatsapp_vitrina_numero || cfg.whatsapp || rest.whatsapp_vitrina_numero || rest.whatsapp || rest.telefono || '',
      })

      const activeCats = (catsData || []).filter(c => c.activa !== false)
      setCats(activeCats)
      setProds((prodsData || []).map(p => ({
        ...p,
        cat:    p.cat    ?? p.categoria_id ?? null,
        name:   p.name   || p.nombre       || "",
        nombre: p.nombre || p.name         || "",
        price:  p.price  ?? p.precio       ?? 0,
        precio: p.precio ?? p.price        ?? 0,
        active: p.active ?? p.activo       ?? true,
        activo: p.activo ?? p.active       ?? true,
        desc:   p.desc   || p.descripcion  || "",
        orig:   p.orig   ?? p.precio_original ?? null,
      })))
      if (activeCats.length > 0) setActiveCat(activeCats[0].id)
    } catch (e) {
      setDataError('Error al cargar la carta')
    } finally {
      setLoading(false)
    }
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const cartItems = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => { const p = prods.find(x => String(x.id) === String(id)); return p ? { ...p, qty } : null })
    .filter(Boolean)

  const total    = cartItems.reduce((s, i) => s + i.price * i.qty, 0)
  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0)

  const addItem = p => setCart(c => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))
  const remItem = p => setCart(c => {
    const q = (c[p.id] || 0) - 1
    if (q <= 0) { const n = { ...c }; delete n[p.id]; return n }
    return { ...c, [p.id]: q }
  })

  // ── TomTom address autocomplete ───────────────────────────────────────────

  const handleDirecChange = val => {
    setDirec(val); setZoneInfo(null); setDirecPos(null)
    clearTimeout(direcTimer.current)
    if (!val.trim() || val.length < 4 || !TOMTOM_KEY) { setDirecSugg([]); return }
    setSuggLoad(true)
    direcTimer.current = setTimeout(async () => {
      try {
        const rLat = local?.delivery_config?.lat ?? -34.6037
        const rLng = local?.delivery_config?.lng ?? -58.3816
        const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(val)}.json?key=${TOMTOM_KEY}&limit=5&countrySet=AR&lat=${rLat}&lon=${rLng}`
        const data = await (await fetch(url)).json()
        const suggs = (data.results || [])
          .filter(r => r.address?.freeformAddress)
          .map(r => ({ label: r.address.freeformAddress, lat: r.position?.lat, lon: r.position?.lon }))
        const seen = new Set()
        setDirecSugg(suggs.filter(s => { if (seen.has(s.label)) return false; seen.add(s.label); return true }).slice(0, 5))
      } catch { setDirecSugg([]) }
      finally { setSuggLoad(false) }
    }, 400)
  }

  const selectSugg = async sugg => {
    setDirec(sugg.label); setDirecSugg([])
    const pos = { lat: sugg.lat, lon: sugg.lon }
    setDirecPos(pos)
    await checkZone(sugg.label, pos)
  }

  // ── TomTom routing — zone check ───────────────────────────────────────────

  const checkZone = async (address, pos = null) => {
    const cfg = local?.delivery_config
    if (!cfg?.enabled || !cfg?.lat) return
    setZoneLoad(true)
    try {
      let cPos = (pos?.lat) ? pos : null

      if (!cPos) {
        const rLat = cfg.lat, rLng = cfg.lng
        const geocodeUrl = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address)}.json?key=${TOMTOM_KEY}&limit=1&countrySet=AR&lat=${rLat}&lon=${rLng}`
        const p = (await (await fetch(geocodeUrl)).json())?.results?.[0]?.position
        if (!p) { setZoneLoad(false); return }
        cPos = { lat: p.lat, lon: p.lon }
        setDirecPos(cPos)
      }

      const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${cfg.lat},${cfg.lng}:${cPos.lat},${cPos.lon}/json?key=${TOMTOM_KEY}&routeType=fastest&traffic=false`
      const routeData = await (await fetch(routeUrl)).json()
      const meters = routeData?.routes?.[0]?.summary?.lengthInMeters
      if (meters == null) { setZoneLoad(false); return }

      const distKm = Math.round((meters / 1000) * 10) / 10
      const zonas  = (cfg.zonas || []).slice().sort((a, b) => a.radio_km - b.radio_km)
      const zona   = zonas.find(z => distKm <= z.radio_km)
      setZoneInfo(zona ? { zona, distKm } : { fuera: true, distKm })
    } catch { }
    finally { setZoneLoad(false) }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const deliveryCost  = (zoneInfo && !zoneInfo.fuera) ? (zoneInfo.zona?.precio || 0) : 0
  const totalConEnvio = total + deliveryCost
  const waNum         = (local?.whatsapp_num || '').replace(/\D/g, '')

  const canStep2  = cartItems.length > 0
  const canStep3  = name.trim() && direc.trim() && !(zoneInfo?.fuera)
  const canConfirm = canStep3 && payMethod

  // ── Send order ────────────────────────────────────────────────────────────

  const sendOrder = async () => {
    setSaving(true)
    try {
      if (sb && local?.restauranteId) {
        const pedidoId = crypto.randomUUID()
        const nota_str = [
          'DELIVERY',
          `Dir: ${direc}${piso ? ` (${piso})` : ''}`,
          zoneInfo && !zoneInfo.fuera
            ? `Zona: ${zoneInfo.zona.nombre} | Envío: $${zoneInfo.zona.precio} | ~${zoneInfo.zona.minutos}min | Dist: ${zoneInfo.distKm}km`
            : null,
          `Cliente: ${name}`,
          phone ? `Tel: ${phone}` : null,
          nota  ? `Nota: ${nota}` : null,
        ].filter(Boolean).join(' | ')

        await sb.from('pedidos').insert({
          id: pedidoId, restaurante_id: local.restauranteId,
          mesa_numero: 0, status: 'nuevo', metodo_pago: payMethod,
          propina: 0, total: totalConEnvio, nota: nota_str, idioma: 'es',
          tipo: 'delivery',
          // Extra delivery fields stored in nota — Supabase schema may not have these columns yet
        })
        await sb.from('pedido_items').insert(
          cartItems.map(i => ({ pedido_id: pedidoId, producto_id: i.id, nombre: i.name, precio: i.price, cantidad: i.qty }))
        )
      }
    } catch (e) { console.warn('DeliveryPage save error:', e) }

    // Build WhatsApp message
    const payLabels = { efectivo: 'Efectivo en la puerta 💵', mp: 'Mercado Pago 📲', trans: 'Transferencia bancaria 🏦' }
    const lineas = cartItems.map(i => `• ${i.qty}x ${i.name} — $${fmt(i.price * i.qty)}`).join('\n')
    const msg = `*Hola ${local.nombre}! Quiero hacer un pedido DELIVERY* 🛵\n\n`
      + `📍 *Dirección:* ${direc}${piso ? ` (${piso})` : ''}\n`
      + (zoneInfo && !zoneInfo.fuera
          ? `🗺️ ${zoneInfo.zona.nombre} · $${fmt(zoneInfo.zona.precio)} envío · ~${zoneInfo.zona.minutos} min · ${zoneInfo.distKm} km\n`
          : '')
      + `👤 *Cliente:* ${name}${phone ? ` · 📱 ${phone}` : ''}\n\n`
      + `*Mi pedido:*\n${lineas}\n\n`
      + `💰 *Subtotal:* $${fmt(total)}\n`
      + (deliveryCost > 0 ? `🛵 *Envío:* $${fmt(deliveryCost)}\n` : '')
      + `💳 *TOTAL:* $${fmt(totalConEnvio)}\n\n`
      + `💳 *Forma de pago:* ${payLabels[payMethod] || payMethod}`
      + (nota ? `\n📝 *Nota:* ${nota}` : '')

    if (waNum) {
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank')
    } else {
      // Fallback: copy to clipboard if no WA number configured
      try { await navigator.clipboard.writeText(msg) } catch {}
      alert('El pedido se copió al portapapeles. El restaurante no tiene número de WhatsApp configurado aún.')
    }

    setSaving(false)
    setDone(true)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return <Spinner text="Cargando carta..." />
  if (dataError) return <ErrorScreen msg={dataError} />

  // Done screen
  if (done) return (
    <div style={{ ...S.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <GlobalStyles />
      <div style={{ width: 90, height: 90, borderRadius: '50%', background: `${GA}0.1)`, border: `2px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 24 }}>✅</div>
      <h2 style={{ ...S.outfit, fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 10 }}>¡Pedido enviado!</h2>
      <p style={{ ...S.dmsans, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 6 }}>
        Se abrió WhatsApp con tu pedido.<br />Solo tocá <b style={{ color: G }}>Enviar</b> y el local lo recibe.
      </p>
      <p style={{ ...S.dmsans, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 36 }}>
        🛵 Te van a contactar para coordinar la entrega.
      </p>
      <button
        onClick={() => { setStep(1); setDone(false); setCart({}); setPayMethod(''); setZoneInfo(null); setDirec(''); setDirecPos(null); setName(''); setPhone(''); setPiso(''); setNota('') }}
        style={{ ...S.btn, width: 'auto', padding: '14px 40px' }}
      >
        Hacer otro pedido
      </button>
    </div>
  )

  const activeCats = cats.filter(c => c.activa !== false)
  const catProds   = prods.filter(p => p.cat === activeCat && (p.active || p.active == null) && !p.sin_stock)

  return (
    <div style={{ ...S.bg, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <GlobalStyles />

      {/* ── Header ── */}
      <div style={S.header}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${GA}0.15)`, border: `1px solid ${GA}0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          🛵
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...S.outfit, fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Delivery</div>
          <div style={{ ...S.dmsans, fontSize: 12, color: G, marginTop: 1 }}>{local.nombre}</div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ height: 6, borderRadius: 3, transition: 'all .3s', width: step >= s ? 20 : 6, background: step >= s ? G : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
      </div>

      {/* ── Step tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,10,0.97)', flexShrink: 0 }}>
        {['Tu pedido', 'Tus datos', 'Confirmar'].map((l, i) => {
          const n = i + 1
          return (
            <div key={n} style={{ flex: 1, textAlign: 'center', padding: '9px 4px', borderBottom: `2px solid ${step === n ? G : 'transparent'}`, ...S.mono, fontSize: 8, fontWeight: 700, letterSpacing: 1, color: step === n ? G : step > n ? `${GA}0.5)` : 'rgba(255,255,255,0.25)' }}>
              {step > n ? '✓ ' : ''}{l.toUpperCase().replace(/ /g, ' ')}
            </div>
          )
        })}
      </div>

      {/* ══════════════════════════════════
          STEP 1 — CARTA
      ══════════════════════════════════ */}
      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Category pills */}
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {activeCats.map(c => (
              <button key={c.id} onClick={() => setActiveCat(c.id)} style={S.catBtn(activeCat === c.id)}>
                {c.icon && <span style={{ marginRight: 4 }}>{c.icon}</span>}{c.label}
              </button>
            ))}
          </div>

          {/* Product list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 110px', WebkitOverflowScrolling: 'touch' }}>
            {catProds.length === 0 && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', ...S.dmsans, fontSize: 13, padding: 40 }}>
                No hay productos en esta categoría
              </p>
            )}
            {catProds.map(p => {
              const qty = cart[p.id] || 0
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Thumbnail */}
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.name} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                  ) : p.emoji ? (
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{p.emoji}</div>
                  ) : null}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...S.outfit, fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 2 }}>{p.name}</div>
                    {p.desc && (
                      <div style={{ ...S.dmsans, fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                        {p.desc}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ ...S.mono, fontSize: 14, fontWeight: 700, color: G }}>${fmt(p.price)}</span>
                      {p.orig && <span style={{ ...S.mono, fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'line-through' }}>${fmt(p.orig)}</span>}
                      {p.tag  && <span style={{ background: `${GA}0.15)`, border: `1px solid ${GA}0.3)`, borderRadius: 6, padding: '1px 6px', ...S.mono, fontSize: 9, color: G }}>{p.tag}</span>}
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {qty > 0 ? (
                      <>
                        <button onClick={() => remItem(p)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ ...S.mono, fontSize: 14, fontWeight: 700, color: G, minWidth: 22, textAlign: 'center' }}>{qty}</span>
                        <button onClick={() => addItem(p)} style={{ width: 32, height: 32, borderRadius: 8, background: G, border: 'none', color: '#1a0d00', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>+</button>
                      </>
                    ) : (
                      <button onClick={() => addItem(p)} style={{ width: 32, height: 32, borderRadius: 8, background: `${GA}0.12)`, border: `1px solid ${GA}0.3)`, color: G, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          STEP 2 — FORM
      ══════════════════════════════════ */}
      {step === 2 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 120px', WebkitOverflowScrolling: 'touch' }}>
          {/* Nombre */}
          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>Tu nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Juan García" style={S.input} autoComplete="name" />
          </div>

          {/* Teléfono */}
          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>Teléfono</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="11 1234-5678" style={S.input} autoComplete="tel" />
          </div>

          {/* Dirección con autocomplete */}
          <div style={{ marginBottom: 8, position: 'relative' }}>
            <label style={S.label}>Dirección de entrega *</label>
            <input
              value={direc}
              onChange={e => handleDirecChange(e.target.value)}
              placeholder="Ej: Av. Corrientes 1234, CABA"
              style={S.input}
              autoComplete="street-address"
            />
            {suggLoading && (
              <span style={{ position: 'absolute', right: 14, top: 38, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>...</span>
            )}
            {direcSugg.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#181818', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, zIndex: 99, overflow: 'hidden', marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                {direcSugg.map((s, i) => (
                  <button key={i} onClick={() => selectSugg(s)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: i < direcSugg.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', padding: '11px 14px', color: '#fff', fontSize: 13, ...S.dmsans, cursor: 'pointer' }}>
                    📍 {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zone feedback */}
          {zoneLoading && (
            <p style={{ ...S.mono, fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Verificando zona de entrega...</p>
          )}
          {zoneInfo && !zoneInfo.fuera && (
            <div style={{ background: `${GA}0.08)`, border: `1px solid ${GA}0.25)`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ ...S.mono, fontSize: 10, color: G, margin: 0 }}>
                ✓ {zoneInfo.zona.nombre} · {zoneInfo.distKm} km · ${fmt(zoneInfo.zona.precio)} envío · ~{zoneInfo.zona.minutos} min
              </p>
            </div>
          )}
          {zoneInfo && zoneInfo.fuera && (
            <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ ...S.mono, fontSize: 10, color: '#FF4444', margin: 0 }}>
                ⚠️ Esta dirección está fuera de la zona de entrega ({zoneInfo.distKm} km)
              </p>
            </div>
          )}
          {!local.delivery_config?.enabled && (
            <div style={{ background: 'rgba(232,160,32,0.08)', border: `1px solid ${GA}0.2)`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ ...S.mono, fontSize: 10, color: G, margin: 0 }}>
                ℹ️ Ingresá tu dirección — el costo de envío se coordina con el local
              </p>
            </div>
          )}

          {/* Piso / depto */}
          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>Piso / Depto (opcional)</label>
            <input value={piso} onChange={e => setPiso(e.target.value)} placeholder="Ej: 3° B" style={S.input} />
          </div>

          {/* Notas */}
          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>Notas del pedido (opcional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Sin cebolla, tocar timbre 2, alérgico a..." rows={3} style={{ ...S.input, resize: 'none' }} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          STEP 3 — RESUMEN + PAGO
      ══════════════════════════════════ */}
      {step === 3 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 130px', WebkitOverflowScrolling: 'touch' }}>

          {/* Products summary */}
          <div style={S.card}>
            <p style={{ ...S.mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 12 }}>TU PEDIDO</p>
            {cartItems.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', ...S.dmsans, fontSize: 13, color: '#fff' }}>
                <span>{i.qty}× {i.name}</span>
                <span style={{ color: G, ...S.mono }}>${fmt(i.price * i.qty)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, ...S.dmsans, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
              <span>Subtotal</span>
              <span style={{ color: '#fff', ...S.mono }}>${fmt(total)}</span>
            </div>
            {deliveryCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, ...S.dmsans, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                <span>🛵 Envío ({zoneInfo.zona.nombre})</span>
                <span style={{ color: '#fff', ...S.mono }}>${fmt(deliveryCost)}</span>
              </div>
            )}
            {zoneInfo && !zoneInfo.fuera && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, ...S.dmsans, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                <span>⏱ Tiempo estimado</span>
                <span>~{zoneInfo.zona.minutos} min</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, ...S.outfit, fontSize: 20, fontWeight: 800 }}>
              <span style={{ color: '#fff' }}>Total</span>
              <span style={{ color: G }}>${fmt(totalConEnvio)}</span>
            </div>
          </div>

          {/* Delivery details */}
          <div style={S.card}>
            <p style={{ ...S.mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>DATOS DE ENTREGA</p>
            <p style={{ ...S.dmsans, fontSize: 13, color: '#fff', marginBottom: 4 }}>📍 {direc}{piso ? ` (${piso})` : ''}</p>
            {zoneInfo && !zoneInfo.fuera && (
              <p style={{ ...S.mono, fontSize: 10, color: G, marginBottom: 4 }}>
                🛵 {zoneInfo.zona.nombre} · ${fmt(zoneInfo.zona.precio)} · ~{zoneInfo.zona.minutos} min · {zoneInfo.distKm} km
              </p>
            )}
            <p style={{ ...S.dmsans, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              👤 {name}{phone ? ` · 📱 ${phone}` : ''}
            </p>
            {nota && (
              <p style={{ ...S.dmsans, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>📝 {nota}</p>
            )}
          </div>

          {/* Payment method */}
          <div style={S.card}>
            <p style={{ ...S.mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 12 }}>FORMA DE PAGO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'efectivo', icon: '💵', label: 'Efectivo en la puerta' },
                { id: 'mp',       icon: '📲', label: 'Mercado Pago' },
                { id: 'trans',    icon: '🏦', label: 'Transferencia bancaria' },
              ].map(pm => (
                <button key={pm.id} onClick={() => setPayMethod(pm.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: payMethod === pm.id ? `${GA}0.12)` : 'rgba(255,255,255,0.03)', border: `2px solid ${payMethod === pm.id ? G : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                  <span style={{ fontSize: 22 }}>{pm.icon}</span>
                  <span style={{ ...S.dmsans, fontSize: 14, fontWeight: 600, color: payMethod === pm.id ? G : 'rgba(255,255,255,0.6)', flex: 1 }}>{pm.label}</span>
                  {payMethod === pm.id && (
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#1a0d00', fontWeight: 800, flexShrink: 0 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* MP alias */}
          {payMethod === 'mp' && local.mp_alias && (
            <div style={S.goldCard}>
              <p style={{ ...S.mono, fontSize: 8, color: `${GA}0.8)`, letterSpacing: 2, marginBottom: 10 }}>💳 ALIAS MERCADO PAGO</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ ...S.mono, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>{local.mp_alias}</div>
                  {local.mp_titular && (
                    <div style={{ ...S.dmsans, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Titular: {local.mp_titular}</div>
                  )}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(local.mp_alias); setCopied('mp'); setTimeout(() => setCopied(''), 2000) }}
                  style={{ background: G, border: 'none', borderRadius: 10, padding: '10px 16px', ...S.mono, fontSize: 12, fontWeight: 700, color: '#1a0d00', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {copied === 'mp' ? '✓ Copiado' : '📋 Copiar alias'}
                </button>
              </div>
            </div>
          )}

          {/* Transfer alias */}
          {payMethod === 'trans' && (local.alias_trans || local.mp_alias) && (
            <div style={S.goldCard}>
              <p style={{ ...S.mono, fontSize: 8, color: `${GA}0.8)`, letterSpacing: 2, marginBottom: 10 }}>🏦 ALIAS DE TRANSFERENCIA</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ ...S.mono, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>{local.alias_trans || local.mp_alias}</div>
                  {local.mp_titular && (
                    <div style={{ ...S.dmsans, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Titular: {local.mp_titular}</div>
                  )}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(local.alias_trans || local.mp_alias); setCopied('trans'); setTimeout(() => setCopied(''), 2000) }}
                  style={{ background: G, border: 'none', borderRadius: 10, padding: '10px 16px', ...S.mono, fontSize: 12, fontWeight: 700, color: '#1a0d00', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {copied === 'trans' ? '✓ Copiado' : '📋 Copiar alias'}
                </button>
              </div>
            </div>
          )}

          {/* Hint */}
          <div style={{ background: `${GA}0.05)`, border: `1px solid ${GA}0.15)`, borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ ...S.dmsans, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: 0 }}>
              Al tocar <b style={{ color: G }}>Hacer pedido por WhatsApp</b> se abre la app con tu pedido ya escrito. Solo tocás Enviar y el local lo recibe de inmediato.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          BOTTOM BAR
      ══════════════════════════════════ */}
      <div style={{ padding: '10px 16px 28px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)', flexShrink: 0, position: 'sticky', bottom: 0, zIndex: 50 }}>

        {/* Step 1 */}
        {step === 1 && (
          <>
            {cartItems.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 2px' }}>
                <span style={{ ...S.dmsans, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{totalQty} {totalQty === 1 ? 'producto' : 'productos'}</span>
                <span style={{ ...S.mono, fontSize: 16, fontWeight: 700, color: G }}>${fmt(total)}</span>
              </div>
            )}
            <button onClick={() => setStep(2)} disabled={!canStep2} style={{ ...S.btn, opacity: canStep2 ? 1 : 0.35, cursor: canStep2 ? 'pointer' : 'default' }}>
              {canStep2 ? `Continuar — ${totalQty} ${totalQty === 1 ? 'producto' : 'productos'} →` : 'Agregá productos para continuar'}
            </button>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ ...S.btnGhost, flex: 1 }}>← Atrás</button>
            <button
              onClick={() => setStep(3)}
              disabled={!canStep3}
              style={{ ...S.btn, flex: 2, opacity: canStep3 ? 1 : 0.35, cursor: canStep3 ? 'pointer' : 'default' }}
            >
              {zoneInfo?.fuera ? 'Fuera de zona ⚠️' : 'Ver resumen →'}
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ ...S.btnGhost, flex: 1 }}>← Atrás</button>
            <button
              onClick={sendOrder}
              disabled={saving || !canConfirm}
              style={{ ...S.btn, flex: 2, opacity: (saving || !canConfirm) ? 0.45 : 1, cursor: (saving || !canConfirm) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <WASvg />
              {saving ? 'Abriendo WhatsApp...' : 'Hacer pedido por WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;padding:0;background:#0a0a0a}
        input,textarea,button{-webkit-tap-highlight-color:transparent}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.25)}
        input:focus,textarea:focus{border-color:rgba(232,160,32,0.5)!important;outline:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(232,160,32,0.3);border-radius:3px}
      `}</style>
    </>
  )
}

function WASvg() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.996 0C5.374 0 0 5.373 0 11.996c0 2.133.56 4.133 1.54 5.867L.047 23.53a.5.5 0 00.612.632l5.828-1.528A11.935 11.935 0 0011.996 24C18.619 24 24 18.619 24 11.996 24 5.373 18.619 0 11.996 0zm0 21.818a9.794 9.794 0 01-4.992-1.367l-.358-.212-3.718.975 1.002-3.618-.234-.372a9.794 9.794 0 01-1.518-5.228c0-5.419 4.409-9.818 9.818-9.818s9.818 4.399 9.818 9.818-4.399 9.822-9.818 9.822z"/>
    </svg>
  )
}
