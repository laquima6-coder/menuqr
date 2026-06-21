import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { createClient } from '@supabase/supabase-js'

// Cliente con service role para operaciones de admin (reset de contraseña)
const supabaseAdmin = (() => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
})()

const SUPER_PIN = import.meta.env.VITE_SUPER_PIN || 'Tincho1364#'
const PLAN_PRICES = { free:0, basico:15, pro:35, empresa:89 }
const PLAN_COLORS = { free:'#4A6080', basico:'#3D8EFF', pro:'#6366F1', empresa:'#10B981' }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#060810;font-family:'Outfit',sans-serif}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1E2A3A;border-radius:2px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .sa-row{animation:fadeUp .3s ease both}
  .sa-row:nth-child(1){animation-delay:.04s}.sa-row:nth-child(2){animation-delay:.08s}.sa-row:nth-child(3){animation-delay:.12s}
  .sa-row:nth-child(4){animation-delay:.16s}.sa-row:nth-child(5){animation-delay:.20s}
  tr:hover td{background:#0F1826}
  input:focus,select:focus{outline:none;border-color:#6366F1!important}
  .copy-btn:hover{opacity:.8}
  .copy-btn:active{transform:scale(.96)}
`

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 10 * 60 * 1000

function qrUrl(data, size=140) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=0a0806&margin=6`
}

function CopyBtn({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button className="copy-btn" onClick={async () => {
      await navigator.clipboard.writeText(text).catch(()=>{})
      setCopied(true); setTimeout(()=>setCopied(false), 1800)
    }} style={{
      padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:'.75rem',
      background: copied ? '#0a1f0e' : '#13152a',
      color: copied ? '#4ade80' : '#818CF8', fontWeight:600, transition:'all .2s'
    }}>
      {copied ? '✓ Copiado' : label}
    </button>
  )
}

// ── Tab Demo ────────────────────────────────────────────────────────────────
function DemoTab({ restaurantes }) {
  const [demoId, setDemoId] = useState(() => localStorage.getItem('sa_demo_id') || '')
  const [shareMsg, setShareMsg] = useState(false)

  const rest = restaurantes.find(r => r.id === demoId) || restaurantes[0]
  if (!rest) return <div style={{color:'#4A6080',padding:40,textAlign:'center'}}>No hay restaurantes cargados.</div>

  const base = `https://menuqr.vercel.app`
  const slug = rest.slug
  const links = [
    { label:'📋 Carta (Mesa 1)', url:`${base}/menu/${slug}/mesa/1`,  desc:'QR que va en cada mesa' },
    { label:'🪟 Vitrina',         url:`${base}/menu/${slug}/vitrina`, desc:'QR para la puerta o vidrio' },
    { label:'👁 Solo carta',      url:`${base}/menu/${slug}`,         desc:'Menú sin mesa asignada' },
    { label:'👨‍🍳 Pantalla Cocina', url:`${base}/${slug}/cocina`,       desc:'Vista para el cocinero' },
  ]

  const cfg = rest.config || {}
  const features = [
    { ok: true,                          label: '📋 Carta digital con categorías y productos' },
    { ok: true,                          label: '📱 QR por mesa — el cliente pide desde su celu' },
    { ok: true,                          label: '🏷️ Gestión de stock y precios en tiempo real' },
    { ok: true,                          label: '📦 Panel de pedidos en vivo (Pedidos tab)' },
    { ok: true,                          label: '👨‍🍳 Pantalla de cocina dedicada' },
    { ok: true,                          label: '📊 Historial y estadísticas de ventas' },
    { ok: cfg.propina !== false,         label: '💝 Propina opcional al pagar' },
    { ok: cfg.happyHour,                 label: `🔥 Happy Hour (${cfg.happyDesde||'—'} a ${cfg.happyHasta||'—'})` },
    { ok: cfg.feat_solicitudes !== false,label: '🛎️ Llamar al mozo desde la mesa' },
    { ok: !!cfg.feat_promo10,            label: '🎁 Descuento 10% primera visita (QR vitrina)' },
    { ok: !!rest.logo_url,               label: '🖼️ Logo del restaurante' },
    { ok: !!cfg.wifi_nombre,             label: '📶 QR WiFi para clientes' },
    { ok: !!cfg.whatsapp,                label: '💬 QR WhatsApp directo' },
    { ok: true,                          label: '🌍 Multiidioma (ES / EN / PT / IT / FR / DE / ZH / JA)' },
    { ok: true,                          label: '🔒 Panel admin con login seguro' },
  ]

  const waText = `Hola! Te quiero mostrar MenuQR 🍽️\n\nEscaneá este link para ver la carta demo en vivo:\n👉 ${links[0].url}\n\nO la vitrina (para la puerta del local):\n👉 ${links[1].url}\n\nMenuQR te permite tener tu carta digital con QR por mesa, pedidos en tiempo real, panel de admin, cocina y mucho más 🚀`

  function descargarPDF() {
    const featOk = features.filter(f=>f.ok).map(f=>f.label.replace(/[^\w\s\-().,%]/g,'').trim())
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>MenuQR — Demo ${rest.nombre}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Outfit',sans-serif;background:#fff;color:#1a1a1a;padding:32px;max-width:800px;margin:0 auto}
  h1{font-size:2rem;font-weight:800;color:#0A0806;margin-bottom:4px}
  .sub{color:#666;font-size:.95rem;margin-bottom:28px}
  .section-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#999;font-family:'IBM Plex Mono',monospace;margin-bottom:12px;font-weight:600}
  .qr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
  .qr-card{border:1px solid #E5E7EB;border-radius:12px;padding:14px;text-align:center}
  .qr-card img{width:120px;height:120px;display:block;margin:0 auto 10px;border-radius:6px}
  .qr-label{font-size:.78rem;font-weight:700;color:#1a1a1a;margin-bottom:3px}
  .qr-desc{font-size:.65rem;color:#888}
  .qr-url{font-size:.55rem;color:#6366F1;font-family:'IBM Plex Mono',monospace;word-break:break-all;margin-top:5px}
  .features{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:32px}
  .feat{display:flex;align-items:center;gap:8px;font-size:.82rem;color:#1a1a1a}
  .check{width:16px;height:16px;border-radius:4px;background:#DCFCE7;border:1px solid #86EFAC;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#16A34A;font-weight:700}
  .cta{background:linear-gradient(135deg,#C9A84C,#E8C97A);border-radius:14px;padding:22px 28px;color:#0A0806}
  .cta h2{font-size:1.3rem;font-weight:800;margin-bottom:6px}
  .cta p{font-size:.88rem;opacity:.8;margin-bottom:14px}
  .cta .links{font-family:'IBM Plex Mono',monospace;font-size:.75rem;color:#5A3A00;line-height:2}
  .footer{margin-top:28px;text-align:center;font-size:.7rem;color:#BBB;font-family:'IBM Plex Mono',monospace}
  @media print{body{padding:16px}@page{margin:12mm}}
</style>
</head>
<body>
<h1>🍽️ MenuQR</h1>
<div class="sub">Demo en vivo — <strong>${rest.nombre}</strong> · menuqr.vercel.app</div>

<div class="section-title">Escaneá para ver la app en tu celular</div>
<div class="qr-grid">
${links.map(l=>`  <div class="qr-card">
    <img src="${qrUrl(l.url,120)}" alt="${l.label.replace(/[^\w\s]/g,'')}"/>
    <div class="qr-label">${l.label}</div>
    <div class="qr-desc">${l.desc}</div>
    <div class="qr-url">${l.url}</div>
  </div>`).join('\n')}
</div>

<div class="section-title">Funcionalidades incluidas</div>
<div class="features">
${featOk.map(f=>`  <div class="feat"><div class="check">✓</div>${f}</div>`).join('\n')}
</div>

<div class="cta">
  <h2>¿Querés esto para tu restaurante?</h2>
  <p>Carta digital, QR por mesa, pedidos en tiempo real y panel de gestión completo.</p>
  <div class="links">
    Carta demo: ${links[0].url}<br/>
    Vitrina demo: ${links[1].url}
  </div>
</div>

<div class="footer">Generado por MenuQR SuperAdmin · menuqr.vercel.app</div>

<script>window.onload=()=>{ setTimeout(()=>window.print(), 600) }<\/script>
</body>
</html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  return (
    <div style={{paddingBottom:40}}>

      {/* Selector de restaurante demo */}
      <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:'.72rem',color:'#4A6080',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>Restaurante para el demo</div>
          <select value={rest.id} onChange={e=>{ setDemoId(e.target.value); localStorage.setItem('sa_demo_id',e.target.value) }}
            style={{width:'100%',padding:'9px 12px',background:'#060810',border:'1px solid #1E2A3A',borderRadius:8,color:'#B8D0E8',fontSize:'1rem',fontFamily:'Outfit,sans-serif'}}>
            {restaurantes.map(r=><option key={r.id} value={r.id}>{r.nombre} (/{r.slug})</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <a href={links[0].url} target="_blank" style={{padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',textDecoration:'none',fontSize:'.88rem',fontWeight:700,whiteSpace:'nowrap'}}>
            ↗ Abrir demo
          </a>
          <button onClick={descargarPDF} style={{padding:'9px 18px',borderRadius:8,border:'1px solid #6366F1',background:'#13152a',color:'#818CF8',cursor:'pointer',fontSize:'.88rem',fontWeight:700,whiteSpace:'nowrap'}}>
            ⬇ Descargar PDF
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>

        {/* QR codes */}
        <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:12,padding:'18px 20px'}}>
          <div style={{fontSize:'.72rem',color:'#4A6080',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:14}}>QR codes para compartir</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {links.map((l,i)=>(
              <div key={i} style={{background:'#060810',border:'1px solid #1E2A3A',borderRadius:10,padding:'12px',textAlign:'center'}}>
                <img src={qrUrl(l.url)} alt={l.label} style={{width:110,height:110,borderRadius:6,display:'block',margin:'0 auto 8px'}} loading="lazy"/>
                <div style={{fontSize:'.75rem',fontWeight:700,color:'#B8D0E8',marginBottom:2}}>{l.label}</div>
                <div style={{fontSize:'.65rem',color:'#4A6080',marginBottom:8}}>{l.desc}</div>
                <CopyBtn text={l.url} label="Copiar link"/>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:12,padding:'18px 20px'}}>
          <div style={{fontSize:'.72rem',color:'#4A6080',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:14}}>Funcionalidades activas en este restaurante</div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {features.map((f,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:18,height:18,borderRadius:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  background:f.ok?'rgba(16,185,129,.15)':'rgba(255,255,255,.04)',
                  border:`1px solid ${f.ok?'rgba(16,185,129,.4)':'rgba(255,255,255,.08)'}`}}>
                  {f.ok && <span style={{color:'#10B981',fontSize:11,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:'.78rem',color:f.ok?'#B8D0E8':'#3A4A60'}}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Kit de venta / compartir */}
      <div style={{background:'linear-gradient(135deg,#0d0f1e,#0F1320)',border:'1px solid #6366F1',borderRadius:12,padding:'20px 22px'}}>
        <div style={{fontSize:'.72rem',color:'#6366F1',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4}}>Kit para compartir con clientes potenciales</div>
        <div style={{fontSize:'.83rem',color:'#4A6080',marginBottom:16}}>Mandá este texto por WhatsApp o Instagram para mostrar el demo en vivo</div>

        <div style={{background:'#060810',border:'1px solid #1E2A3A',borderRadius:10,padding:'14px 16px',marginBottom:14,fontFamily:'DM Sans,sans-serif',fontSize:'.82rem',color:'#7A9AB8',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
          {waText}
        </div>

        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <CopyBtn text={waText} label="📋 Copiar mensaje"/>
          <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank"
            style={{padding:'5px 14px',borderRadius:6,border:'none',background:'#0a1f0e',color:'#4ade80',textDecoration:'none',fontSize:'.75rem',fontWeight:600,display:'inline-flex',alignItems:'center',gap:5}}>
            📲 Abrir en WhatsApp
          </a>
          <CopyBtn text={links[0].url} label="📋 Copiar link carta"/>
          <CopyBtn text={links[1].url} label="📋 Copiar link vitrina"/>
        </div>
      </div>

    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function SuperAdmin() {
  const [auth,        setAuth]        = useState(() => sessionStorage.getItem('sa_auth') === '1')
  const [pin,         setPin]         = useState('')
  const [pinErr,      setPinErr]      = useState(false)
  const [showPin,     setShowPin]     = useState(false)
  const [tab,         setTab]         = useState('restaurantes')
  const [data,        setData]        = useState({ restaurantes:[], stats:{} })
  const [loading,     setLoading]     = useState(false)
  const [search,      setSearch]      = useState('')
  const [planFilter,  setPlanFilter]  = useState('')
  const [editRest,    setEditRest]    = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [resetModal,  setResetModal]  = useState(null)
  const [resetPass,   setResetPass]   = useState('')
  const [resetMsg,    setResetMsg]    = useState(null)
  const [resetLoading,setResetLoading]= useState(false)
  const [attempts,    setAttempts]    = useState(() => {
    const s = JSON.parse(localStorage.getItem('sa_attempts')||'{}'); return s.count||0
  })
  const [lockedUntil, setLockedUntil] = useState(() => {
    const s = JSON.parse(localStorage.getItem('sa_attempts')||'{}'); return s.until||0
  })

  useEffect(() => { if (auth) loadAll() }, [auth])

  const isLocked = () => Date.now() < lockedUntil
  const lockMins = () => Math.ceil((lockedUntil - Date.now()) / 60000)

  function checkPin() {
    if (isLocked()) return
    if (pin === SUPER_PIN) {
      sessionStorage.setItem('sa_auth','1')
      localStorage.removeItem('sa_attempts')
      setAttempts(0); setLockedUntil(0); setAuth(true)
    } else {
      const next = attempts + 1
      const until = next >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0
      setAttempts(next); setLockedUntil(until)
      localStorage.setItem('sa_attempts', JSON.stringify({count:next, until}))
      setPinErr(true); setPin('')
      setTimeout(()=>setPinErr(false), 2500)
    }
  }

  async function loadAll() {
    setLoading(true)
    try {
      if (!supabase) { setData({ restaurantes:[], stats:{} }); return }
      const { data: rests, error } = await supabase
        .from('restaurantes').select('*').order('created_at', { ascending: false })
      if (error) { console.error(error); return }
      const byPlan = {}; let revenue = 0
      rests.forEach(r => {
        byPlan[r.plan] = (byPlan[r.plan]||0) + 1
        revenue += PLAN_PRICES[r.plan] || 0
      })
      setData({ restaurantes: rests, stats: { total:rests.length, activos:rests.filter(r=>r.activo).length, revenue, byPlan } })
    } finally { setLoading(false) }
  }

  async function toggleActivo(id, activo) {
    if (!supabase) return
    await supabase.from('restaurantes').update({ activo }).eq('id', id); loadAll()
  }

  async function cambiarPlan(id, plan) {
    if (!supabase) return
    await supabase.from('restaurantes').update({ plan }).eq('id', id); loadAll()
  }

  async function saveEdit() {
    if (!supabase || !editRest) return
    setSaving(true)
    await supabase.from('restaurantes').update({
      nombre:editRest.nombre, telefono:editRest.telefono,
      direccion:editRest.direccion, email:editRest.email,
      plan:editRest.plan, activo:editRest.activo, color:editRest.color,
    }).eq('id', editRest.id)
    setSaving(false); setEditRest(null); loadAll()
  }

  async function resetPassword() {
    if (!supabaseAdmin) { setResetMsg({ok:false, text:'Falta VITE_SUPABASE_SERVICE_KEY'}); return }
    if (!resetPass || resetPass.length < 6) { setResetMsg({ok:false, text:'Mínimo 6 caracteres'}); return }
    setResetLoading(true); setResetMsg(null)
    try {
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page:1, perPage:1000 })
      if (listErr) { setResetMsg({ok:false, text:listErr.message}); return }
      const user = users?.find(u => u.email?.toLowerCase() === resetModal.email?.toLowerCase())
      if (!user) { setResetMsg({ok:false, text:'Usuario no encontrado: ' + resetModal.email}); return }
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: resetPass })
      if (updErr) { setResetMsg({ok:false, text:updErr.message}); return }
      setResetMsg({ok:true, text:'Contraseña actualizada para ' + resetModal.email})
      setResetPass('')
    } finally { setResetLoading(false) }
  }

  async function deleteRest(id, nombre) {
    if (!confirm('Borrar "' + nombre + '"? Se eliminan todos sus datos.')) return
    await supabase.from('restaurantes').delete().eq('id', id); loadAll()
  }

  const filtered = (data.restaurantes || []).filter(r => {
    const q = search.toLowerCase()
    const matchQ = !q || r.nombre?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.slug?.toLowerCase().includes(q)
    return matchQ && (!planFilter || r.plan === planFilter)
  })

  // ── PIN ─────────────────────────────────────────────────────────────────
  if (!auth) return (
    <>
      <style>{css}</style>
      <div style={{background:'#060810',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:16,padding:'40px 32px',width:'100%',maxWidth:360,textAlign:'center'}}>
          <div style={{fontSize:'2.5rem',marginBottom:12}}>🔐</div>
          <div style={{fontSize:'1.2rem',fontWeight:700,color:'#B8D0E8',marginBottom:6}}>Super Admin</div>
          <div style={{color:'#4A6080',fontSize:'.85rem',marginBottom:24}}>Panel de gestión de MenuQR</div>
          <div style={{position:'relative',marginBottom:14}}>
            <input type={showPin?"text":"password"} maxLength={20} placeholder="PIN de acceso"
              value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&checkPin()}
              style={{width:'100%',padding:'14px 44px 14px 14px',background:'#060810',border:'1px solid '+(pinErr?'#7f1d1d':'#1E2A3A'),borderRadius:8,color:'#B8D0E8',fontSize:'1.4rem',textAlign:'center',letterSpacing:'.3em',fontFamily:'IBM Plex Mono,monospace',boxSizing:'border-box'}}/>
            <button type="button" onClick={()=>setShowPin(v=>!v)}
              style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#4A6080',fontSize:'1.2rem',padding:0,lineHeight:1}}>
              {showPin?'🙈':'👁️'}
            </button>
          </div>
          {pinErr && !isLocked() && <div style={{color:'#f87171',fontSize:'.82rem',marginBottom:10}}>PIN incorrecto — {MAX_ATTEMPTS-attempts} intentos restantes</div>}
          {isLocked() && <div style={{color:'#f87171',fontSize:'.82rem',marginBottom:10,background:'rgba(127,29,29,.15)',border:'1px solid #7f1d1d',borderRadius:6,padding:'8px 12px'}}>Bloqueado por {lockMins()} min</div>}
          <button onClick={checkPin} disabled={isLocked()} style={{width:'100%',padding:13,background:isLocked()?'#1E2A3A':'linear-gradient(135deg,#6366F1,#818CF8)',border:'none',borderRadius:8,color:isLocked()?'#4A6080':'#fff',fontSize:'1rem',fontWeight:700,cursor:isLocked()?'not-allowed':'pointer'}}>
            {isLocked()?'Bloqueado':'Ingresar'}
          </button>
          <div style={{marginTop:16,fontSize:'.8rem',color:'#2A3A50'}}>
            <a href="/" style={{color:'#4A6080',textDecoration:'none'}}>← Volver a la app</a>
          </div>
        </div>
      </div>
    </>
  )

  const s = data.stats
  return (
    <>
      <style>{css}</style>
      <div style={{background:'#060810',minHeight:'100vh',color:'#B8D0E8'}}>

        {/* Top bar */}
        <div style={{background:'#0C1018',borderBottom:'1px solid #1A2230',padding:'14px 24px',display:'flex',alignItems:'center',gap:12}}>
          <a href="/" style={{color:'#4A6080',textDecoration:'none',fontSize:'.88rem'}}>← App</a>
          <div style={{flex:1,fontWeight:700,fontSize:'1rem'}}>MenuQR <span style={{color:'#4A6080',fontSize:'.8rem',fontWeight:400}}>/ Super Admin</span></div>
          <span style={{background:'#EF4444',color:'#fff',padding:'2px 10px',borderRadius:20,fontSize:'.7rem',fontWeight:700}}>ADMIN</span>
          <button onClick={()=>{sessionStorage.removeItem('sa_auth');setAuth(false)}} style={{background:'none',border:'none',color:'#4A6080',cursor:'pointer',fontSize:'.85rem'}}>Salir</button>
        </div>

        <div style={{padding:'24px 24px 0'}}>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:24}}>
            {[
              { label:'Restaurantes', val: s.total ?? '—' },
              { label:'Activos',      val: s.activos ?? '—' },
              { label:'Revenue est.', val: s.revenue != null ? '$'+s.revenue+'/mes' : '—', green:true },
              { label:'Free',    val: s.byPlan?.free    ?? 0 },
              { label:'Básico',  val: s.byPlan?.basico  ?? 0 },
              { label:'Pro',     val: s.byPlan?.pro     ?? 0 },
              { label:'Empresa', val: s.byPlan?.empresa ?? 0 },
            ].map((st,i)=>(
              <div key={i} style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:10,padding:'14px 16px'}}>
                <div style={{fontSize:'.72rem',color:'#4A6080',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>{st.label}</div>
                <div style={{fontSize:'1.6rem',fontWeight:800,color:st.green?'#10B981':'#B8D0E8'}}>{st.val}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
            {[['restaurantes','🏪 Restaurantes'],['demo','🎯 Demo & Ventas'],['revenue','💰 Revenue']].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)}
                style={{padding:'8px 16px',borderRadius:8,border:'1px solid '+(tab===id?'#6366F1':'#1E2A3A'),background:tab===id?'#13152a':'transparent',color:tab===id?'#818CF8':'#4A6080',cursor:'pointer',fontSize:'.85rem',fontWeight:tab===id?600:400}}>
                {label}
              </button>
            ))}
            <button onClick={loadAll} style={{marginLeft:'auto',padding:'8px 14px',borderRadius:8,border:'1px solid #1E2A3A',background:'transparent',color:'#4A6080',cursor:'pointer',fontSize:'.82rem'}}>↻ Actualizar</button>
          </div>

          {/* ── TAB RESTAURANTES */}
          {tab === 'restaurantes' && (
            <>
              <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, email o slug..."
                  style={{flex:1,padding:'9px 14px',background:'#0C1018',border:'1px solid #1E2A3A',borderRadius:8,color:'#B8D0E8',fontSize:'.9rem',minWidth:200}}/>
                <select value={planFilter} onChange={e=>setPlanFilter(e.target.value)}
                  style={{padding:'9px 12px',background:'#0C1018',border:'1px solid #1E2A3A',borderRadius:8,color:'#7A9AB8',fontSize:'.85rem'}}>
                  <option value="">Todos los planes</option>
                  <option value="free">Free</option><option value="basico">Básico</option>
                  <option value="pro">Pro</option><option value="empresa">Empresa</option>
                </select>
              </div>
              {loading
                ? <div style={{textAlign:'center',padding:40,color:'#4A6080'}}>Cargando...</div>
                : (
                <div style={{overflowX:'auto',borderRadius:10,border:'1px solid #1E2A3A'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid #1E2A3A'}}>
                        {['Restaurante','Slug','Plan','Estado','Creado','Acciones'].map(h=>(
                          <th key={h} style={{textAlign:'left',padding:'10px 14px',color:'#4A6080',fontSize:'.72rem',textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length===0
                        ? <tr><td colSpan={6} style={{textAlign:'center',padding:30,color:'#2A3A50'}}>Sin resultados</td></tr>
                        : filtered.map(r=>(
                          <tr key={r.id} className="sa-row" style={{borderBottom:'1px solid #0F1320',transition:'background .15s'}}>
                            <td style={{padding:'12px 14px'}}>
                              <div style={{fontWeight:600,color:'#C8DCF0'}}>{r.nombre}</div>
                              <div style={{color:'#4A6080',fontSize:'.75rem'}}>{r.email}</div>
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              <a href={'/menu/'+r.slug} target="_blank" style={{color:'#6366F1',textDecoration:'none',fontSize:'.8rem',fontFamily:'IBM Plex Mono,monospace'}}>/{r