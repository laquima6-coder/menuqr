import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const S = {
  wrap: { background:'#060810', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'Outfit,sans-serif' },
  card: { background:'#0F1320', border:'1px solid #1E2A3A', borderRadius:16, padding:'36px 32px', width:'100%', maxWidth:460 },
  logo: { textAlign:'center', marginBottom:28 },
  logoText: { fontSize:'1.6rem', fontWeight:800, background:'linear-gradient(135deg,#6366F1,#C9A84C)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  sub: { color:'#4A6080', fontSize:'.88rem', marginTop:6 },
  label: { display:'block', fontSize:'.8rem', color:'#4A6080', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' },
  input: { width:'100%', padding:'11px 14px', background:'#060810', border:'1px solid #1E2A3A', borderRadius:8, color:'#B8D0E8', fontSize:'.95rem', outline:'none', marginBottom:14, fontFamily:'Outfit,sans-serif', boxSizing:'border-box' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  btn: { width:'100%', padding:13, background:'linear-gradient(135deg,#6366F1,#818CF8)', border:'none', borderRadius:8, color:'#fff', fontSize:'1rem', fontWeight:700, cursor:'pointer', marginTop:4 },
  btnDisabled: { opacity:.5, cursor:'not-allowed' },
  err: { background:'#1a0808', border:'1px solid #7f1d1d', color:'#f87171', padding:'10px 14px', borderRadius:8, fontSize:'.85rem', marginBottom:14 },
  ok: { background:'#081a0e', border:'1px solid #166534', color:'#4ade80', padding:'10px 14px', borderRadius:8, fontSize:'.85rem', marginBottom:14 },
  link: { textAlign:'center', marginTop:16, fontSize:'.85rem', color:'#4A6080' },
  sep: { borderTop:'1px solid #1E2A3A', margin:'18px 0' },
  plan: { border:'2px solid #1E2A3A', borderRadius:10, padding:14, cursor:'pointer', transition:'.2s', position:'relative' },
  planActive: { borderColor:'#6366F1', background:'#0d0f1e' },
  planName: { fontWeight:700, fontSize:'.9rem', color:'#B8D0E8' },
  planPrice: { fontSize:'1.15rem', fontWeight:800, color:'#6366F1' },
  planFeat: { fontSize:'.75rem', color:'#4A6080', marginTop:4, lineHeight:1.5 },
  badge: { position:'absolute', top:-8, right:10, background:'#6366F1', color:'#fff', fontSize:'.62rem', padding:'2px 8px', borderRadius:20, fontWeight:700 },
  tabs: { display:'flex', marginBottom:24, background:'#060810', borderRadius:10, padding:4, gap:4 },
  tab: { flex:1, padding:'10px', border:'none', borderRadius:8, fontSize:'.9rem', fontWeight:600, cursor:'pointer', background:'transparent', color:'#4A6080', transition:'.2s' },
  tabActive: { background:'#1E2A3A', color:'#B8D0E8' },
}

const PLANES = [
  { id:'free',    nombre:'Gratis',  precio:'$0',   features:'1 menu · 10 productos · Sin pedidos online' },
  { id:'basico',  nombre:'Basico',  precio:'$15',  features:'1 menu · Ilimitados · Pedidos online', popular:false },
  { id:'pro',     nombre:'Pro',     precio:'$35',  features:'3 menus · Ilimitados · Realtime · Caja', popular:true },
  { id:'empresa', nombre:'Empresa', precio:'$89',  features:'Ilimitados · Multi-local · Soporte priority' },
]

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function login() {
    setErr('')
    if (!email || !password) { setErr('Ingresa tu email y contraseña'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setErr(error.message); return }
      window.location.href = '/panel'
    } catch(e) {
      setErr('Error inesperado: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') login()
  }

  return (
    <>
      {err && <div style={S.err}>{err}</div>}

      <label style={S.label}>Email</label>
      <input
        style={S.input}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={handleKey}
        placeholder="hola@mirestaurante.com"
        autoComplete="email"
      />

      <label style={S.label}>Contraseña</label>
      <input
        style={S.input}
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Tu contraseña"
        autoComplete="current-password"
      />

      <button
        style={{...S.btn, ...(loading ? S.btnDisabled : {})}}
        disabled={loading}
        onClick={login}
      >
        {loading ? 'Ingresando...' : 'Ingresar al panel'}
      </button>
    </>
  )
}

function RegisterForm() {
  const [plan,  setPlan]  = useState('free')
  const [form,  setForm]  = useState({ nombre:'', slug:'', email:'', password:'', telefono:'', direccion:'' })
  const [err,   setErr]   = useState('')
  const [ok,    setOk]    = useState('')
  const [loading, setLoading] = useState(false)

  function upd(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'nombre') next.slug = slugify(v)
      return next
    })
  }

  async function registrar() {
    setErr(''); setOk('')
    if (!form.nombre || !form.email || !form.password) { setErr('Completa nombre, email y contrasena'); return }
    if (form.password.length < 6) { setErr('La contrasena debe tener al menos 6 caracteres'); return }
    if (!form.slug) { setErr('Genera un slug para la URL'); return }
    setLoading(true)
    try {
      if (!supabase) { setErr('Supabase no configurado. Contacta al administrador.'); return }

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { nombre_restaurante: form.nombre } }
      })
      if (authErr) { setErr(authErr.message); return }

      const { error: restErr } = await supabase.from('restaurantes').insert({
        owner_id:    authData.user.id,
        nombre:      form.nombre,
        slug:        form.slug,
        telefono:    form.telefono,
        direccion:   form.direccion,
        email:       form.email,
        plan:        plan,
        base_url:    `${location.origin}/menu/${form.slug}`,
      })
      if (restErr) { setErr(restErr.message); return }

      setOk(`Listo! Tu carta estara en: ${location.origin}/menu/${form.slug}`)
      setTimeout(() => { window.location.href = '/panel?nuevo=1&slug=' + form.slug }, 3000)
    } catch(e) {
      setErr('Error inesperado: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {err && <div style={S.err}>{err}</div>}
      {ok  && <div style={S.ok}>{ok}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {PLANES.map(p => (
          <div key={p.id} style={{...S.plan, ...(plan===p.id?S.planActive:{})}} onClick={()=>setPlan(p.id)}>
            {p.popular && <span style={S.badge}>Popular</span>}
            <div style={S.planName}>{p.nombre}</div>
            <div style={S.planPrice}>{p.precio}<span style={{fontSize:'.7rem',fontWeight:400,color:'#4A6080'}}>/mes</span></div>
            <div style={S.planFeat}>{p.features}</div>
          </div>
        ))}
      </div>

      <div style={S.sep}/>

      <label style={S.label}>Nombre del restaurante</label>
      <input style={S.input} value={form.nombre} onChange={e=>upd('nombre',e.target.value)} placeholder="La Trattoria" />

      <label style={S.label}>URL de tu carta (slug)</label>
      <div style={{display:'flex',align