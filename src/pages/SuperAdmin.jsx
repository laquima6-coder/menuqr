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
`

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
          <div style={{color:'#4A6080',fontSize:'.85rem',marginBottom:24}}>Panel de gestión de MenuQR</div>
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
  return (
    <>
      <style>{css}</style>
      <div style={{background:'#060810',minHeight:'100vh',color:'#B8D0E8'}}>

        {/* Top bar */}
        <div style={{background:'#0C1018',borderBottom:'1px solid #1A2230',padding:'14px 24px',display:'flex',alignItems:'center',gap:12}}>
          <a href="/" style={{color:'#4A6080',textDecoration:'none',fontSize:'.88rem'}}>← App</a>
          <div style={{flex:1,fontWeight:700,fontSize:'1rem'}}>
            MenuQR <span style={{color:'#4A6080',fontSize:'.8rem',fontWeight:400}}>/ Super Admin</span>
          </div>
          <span style={{background:'#EF4444',color:'#fff',padding:'2px 10px',borderRadius:20,fontSize:'.7rem',fontWeight:700}}>ADMIN</span>
          <button onClick={()=>{sessionStorage.removeItem('sa_auth');setAuth(false)}} style={{background:'none',border:'none',color:'#4A6080',cursor:'pointer',fontSize:'.85rem'}}>
            Salir
          </button>
        </div>

        <div style={{padding:'24px 24px 0'}}>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:24}}>
            {[
              { label:'Restaurantes', val: s.total ?? '—' },
              { label:'Activos',      val: s.activos ?? '—' },
              { label:'Revenue est.', val: s.revenue != null ? `$${s.revenue}/mes` : '—', green:true },
              { label:'Free',    val: s.byPlan?.free    ?? 0 },
              { label:'Básico',  val: s.byPlan?.basico  ?? 0 },
              { label:'Pro',     val: s.byPlan?.pro     ?? 0 },
              { label:'Empresa', val: s.byPlan?.empresa ?? 0 },
            ].map((st,i) => (
              <div key={i} style={{background:'#0F1320',border:'1px solid #1E2A3A',borderRadius:10,padding:'14px 16px'}}>
                <div style={{fontSize:'.72rem',color:'#4A6080',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>{st.label}</div>
                <div style={{fontSize:'1.6rem',fontWeight:800,color:st.green?'#10B981':'#B8D0E8'}}>{st.val}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
            {[['restaurantes','🏪 Restaurantes'],['revenue','💰 Revenue']].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)}
                style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${tab===id?'#6366F1':'#1E2A3A'}`,background:tab===id?'#13152a':'transparent',color:tab===id?'#818CF8':'#4A6080',cursor:'pointer',fontSize:'.85rem',fontWeight:tab===id?600:400}}>
                {label}
              </button>
            ))}
            <button onClick={loadAll} style={{marginLeft:'auto',padding:'8px 14px',borderRadius:8,border:'1px solid #1E2A3A',background:'transparent',color:'#4A6080',cursor:'pointer',fontSize:'.82rem'}}>
              ↻ Actualizar
            </button>
          </div>

          {/* ── RESTAURANTES TAB */}
          {tab === 'restaurantes' && (
            <>
              <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, email o slug..."
                  style={{flex:1,padding:'9px 14px',background:'#0C1018',border:'1px solid #1E2A3A',borderRadius:8,color:'#B8D0E8',fontSize:'.9rem',minWidth:200}} />
                <select value={planFilter} onChange={e=>setPlanFilter(e.target.value)}
                  style={{padding:'9px 12px',background:'#0C1018',border:'1px solid #1E2A3A',borderRadius:8,color:'#7A9AB8',fontSize:'.85rem'}}>
                  <option value="">Todos los planes</option>
                  <option value="free">Free</option>
                  <option value="basico">Básico</option>
                  <option value="pro">Pro</option>
                  <option value="empresa">Empresa</option>
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
                      {filtered.length === 0
                        ? <tr><td colSpan={6} style={{textAlign:'center',padding:30,color:'#2A3A50'}}>Sin resultados</td></tr>
                        : filtered.map(r => (
                          <tr key={r.id} className="sa-row" style={{borderBottom:'1px solid #0F1320',transition:'background .15s'}}>
                            <td style={{padding:'12px 14px'}}>
                              <div style={{fontWeight:600,color:'#C8DCF0'}}>{r.nombre}</div>
                              <div style={{color:'#4A6080',fontSize:'.75rem'}}>{r.email}</div>
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              <a href={`/menu/${r.slug}`} target="_blank" style={{color:'#6366F1',textDecoration:'none',fontSize:'.8rem',fontFamily:'IBM Plex Mono,monospace'}}>/{r.slug}</a>
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              <select value={r.plan} onChange={e=>cambiarPlan(r.id,e.target.value)}
                                style={{padding:'4px 8px',background:'#0C1018',border:`1px solid ${PLAN_COLORS[r.plan]||'#1E2A3A'}`,borderRadius:6,color:PLAN_COLORS[r.plan]||'#7A9AB8',fontSize:'.78rem',cursor:'pointer'}}>
                                <option value="free">Free</option>
                                <option value="basico">Básico</option>
                                <option value="pro">Pro</option>
                                <option value="empresa">Empresa</option>
                              </select>
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              <button onClick={()=>toggleActivo(r.id,!r.activo)}
                                style={{padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:'.75rem',fontWeight:600,background:r.activo?'#0a1f0e':'#1a0808',color:r.activo?'#4ade80':'#f87171'}}>
                                {r.activo ? '● Activo' : '○ Inactivo'}
                              </button>
                            </td>
                            <td style={{padding:'12px 14px',color:'#4A6080',fontSize:'.78rem',whiteSpace:'nowrap'}}>
                              {new Date(r.created_at).toLocaleDateString('es-AR')}
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              <div style={{display:'flex',gap:6}}>
                                <button onClick={()=>setEditRest({...r})}
                                  style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#13152a',color:'#818CF8',cursor:'pointer',fontSize:'.75rem'}}>
                                  Editar
                                </button>
                                <a href={`/menu/${r.slug}`} target="_blank"
                                  style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#0a1f0e',color:'#4ade80',textDecoration:'none',fontSize:'.75rem',display:'inline-flex',alignItems:'center'}}>
                                  Ver
                                </a>
                                <button onClick={()=>deleteRest(r.id,r.nombre)}
                                  style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#1a0808',color:'#f87171',cursor:'pointer',fontSize:'.75rem'}}>
                                  Borrar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── REVENUE TAB */}
          {tab === 'revenue' && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,paddingBottom:24}}>
              {Object.entries(PLAN_PRICES).map(([plan,price])=>{
                const count = (data.restaurantes||[]).filter(r=>r.plan===plan).length
                return (
                  <div key={plan} style={{background:'#0F1320',border:`1px solid ${PLAN_COLORS[plan]||'#1E2A3A'}`,borderRadius:12,padding:'20px 18px'}}>
                    <div style={{fontSize:'.8rem',color:PLAN_COLORS[plan]||'#4A6080',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8,fontWeight:700}}>{plan}</div>
                    <div style={{fontSize:'2rem',fontWeight:800,color:'#10B981'}}>${count*price}<span style={{fontSize:'.75rem',fontWeight:400,color:'#4A6080'}}>/mes</span></div>
                    <div style={{fontSize:'.78rem',color:'#4A6080',marginTop:6}}>{count} restaurantes × ${price}/mes</div>
                  </div>
                )
              })}
              <div style={{background:'linear-gradient(135deg,#0d0f1e,#13152a)',border:'1px solid #6366F1',borderRadius:12,padding:'20px 18px',gridColumn:'span 2'}}>
                <div style={{fontSize:'.8rem',color:'#6366F1',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8,fontWeight:700}}>Revenue Total Estimado</div>
                <div style={{fontSize:'2.5rem',fontWeight:800,color:'#10B981'}}>${s.revenue ?? 0}<span style={{fontSize:'.85rem',fontWeight:400,color:'#4A6080'}}>/mes</span></div>
                <div style={{fontSize:'.78rem',color:'#4A6080',marginTop:6}}>{s.total ?? 0} restaurantes activos</div>
              </div>
            </div>
          )}

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
              <button onClick={()=>setEditRest(null)} style={{padding:'9px 18px',borderRadius:7,border:'none',background:'#1E2A3A',color:'#7A9AB8',cursor:'pointer',fontSize:'.88rem'}}>
                Cancelar
              </button>
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
