import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

/* ══════════════════════════════════════════════════════════
   SUPER ADMIN — Panel de gestión de todos los restaurantes
   URL: /superadmin
   Acceso: PIN + email de super admin configurado en .env
══════════════════════════════════════════════════════════ */

const SUPER_PIN = import.meta.env.VITE_SUPER_PIN || 'Tincho1364#'

const PLAN_PRICES = { free:0, basico:15, pro:35, empresa:89 }
const PLAN_COLORS = { free:'#4A6080', basico:'#3D8EFF', pro:'#6366F1', empresa:'#10B981' }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
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
  .copy-btn:hover{opacity:.8}.copy-btn:active{transform:scale(.96)}
  .sa-nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:9px;cursor:pointer;font-size:.9rem;font-weight:500;color:#4A6080;transition:all .15s;border:none;background:none;width:100%;text-align:left}
  .sa-nav-item:hover{background:#0F1826;color:#7A9AB8}
  .sa-nav-item.active{background:linear-gradient(135deg,#13152a,#0d0f20);color:#818CF8;border:1px solid #2A2F5A;font-weight:700}
  .sa-card{background:#0F1320;border:1px solid #1E2A3A;border-radius:12px;padding:20px}
`


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

function DemoTab({ restaurantes }) {
  const [demoId, setDemoId] = useState(() => localStorage.getItem('sa_demo_id') || '')

  const rest = restaurantes.find(r => r.id === demoId) || restaurantes[0]
  if (!rest) return <div style={{color:'#4A6080',padding:40,textAlign:'center'}}>No hay restaurantes cargados.</div>

  const base = `https://pedidosqr.vercel.app`
  const slug = rest.slug
  const links = [
    { label:'Carta (Mesa 1)', icon:'📋', url:`${base}/menu/${slug}/mesa/1`,  desc:'QR que va en cada mesa' },
    { label:'Vitrina',        icon:'🪟', url:`${base}/menu/${slug}/vitrina`, desc:'QR para la puerta o vidrio' },
    { label:'Solo carta',     icon:'👁',  url:`${base}/menu/${slug}`,         desc:'Menú sin mesa asignada' },
    { label:'Cocina',         icon:'👨‍🍳', url:`${base}/${slug}/cocina`,       desc:'Vista para el cocinero' },
  ]

  const cfg = rest.config || {}
  const features = [
    { ok: true,                          label: 'Carta digital con categorías y productos' },
    { ok: true,                          label: 'QR por mesa — el cliente pide desde su celu' },
    { ok: true,                          label: 'Gestión de stock y precios en tiempo real' },
    { ok: true,                          label: 'Panel de pedidos en vivo' },
    { ok: true,                          label: 'Pantalla de cocina dedicada' },
    { ok: true,                          label: 'Historial y estadísticas de ventas' },
    { ok: true,                          label: 'Exportar ventas/pedidos a CSV (pendrive)' },
    { ok: cfg.propina !== false,         label: 'Propina opcional al pagar' },
    { ok: cfg.happyHour,                 label: 'Happy Hour con horario configurable' },
    { ok: cfg.feat_solicitudes !== false,label: 'Llamar al mozo desde la mesa' },
    { ok: !!cfg.feat_promo10,            label: 'Descuento 10% primera visita (QR vitrina)' },
    { ok: !!rest.logo_url,               label: 'Logo del restaurante' },
    { ok: !!cfg.wifi_nombre,             label: 'QR WiFi para clientes' },
    { ok: !!cfg.whatsapp,               label: 'QR WhatsApp directo' },
    { ok: true,                          label: 'Multiidioma (ES/EN/PT/IT/FR/DE/ZH/JA)' },
    { ok: true,                          label: 'Panel admin con login seguro' },
  ]

  const waText = "Hola! Te quiero mostrar PedidosQR\n\nEscaneá este link para ver la carta demo en vivo:\n👉 " + links[0].url + "\n\nO la vitrina (para la puerta del local):\n👉 " + links[1].url + "\n\nMenuQR te permite tener tu carta digital con QR por mesa, pedidos en tiempo real, panel de admin, cocina y mucho más"

  function descargarPDF() {
    const BASE = "https://pedidosqr.vercel.app"
    const featOk = features.filter(f=>f.ok).map(f=>f.label)
    const qrs = links.map(l=>(
      "<div class=\"qr-card\">" +
      "<img src=\"https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent(l.url) + "&bgcolor=ffffff&color=0a0806&margin=6\" alt=\"\" />" +
      "<div class=\"qr-label\">" + l.icon + " " + l.label + "</div>" +
      "<div class=\"qr-desc\">" + l.desc + "</div>" +
      "<div class=\"qr-url\">" + l.url + "</div>" +
      "</div>"
    )).join("")

    const feats = featOk.map(f=>(
      "<div class=\"feat\"><div class=\"check\">✓</div>" + f + "</div>"
    )).join("")

    const html = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\"/>" +
      "<title>PedidosQR Demo " + rest.nombre + "</title>" +
      "<style>" +
      "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');" +
      "*{box-sizing:border-box;margin:0;padding:0}" +
      "body{font-family:Outfit,sans-serif;background:#fff;color:#1a1a1a;padding:32px;max-width:800px;margin:0 auto}" +
      "h1{font-size:2rem;font-weight:800;color:#0A0806;margin-bottom:4px}" +
      ".sub{color:#666;font-size:.95rem;margin-bottom:28px}" +
      ".section-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#999;font-family:'IBM Plex Mono',monospace;margin-bottom:12px;font-weight:600}" +
      ".qr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}" +
      ".qr-card{border:1px solid #E5E7EB;border-radius:12px;padding:14px;text-align:center}" +
      ".qr-card img{width:120px;height:120px;display:block;margin:0 auto 10px;border-radius:6px}" +
      ".qr-label{font-size:.78rem;font-weight:700;color:#1a1a1a;margin-bottom:3px}" +
      ".qr-desc{font-size:.65rem;color:#888}" +
      ".qr-url{font-size:.55rem;color:#6366F1;font-family:'IBM Plex Mono',monospace;word-break:break-all;margin-top:5px}" +
      ".features{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:32px}" +
      ".feat{display:flex;align-items:center;gap:8px;font-size:.82rem;color:#1a1a1a}" +
      ".check{width:16px;height:16px;border-radius:4px;background:#DCFCE7;border:1px solid #86EFAC;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#16A34A;font-weight:700}" +
      ".cta{background:linear-gradient(135deg,#C9A84C,#E8C97A);border-radius:14px;padding:22px 28px;color:#0A0806}" +
      ".cta h2{font-size:1.3rem;font-weight:800;margin-bottom:6px}" +
      ".cta p{font-size:.88rem;opacity:.8;margin-bottom:14px}" +
      ".cta .links{font-family:'IBM Plex Mono',monospace;font-size:.75rem;color:#5A3A00;line-height:2}" +
      ".footer{margin-top:28px;text-align:center;font-size:.7rem;color:#BBB;font-family:'IBM Plex Mono',monospace}" +
      "@media print{body{padding:16px}@page{margin:12mm}}" +
      "</style></head><body>" +
      "<h1>🍽️ PedidosQR</h1>" +
      "<div class=\"sub\">Demo en vivo — <strong>" + rest.nombre + "</strong></div>" +
      "<div class=\"section-title\">Escaneá para ver la app en tu celular</div>" +
      "<div class=\"qr-grid\">" + qrs + "</div>" +
      "<div class=\"section-title\">Funcionalidades incluidas</div>" +
      "<div class=\"features\">" + feats + "</div>" +
      "<div class=\"cta\"><h2>Queres esto para tu restaurante?</h2><p>Carta digital, QR por mesa, pedidos en tiempo real y panel de gestión completo.</p>" +
      "<div class=\"links\">Carta demo: " + links[0].url + "<br/>Vitrina demo: " + links[1].url + "</div></div>" +
      "<div class=\"footer\">Generado por PedidosQR SuperAdmin</div>" +
      "<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script>" +
      "</body></html>"

    const w = window.open('', '_blank')
    if(w){ w.document.write(html); w.document.close() }
  }

  return (
    <div style={{paddingBottom:40}}>
      <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:'.72rem',color:'#4A6080',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>Restaurante para el demo</div>
          <select value={rest.id} onChange={e=>{setDemoId(e.target.value);localStorage.setItem('sa_demo_id',e.target.value)}}
            style={{width:'100%',padding:'9px 12px',background:'#060810',border:'1px solid #1E2A3A',borderRadius:8,color:'#B8D0E8',fontSize:'1rem'}}>
            {restaurantes.map(r=><option key={r.id} value={r.id}>{r.nombre} (/{r.slug})</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <a href={links[0].url} target="_blank" style={{padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',textDecoration:'none',fontSize:'.88rem',fontWeight:700,whiteSpace:'nowrap'}}>↗ Abrir demo</a>
          <button onClick={descargarPDF} style={{padding:'9px 18px',borderRadius:8,border:'1px solid #6366F1',background:'#13152a',color:'#818CF8',cursor:'pointer',fontSize:'.88rem',fontWeight:700,whiteSpace:'nowrap'}}>⬇ Descargar PDF</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:12,padding:'18px 20px'}}>
          <div style={{fontSize:'.72rem',color:'#4A6080',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:14}}>QR codes para compartir</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {links.map((l,i)=>(
              <div key={i} style={{background:'#060810',border:'1px solid #1E2A3A',borderRadius:10,padding:'12px',textAlign:'center'}}>
                <img src={qrUrl(l.url)} alt={l.label} style={{width:110,height:110,borderRadius:6,display:'block',margin:'0 auto 8px'}} loading="lazy"/>
                <div style={{fontSize:'.75rem',fontWeight:700,color:'#B8D0E8',marginBottom:2}}>{l.icon} {l.label}</div>
                <div style={{fontSize:'.65rem',color:'#4A6080',marginBottom:8}}>{l.desc}</div>
                <CopyBtn text={l.url} label="Copiar link"/>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:12,padding:'18px 20px'}}>
          <div style={{fontSize:'.72rem',color:'#4A6080',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:14}}>Funcionalidades incluidas</div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {features.map((f,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:18,height:18,borderRadius:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  background:f.ok?'rgba(16,185,129,.15)':'rgba(255,255,255,.04)',
                  border:"1px solid "+(f.ok?'rgba(16,185,129,.4)':'rgba(255,255,255,.08)')}}>
                  {f.ok && <span style={{color:'#10B981',fontSize:11,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:'.78rem',color:f.ok?'#B8D0E8':'#3A4A60'}}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:'linear-gradient(135deg,#0d0f1e,#0F1320)',border:'1px solid #6366F1',borderRadius:12,padding:'20px 22px'}}>
        <div style={{fontSize:'.72rem',color:'#6366F1',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4}}>Kit para compartir con clientes potenciales</div>
        <div style={{fontSize:'.83rem',color:'#4A6080',marginBottom:16}}>Mandá este texto por WhatsApp o Instagram para mostrar el demo en vivo</div>
        <div style={{background:'#060810',border:'1px solid #1E2A3A',borderRadius:10,padding:'14px 16px',marginBottom:14,fontFamily:'DM Sans,sans-serif',fontSize:'.82rem',color:'#7A9AB8',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
          {waText}
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <CopyBtn text={waText} label="Copiar mensaje"/>
          <a href={"https://wa.me/?text="+encodeURIComponent(waText)} target="_blank"
            style={{padding:'5px 14px',borderRadius:6,border:'none',background:'#0a1f0e',color:'#4ade80',textDecoration:'none',fontSize:'.75rem',fontWeight:600,display:'inline-flex',alignItems:'center',gap:5}}>
            📲 Abrir en WhatsApp
          </a>
          <CopyBtn text={links[0].url} label="Copiar link carta"/>
          <CopyBtn text={links[1].url} label="Copiar link vitrina"/>
        </div>
      </div>
    </div>
  )
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 10 * 60 * 1000; // 10 minutos

export default function SuperAdmin() {
  const [auth,      setAuth]      = useState(() => sessionStorage.getItem('sa_auth') === '1')
  const [pin,       setPin]       = useState('')
  const [pinErr,    setPinErr]    = useState(false)
  const [showPin,   setShowPin]   = useState(false)
  const [tab,       setTab]       = useState('restaurantes')
  const [data,      setData]      = useState({ restaurantes:[], stats:{} })
  const [loading,   setLoading]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [planFilter,setPlanFilter]= useState('')
  const [editRest,  setEditRest]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [attempts,  setAttempts]  = useState(() => {
    const s = JSON.parse(localStorage.getItem('sa_attempts')||'{}');
    return s.count||0;
  })
  const [lockedUntil, setLockedUntil] = useState(() => {
    const s = JSON.parse(localStorage.getItem('sa_attempts')||'{}');
    return s.until||0;
  })

  useEffect(() => { if (auth) loadAll() }, [auth])

  const isLocked = () => Date.now() < lockedUntil;
  const lockMins = () => Math.ceil((lockedUntil - Date.now()) / 60000);

  function checkPin() {
    if (isLocked()) return;
    if (pin === SUPER_PIN) {
      sessionStorage.setItem('sa_auth','1');
      localStorage.removeItem('sa_attempts');
      setAttempts(0); setLockedUntil(0); setAuth(true);
    } else {
      const next = attempts + 1;
      const until = next >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
      setAttempts(next); setLockedUntil(until);
      localStorage.setItem('sa_attempts', JSON.stringify({count:next, until}));
      setPinErr(true); setPin('');
      setTimeout(()=>setPinErr(false), 2500);
    }
  }

  async function loadAll() {
    setLoading(true)
    try {
      if (!supabase) { setData({ restaurantes:[], stats:{} }); return }

      // Leer todos los restaurantes (requiere que el usuario sea superadmin en Supabase)
      const { data: rests, error } = await supabase
        .from('restaurantes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) { console.error(error); setLoading(false); return }

      // Stats
      const byPlan = {}
      let revenue = 0
      rests.forEach(r => {
        byPlan[r.plan] = (byPlan[r.plan]||0) + 1
        revenue += PLAN_PRICES[r.plan] || 0
      })

      setData({
        restaurantes: rests,
        stats: { total: rests.length, activos: rests.filter(r=>r.activo).length, revenue, byPlan }
      })
    } finally {
      setLoading(false)
    }
  }

  async function toggleActivo(id, activo) {
    if (!supabase) return
    await supabase.from('restaurantes').update({ activo }).eq('id', id)
    loadAll()
  }

  async function togglePlus(id, field, current) {
    if (!supabase) return
    await supabase.from('restaurantes').update({ [field]: !current }).eq('id', id)
    loadAll()
  }

  async function cambiarPlan(id, plan) {
    if (!supabase) return
    await supabase.from('restaurantes').update({ plan }).eq('id', id)
    loadAll()
  }

  async function saveEdit() {
    if (!supabase || !editRest) return
    setSaving(true)
    await supabase.from('restaurantes').update({
      nombre:    editRest.nombre,
      telefono:  editRest.telefono,
      direccion: editRest.direccion,
      email:     editRest.email,
      plan:      editRest.plan,
      activo:    editRest.activo,
      color:     editRest.color,
    }).eq('id', editRest.id)
    setSaving(false)
    setEditRest(null)
    loadAll()
  }

  async function deleteRest(id, nombre) {
    if (!confirm(`¿Borrar "${nombre}"? Esto elimina el restaurante y todos sus datos.`)) return
    await supabase.from('restaurantes').delete().eq('id', id)
    loadAll()
  }

  const filtered = (data.restaurantes || []).filter(r => {
    const q = search.toLowerCase()
    const matchQ = !q || r.nombre?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.slug?.toLowerCase().includes(q)
    const matchP = !planFilter || r.plan === planFilter
    return matchQ && matchP
  })

  // ── PIN SCREEN ─────────────────────────────────
  if (!auth) return (
    <>
      <style>{css}</style>
      <div style={{background:'#060810',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:16,padding:'40px 32px',width:'100%',maxWidth:360,textAlign:'center'}}>
          <div style={{fontSize:'2.5rem',marginBottom:12}}>🔐</div>
          <div style={{fontSize:'1.2rem',fontWeight:700,color:'#B8D0E8',marginBottom:6}}>Super Admin</div>
          <div style={{color:'#4A6080',fontSize:'.85rem',marginBottom:24}}>Panel de gestión de PedidosQR</div>
          <div style={{position:'relative',marginBottom:14}}>
            <input
              type={showPin?"text":"password"} maxLength={20} placeholder="PIN de acceso"
              value={pin} onChange={e=>setPin(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&checkPin()}
              style={{width:'100%',padding:'14px 44px 14px 14px',background:'#060810',border:`1px solid ${pinErr?'#7f1d1d':'#1E2A3A'}`,borderRadius:8,color:'#B8D0E8',fontSize:'1.4rem',textAlign:'center',letterSpacing:'.3em',fontFamily:'IBM Plex Mono,monospace',boxSizing:'border-box'}}
            />
            <button type="button" onClick={()=>setShowPin(v=>!v)}
              style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#4A6080',fontSize:'1.2rem',padding:0,lineHeight:1}}
              title={showPin?"Ocultar PIN":"Mostrar PIN"}>
              {showPin ? '🙈' : '👁️'}
            </button>
          </div>
          {pinErr && !isLocked() && (
            <div style={{color:'#f87171',fontSize:'.82rem',marginBottom:10}}>
              PIN incorrecto — {MAX_ATTEMPTS - attempts} intentos restantes
            </div>
          )}
          {isLocked() && (
            <div style={{color:'#f87171',fontSize:'.82rem',marginBottom:10,
              background:'rgba(127,29,29,.15)',border:'1px solid #7f1d1d',
              borderRadius:6,padding:'8px 12px'}}>
              🔒 Bloqueado por {lockMins()} min por demasiados intentos
            </div>
          )}
          <button onClick={checkPin} disabled={isLocked()} style={{
            width:'100%',padding:13,
            background:isLocked()?'#1E2A3A':'linear-gradient(135deg,#6366F1,#818CF8)',
            border:'none',borderRadius:8,color:isLocked()?'#4A6080':'#fff',
            fontSize:'1rem',fontWeight:700,cursor:isLocked()?'not-allowed':'pointer'}}>
            {isLocked()?'Bloqueado':'Ingresar'}
          </button>
          <div style={{marginTop:16,fontSize:'.8rem',color:'#2A3A50'}}>
            <a href="/" style={{color:'#4A6080',textDecoration:'none'}}>← Volver a la app</a>
          </div>
        </div>
      </div>
    </>
  )

  // ── ADMIN PANEL ────────────────────────────────
  const s = data.stats
  const [saTab, setSaTab] = useState('dashboard')
  const [plusSearch, setPlusSearch] = useState('')

  const NAV = [
    { id:'dashboard',   icon:'📊', label:'Dashboard' },
    { id:'clientes',    icon:'🏪', label:'Gestión de Clientes' },
    { id:'pagos',       icon:'💳', label:'Suscripciones & Pagos' },
    { id:'auditoria',   icon:'📋', label:'Auditoría & Logs' },
    { id:'soporte',     icon:'🆘', label:'Soporte Técnico' },
    { id:'reportes',    icon:'📈', label:'Reportes' },
    { id:'plus',        icon:'⭐', label:'Gestión de PLUS' },
    { id:'config',      icon:'⚙️', label:'Configuración' },
  ]

  return (
    <>
      <style>{css}</style>
      <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#060810',color:'#B8D0E8'}}>

        {/* ── SIDEBAR ── */}
        <div style={{width:260,background:'#0C1018',borderRight:'1px solid #1A2230',display:'flex',flexDirection:'column',flexShrink:0}}>
          {/* Profile */}
          <div style={{padding:'24px 20px 20px',borderBottom:'1px solid #1A2230'}}>
            <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:12}}>👑</div>
            <div style={{fontWeight:800,fontSize:'1rem',color:'#C8DCF0',marginBottom:2}}>Super Administrador</div>
            <div style={{fontSize:'.78rem',color:'#4A6080',marginBottom:10}}>super@pedidosqr.com</div>
            <span style={{background:'rgba(99,102,241,.15)',color:'#818CF8',border:'1px solid rgba(99,102,241,.3)',padding:'3px 10px',borderRadius:20,fontSize:'.68rem',fontWeight:700,letterSpacing:.5}}>TOTAL ACCESS</span>
          </div>
          {/* Nav */}
          <div style={{flex:1,overflowY:'auto',padding:'12px 10px'}}>
            {NAV.map(n=>(
              <button key={n.id} className={`sa-nav-item${saTab===n.id?' active':''}`} onClick={()=>setSaTab(n.id)}>
                <span style={{fontSize:'1.1rem',width:22,textAlign:'center'}}>{n.icon}</span>
                <span>{n.label}</span>
                {n.id==='plus' && (data.restaurantes||[]).filter(r=>r.plus_ia||r.plus_figma).length > 0 && (
                  <span style={{marginLeft:'auto',background:'rgba(99,102,241,.2)',color:'#818CF8',borderRadius:10,padding:'1px 7px',fontSize:'.68rem',fontWeight:700}}>
                    {(data.restaurantes||[]).filter(r=>r.plus_ia||r.plus_figma).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Bottom */}
          <div style={{padding:'12px 10px',borderTop:'1px solid #1A2230'}}>
            <button className="sa-nav-item" onClick={()=>{sessionStorage.removeItem('sa_auth');setAuth(false)}}>
              <span>🚪</span><span>Salir</span>
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{flex:1,overflowY:'auto',padding:28}}>

          {/* ── DASHBOARD ── */}
          {saTab==='dashboard' && (
            <div>
              <h2 style={{fontSize:'1.5rem',fontWeight:900,color:'#C8DCF0',marginBottom:6}}>📊 Dashboard</h2>
              <p style={{color:'#4A6080',fontSize:'.88rem',marginBottom:24}}>Resumen general de la plataforma</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:28}}>
                {[
                  {label:'Total restaurantes', val:s.total??0,   color:'#818CF8', icon:'🏪'},
                  {label:'Activos',             val:s.activos??0, color:'#4ade80', icon:'✅'},
                  {label:'Revenue mensual',     val:`$${s.revenue??0}`, color:'#10B981', icon:'💰'},
                  {label:'PLUS activos',        val:(data.restaurantes||[]).filter(r=>r.plus_ia||r.plus_figma).length, color:'#F59E0B', icon:'⭐'},
                  {label:'Plan Free',    val:s.byPlan?.free??0,    color:'#4A6080', icon:'🆓'},
                  {label:'Plan Básico',  val:s.byPlan?.basico??0,  color:'#3D8EFF', icon:'📦'},
                  {label:'Plan Pro',     val:s.byPlan?.pro??0,     color:'#6366F1', icon:'🚀'},
                  {label:'Plan Empresa', val:s.byPlan?.empresa??0, color:'#10B981', icon:'🏢'},
                ].map((st,i)=>(
                  <div key={i} className="sa-card" style={{display:'flex',alignItems:'center',gap:14,padding:'16px 18px'}}>
                    <div style={{fontSize:'1.8rem'}}>{st.icon}</div>
                    <div>
                      <div style={{fontSize:'1.7rem',fontWeight:900,color:st.color,lineHeight:1}}>{st.val}</div>
                      <div style={{fontSize:'.72rem',color:'#4A6080',marginTop:2}}>{st.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div className="sa-card">
                  <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>Últimos registros</div>
                  {(data.restaurantes||[]).slice(0,5).map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #1A2230'}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:'.88rem',color:'#C8DCF0'}}>{r.nombre}</div>
                        <div style={{fontSize:'.72rem',color:'#4A6080'}}>{new Date(r.created_at).toLocaleDateString('es-AR')}</div>
                      </div>
                      <span style={{background:PLAN_COLORS[r.plan]+'22',color:PLAN_COLORS[r.plan],border:`1px solid ${PLAN_COLORS[r.plan]}44`,borderRadius:6,padding:'2px 8px',fontSize:'.7rem',fontWeight:700}}>{r.plan}</span>
                    </div>
                  ))}
                </div>
                <div className="sa-card">
                  <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>Revenue por plan</div>
                  {Object.entries(PLAN_PRICES).map(([plan,price])=>{
                    const count = (data.restaurantes||[]).filter(r=>r.plan===plan).length
                    const total = count * price
                    const maxTotal = Math.max(...Object.entries(PLAN_PRICES).map(([p,pr])=>(data.restaurantes||[]).filter(r=>r.plan===p).length*pr), 1)
                    return (
                      <div key={plan} style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'.8rem',marginBottom:4}}>
                          <span style={{color:PLAN_COLORS[plan],fontWeight:600,textTransform:'capitalize'}}>{plan}</span>
                          <span style={{color:'#10B981',fontWeight:700}}>${total}/mes</span>
                        </div>
                        <div style={{background:'#1A2230',borderRadius:999,height:6}}>
                          <div style={{width:`${Math.round(total/maxTotal*100)}%`,height:'100%',background:PLAN_COLORS[plan],borderRadius:999}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── GESTIÓN DE CLIENTES ── */}
          {saTab==='clientes' && (
            <div>
              <h2 style={{fontSize:'1.5rem',fontWeight:900,color:'#C8DCF0',marginBottom:6}}>🏪 Gestión de Clientes</h2>
              <p style={{color:'#4A6080',fontSize:'.88rem',marginBottom:20}}>Todos los restaurantes registrados en la plataforma</p>
              <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por nombre, email o slug..."
                  style={{flex:1,padding:'10px 14px',background:'#0C1018',border:'1px solid #1E2A3A',borderRadius:8,color:'#B8D0E8',fontSize:'.9rem',minWidth:200}} />
                <select value={planFilter} onChange={e=>setPlanFilter(e.target.value)}
                  style={{padding:'10px 12px',background:'#0C1018',border:'1px solid #1E2A3A',borderRadius:8,color:'#7A9AB8',fontSize:'.85rem'}}>
                  <option value="">Todos los planes</option>
                  <option value="free">Free</option><option value="basico">Básico</option>
                  <option value="pro">Pro</option><option value="empresa">Empresa</option>
                </select>
                <button onClick={loadAll} style={{padding:'10px 14px',borderRadius:8,border:'1px solid #1E2A3A',background:'transparent',color:'#4A6080',cursor:'pointer',fontSize:'.82rem'}}>
                  ↻ Actualizar
                </button>
              </div>
              {loading ? <div style={{textAlign:'center',padding:40,color:'#4A6080'}}>Cargando...</div> : (
                <div style={{borderRadius:12,border:'1px solid #1E2A3A',overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid #1E2A3A',background:'#0C1018'}}>
                        {['Restaurante','Slug','Plan','Estado','PLUS','Creado','Acciones'].map(h=>(
                          <th key={h} style={{textAlign:'left',padding:'12px 14px',color:'#4A6080',fontSize:'.72rem',textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length===0
                        ? <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#2A3A50'}}>Sin resultados</td></tr>
                        : filtered.map(r=>(
                          <tr key={r.id} className="sa-row" style={{borderBottom:'1px solid #0F1320',transition:'background .15s'}}>
                            <td style={{padding:'13px 14px'}}>
                              <div style={{fontWeight:700,color:'#C8DCF0',fontSize:'.9rem'}}>{r.nombre}</div>
                              <div style={{color:'#4A6080',fontSize:'.72rem'}}>{r.email}</div>
                            </td>
                            <td style={{padding:'13px 14px'}}>
                              <a href={`/menu/${r.slug}`} target="_blank" style={{color:'#6366F1',textDecoration:'none',fontSize:'.78rem',fontFamily:'IBM Plex Mono,monospace'}}>/{r.slug}</a>
                            </td>
                            <td style={{padding:'13px 14px'}}>
                              <select value={r.plan} onChange={e=>cambiarPlan(r.id,e.target.value)}
                                style={{padding:'5px 9px',background:'#0C1018',border:`1px solid ${PLAN_COLORS[r.plan]||'#1E2A3A'}`,borderRadius:6,color:PLAN_COLORS[r.plan]||'#7A9AB8',fontSize:'.78rem',cursor:'pointer'}}>
                                <option value="free">Free</option><option value="basico">Básico</option>
                                <option value="pro">Pro</option><option value="empresa">Empresa</option>
                              </select>
                            </td>
                            <td style={{padding:'13px 14px'}}>
                              <button onClick={()=>toggleActivo(r.id,!r.activo)}
                                style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:'.75rem',fontWeight:700,background:r.activo?'rgba(74,222,128,.1)':'rgba(248,113,113,.1)',color:r.activo?'#4ade80':'#f87171'}}>
                                {r.activo?'● Activo':'○ Inactivo'}
                              </button>
                            </td>
                            <td style={{padding:'13px 14px'}}>
                              <div style={{display:'flex',gap:5,flexDirection:'column'}}>
                                <span style={{fontSize:'.7rem',fontWeight:700,color:r.plus_ia?'#A78BFA':'#2A3A50',background:r.plus_ia?'rgba(139,92,246,.12)':'transparent',padding:'2px 7px',borderRadius:5,border:`1px solid ${r.plus_ia?'rgba(139,92,246,.3)':'#1A2230'}`}}>🤖 IA {r.plus_ia?'ON':'—'}</span>
                                <span style={{fontSize:'.7rem',fontWeight:700,color:r.plus_figma?'#22D3EE':'#2A3A50',background:r.plus_figma?'rgba(6,182,212,.12)':'transparent',padding:'2px 7px',borderRadius:5,border:`1px solid ${r.plus_figma?'rgba(6,182,212,.3)':'#1A2230'}`}}>🎨 Figma {r.plus_figma?'ON':'—'}</span>
                              </div>
                            </td>
                            <td style={{padding:'13px 14px',color:'#4A6080',fontSize:'.78rem',whiteSpace:'nowrap'}}>{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
                            <td style={{padding:'13px 14px'}}>
                              <div style={{display:'flex',gap:5}}>
                                <button onClick={()=>setEditRest({...r})} style={{padding:'5px 10px',borderRadius:6,border:'none',background:'#13152a',color:'#818CF8',cursor:'pointer',fontSize:'.75rem',fontWeight:600}}>Editar</button>
                                <a href={`/menu/${r.slug}`} target="_blank" style={{padding:'5px 10px',borderRadius:6,border:'none',background:'rgba(74,222,128,.08)',color:'#4ade80',textDecoration:'none',fontSize:'.75rem',display:'inline-flex',alignItems:'center',fontWeight:600}}>Ver</a>
                                <button onClick={()=>deleteRest(r.id,r.nombre)} style={{padding:'5px 10px',borderRadius:6,border:'none',background:'rgba(248,113,113,.08)',color:'#f87171',cursor:'pointer',fontSize:'.75rem',fontWeight:600}}>✕</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── SUSCRIPCIONES & PAGOS ── */}
          {saTab==='pagos' && (
            <div>
              <h2 style={{fontSize:'1.5rem',fontWeight:900,color:'#C8DCF0',marginBottom:6}}>💳 Suscripciones & Pagos</h2>
              <p style={{color:'#4A6080',fontSize:'.88rem',marginBottom:24}}>Revenue estimado por plan</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:24}}>
                {Object.entries(PLAN_PRICES).map(([plan,price])=>{
                  const count = (data.restaurantes||[]).filter(r=>r.plan===plan).length
                  return (
                    <div key={plan} className="sa-card" style={{borderColor:PLAN_COLORS[plan]+'44'}}>
                      <div style={{fontSize:'.78rem',color:PLAN_COLORS[plan],textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8,fontWeight:700}}>{plan}</div>
                      <div style={{fontSize:'2rem',fontWeight:900,color:'#10B981'}}>${count*price}<span style={{fontSize:'.72rem',fontWeight:400,color:'#4A6080'}}>/mes</span></div>
                      <div style={{fontSize:'.78rem',color:'#4A6080',marginTop:6}}>{count} restaurantes × ${price}/mes</div>
                    </div>
                  )
                })}
                <div className="sa-card" style={{borderColor:'#6366F1',background:'linear-gradient(135deg,#0d0f1e,#13152a)',gridColumn:'span 2'}}>
                  <div style={{fontSize:'.78rem',color:'#818CF8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8,fontWeight:700}}>Total mensual estimado</div>
                  <div style={{fontSize:'2.5rem',fontWeight:900,color:'#10B981'}}>${s.revenue??0}<span style={{fontSize:'.85rem',fontWeight:400,color:'#4A6080'}}>/mes</span></div>
                  <div style={{fontSize:'.78rem',color:'#4A6080',marginTop:6}}>{s.total??0} restaurantes</div>
                </div>
              </div>
              <div className="sa-card">
                <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>Detalle de suscripciones</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #1A2230'}}>
                      {['Restaurante','Plan','Estado','Monto/mes','PLUS extra'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'10px 12px',color:'#4A6080',fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.restaurantes||[]).map((r,i)=>{
                      const base = PLAN_PRICES[r.plan]||0
                      const plus = (r.plus_ia?29:0)+(r.plus_figma?49:0)
                      return (
                        <tr key={i} style={{borderBottom:'1px solid #0F1320'}}>
                          <td style={{padding:'11px 12px',fontWeight:600,color:'#C8DCF0'}}>{r.nombre}</td>
                          <td style={{padding:'11px 12px'}}><span style={{color:PLAN_COLORS[r.plan],fontWeight:700,textTransform:'capitalize'}}>{r.plan}</span></td>
                          <td style={{padding:'11px 12px'}}><span style={{color:r.activo?'#4ade80':'#f87171',fontWeight:600}}>{r.activo?'Activo':'Inactivo'}</span></td>
                          <td style={{padding:'11px 12px',color:'#10B981',fontWeight:700}}>${base}/mes</td>
                          <td style={{padding:'11px 12px',color:plus>0?'#F59E0B':'#2A3A50',fontWeight:plus>0?700:400}}>{plus>0?`+$${plus}/mes`:'—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── AUDITORÍA & LOGS ── */}
          {saTab==='auditoria' && (
            <div>
              <h2 style={{fontSize:'1.5rem',fontWeight:900,color:'#C8DCF0',marginBottom:6}}>📋 Auditoría & Logs</h2>
              <p style={{color:'#4A6080',fontSize:'.88rem',marginBottom:20}}>Registro de actividad de la plataforma</p>
              <div className="sa-card" style={{marginBottom:16,borderColor:'rgba(99,102,241,.2)'}}>
                <div style={{fontSize:'.78rem',color:'#818CF8',fontWeight:600,marginBottom:8}}>ℹ️ Módulo de auditoría</div>
                <div style={{fontSize:'.85rem',color:'#4A6080'}}>Los logs de actividad se integran con Supabase Logs en el dashboard. Próximamente: historial de cambios de plan, activaciones PLUS y acceso de admins.</div>
              </div>
              <div className="sa-card">
                <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>Última actividad por restaurante</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #1A2230'}}>
                      {['Restaurante','Plan','PLUS IA','PLUS Figma','Registrado'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'10px 12px',color:'#4A6080',fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.restaurantes||[]).map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #0F1320'}}>
                        <td style={{padding:'11px 12px'}}>
                          <div style={{fontWeight:600,color:'#C8DCF0'}}>{r.nombre}</div>
                          <div style={{fontSize:'.7rem',color:'#4A6080'}}>{r.email}</div>
                        </td>
                        <td style={{padding:'11px 12px'}}><span style={{color:PLAN_COLORS[r.plan],fontWeight:600,textTransform:'capitalize'}}>{r.plan}</span></td>
                        <td style={{padding:'11px 12px'}}><span style={{color:r.plus_ia?'#A78BFA':'#2A3A50',fontWeight:700}}>{r.plus_ia?'✓ Activo':'—'}</span></td>
                        <td style={{padding:'11px 12px'}}><span style={{color:r.plus_figma?'#22D3EE':'#2A3A50',fontWeight:700}}>{r.plus_figma?'✓ Activo':'—'}</span></td>
                        <td style={{padding:'11px 12px',color:'#4A6080',fontSize:'.78rem'}}>{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SOPORTE TÉCNICO ── */}
          {saTab==='soporte' && (
            <div>
              <h2 style={{fontSize:'1.5rem',fontWeight:900,color:'#C8DCF0',marginBottom:6}}>🆘 Soporte Técnico</h2>
              <p style={{color:'#4A6080',fontSize:'.88rem',marginBottom:20}}>Herramientas de acceso y soporte para clientes</p>
              <div className="sa-card" style={{marginBottom:20,borderColor:'rgba(74,222,128,.2)',background:'rgba(74,222,128,.03)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <span style={{fontSize:'1.2rem'}}>🆘</span>
                  <span style={{fontSize:'.88rem',fontWeight:700,color:'#4ade80'}}>Herramientas de Soporte</span>
                </div>
                <div style={{fontSize:'.85rem',color:'#4A6080'}}>Acceso temporal a paneles de clientes, reseteo de contraseñas, y soporte directo.</div>
              </div>
              <div style={{display:'flex',gap:10,marginBottom:16}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar cliente..."
                  style={{flex:1,padding:'10px 14px',background:'#0C1018',border:'1px solid #1E2A3A',borderRadius:8,color:'#B8D0E8',fontSize:'.9rem'}} />
              </div>
              <div className="sa-card" style={{padding:0,overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #1E2A3A',background:'#0C1018'}}>
                      {['Negocio','Email','Estado','Última actividad','Acciones'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'12px 16px',color:'#4A6080',fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #0F1320'}}>
                        <td style={{padding:'13px 16px',fontWeight:700,color:'#C8DCF0'}}>{r.nombre}</td>
                        <td style={{padding:'13px 16px',color:'#4A6080',fontSize:'.82rem'}}>{r.email}</td>
                        <td style={{padding:'13px 16px'}}>
                          <span style={{background:r.activo?'rgba(74,222,128,.1)':'rgba(248,113,113,.1)',color:r.activo?'#4ade80':'#f87171',padding:'3px 10px',borderRadius:20,fontSize:'.72rem',fontWeight:700}}>
                            {r.activo?'Activo':'Inactivo'}
                          </span>
                        </td>
                        <td style={{padding:'13px 16px',color:'#4A6080',fontSize:'.78rem'}}>{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
                        <td style={{padding:'13px 16px'}}>
                          <div style={{display:'flex',gap:6}}>
                            <a href={`/panel`} target="_blank" style={{padding:'5px 12px',borderRadius:6,background:'rgba(99,102,241,.1)',color:'#818CF8',textDecoration:'none',fontSize:'.75rem',fontWeight:600,border:'1px solid rgba(99,102,241,.2)'}}>Ver panel</a>
                            <a href={`/menu/${r.slug}`} target="_blank" style={{padding:'5px 12px',borderRadius:6,background:'rgba(74,222,128,.08)',color:'#4ade80',textDecoration:'none',fontSize:'.75rem',fontWeight:600,border:'1px solid rgba(74,222,128,.15)'}}>Ver carta</a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REPORTES ── */}
          {saTab==='reportes' && (
            <div>
              <h2 style={{fontSize:'1.5rem',fontWeight:900,color:'#C8DCF0',marginBottom:6}}>📈 Reportes</h2>
              <p style={{color:'#4A6080',fontSize:'.88rem',marginBottom:24}}>Métricas y análisis de la plataforma</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                <div className="sa-card">
                  <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>Distribución de planes</div>
                  {Object.entries(PLAN_PRICES).map(([plan])=>{
                    const count = (data.restaurantes||[]).filter(r=>r.plan===plan).length
                    const total = s.total||1
                    return (
                      <div key={plan} style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'.8rem',marginBottom:5}}>
                          <span style={{color:PLAN_COLORS[plan],fontWeight:600,textTransform:'capitalize'}}>{plan}</span>
                          <span style={{color:'#B8D0E8'}}>{count} ({Math.round(count/total*100)}%)</span>
                        </div>
                        <div style={{background:'#1A2230',borderRadius:999,height:8}}>
                          <div style={{width:`${Math.round(count/total*100)}%`,height:'100%',background:PLAN_COLORS[plan],borderRadius:999}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="sa-card">
                  <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>PLUS adoptado</div>
                  {[
                    {label:'PLUS IA', color:'#A78BFA', val:(data.restaurantes||[]).filter(r=>r.plus_ia).length},
                    {label:'PLUS Figma', color:'#22D3EE', val:(data.restaurantes||[]).filter(r=>r.plus_figma).length},
                    {label:'PLUS Combo', color:'#F59E0B', val:(data.restaurantes||[]).filter(r=>r.plus_ia&&r.plus_figma).length},
                  ].map((item,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #1A2230'}}>
                      <span style={{color:item.color,fontWeight:600}}>{item.label}</span>
                      <span style={{fontSize:'1.4rem',fontWeight:900,color:'#C8DCF0'}}>{item.val}</span>
                    </div>
                  ))}
                  <div style={{marginTop:12,padding:'12px 0',display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'#4A6080',fontSize:'.85rem'}}>Revenue PLUS mensual</span>
                    <span style={{color:'#10B981',fontWeight:800,fontSize:'1rem'}}>
                      ${(data.restaurantes||[]).reduce((s,r)=>(s+(r.plus_ia?29:0)+(r.plus_figma?49:0)),0)}/mes
                    </span>
                  </div>
                </div>
              </div>
              <div className="sa-card">
                <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Exportar datos</div>
                <p style={{fontSize:'.84rem',color:'#4A6080',marginBottom:14}}>Descargá la lista completa de restaurantes en CSV</p>
                <button onClick={()=>{
                  const rows = [['Nombre','Email','Slug','Plan','Activo','PLUS IA','PLUS Figma','Creado']];
                  (data.restaurantes||[]).forEach(r=>rows.push([r.nombre,r.email,r.slug,r.plan,r.activo?'Sí':'No',r.plus_ia?'Sí':'No',r.plus_figma?'Sí':'No',new Date(r.created_at).toLocaleDateString('es-AR')]));
                  const csv = rows.map(r=>r.join(',')).join('\n');
                  const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='pedidosqr_clientes.csv'; a.click();
                }} style={{padding:'10px 20px',borderRadius:8,background:'linear-gradient(135deg,#6366F1,#818CF8)',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:'.88rem'}}>
                  ⬇️ Descargar CSV
                </button>
              </div>
            </div>
          )}

          {/* ── GESTIÓN DE PLUS ── */}
          {saTab==='plus' && (
            <div>
              <h2 style={{fontSize:'1.5rem',fontWeight:900,color:'#C8DCF0',marginBottom:6}}>⭐ Gestión de PLUS</h2>
              <p style={{color:'#4A6080',fontSize:'.88rem',marginBottom:24}}>Activá o desactivá módulos premium por restaurante</p>

              {/* Pricing cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginBottom:28}}>
                {[
                  {id:'plus_ia',    icon:'🤖', label:'PLUS IA',    color:'#A78BFA', bg:'linear-gradient(135deg,#2D1B6B,#4C1D95)', price:'$29/mes', desc:'Integración con Claude IA para ayudar a crear menús, pedidos y análisis'},
                  {id:'plus_figma', icon:'🎨', label:'PLUS FIGMA', color:'#22D3EE', bg:'linear-gradient(135deg,#0C3A5A,#164E63)', price:'$49/mes', desc:'Editor visual de menús con Figma, diseños profesionales en segundos'},
                  {id:'combo',      icon:'✦',  label:'COMBO',      color:'#F59E0B', bg:'linear-gradient(135deg,#451A03,#78350F)', price:'$69/mes', desc:'IA + Figma juntos. Ahorrás $29/mes vs. comprar por separado'},
                ].map(p=>(
                  <div key={p.id} style={{background:p.bg,borderRadius:16,padding:'24px 20px',border:`1px solid ${p.color}33`}}>
                    <div style={{fontSize:'2rem',marginBottom:10}}>{p.icon}</div>
                    <div style={{fontWeight:900,fontSize:'1.1rem',color:'#FFF',marginBottom:6}}>{p.label}</div>
                    <div style={{fontSize:'.82rem',color:'rgba(255,255,255,.6)',marginBottom:14,lineHeight:1.5}}>{p.desc}</div>
                    <div style={{fontSize:'1.6rem',fontWeight:900,color:p.color}}>{p.price}</div>
                    <div style={{fontSize:'.72rem',color:'rgba(255,255,255,.4)',marginTop:3}}>Por cliente</div>
                  </div>
                ))}
              </div>

              {/* Search + table */}
              <div style={{display:'flex',gap:10,marginBottom:16}}>
                <input value={plusSearch} onChange={e=>setPlusSearch(e.target.value)} placeholder="🔍 Buscar cliente..."
                  style={{flex:1,padding:'10px 14px',background:'#0C1018',border:'1px solid #1E2A3A',borderRadius:8,color:'#B8D0E8',fontSize:'.9rem'}} />
                <button onClick={loadAll} style={{padding:'10px 14px',borderRadius:8,border:'1px solid #1E2A3A',background:'transparent',color:'#4A6080',cursor:'pointer',fontSize:'.82rem'}}>
                  ↻ Actualizar
                </button>
              </div>

              <div style={{borderRadius:12,border:'1px solid #1E2A3A',overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #1E2A3A',background:'#0C1018'}}>
                      {['Negocio','Email','Plan Base','PLUS IA','PLUS FIGMA','Costo Extra','Acciones'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'12px 16px',color:'#4A6080',fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.restaurantes||[])
                      .filter(r=>!plusSearch||r.nombre?.toLowerCase().includes(plusSearch.toLowerCase())||r.email?.toLowerCase().includes(plusSearch.toLowerCase()))
                      .map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #0F1320'}}>
                        <td style={{padding:'13px 16px',fontWeight:700,color:'#C8DCF0'}}>{r.nombre}</td>
                        <td style={{padding:'13px 16px',color:'#4A6080',fontSize:'.82rem'}}>{r.email}</td>
                        <td style={{padding:'13px 16px'}}><span style={{color:PLAN_COLORS[r.plan],fontWeight:700,textTransform:'capitalize'}}>{r.plan}</span></td>
                        <td style={{padding:'13px 16px'}}>
                          <button onClick={()=>togglePlus(r.id,'plus_ia',r.plus_ia)}
                            style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${r.plus_ia?'rgba(139,92,246,.5)':'#1E2A3A'}`,background:r.plus_ia?'rgba(139,92,246,.15)':'transparent',color:r.plus_ia?'#A78BFA':'#4A6080',cursor:'pointer',fontSize:'.78rem',fontWeight:700}}>
                            {r.plus_ia?'✓ ON':'— OFF'}
                          </button>
                        </td>
                        <td style={{padding:'13px 16px'}}>
                          <button onClick={()=>togglePlus(r.id,'plus_figma',r.plus_figma)}
                            style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${r.plus_figma?'rgba(6,182,212,.5)':'#1E2A3A'}`,background:r.plus_figma?'rgba(6,182,212,.15)':'transparent',color:r.plus_figma?'#22D3EE':'#4A6080',cursor:'pointer',fontSize:'.78rem',fontWeight:700}}>
                            {r.plus_figma?'✓ ON':'— OFF'}
                          </button>
                        </td>
                        <td style={{padding:'13px 16px',color:'#F59E0B',fontWeight:700,fontSize:'.9rem'}}>
                          {(r.plus_ia||r.plus_figma)?`+$${(r.plus_ia?29:0)+(r.plus_figma?49:0)}/mes`:<span style={{color:'#2A3A50'}}>—</span>}
                        </td>
                        <td style={{padding:'13px 16px'}}>
                          {(r.plus_ia||r.plus_figma) && (
                            <button onClick={()=>{togglePlus(r.id,'plus_ia',true);togglePlus(r.id,'plus_figma',true)}}
                              style={{padding:'5px 10px',borderRadius:6,border:'1px solid rgba(248,113,113,.3)',background:'rgba(248,113,113,.08)',color:'#f87171',cursor:'pointer',fontSize:'.72rem',fontWeight:600}}>
                              Quitar todo
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CONFIGURACIÓN ── */}
          {saTab==='config' && (
            <div>
              <h2 style={{fontSize:'1.5rem',fontWeight:900,color:'#C8DCF0',marginBottom:6}}>⚙️ Configuración</h2>
              <p style={{color:'#4A6080',fontSize:'.88rem',marginBottom:24}}>Configuración global de la plataforma</p>
              <div className="sa-card" style={{marginBottom:16}}>
                <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>Acceso Super Admin</div>
                <div style={{fontSize:'.88rem',color:'#B8D0E8',marginBottom:8}}>PIN configurado en variable de entorno <code style={{background:'#0C1018',padding:'2px 8px',borderRadius:4,color:'#818CF8',fontFamily:'IBM Plex Mono,monospace',fontSize:'.8rem'}}>VITE_SUPER_PIN</code></div>
                <div style={{fontSize:'.82rem',color:'#4A6080'}}>Para cambiar el PIN, actualizá la variable de entorno en Vercel y hace redeploy.</div>
              </div>
              <div className="sa-card">
                <div style={{fontSize:'.75rem',color:'#4A6080',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>Links rápidos</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <a href="https://supabase.com/dashboard/project/fwovflsaghnutysjyaus" target="_blank" style={{padding:'10px 16px',borderRadius:8,background:'rgba(74,222,128,.08)',color:'#4ade80',textDecoration:'none',fontWeight:600,fontSize:'.85rem',border:'1px solid rgba(74,222,128,.15)'}}>🗄️ Supabase Dashboard</a>
                  <a href="https://vercel.com/laquima6-coders-projects/menuqr" target="_blank" style={{padding:'10px 16px',borderRadius:8,background:'rgba(99,102,241,.08)',color:'#818CF8',textDecoration:'none',fontWeight:600,fontSize:'.85rem',border:'1px solid rgba(99,102,241,.15)'}}>▲ Vercel Dashboard</a>
                  <a href="/panel" style={{padding:'10px 16px',borderRadius:8,background:'rgba(201,168,76,.08)',color:'#C9A84C',textDecoration:'none',fontWeight:600,fontSize:'.85rem',border:'1px solid rgba(201,168,76,.15)'}}>🍽️ Panel Admin</a>
                </div>
              </div>
            </div>
          )}

          {/* ── DEMO TAB (keep from original) ── */}
          {saTab==='demo' && <DemoTab restaurantes={data.restaurantes}/>}

        </div>
      </div>

      {/* ── MODAL EDITAR */}
      {editRest && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:20}} onClick={()=>setEditRest(null)}>
          <div style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:14,padding:28,width:'100%',maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:'1rem',color:'#C8DCF0',marginBottom:20}}>Editar — {editRest.nombre}</div>
            {[
              ['nombre','Nombre','text'],['email','Email','email'],
              ['telefono','Teléfono','text'],['direccion','Dirección','text'],
            ].map(([k,l,t])=>(
              <div key={k} style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:'.75rem',color:'#4A6080',marginBottom:5,textTransform:'uppercase'}}>{l}</label>
                <input type={t} value={editRest[k]||''} onChange={e=>setEditRest(r=>({...r,[k]:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',background:'#060810',border:'1px solid #1E2A3A',borderRadius:7,color:'#B8D0E8',fontSize:'.9rem'}} />
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <div>
                <label style={{display:'block',fontSize:'.75rem',color:'#4A6080',marginBottom:5,textTransform:'uppercase'}}>Plan</label>
                <select value={editRest.plan} onChange={e=>setEditRest(r=>({...r,plan:e.target.value}))}
                  style={{width:'100%',padding:'9px 10px',background:'#060810',border:'1px solid #1E2A3A',borderRadius:7,color:'#7A9AB8',fontSize:'.88rem'}}>
                  <option value="free">Free</option><option value="basico">Básico</option>
                  <option value="pro">Pro</option><option value="empresa">Empresa</option>
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:'.75rem',color:'#4A6080',marginBottom:5,textTransform:'uppercase'}}>Estado</label>
                <select value={editRest.activo?'1':'0'} onChange={e=>setEditRest(r=>({...r,activo:e.target.value==='1'}))}
                  style={{width:'100%',padding:'9px 10px',background:'#060810',border:'1px solid #1E2A3A',borderRadius:7,color:'#7A9AB8',fontSize:'.88rem'}}>
                  <option value="1">Activo</option><option value="0">Inactivo</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setEditRest(null)} style={{padding:'9px 18px',borderRadius:7,border:'none',background:'#1E2A3A',color:'#7A9AB8',cursor:'pointer',fontSize:'.88rem'}}>Cancelar</button>
              <button onClick={saveEdit} disabled={saving} style={{padding:'9px 18px',borderRadius:7,border:'none',background:'linear-gradient(135deg,#6366F1,#818CF8)',color:'#fff',cursor:'pointer',fontSize:'.88rem',fontWeight:700,opacity:saving?.5:1}}>
                {saving?'Guardando...':'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}