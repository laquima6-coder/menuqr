import { useState, useEffect } from "react";
import { supabase, loginAdmin, logoutAdmin, getSession, getRestaurante, getCategorias, getProductos, createTurno, closeTurno, getTurnos } from "./lib/supabase.js";

/* ══════════════════════════════════════════════════════════════
   GLOBAL STYLES — dos paletas: cliente (cálida) + admin (técnica)
══════════════════════════════════════════════════════════════ */
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Outfit:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    :root {
      /* Cliente — dark + naranja */
      --cb:  #0D0D0D; --cs: #171717; --cc: #1F1F1F; --cbr: #2D2D2D;
      --cm:  #6B6B6B; --cd: #8A8A8A; --ct: #AAAAAA; --cbri:#FFFFFF;
      --cg:  #F97316; --cg2:#FB923C; --cgr:#22C55E; --crd:#EF4444;
      /* Admin — cockpit técnico */
      --ab:  #0d1117; --as: #161b22; --ac: #1c2128; --abr:#2a3441;
      --am:  #4a5a6a; --ad: #6a8090; --at: #a0b8c8; --abri:#d8ecf8;
      --ag:  #00FF88; --aam:#FFB020; --ar: #FF3B5C; --abl:#3D8EFF;
      /* Gestión — dashboard SaaS */
      --gb:  #080B12; --gs: #0F1320; --gc: #111827; --gbr:#1E2A3A;
      --gm:  #2A3A50; --gd: #4A6080; --gt: #7A9AB8; --gbri:#B8D0E8;
      --gi:  #6366F1; --gi2:#818CF8; --gg: #10B981; --gr: #EF4444; --gam:#F59E0B;
      --gg2: #C9A84C;
    }

    * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent }
    body { background:#0d1117 }
    ::-webkit-scrollbar { width:4px }
    ::-webkit-scrollbar-track { background:transparent }
    ::-webkit-scrollbar-thumb { background:#1E2A3A; border-radius:2px }

    @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes slideUp  { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scaleIn  { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
    @keyframes rowIn    { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
    @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes pulseG   { 0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,.3)} 50%{box-shadow:0 0 0 7px rgba(0,255,136,0)} }
    @keyframes pulseGold{ 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,.3)} 50%{box-shadow:0 0 0 7px rgba(201,168,76,0)} }
    @keyframes itemIn   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

    .cf .ci { animation:itemIn .4s ease both }
    .cf .ci:nth-child(1){animation-delay:.04s} .cf .ci:nth-child(2){animation-delay:.08s}
    .cf .ci:nth-child(3){animation-delay:.12s} .cf .ci:nth-child(4){animation-delay:.16s}
    .cf .ci:nth-child(5){animation-delay:.20s}

    .ar { animation:rowIn .3s ease both }
    .ar:nth-child(1){animation-delay:.04s} .ar:nth-child(2){animation-delay:.08s}
    .ar:nth-child(3){animation-delay:.12s} .ar:nth-child(4){animation-delay:.16s}
    .ar:nth-child(5){animation-delay:.20s}

    .ri { animation:fadeUp .3s ease both }
    .ri:nth-child(1){animation-delay:.04s} .ri:nth-child(2){animation-delay:.08s}
    .ri:nth-child(3){animation-delay:.12s} .ri:nth-child(4){animation-delay:.16s}

    .pr { transition:transform .14s,opacity .14s }
    .pr:active { transform:scale(.94); opacity:.8 }

    /* ── POS Caja */
    .pos-cat {
      display:flex;flex-direction:column;align-items:center;gap:5px;
      background:var(--ac);border:1px solid var(--abr);border-radius:11px;
      padding:12px 6px;cursor:pointer;width:100%;
      transition:background .15s,border-color .15s,box-shadow .15s;
    }
    .pos-cat:hover { background:rgba(61,142,255,.12);border-color:rgba(61,142,255,.4);box-shadow:0 0 0 1px rgba(61,142,255,.15); }
    .pos-cat.sel   { background:rgba(61,142,255,.18);border-color:var(--abl);box-shadow:0 0 10px rgba(61,142,255,.15); }

    .pos-item {
      background:var(--ac);border:1px solid var(--abr);border-radius:12px;
      padding:13px 12px;cursor:default;
      transition:background .15s,border-color .15s,box-shadow .15s;
    }
    .pos-item:hover { background:rgba(0,255,136,.07);border-color:rgba(0,255,136,.28);box-shadow:0 0 0 1px rgba(0,255,136,.08); }

    input,textarea,select { font-family:'Outfit',sans-serif }
    input:focus,textarea:focus,select:focus { outline:none }
    input[type=number]::-webkit-outer-spin-button,
    input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none }

    /* ── DESKTOP LAYOUT ───────────────────── */
    @media (min-width: 900px) {
      .admin-wrap {
        display: flex !important;
        flex-direction: row !important;
        max-width: none !important;
        width: 100vw !important;
        margin: 0 !important;
        height: 100vh;
        overflow: hidden;
        padding-bottom: 0 !important;
      }
      .admin-sidebar {
        display: flex !important;
        flex-direction: column;
        width: 220px;
        min-width: 220px;
        height: 100vh;
        background: var(--as);
        border-left: 1px solid var(--abr);
        position: sticky;
        top: 0;
        flex-shrink: 0;
        overflow-y: auto;
        z-index: 10;
        order: 2;
      }
      .admin-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
        order: 1;
      }
      .admin-topbar {
        position: sticky !important;
        top: 0;
      }
      .admin-content-scroll {
        flex: 1;
        overflow-y: auto;
        padding-bottom: 24px !important;
      }
      .admin-bottomnav {
        display: none !important;
      }
      .admin-sidebar-nav {
        display: flex !important;
      }
      .admin-sidebar-logo {
        display: flex !important;
      }
    }
    @media (max-width: 899px) {
      .admin-sidebar-nav { display: none !important; }
      .admin-sidebar-logo { display: none !important; }
      .admin-sidebar { display: none !important; }
      .admin-content-scroll { display: contents; }
    }
  `}</style>
);

/* ══════════════════════════════════════════════════════════════
   INITIAL DATA (state inicial — luego viene de Supabase)
══════════════════════════════════════════════════════════════ */
export const INIT_LOCAL = {
  nombre:"La Trattoria", direccion:"Av. Corrientes 1234, CABA",
  telefono:"+54 11 1234-5678", email:"hola@latrattoria.com",
  descripcion:"Cocina italiana contemporánea en el corazón de Buenos Aires.",
  color:"#C9A84C", mesas:12,
  propina:true, happyHour:true, happyDesde:"17:00", happyHasta:"21:00",
  wifi_nombre:"LaTrattoria_WiFi", wifi_pass:"bienvenido2024",
  whatsapp:"5491112345678", whatsapp_msg:"Hola! Quiero hacer una consulta.",
  baseUrl:"latrattoria.menuqr.app",
};

export const INIT_CATS = [
  {id:"dest",  label:"Destacados",  icon:"✦", activa:true},
  {id:"promo", label:"Promos",      icon:"◈", activa:true},
  {id:"ent",   label:"Entradas",    icon:"◇", activa:true},
  {id:"pri",   label:"Principales", icon:"◉", activa:true},
  {id:"pos",   label:"Postres",     icon:"◌", activa:true},
  {id:"beb",   label:"Bebidas",     icon:"◎", activa:true},
];

export const INIT_PRODS = [
  {id:1, cat:"dest", name:"Ojo de Bife Madurado",   price:8200, orig:null,  desc:"60 días de maduración. Papas rústicas y chimichurri.", tag:"CHEF",  emoji:"🥩", active:true},
  {id:2, cat:"dest", name:"Pasta Fresca al Tartufo", price:5600, orig:null,  desc:"Tagliatelle a mano, crema de trufa negra, parmesano.",  tag:"NUEVO", emoji:"🍝", active:true},
  {id:3, cat:"dest", name:"Burrata con Tomates",     price:3800, orig:null,  desc:"Burrata fresca, tomates cherry, albahaca y EVOO.",      tag:null,    emoji:"🧀", active:true},
  {id:4, cat:"promo",name:"Combo Parrilla para 2",   price:12400,orig:16000, desc:"Vacío+morcilla+chorizo+2 guarniciones+sangría.",         tag:"−22%",  emoji:"🔥", active:true},
  {id:5, cat:"promo",name:"Menú Mediodía",           price:4200, orig:6000,  desc:"Entrada+principal+postre+bebida. L-V hasta 15hs.",       tag:"−30%",  emoji:"☀️", active:true},
  {id:6, cat:"ent",  name:"Provoleta Especial",      price:2600, orig:null,  desc:"A la plancha, orégano fresco y ajo negro.",              tag:null,    emoji:"🫕", active:true},
  {id:7, cat:"ent",  name:"Tabla de Fiambres",       price:4400, orig:null,  desc:"Selección artesanal, pickles y pan de masa madre.",      tag:null,    emoji:"🪵", active:true},
  {id:8, cat:"pri",  name:"Bife de Chorizo",         price:6800, orig:null,  desc:"400g con papas rústicas y chimichurri.",                 tag:null,    emoji:"🥩", active:true},
  {id:9, cat:"pri",  name:"Milanesa Napolitana",     price:5400, orig:null,  desc:"Con salsa napolitana, jamón y mozzarella.",              tag:null,    emoji:"🍖", active:true},
  {id:10,cat:"pri",  name:"Risotto de Hongos",       price:4800, orig:null,  desc:"Carnaroli, hongos silvestres, parmesano.",               tag:"VEG",   emoji:"🍄", active:true},
  {id:11,cat:"pos",  name:"Tiramisú Casero",         price:2400, orig:null,  desc:"Mascarpone, espresso y cacao.",                         tag:null,    emoji:"🍮", active:true},
  {id:12,cat:"pos",  name:"Helado Artesanal",        price:2000, orig:null,  desc:"3 bochas a elección del día.",                          tag:null,    emoji:"🍨", active:true},
  {id:13,cat:"beb",  name:"Cerveza Artesanal",       price:1600, orig:null,  desc:"Rubia o roja. Chopera 500ml.",                          tag:null,    emoji:"🍺", active:true},
  {id:14,cat:"beb",  name:"Sangría de la Casa",      price:2200, orig:null,  desc:"Jarra individual, vino tinto y frutas.",                tag:null,    emoji:"🍷", active:true},
  {id:15,cat:"beb",  name:"Limonada Artesanal",      price:1400, orig:null,  desc:"Limón, jengibre y menta.",                              tag:null,    emoji:"🍋", active:true},
];

const INIT_ORDERS = []; // Pedidos reales vienen de Supabase en tiempo real

const BILLETES = [
  {val:10000,label:"$10.000"},{val:2000,label:"$2.000"},{val:1000,label:"$1.000"},
  {val:500,  label:"$500"},   {val:200, label:"$200"},   {val:100, label:"$100"},
  {val:50,   label:"$50"},    {val:10,  label:"$10"},
];

const STATUS_CFG = {
  nuevo:      {label:"NUEVO",    color:"#FFB020", dim:"rgba(255,176,32,.1)",  next:"preparando", action:"→ COCINA"},
  preparando: {label:"EN COCINA",color:"#3D8EFF", dim:"rgba(61,142,255,.1)",  next:"listo",      action:"→ LISTO"},
  listo:      {label:"LISTO",    color:"#00FF88", dim:"rgba(0,255,136,.1)",   next:"entregado",  action:"→ ENTREGAR"},
  entregado:  {label:"ENTREGADO",color:"#506070", dim:"rgba(80,96,112,.1)",   next:null,         action:null},
};

const PLAN_LIMITS = {
  free:    { maxProds:10,  pedidos:false, caja:false },
  basico:  { maxProds:9999,pedidos:true,  caja:false },
  pro:     { maxProds:9999,pedidos:true,  caja:true  },
  empresa: { maxProds:9999,pedidos:true,  caja:true  },
};
const PLAN_LABELS = { free:"FREE", basico:"BÁSICO", pro:"PRO ✦", empresa:"EMPRESA" };
const PLAN_COLORS_MAP = { free:"#4A6080", basico:"#3D8EFF", pro:"#6366F1", empresa:"#10B981" };

const PAYS = [
  {id:"mp",    label:"Mercado Pago", icon:"💳", sub:"QR o link de pago"},
  {id:"trans", label:"Transferencia",icon:"🏦", sub:"CVU / Alias"},
  {id:"cash",  label:"Efectivo",     icon:"💵", sub:"Le cobrás el mozo"},
  {id:"card",  label:"Déb / Créd",   icon:"💰", sub:"Visa, Master, Amex"},
];

const EMOJIS = ["🍕","🥩","🍝","🧀","🥗","🍺","🍷","🍹","🥟","🍔","🍖","🫕","🪵","🍮","🍨","🍰","☕","🥐","🌮","🐟","🦐","🍄","☀️","🔥","🥘","🫙","🧆","🥙"];

/* ══════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════ */
const fmt    = n => Number(n||0).toLocaleString("es-AR");
const nowStr = () => new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
const todStr = () => new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"});
const emptyArq = () => Object.fromEntries(BILLETES.map(b=>[b.val,""]));
const qrBuild = (data, bgColor="#F5ECD7") =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data)}&color=0A0806&bgcolor=${bgColor.replace("#","")}&margin=12&ecc=M`;

/* ══════════════════════════════════════════════════════════════
   SHARED ATOMS
══════════════════════════════════════════════════════════════ */
const Dot = ({color, pulse}) => (
  <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",
    background:color,flexShrink:0,
    boxShadow:pulse?`0 0 8px ${color}`:"none",
    animation:pulse?"pulseG 2s infinite":"none"}}/>
);

// Toggle para el admin (verde neón)
const ToggleA = ({on, onChange}) => (
  <div onClick={onChange} style={{width:44,height:24,borderRadius:12,cursor:"pointer",
    background:on?"var(--ag)":"var(--am)",position:"relative",transition:"background .25s",flexShrink:0}}>
    <div style={{position:"absolute",top:3,left:on?23:3,width:18,height:18,
      borderRadius:"50%",background:"#fff",transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,.5)"}}/>
  </div>
);

// Toggle para gestión (índigo)
const ToggleG = ({on, onChange}) => (
  <div onClick={onChange} style={{width:44,height:24,borderRadius:12,cursor:"pointer",
    background:on?"var(--gi)":"var(--gm)",position:"relative",transition:"background .25s",flexShrink:0}}>
    <div style={{position:"absolute",top:3,left:on?23:3,width:18,height:18,
      borderRadius:"50%",background:"#fff",transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,.4)"}}/>
  </div>
);

const Chip = ({status}) => {
  const s = STATUS_CFG[status];
  return (
    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
      letterSpacing:1.5,color:s.color,background:s.dim,
      border:`1px solid ${s.color}33`,padding:"3px 8px",borderRadius:4}}>
      {s.label}
    </span>
  );
};

const ALbl = ({children, color="var(--am)"}) => (
  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,
    textTransform:"uppercase",color,marginBottom:6}}>{children}</p>
);

const GLbl = ({children, color="var(--gd)"}) => (
  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,
    textTransform:"uppercase",color,marginBottom:7}}>{children}</p>
);

// Input reutilizable para gestión
const GInput = ({label, value, onChange, placeholder, type="text", prefix}) => (
  <div style={{marginBottom:14}}>
    {label && <GLbl>{label}</GLbl>}
    <div style={{display:"flex",alignItems:"center",background:"var(--gb)",
      border:"1px solid var(--gbr)",borderRadius:10,overflow:"hidden"}}>
      {prefix && (
        <span style={{padding:"0 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
          color:"var(--gd)",borderRight:"1px solid var(--gbr)",height:42,
          display:"flex",alignItems:"center",flexShrink:0}}>{prefix}</span>
      )}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{flex:1,background:"none",border:"none",padding:"11px 14px",
          color:"var(--gbri)",fontSize:14,fontWeight:500}}/>
    </div>
  </div>
);

// Modal bottom-sheet reutilizable
const BottomModal = ({onClose, title, children}) => (
  <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
    position:"fixed",inset:0,background:"rgba(6,8,16,.88)",
    display:"flex",alignItems:"flex-end",justifyContent:"center",
    zIndex:300,padding:16,animation:"fadeIn .2s"}}>
    <div style={{width:"100%",maxWidth:480,background:"var(--gs)",
      border:"1px solid var(--gbr)",borderRadius:"20px 20px 0 0",
      maxHeight:"92vh",overflowY:"auto",
      animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1) both"}}>
      <div style={{display:"flex",justifyContent:"center",padding:"10px 0 0"}}>
        <div style={{width:40,height:4,borderRadius:2,background:"var(--gbr)"}}/>
      </div>
      {title && (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"14px 20px 0"}}>
          <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:700,
            color:"var(--gbri)"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:"var(--gd)",fontSize:20,cursor:"pointer",padding:4}}>✕</button>
        </div>
      )}
      <div style={{padding:"16px 20px 32px"}}>{children}</div>
    </div>
  </div>
);

// Admin modal (bottom sheet con estilos del admin)
const AdminModal = ({onClose, children}) => (
  <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
    position:"fixed",inset:0,background:"rgba(6,8,16,.92)",
    display:"flex",alignItems:"flex-end",justifyContent:"center",
    zIndex:200,padding:16,animation:"fadeIn .2s"}}>
    <div style={{width:"100%",maxWidth:430,background:"var(--as)",
      border:"1px solid var(--abr)",borderRadius:"20px 20px 0 0",
      maxHeight:"92vh",overflowY:"auto",
      animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1) both"}}>
      <div style={{display:"flex",justifyContent:"center",padding:"10px 0 0"}}>
        <div style={{width:40,height:4,borderRadius:2,background:"var(--abr)"}}/>
      </div>
      {children}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   LANDING
══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   LOGIN MODAL — auth de dueños de restaurante
══════════════════════════════════════════════════════════════ */
function LoginModal({ onSuccess, onClose }) {
  const [tab,    setTab]    = useState("login"); // login | register | forgot
  const [email,  setEmail]  = useState("");
  const [pass,   setPass]   = useState("");
  const [nombre, setNombre] = useState("");
  const [slug,   setSlug]   = useState("");
  const [err,    setErr]    = useState("");
  const [ok,     setOk]     = useState("");
  const [loading,setLoading]= useState(false);
  const [showPass,setShowPass]= useState(false);

  function slugify(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  }

  async function handleLogin(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) { setErr(error.message); return; }
      onSuccess(data.user);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function handleForgot(e) {
    e.preventDefault(); setErr(""); setOk(""); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://menuqr-ten.vercel.app/"
      });
      if (error) { setErr(error.message); return; }
      setOk("✓ Te enviamos un email para resetear tu contraseña. Revisá tu bandeja de entrada.");
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      if (!nombre || !email || !pass) { setErr("Completá todos los campos"); return; }
      if (pass.length < 6) { setErr("La contraseña debe tener al menos 6 caracteres"); return; }
      const sl = slug || slugify(nombre);
      const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { nombre_restaurante: nombre } } });
      if (error) { setErr(error.message); return; }
      // Create restaurant record
      await supabase.from("restaurantes").insert({
        owner_id: data.user.id, nombre, slug: sl, email,
        base_url: `${location.origin}/menu/${sl}`, plan: "free"
      });
      onSuccess(data.user);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const S = {
    overlay: { position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20 },
    card:    { background:"#0C1018",border:"1px solid #1A2230",borderRadius:18,padding:"32px 28px",width:"100%",maxWidth:400,animation:"scaleIn .2s ease" },
    tabs:    { display:"flex",gap:4,background:"#060810",borderRadius:10,padding:4,marginBottom:24 },
    tab:     (a) => ({ flex:1,padding:"9px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:".85rem",fontWeight:600,fontFamily:"Outfit,sans-serif",transition:".2s",background:a?"#1A2230":"transparent",color:a?"#B8D0E8":"#4A6080" }),
    label:   { display:"block",fontSize:".75rem",color:"#4A6080",marginBottom:5,textTransform:"uppercase",letterSpacing:".04em",fontFamily:"Outfit,sans-serif" },
    input:   { width:"100%",padding:"11px 14px",background:"#060810",border:"1px solid #1A2230",borderRadius:8,color:"#B8D0E8",fontSize:".95rem",outline:"none",marginBottom:14,fontFamily:"Outfit,sans-serif" },
    btn:     { width:"100%",padding:13,background:"linear-gradient(135deg,#00FF88,#00C870)",border:"none",borderRadius:8,color:"#060810",fontSize:"1rem",fontWeight:800,cursor:"pointer",fontFamily:"Outfit,sans-serif" },
    err:     { background:"#1a0808",border:"1px solid #7f1d1d",color:"#f87171",padding:"9px 12px",borderRadius:7,fontSize:".82rem",marginBottom:12,fontFamily:"Outfit,sans-serif" },
    close:   { position:"absolute",top:14,right:16,background:"none",border:"none",color:"#4A6080",cursor:"pointer",fontSize:20 },
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.card,position:"relative"}} onClick={e=>e.stopPropagation()}>
        <button style={S.close} onClick={onClose}>×</button>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:"2rem",marginBottom:6}}>🍽️</div>
          <div style={{fontFamily:"Playfair Display,serif",fontSize:"1.2rem",fontWeight:700,color:"#EDE0C8"}}>MenuQR</div>
        </div>
        {tab !== "forgot" && <div style={S.tabs}>
          <button style={S.tab(tab==="login")} onClick={()=>{setTab("login");setErr("");setOk("")}}>Iniciar sesión</button>
          <button style={S.tab(tab==="register")} onClick={()=>{setTab("register");setErr("");setOk("")}}>Registrarme</button>
        </div>}
        {err && <div style={S.err}>{err}</div>}
        {ok  && <div style={{background:"#081a0f",border:"1px solid #14532d",color:"#4ade80",padding:"9px 12px",borderRadius:7,fontSize:".82rem",marginBottom:12,fontFamily:"Outfit,sans-serif"}}>{ok}</div>}
        {tab === "forgot" ? (
          <form onSubmit={handleForgot}>
            <div style={{textAlign:"center",marginBottom:16,color:"#EDE0C8",fontFamily:"Outfit,sans-serif",fontWeight:600}}>Recuperar contraseña</div>
            <label style={S.label}>Tu email</label>
            <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@restaurante.com" required autoFocus />
            <button style={{...S.btn,opacity:loading?.6:1}} type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar email de recuperación"}
            </button>
            <div style={{textAlign:"center",marginTop:12}}>
              <button type="button" onClick={()=>{setTab("login");setErr("");setOk("")}} style={{background:"none",border:"none",color:"#4A6080",cursor:"pointer",fontSize:".82rem",fontFamily:"Outfit,sans-serif",textDecoration:"underline"}}>← Volver al login</button>
            </div>
          </form>
        ) : tab === "login" ? (
          <form onSubmit={handleLogin}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@restaurante.com" required autoFocus />
            <label style={S.label}>Contraseña</label>
            <div style={{position:"relative",marginBottom:14}}>
              <input style={{...S.input,marginBottom:0,paddingRight:40}} type={showPass?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required />
              <button type="button" onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4A6080",fontSize:"1.1rem",padding:0,lineHeight:1}}>{showPass?"🙈":"👁️"}</button>
            </div>
            <button style={{...S.btn,opacity:loading?.6:1}} type="submit" disabled={loading}>
              {loading ? "Verificando..." : "Entrar al panel →"}
            </button>
            <div style={{textAlign:"center",marginTop:10}}>
              <button type="button" onClick={()=>{setTab("forgot");setErr("");setOk("")}} style={{background:"none",border:"none",color:"#4A6080",cursor:"pointer",fontSize:".82rem",fontFamily:"Outfit,sans-serif",textDecoration:"underline"}}>¿Olvidaste tu contraseña?</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <label style={S.label}>Nombre del restaurante</label>
            <input style={S.input} type="text" value={nombre} onChange={e=>{setNombre(e.target.value);setSlug(slugify(e.target.value))}} placeholder="La Trattoria" required autoFocus />
            <label style={S.label}>URL de tu carta</label>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
              <span style={{color:"#2A3A50",fontSize:".75rem",whiteSpace:"nowrap",fontFamily:"IBM Plex Mono,monospace"}}>/menu/</span>
              <input style={{...S.input,marginBottom:0,flex:1}} value={slug} onChange={e=>setSlug(slugify(e.target.value))} placeholder="la-trattoria" />
            </div>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@restaurante.com" required />
            <label style={S.label}>Contraseña</label>
            <div style={{position:"relative",marginBottom:14}}>
              <input style={{...S.input,marginBottom:0,paddingRight:40}} type={showPass?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mínimo 6 caracteres" required />
              <button type="button" onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4A6080",fontSize:"1.1rem",padding:0,lineHeight:1}}>{showPass?"🙈":"👁️"}</button>
            </div>
            <button style={{...S.btn,opacity:loading?.6:1}} type="submit" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear mi restaurante →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RESET PASSWORD MODAL — cuando el usuario llega desde el email de recuperación
══════════════════════════════════════════════════════════════ */
function ResetPasswordModal({ onDone }) {
  const [pass,   setPass]   = useState("");
  const [pass2,  setPass2]  = useState("");
  const [loading,setLoading]= useState(false);
  const [err,    setErr]    = useState("");
  const [ok,     setOk]     = useState("");
  const [show,   setShow]   = useState(false);

  const S = {
    overlay: { position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20 },
    card:    { background:"#0C1018",border:"1px solid #1A2230",borderRadius:18,padding:"32px 28px",width:"100%",maxWidth:400,animation:"scaleIn .2s ease" },
    label:   { display:"block",fontSize:".75rem",color:"#4A6080",marginBottom:5,textTransform:"uppercase",letterSpacing:".04em",fontFamily:"Outfit,sans-serif" },
    input:   { width:"100%",padding:"11px 14px",background:"#060810",border:"1px solid #1A2230",borderRadius:8,color:"#B8D0E8",fontSize:".95rem",outline:"none",marginBottom:14,fontFamily:"Outfit,sans-serif" },
    btn:     { width:"100%",padding:13,background:"linear-gradient(135deg,#00FF88,#00C870)",border:"none",borderRadius:8,color:"#060810",fontSize:"1rem",fontWeight:800,cursor:"pointer",fontFamily:"Outfit,sans-serif" },
    err:     { background:"#1a0808",border:"1px solid #7f1d1d",color:"#f87171",padding:"9px 12px",borderRadius:7,fontSize:".82rem",marginBottom:12,fontFamily:"Outfit,sans-serif" },
    ok:      { background:"#081a0f",border:"1px solid #14532d",color:"#4ade80",padding:"9px 12px",borderRadius:7,fontSize:".82rem",marginBottom:12,fontFamily:"Outfit,sans-serif" },
  };

  async function handleReset(e) {
    e.preventDefault(); setErr("");
    if (pass.length < 6) { setErr("La contraseña debe tener al menos 6 caracteres"); return; }
    if (pass !== pass2)  { setErr("Las contraseñas no coinciden"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) { setErr(error.message); return; }
      setOk("✓ ¡Contraseña actualizada! Redirigiendo...");
      setTimeout(() => onDone(), 1800);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:"2rem",marginBottom:6}}>🔐</div>
          <div style={{fontFamily:"Outfit,sans-serif",fontSize:"1.15rem",fontWeight:700,color:"#EDE0C8",marginBottom:4}}>Nueva contraseña</div>
          <div style={{fontFamily:"Outfit,sans-serif",fontSize:".82rem",color:"#4A6080"}}>Ingresá tu nueva contraseña para el panel</div>
        </div>
        {err && <div style={S.err}>{err}</div>}
        {ok  && <div style={S.ok}>{ok}</div>}
        {!ok && (
          <form onSubmit={handleReset}>
            <label style={S.label}>Nueva contraseña</label>
            <div style={{position:"relative",marginBottom:14}}>
              <input style={{...S.input,marginBottom:0,paddingRight:40}} type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder="mínimo 6 caracteres" required autoFocus />
              <button type="button" onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4A6080",fontSize:"1.1rem",padding:0,lineHeight:1}}>{show?"🙈":"👁️"}</button>
            </div>
            <label style={S.label}>Repetir contraseña</label>
            <input style={S.input} type={show?"text":"password"} value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="repetí la contraseña" required />
            <button style={{...S.btn,opacity:loading?.6:1}} type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar nueva contraseña →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Landing({setMode}) {
  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#060810",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28}}>
      <GS/>
      <div style={{textAlign:"center",marginBottom:44,animation:"fadeUp .6s ease both"}}>
        <div style={{width:72,height:72,borderRadius:22,
          background:"linear-gradient(135deg,#1A1408,rgba(201,168,76,.35))",
          border:"1px solid rgba(201,168,76,.35)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:36,margin:"0 auto 20px"}}>🍽️</div>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#C9A84C",
          letterSpacing:3,marginBottom:8}}>MENUQR</p>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,
          color:"#EDE0C8",lineHeight:1.1,marginBottom:8}}>La Trattoria</h1>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#5A4A30"}}>
          Seleccioná la vista que querés explorar
        </p>
      </div>
      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,
        animation:"fadeUp .6s ease .12s both"}}>
        {[
          {mode:"client",icon:"📱",title:"Vista del Cliente",
           sub:"Lo que ve el comensal al escanear el QR",
           accent:"#C9A84C",bg:"linear-gradient(135deg,#1A140A,#241A0E)"},
          {mode:"admin", icon:"⚙️",title:"Panel del Dueño",
           sub:"Pedidos, carta, QRs, caja y gestión completa",
           accent:"#00FF88",bg:"linear-gradient(135deg,#080C14,#0C1420)"},
        ].map(b=>(
          <button key={b.mode} onClick={()=>setMode(b.mode)} className="pr" style={{
            background:b.bg,border:`1px solid ${b.accent}33`,borderRadius:18,
            padding:"20px 22px",display:"flex",alignItems:"center",
            gap:16,cursor:"pointer",textAlign:"left"}}>
            <div style={{width:50,height:50,borderRadius:14,
              background:`${b.accent}14`,border:`1px solid ${b.accent}33`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:26,flexShrink:0}}>{b.icon}</div>
            <div style={{flex:1}}>
              <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:16,
                color:"#EDE0C8",marginBottom:4}}>{b.title}</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,
                color:"#5A6A80"}}>{b.sub}</p>
            </div>
            <span style={{color:b.accent,fontSize:20}}>→</span>
          </button>
        ))}
      </div>
      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
        color:"#1A2A40",marginTop:32,letterSpacing:1}}>MENUQR · v1.0</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TRANSLATIONS — idiomas del menú del cliente
══════════════════════════════════════════════════════════════ */
const LANGS = [
  {code:"es",flag:"🇦🇷",name:"ES"},
  {code:"en",flag:"🇺🇸",name:"EN"},
  {code:"pt",flag:"🇧🇷",name:"PT"},
  {code:"it",flag:"🇮🇹",name:"IT"},
  {code:"fr",flag:"🇫🇷",name:"FR"},
  {code:"de",flag:"🇩🇪",name:"DE"},
  {code:"zh",flag:"🇨🇳",name:"中文"},
  {code:"ja",flag:"🇯🇵",name:"日本語"},
  {code:"ko",flag:"🇰🇷",name:"한국"},
];
const TR = {
  welcome:      {es:"BIENVENIDO A",     en:"WELCOME TO",         pt:"BEM-VINDO A",        it:"BENVENUTI DA",       fr:"BIENVENUE À",       de:"WILLKOMMEN BEI",     zh:"欢迎光临",          ja:"ようこそ",          ko:"어서오세요"},
  menu:         {es:"Menú",             en:"Menu",               pt:"Cardápio",            it:"Menu",               fr:"Menu",              de:"Speisekarte",        zh:"菜单",              ja:"メニュー",          ko:"메뉴"},
  myOrder:      {es:"Tu pedido",        en:"Your order",         pt:"Seu pedido",          it:"Il tuo ordine",      fr:"Votre commande",    de:"Ihre Bestellung",    zh:"您的订单",          ja:"ご注文",            ko:"주문 내역"},
  viewOrder:    {es:"Ver mi pedido",    en:"View my order",      pt:"Ver meu pedido",      it:"Vedi ordine",        fr:"Voir ma commande",  de:"Bestellung anzeigen",zh:"查看订单",          ja:"注文を見る",         ko:"주문 보기"},
  subtotal:     {es:"Subtotal",         en:"Subtotal",           pt:"Subtotal",            it:"Subtotale",          fr:"Sous-total",        de:"Zwischensumme",      zh:"小计",              ja:"小計",              ko:"소계"},
  total:        {es:"Total",            en:"Total",              pt:"Total",               it:"Totale",             fr:"Total",             de:"Gesamt",             zh:"合计",              ja:"合計",              ko:"합계"},
  tip:          {es:"Propina",          en:"Tip",                pt:"Gorjeta",             it:"Mancia",             fr:"Pourboire",         de:"Trinkgeld",          zh:"小费",              ja:"チップ",            ko:"팁"},
  tipQ:         {es:"¿Dejar propina?",  en:"Leave a tip?",       pt:"Deixar gorjeta?",     it:"Lasciare mancia?",   fr:"Laisser un pourboire?",de:"Trinkgeld geben?",zh:"是否给小费？",      ja:"チップを追加？",     ko:"팁을 남기시겠어요?"},
  noTip:        {es:"Sin propina",      en:"No tip",             pt:"Sem gorjeta",         it:"Senza mancia",       fr:"Sans pourboire",    de:"Kein Trinkgeld",     zh:"不给小费",          ja:"チップなし",         ko:"팁 없음"},
  other:        {es:"Otra cantidad:",   en:"Custom amount:",     pt:"Outro valor:",        it:"Altro importo:",     fr:"Autre montant:",    de:"Anderer Betrag:",    zh:"其他金额：",         ja:"その他の金額：",      ko:"다른 금액："},
  notes:        {es:"Aclaraciones",     en:"Notes",              pt:"Observações",         it:"Note",               fr:"Remarques",         de:"Anmerkungen",        zh:"备注",              ja:"備考",              ko:"메모"},
  notesHint:    {es:"Ej: sin cebolla, alergia al gluten...", en:"E.g: no onion, gluten allergy...", pt:"Ex: sem cebola...", it:"Es: senza cipolla...", fr:"Ex: sans oignon...", de:"Z.B.: ohne Zwiebel...", zh:"例如：不要洋葱...", ja:"例：玉ねぎなし...", ko:"예: 양파 없이..."},
  payMethod:    {es:"Método de pago",   en:"Payment method",     pt:"Forma de pagamento",  it:"Metodo di pagamento",fr:"Mode de paiement",  de:"Zahlungsmethode",    zh:"支付方式",          ja:"お支払い方法",       ko:"결제 방법"},
  confirm:      {es:"Confirmar pedido →",en:"Confirm order →",  pt:"Confirmar pedido →",  it:"Conferma ordine →",  fr:"Confirmer commande →",de:"Bestellung bestätigen →",zh:"确认订单 →",    ja:"注文を確定 →",       ko:"주문 확인 →"},
  choosePay:    {es:"Elegí un método de pago",en:"Choose a payment method",pt:"Escolha um método",it:"Scegli un metodo",fr:"Choisissez un mode",de:"Zahlungsmethode wählen",zh:"请选择支付方式",ja:"お支払い方法を選択",ko:"결제 방법 선택"},
  orderReceived:{es:"PEDIDO RECIBIDO",         en:"ORDER RECEIVED",     pt:"PEDIDO RECEBIDO",     it:"ORDINE RICEVUTO",    fr:"COMMANDE REÇUE",    de:"BESTELLUNG ERHALTEN",zh:"订单已接收",        ja:"ご注文受付",         ko:"주문 접수됨"},
  thanks:       {es:"¡Gracias!",        en:"Thank you!",         pt:"Obrigado!",            it:"Grazie!",            fr:"Merci!",            de:"Danke!",             zh:"谢谢！",            ja:"ありがとうございます！",ko:"감사합니다!"},
  estTime:      {es:"Tiempo estimado: 15–20 min.", en:"Estimated time: 15–20 min.", pt:"Tempo estimado: 15–20 min.", it:"Tempo stimato: 15–20 min.", fr:"Temps estimé: 15–20 min.", de:"Geschätzte Zeit: 15–20 Min.", zh:"预计时间：15–20分钟", ja:"お待ち時間：15–20分", ko:"예상 시간: 15–20분"},
  orderMore:    {es:"Pedir más",        en:"Order more",         pt:"Pedir mais",           it:"Ordina ancora",      fr:"Commander plus",    de:"Mehr bestellen",     zh:"继续点餐",          ja:"追加注文",           ko:"더 주문하기"},
  backHome:     {es:"← Inicio",         en:"← Back",             pt:"← Início",             it:"← Indietro",         fr:"← Retour",          de:"← Zurück",           zh:"← 返回",            ja:"← 戻る",            ko:"← 뒤로"},
  happyHour:    {es:"◈ Happy Hour activo",en:"◈ Happy Hour active",pt:"◈ Happy Hour ativo",it:"◈ Happy Hour attivo",fr:"◈ Happy Hour actif", de:"◈ Happy Hour aktiv", zh:"◈ 快乐时光进行中",  ja:"◈ ハッピーアワー中",  ko:"◈ 해피아워 진행중"},
  cash:         {es:"Efectivo",         en:"Cash",               pt:"Dinheiro",             it:"Contanti",           fr:"Espèces",           de:"Bargeld",            zh:"现金",              ja:"現金",              ko:"현금"},
  card:         {es:"Tarjeta",          en:"Card",               pt:"Cartão",               it:"Carta",              fr:"Carte",             de:"Karte",              zh:"刷卡",              ja:"カード",            ko:"카드"},
  transfer:     {es:"Transferencia",    en:"Transfer",           pt:"Transferência",         it:"Bonifico",           fr:"Virement",          de:"Überweisung",        zh:"转账",              ja:"振込",              ko:"이체"},
};
const t = (key,lang) => TR[key]?.[lang] || TR[key]?.es || key;
const CAT_TR = {
  "entradas":      {en:"Starters",      pt:"Entradas",         it:"Antipasti",      fr:"Entrées",        de:"Vorspeisen",     zh:"前菜",    ja:"前菜",            ko:"에피타이저"},
  "principales":   {en:"Main courses",  pt:"Pratos principais",it:"Secondi",        fr:"Plats",          de:"Hauptgerichte",  zh:"主菜",    ja:"メインディッシュ",  ko:"메인 요리"},
  "postres":       {en:"Desserts",      pt:"Sobremesas",       it:"Dolci",          fr:"Desserts",       de:"Nachspeisen",    zh:"甜点",    ja:"デザート",         ko:"디저트"},
  "bebidas":       {en:"Drinks",        pt:"Bebidas",          it:"Bevande",        fr:"Boissons",       de:"Getränke",       zh:"饮料",    ja:"ドリンク",         ko:"음료"},
  "ensaladas":     {en:"Salads",        pt:"Saladas",          it:"Insalate",       fr:"Salades",        de:"Salate",         zh:"沙拉",    ja:"サラダ",           ko:"샐러드"},
  "pizzas":        {en:"Pizzas",        pt:"Pizzas",           it:"Pizze",          fr:"Pizzas",         de:"Pizzen",         zh:"披萨",    ja:"ピザ",             ko:"피자"},
  "hamburguesas":  {en:"Burgers",       pt:"Hambúrgueres",     it:"Hamburger",      fr:"Burgers",        de:"Burger",         zh:"汉堡",    ja:"バーガー",         ko:"버거"},
  "pastas":        {en:"Pasta",         pt:"Massas",           it:"Pasta",          fr:"Pâtes",          de:"Pasta",          zh:"意面",    ja:"パスタ",           ko:"파스타"},
  "carnes":        {en:"Grills",        pt:"Carnes",           it:"Carni",          fr:"Viandes",        de:"Fleisch",        zh:"肉类",    ja:"肉料理",           ko:"육류"},
  "mariscos":      {en:"Seafood",       pt:"Frutos do mar",    it:"Frutti di mare", fr:"Fruits de mer",  de:"Meeresfrüchte",  zh:"海鲜",    ja:"シーフード",        ko:"해산물"},
  "sopas":         {en:"Soups",         pt:"Sopas",            it:"Zuppe",          fr:"Soupes",         de:"Suppen",         zh:"汤",      ja:"スープ",           ko:"수프"},
  "sandwiches":    {en:"Sandwiches",    pt:"Sanduíches",       it:"Panini",         fr:"Sandwichs",      de:"Sandwiches",     zh:"三明治",  ja:"サンドイッチ",      ko:"샌드위치"},
  "desayuno":      {en:"Breakfast",     pt:"Café da manhã",    it:"Colazione",      fr:"Petit-déjeuner", de:"Frühstück",      zh:"早餐",    ja:"朝食",             ko:"아침식사"},
  "almuerzo":      {en:"Lunch",         pt:"Almoço",           it:"Pranzo",         fr:"Déjeuner",       de:"Mittagessen",    zh:"午餐",    ja:"昼食",             ko:"점심"},
  "cena":          {en:"Dinner",        pt:"Jantar",           it:"Cena",           fr:"Dîner",          de:"Abendessen",     zh:"晚餐",    ja:"夕食",             ko:"저녁"},
  "promociones":   {en:"Specials",      pt:"Promoções",        it:"Promozioni",     fr:"Promotions",     de:"Aktionen",       zh:"特价",    ja:"お得情報",         ko:"프로모션"},
  "vegano":        {en:"Vegan",         pt:"Vegano",           it:"Vegano",         fr:"Végétalien",     de:"Vegan",          zh:"素食",    ja:"ヴィーガン",        ko:"비건"},
  "sin tacc":      {en:"Gluten Free",   pt:"Sem glúten",       it:"Senza glutine",  fr:"Sans gluten",    de:"Glutenfrei",     zh:"无麸质",  ja:"グルテンフリー",    ko:"글루텐 프리"},
  "para compartir":{en:"To share",      pt:"Para compartilhar",it:"Da condividere", fr:"À partager",     de:"Zum Teilen",     zh:"分享菜",  ja:"シェア料理",        ko:"나눔 요리"},
};
const tCat = (label,lang) => { if(!lang||lang==="es") return label; const k=label.toLowerCase().trim(); return CAT_TR[k]?.[lang]||label; };

/* ══════════════════════════════════════════════════════════════
   CLIENT APP — carta del cliente
══════════════════════════════════════════════════════════════ */
function ClientApp({onBack, local, cats, prods}) {
  const [view,setView]   = useState("menu"); // menu | cart | done
  const [cart,setCart]   = useState({});
  const [activeCat,setAC]= useState(cats.find(c=>c.activa)?.id || "dest");
  const [pay,setPay]     = useState(null);
  const [note,setNote]   = useState("");
  const [tipPct,setTipPct] = useState(null); // null | 0 | 10 | 15 | 20
  const [tipCustom,setTC]  = useState("");
  const [lang,setLang]     = useState(()=>localStorage.getItem("menuqr_lang")||"es");
  const T = (key) => t(key,lang);
  const changeLang = (code) => { setLang(code); localStorage.setItem("menuqr_lang",code); };
  const [secs,setSecs]   = useState(
    // calcula segundos hasta el fin del happy hour
    () => {
      const [h,m] = (local.happyHasta||"21:00").split(":").map(Number);
      const now = new Date();
      const end = new Date();
      end.setHours(h,m,0,0);
      return Math.max(0, Math.floor((end - now) / 1000));
    }
  );

  useEffect(()=>{
    const t = setInterval(()=>setSecs(s=>s>0?s-1:0),1000);
    return ()=>clearInterval(t);
  },[]);

  // Solo productos activos
  // activa !== false: muestra categorías con activa=true O activa=null (por defecto visibles)
  const activeCats  = cats.filter(c=>c.activa !== false);
  const catItems    = prods.filter(p=>p.cat===activeCat && (p.active || p.active==null));
  const items       = Object.values(cart);
  const subTotal    = items.reduce((s,i)=>s+i.price*i.qty,0);
  const tipAmt      = tipPct===0 ? 0 : tipPct ? Math.round(subTotal*(tipPct/100))
                      : tipCustom ? Number(tipCustom) : 0;
  const grandTotal  = subTotal + tipAmt;
  const cartCount   = items.reduce((s,i)=>s+i.qty,0);
  const fmtTimer    = s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const add = item => setCart(c=>({...c,[item.id]:{...item,qty:(c[item.id]?.qty||0)+1}}));
  const rem = id   => setCart(c=>{
    const n={...c};
    n[id]?.qty>1 ? n[id]={...n[id],qty:n[id].qty-1} : delete n[id];
    return n;
  });
  const reset = () => {
    setCart({}); setView("menu"); setPay(null);
    setNote(""); setTipPct(null); setTC("");
  };

  const Tag = ({tag}) => {
    if(!tag) return null;
    const c = tag.startsWith("−") ? "#C84040"
            : tag==="CHEF"  ? "#C9A84C"
            : tag==="NUEVO" ? "#4A9A5A"
            : tag==="VEG"   ? "#4A9A5A"
            : "#7A6A50";
    return (
      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
        letterSpacing:1,color:c,background:c+"18",border:`1px solid ${c}44`,
        padding:"2px 7px",borderRadius:4}}>{tag}</span>
    );
  };

  /* ── DONE */
  if(view==="done") return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"var(--cb)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:24,textAlign:"center"}}>
      <GS/>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",marginBottom:16}}>
        {LANGS.map(l=><button key={l.code} onClick={()=>changeLang(l.code)} style={{background:lang===l.code?"rgba(201,168,76,.25)":"rgba(10,8,6,.7)",border:`1px solid ${lang===l.code?"var(--cg)":"rgba(255,255,255,.12)"}`,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,color:lang===l.code?"var(--cg)":"rgba(255,255,255,.6)",backdropFilter:"blur(8px)",lineHeight:1.2,minWidth:36,textAlign:"center"}}>{l.flag} {l.name}</button>)}
      </div>
      <div style={{animation:"scaleIn .5s cubic-bezier(.34,1.56,.64,1) both"}}>
        <div style={{width:80,height:80,borderRadius:"50%",
          background:"linear-gradient(135deg,var(--cg),var(--cg2))",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:36,margin:"0 auto 22px",
          boxShadow:"0 0 0 12px rgba(201,168,76,.08),0 0 0 24px rgba(201,168,76,.04)"}}>✓</div>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--cg)",
          letterSpacing:2,marginBottom:8}}>{T("orderReceived")}</p>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"var(--cbri)",
          marginBottom:6,fontWeight:700}}>{T('thanks')}</h2>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--cm)",
          marginBottom:24,lineHeight:1.6}}>
          {T("estTime")}
        </p>
        <div style={{background:"var(--cc)",border:"1px solid var(--cbr)",borderRadius:18,
          padding:18,marginBottom:20,textAlign:"left",width:"100%",maxWidth:340}}>
          {items.map(i=>(
            <div key={i.id} style={{display:"flex",justifyContent:"space-between",
              padding:"7px 0",borderBottom:"1px solid var(--cbr)",
              fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--ct)"}}>
              <span>{i.qty}× {i.name}</span>
              <span style={{color:"var(--cg)"}}>$ {fmt(i.price*i.qty)}</span>
            </div>
          ))}
          {tipAmt>0 && (
            <div style={{display:"flex",justifyContent:"space-between",
              padding:"7px 0",borderBottom:"1px solid var(--cbr)",
              fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--ct)"}}>
              <span>💝 {T('tip')}</span>
              <span style={{color:"var(--cgr)"}}>$ {fmt(tipAmt)}</span>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,
            fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:700,color:"var(--cg)"}}>
            <span>{T('total')}</span><span>$ {fmt(grandTotal)}</span>
          </div>
        </div>
        {/* Debug: mostrar error de guardado si hubo uno */}
        {typeof window!=="undefined" && localStorage.getItem("menuqr_last_order_error") && (
          <div style={{background:"#1a0808",border:"1px solid #7f1d1d",color:"#f87171",
            padding:"10px 14px",borderRadius:10,marginBottom:16,fontSize:12,
            fontFamily:"monospace",textAlign:"left",maxWidth:340,width:"100%"}}>
            ⚠️ {localStorage.getItem("menuqr_last_order_error")}
          </div>
        )}
        <div style={{display:"flex",gap:10,width:"100%",maxWidth:340}}>
          <button onClick={reset} className="pr" style={{flex:1,background:"var(--cc)",
            border:"1px solid var(--cbr)",borderRadius:14,padding:13,
            fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,
            color:"var(--ct)",cursor:"pointer"}}>{T('orderMore')}</button>
          <button onClick={onBack} className="pr" style={{flex:1,background:"var(--cg)",
            border:"none",borderRadius:14,padding:13,
            fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,
            color:"#0A0806",cursor:"pointer"}}>Inicio</button>
        </div>
      </div>
    </div>
  );

  /* ── CART */
  if(view==="cart") return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",
      background:"var(--cb)",paddingBottom:220}}>
      <GS/>
      {/* Header */}
      <div style={{padding:"24px 20px 16px",borderBottom:"1px solid var(--cbr)",
        display:"flex",alignItems:"center",gap:14,
        background:"linear-gradient(180deg,var(--cs),var(--cb))"}}>
        <button onClick={()=>setView("menu")} className="pr" style={{width:38,height:38,
          borderRadius:10,background:"var(--cc)",border:"1px solid var(--cbr)",
          color:"var(--cbri)",fontSize:18,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,
            color:"var(--cbri)",fontWeight:700}}>{T('myOrder')}</h2>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--cm)"}}>
            {local.mesa?`Mesa ${local.mesa} · `:"Pedido · "}{items.length} producto{items.length!==1?"s":""}
          </p>
        </div>
      </div>

      <div style={{padding:"18px 16px"}}>
        {/* Items en el carrito */}
        <div style={{background:"var(--cc)",border:"1px solid var(--cbr)",
          borderRadius:18,overflow:"hidden",marginBottom:14}}>
          {items.map((item,i)=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,
              padding:"13px 16px",
              borderBottom:i<items.length-1?"1px solid var(--cbr)":"none"}}>
              <span style={{fontSize:24}}>{item.emoji}</span>
              <div style={{flex:1}}>
                <p style={{fontFamily:"'Playfair Display',serif",fontSize:14,
                  color:"var(--cbri)",marginBottom:2}}>{item.name}</p>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,
                  color:"var(--cg)"}}>$ {fmt(item.price)} c/u</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>rem(item.id)} style={{width:28,height:28,
                  borderRadius:8,background:"var(--cs)",border:"1px solid var(--cbr)",
                  color:"var(--cbri)",cursor:"pointer",fontSize:16,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                  fontSize:15,minWidth:18,textAlign:"center",color:"var(--cbri)"}}>{item.qty}</span>
                <button onClick={()=>add(item)} style={{width:28,height:28,
                  borderRadius:8,background:"var(--cg)",border:"none",
                  color:"#0A0806",cursor:"pointer",fontSize:16,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",
            padding:"12px 16px",borderTop:"1px solid var(--cbr)"}}>
            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--cm)"}}>{T('subtotal')}</span>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,
              fontWeight:700,color:"var(--cg)"}}>$ {fmt(subTotal)}</span>
          </div>
        </div>

        {/* Propina — solo si el dueño la activó */}
        {local.propina && (
          <div style={{background:"var(--cc)",border:"1px solid var(--cbr)",
            borderRadius:18,padding:16,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:20}}>💝</span>
              <div>
                <p style={{fontFamily:"'Playfair Display',serif",fontSize:16,
                  color:"var(--cbri)",fontWeight:700}}>{T('tipQ')}</p>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--cm)"}}>
                  100% para el equipo del restaurante
                </p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
              {[{label:"No, gracias",val:0},{label:"10%",val:10},{label:"15%",val:15},{label:"20%",val:20}].map(t=>(
                <button key={t.val} onClick={()=>{setTipPct(t.val);setTC("");}} className="pr" style={{
                  background:tipPct===t.val?"rgba(201,168,76,.15)":"var(--cs)",
                  border:`1px solid ${tipPct===t.val?"var(--cg)":"var(--cbr)"}`,
                  borderRadius:12,padding:"10px 4px",cursor:"pointer",
                  textAlign:"center",transition:"all .2s"}}>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,
                    color:tipPct===t.val?"var(--cg)":"var(--cd)"}}>{t.label}</p>
                  {t.val>0 && (
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,
                      color:"var(--cm)",marginTop:2}}>
                      $ {fmt(Math.round(subTotal*(t.val/100)))}
                    </p>
                  )}
                </button>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,
                color:"var(--cm)",flexShrink:0}}>Otra cantidad:</span>
              <div style={{position:"relative",flex:1}}>
                <span style={{position:"absolute",left:12,top:"50%",
                  transform:"translateY(-50%)",fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:13,color:"var(--cm)"}}>$</span>
                <input type="number" value={tipCustom}
                  onChange={e=>{setTC(e.target.value);setTipPct(null);}}
                  placeholder="0"
                  style={{width:"100%",background:"var(--cs)",
                    border:`1px solid ${tipCustom?"var(--cg)":"var(--cbr)"}`,
                    borderRadius:10,padding:"10px 12px 10px 28px",
                    color:"var(--cbri)",fontFamily:"'IBM Plex Mono',monospace",
                    fontSize:14,fontWeight:600}}/>
              </div>
            </div>
            {tipAmt>0 && (
              <div style={{marginTop:12,padding:"10px 14px",
                background:"rgba(74,154,90,.08)",border:"1px solid rgba(74,154,90,.25)",
                borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--cgr)"}}>
                  Propina seleccionada
                </span>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,
                  fontWeight:700,color:"var(--cgr)"}}>$ {fmt(tipAmt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Nota */}
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--cm)",
          letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{T('notes')}</p>
        <textarea value={note} onChange={e=>setNote(e.target.value)}
          placeholder="Sin sal, alergia a mariscos, sin gluten..."
          style={{width:"100%",background:"var(--cc)",border:"1px solid var(--cbr)",
            borderRadius:14,padding:"12px 16px",color:"var(--cbri)",
            fontFamily:"'DM Sans',sans-serif",fontSize:13,
            resize:"none",height:66,marginBottom:16}}/>

        {/* Método de pago */}
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--cm)",
          letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>{T('payMethod')}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {PAYS.map(p=>(
            <button key={p.id} onClick={()=>setPay(p.id)} className="pr" style={{
              background:pay===p.id?"rgba(201,168,76,.15)":"rgba(255,255,255,.05)",
              border:`2px solid ${pay===p.id?"var(--cg)":"rgba(255,255,255,.2)"}`,
              borderRadius:14,padding:"16px 12px",
              cursor:"pointer",textAlign:"left",transition:"all .2s",
              boxShadow:pay===p.id?"0 0 0 3px rgba(201,168,76,.1)":"none"}}>
              <span style={{fontSize:26,display:"block",marginBottom:6}}>{p.icon}</span>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,
                color:pay===p.id?"var(--cg)":"var(--cbri)",marginBottom:2}}>{p.label}</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"var(--cm)"}}>{p.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CTA fijo */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,padding:"12px 16px 28px",
        background:`linear-gradient(transparent,var(--cb) 28%)`}}>
        {pay && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"10px 16px",background:"var(--cc)",
            border:"1px solid var(--cbr)",borderRadius:14,marginBottom:10}}>
            <div>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--cm)"}}>
                {tipAmt>0?"Subtotal + propina":"Total"}
              </p>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,
                fontWeight:700,color:"var(--cg)"}}>$ {fmt(grandTotal)}</p>
            </div>
            {tipAmt>0 && (
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--cgr)"}}>
                💝 +$ {fmt(tipAmt)}
              </p>
            )}
          </div>
        )}
        <button onClick={async()=>{
          if(!pay) return;
          // Calcular total con propina
          const cartItems = Object.values(cart).filter(i=>i.qty>0);
          const subtotal  = cartItems.reduce((s,i)=>s+i.price*i.qty,0);
          const tipAmount = tipPct!=null?(tipPct===0?0:Math.round(subtotal*tipPct/100)):0;
          const totalFinal= subtotal + tipAmount;
          const mesa = local.mesa || 1;
          // Guardar en Supabase si está disponible
          let pedidoGuardado = false;
          let errorMsg = null;
          if(!supabase) errorMsg = "Supabase no configurado";
          else if(!local.restauranteId) errorMsg = "Sin restauranteId";
          else {
            try {
              // Generar UUID en el cliente para no necesitar SELECT después del INSERT
              const pedidoId = crypto.randomUUID();
              const {error} = await supabase.from("pedidos").insert({
                id:             pedidoId,
                restaurante_id: local.restauranteId,
                mesa_numero:    mesa,
                status:         "nuevo",
                metodo_pago:    pay,
                propina:        tipAmount,
                total:          totalFinal,
                nota:           note||null,
                idioma:         lang||"es",
              });
              if(error){ errorMsg = error.message; }
              else {
                pedidoGuardado = true;
                const items = cartItems.map(i=>({
                  pedido_id:   pedidoId,
                  producto_id: i.id,
                  nombre:      i.name,
                  precio:      i.price,
                  cantidad:    i.qty,
                }));
                const {error:itemsErr} = await supabase.from("pedido_items").insert(items);
                if(itemsErr) console.warn("items error:", itemsErr.message);
              }
            } catch(e){ errorMsg = e.message; }
          }
          // Guardar resultado para mostrarlo en la pantalla "done"
          if(errorMsg) localStorage.setItem("menuqr_last_order_error", errorMsg);
          else localStorage.removeItem("menuqr_last_order_error");
          setView("done");
        }} className="pr" style={{
          width:"100%",
          background:pay?"#F97316":"#1F1F1F",
          color:pay?"#FFF":"#555",
          border:"none",borderRadius:16,padding:17,
          fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:700,
          cursor:pay?"pointer":"not-allowed",
          boxShadow:pay?"0 8px 28px rgba(249,115,22,.3)":"none",
          transition:"all .25s"}}>
          {pay?T('confirm'):T('choosePay')}
        </button>
      </div>
    </div>
  );

  /* ── MENU VIEW */
  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",
      background:"var(--cb)",paddingBottom:cartCount>0?96:36}}>
      <GS/>

      {/* Language switcher */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end",marginBottom:12}}>
        {LANGS.map(l=>(
          <button key={l.code} onClick={()=>changeLang(l.code)} style={{
            background:lang===l.code?"rgba(249,115,22,.2)":"rgba(30,30,30,.9)",
            border:`1px solid ${lang===l.code?"#F97316":"rgba(255,255,255,.1)"}`,
            borderRadius:6,padding:"5px 8px",cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:600,
            color:lang===l.code?"#F97316":"rgba(255,255,255,.5)",
            backdropFilter:"blur(8px)",lineHeight:1.2,minWidth:36,textAlign:"center"}}>
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{background:"linear-gradient(160deg,#1A0800,#0D0D0D)",
        padding:"26px 20px 0",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-60,right:-40,width:180,height:180,
          borderRadius:"50%",background:"rgba(249,115,22,.08)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-40,left:-30,width:120,height:120,
          borderRadius:"50%",background:"rgba(249,115,22,.05)",pointerEvents:"none"}}/>

        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"flex-start",marginBottom:14}}>
          <div>
            <button onClick={onBack} style={{background:"none",border:"none",
              color:"var(--cm)",fontSize:11,fontFamily:"'IBM Plex Mono',monospace",
              letterSpacing:1,cursor:"pointer",marginBottom:8,padding:0}}>{T('backHome')}</button>
            <div style={{width:32,height:3,background:"linear-gradient(90deg,#F97316,#FB923C)",marginBottom:8,borderRadius:2}}/>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--cg)",
              letterSpacing:3,marginBottom:4}}>{T('welcome')}</p>
            {/* Nombre dinámico del local */}
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,
              color:"var(--cbri)",lineHeight:1.1}}>{local.nombre}</h1>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--cm)",marginTop:4}}>
              {local.mesa?`Mesa ${local.mesa} · `:""}{nowStr()}
            </p>
          </div>
          <button onClick={()=>setView("cart")} style={{position:"relative",
            background:"var(--cc)",border:"1px solid var(--cbr)",borderRadius:12,
            padding:"10px 13px",cursor:"pointer",color:"var(--cbri)",
            fontSize:20,marginTop:26}}>
            🛒
            {cartCount>0 && (
              <span style={{position:"absolute",top:-6,right:-6,
                background:"var(--cg)",color:"#0A0806",borderRadius:"50%",
                width:20,height:20,fontSize:10,fontWeight:800,
                display:"flex",alignItems:"center",justifyContent:"center",
                animation:"pulseGold 2s infinite"}}>{cartCount}</span>
            )}
          </button>
        </div>

        {/* Happy Hour — solo si está activo */}
        {local.happyHour && secs>0 && (
          <div style={{background:"linear-gradient(90deg,#2A1400,#1A0D00)",
            border:"1px solid rgba(201,168,76,.2)",
            borderRadius:12,padding:"10px 14px",marginBottom:18,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                color:"var(--cg)",fontWeight:600,marginBottom:1}}>{T('happyHour')}</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"var(--cm)"}}>
                Promos hasta las {local.happyHasta} hs
              </p>
            </div>
            <span style={{fontFamily:"monospace",fontSize:18,fontWeight:900,
              color:"var(--cg)",letterSpacing:2}}>{fmtTimer(secs)}</span>
          </div>
        )}

        {/* Category tabs */}
        <div style={{display:"flex",gap:8,overflowX:"auto",
          margin:"0 -20px",padding:"12px 20px 20px",scrollbarWidth:"none"}}>
          {activeCats.map(cat=>{
            const isActive = activeCat===cat.id;
            const ac = local.color||"#F97316";
            return (
            <button key={cat.id} onClick={()=>setAC(cat.id)} style={{
              fontFamily:"'DM Sans',sans-serif",fontSize:13,
              fontWeight:isActive?700:500,
              background:isActive?ac:"#1F1F1F",
              color:isActive?"#FFF":"#888",
              border:`1px solid ${isActive?ac:"#2D2D2D"}`,
              borderRadius:100,padding:"9px 18px",
              cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
              transition:"all .2s",
              boxShadow:isActive?`0 0 18px ${ac}44`:"none",
              touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}}>
              {cat.icon} {tCat(cat.label,lang)}
            </button>
          )})}
        </div>
      </div>

      {/* Items — grilla 2 columnas */}
      <div className="cf" style={{
        display:"grid",gridTemplateColumns:"1fr 1fr",
        gap:12,padding:"0 16px 16px"}} key={activeCat}>
        {catItems.length===0 && (
          <div style={{gridColumn:"1/-1",textAlign:"center",padding:"50px 0"}}>
            <p style={{fontSize:40,marginBottom:10}}>🍽️</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#555"}}>
              Sin productos en esta categoría
            </p>
          </div>
        )}
        {catItems.map(item=>{
          const inCart = cart[item.id]?.qty || 0;
          const disc   = item.orig ? Math.round((1-item.price/item.orig)*100) : null;
          const ac     = local.color||"#F97316";
          return (
            <div key={item.id} className="ci" style={{
              background:"#1A1A1A",
              border:`2px solid ${inCart>0?ac:"#272727"}`,
              borderRadius:20,overflow:"hidden",
              transition:"border-color .25s",
              display:"flex",flexDirection:"column"}}>
              {/* Imagen / emoji */}
              <div style={{
                background:`linear-gradient(135deg,#222,#1A1A1A)`,
                height:110,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:52,position:"relative"}}>
                {item.emoji||"🍽️"}
                {item.tag && (
                  <div style={{position:"absolute",top:8,right:8}}>
                    <Tag tag={item.tag}/>
                  </div>
                )}
                {disc && (
                  <div style={{position:"absolute",top:8,left:8,
                    background:"#22C55E",color:"#FFF",borderRadius:6,
                    fontSize:9,fontWeight:800,padding:"2px 6px",
                    fontFamily:"'DM Sans',sans-serif"}}>-{disc}%</div>
                )}
              </div>
              {/* Info */}
              <div style={{padding:"10px 12px 12px",flex:1,display:"flex",
                flexDirection:"column",justifyContent:"space-between",gap:6}}>
                <div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,
                    color:"#FFF",lineHeight:1.25,marginBottom:3}}>{item.name}</div>
                  {item.desc && (
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,
                      color:"#666",lineHeight:1.4,
                      display:"-webkit-box",WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.desc}</div>
                  )}
                </div>
                <div style={{display:"flex",alignItems:"center",
                  justifyContent:"space-between",marginTop:4}}>
                  <div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:15,
                      fontWeight:800,color:ac}}>$ {fmt(item.price)}</div>
                    {item.orig && (
                      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,
                        color:"#555",textDecoration:"line-through"}}>$ {fmt(item.orig)}</div>
                    )}
                  </div>
                  {item.sin_stock ? (
                    <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,
                      fontWeight:700,color:"#888",background:"#222",
                      border:"1px solid #333",borderRadius:8,
                      padding:"6px 10px",whiteSpace:"nowrap"}}>Sin stock</span>
                  ) : inCart===0 ? (
                    <button onClick={()=>add(item)} className="pr" style={{
                      width:34,height:34,borderRadius:12,
                      background:ac,border:"none",color:"#FFF",
                      fontSize:22,fontWeight:700,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:`0 4px 14px ${ac}55`,
                      touchAction:"manipulation"}}>+</button>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <button onClick={()=>rem(item.id)} className="pr" style={{
                        width:28,height:28,borderRadius:9,
                        background:"#2A2A2A",border:"1px solid #333",
                        color:"#FFF",cursor:"pointer",fontSize:17,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        touchAction:"manipulation"}}>−</button>
                      <span style={{fontFamily:"'DM Sans',sans-serif",
                        fontWeight:800,fontSize:14,color:ac,minWidth:14,
                        textAlign:"center"}}>{inCart}</span>
                      <button onClick={()=>add(item)} className="pr" style={{
                        width:28,height:28,borderRadius:9,
                        background:ac,border:"none",color:"#FFF",cursor:"pointer",
                        fontSize:17,display:"flex",alignItems:"center",
                        justifyContent:"center",touchAction:"manipulation"}}>+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Carrito flotante */}
      {cartCount>0 && (
        <div style={{position:"fixed",bottom:16,left:"50%",
          transform:"translateX(-50%)",
          width:"calc(100% - 32px)",maxWidth:398,zIndex:50}}>
          <button onClick={()=>setView("cart")} className="pr" style={{
            width:"100%",background:local.color||"#F97316",
            border:"none",borderRadius:18,padding:"15px 20px",
            display:"flex",justifyContent:"space-between",alignItems:"center",
            cursor:"pointer",
            boxShadow:`0 8px 32px ${(local.color||"#F97316")}55`,
            animation:"pulseGold 2.5s infinite"}}>
            <div style={{background:"rgba(0,0,0,.25)",borderRadius:"50%",
              width:30,height:30,display:"flex",alignItems:"center",
              justifyContent:"center",fontFamily:"'DM Sans',sans-serif",
              fontSize:13,fontWeight:800,color:"#FFF"}}>{cartCount}</div>
            <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,
              fontSize:16,color:"#FFF"}}>{T('viewOrder')}</span>
            <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,
              fontSize:15,color:"#FFF"}}>$ {fmt(subTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   QR TAB — componente a nivel de módulo para evitar remounts
══════════════════════════════════════════════════════════════ */
function QRTabComp({ mesaNum, setMesaNum, qrType, setQrType, promoUrl, setPromoUrl, local }) {
  const getQRData = () => {
    switch(qrType){
      case "mesa":
        return `https://${(local.baseUrl||'').replace(/^https?:\/\//,'')}/mesa/${mesaNum}`;
      case "wifi":
        return `WIFI:T:WPA;S:${local.wifi_nombre};P:${local.wifi_pass};;`;
      case "whatsapp":
        return `https://wa.me/${local.whatsapp}?text=${encodeURIComponent(local.whatsapp_msg||'')}`;
      case "promo":
        return promoUrl || `https://${local.baseUrl}/promo`;
      default:
        return `https://${local.baseUrl}`;
    }
  };
  const QR_TYPES = [
    {id:"mesa",     icon:"🪑", label:"Mesa",     desc:"Un QR único por cada mesa",           color:"#C9A84C", bg:"#F5ECD7"},
    {id:"wifi",     icon:"📶", label:"WiFi",     desc:"El cliente se conecta al escanear",   color:"#10B981", bg:"#F0FFF4"},
    {id:"whatsapp", icon:"💬", label:"WhatsApp", desc:"Abre WA directo con tu número",       color:"#25D366", bg:"#F0FFF0"},
    {id:"promo",    icon:"🔥", label:"Promo",    desc:"QR para un producto o promo especial",color:"#EF4444", bg:"#FFF0F0"},
  ];
  const current = QR_TYPES.find(t=>t.id===qrType);
  return (
    <div style={{padding:"18px 16px 0"}}>
      <div style={{marginBottom:14}}>
        <ALbl>Generador</ALbl>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:"var(--abri)"}}>QRs</h2>
      </div>
      {/* Type selector */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {QR_TYPES.map(t=>(
          <button key={t.id} type="button" onClick={()=>setQrType(t.id)} className="pr" style={{
            background:qrType===t.id?`${t.color}12`:"var(--ac)",
            border:`1px solid ${qrType===t.id?`${t.color}55`:"var(--abr)"}`,
            borderRadius:14,padding:"13px 12px",cursor:"pointer",textAlign:"left",transition:"all .2s"}}>
            <p style={{fontSize:22,marginBottom:5}}>{t.icon}</p>
            <p style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,
              color:qrType===t.id?t.color:"var(--abri)",marginBottom:2}}>{t.label}</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--ad)",lineHeight:1.3}}>{t.desc}</p>
          </button>
        ))}
      </div>
      {/* Config por tipo */}
      <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:16,marginBottom:16}}>
        {qrType==="mesa" && (
          <div>
            <ALbl color={current.color}>Número de mesa</ALbl>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
              <input type="range" min={1} max={local.mesas||10} value={mesaNum}
                onChange={e=>setMesaNum(Number(e.target.value))}
                style={{flex:1,accentColor:current.color}}/>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,
                fontWeight:700,color:current.color,minWidth:32,textAlign:"center"}}>
                {mesaNum}
              </span>
            </div>
            {/* Grilla de mesas */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
              {Array.from({length:Math.min(local.mesas||10,15)},(_,i)=>i+1).map(n=>(
                <button key={n} type="button" onClick={()=>setMesaNum(n)} className="pr" style={{
                  background:mesaNum===n?"rgba(201,168,76,.15)":"var(--as)",
                  border:`1px solid ${mesaNum===n?"#C9A84C":"var(--abr)"}`,
                  borderRadius:8,padding:"8px 4px",fontFamily:"'IBM Plex Mono',monospace",
                  fontWeight:700,fontSize:13,color:mesaNum===n?"#C9A84C":"var(--at)",cursor:"pointer"}}>
                  {n}
                </button>
              ))}
              {(local.mesas||10)>15 && (
                <div style={{gridColumn:"1/-1",textAlign:"center",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)",padding:"4px 0"}}>
                  + {(local.mesas||10)-15} mesas más
                </div>
              )}
            </div>
          </div>
        )}
        {qrType==="wifi" && (
          <div>
            <ALbl color={current.color}>Datos del WiFi</ALbl>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--at)",marginBottom:4}}>
              Red: <b style={{color:"var(--abri)"}}>{local.wifi_nombre||"Sin configurar"}</b>
            </p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--at)",marginBottom:8}}>
              Contraseña: <b style={{color:"var(--abri)"}}>{local.wifi_pass||"Sin configurar"}</b>
            </p>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)"}}>Editá estos datos en la pestaña Gestión →</p>
          </div>
        )}
        {qrType==="whatsapp" && (
          <div>
            <ALbl color={current.color}>Datos de WhatsApp</ALbl>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--at)",marginBottom:4}}>
              Número: <b style={{color:"var(--abri)"}}>+{local.whatsapp||"Sin configurar"}</b>
            </p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--at)",marginBottom:8}}>
              Mensaje: <i style={{color:"var(--ad)"}}>{local.whatsapp_msg||"Sin mensaje"}</i>
            </p>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)"}}>Editá estos datos en la pestaña Gestión →</p>
          </div>
        )}
        {qrType==="promo" && (
          <div>
            <ALbl color={current.color}>URL de la promo</ALbl>
            <div style={{display:"flex",alignItems:"center",background:"var(--as)",
              border:"1px solid var(--abr)",borderRadius:10,overflow:"hidden",marginBottom:8}}>
              <span style={{padding:"0 10px",fontFamily:"'IBM Plex Mono',monospace",
                fontSize:11,color:"var(--ad)",borderRight:"1px solid var(--abr)",
                height:40,display:"flex",alignItems:"center",flexShrink:0}}>URL</span>
              <input value={promoUrl} onChange={e=>setPromoUrl(e.target.value)}
                placeholder="https://instagram.com/tu_promo_especial"
                style={{flex:1,background:"none",border:"none",padding:"10px 12px",
                  color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}/>
            </div>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--am)"}}>
              Puede ser cualquier URL — Instagram, producto, promo del mes, etc.
            </p>
          </div>
        )}
      </div>
      {/* QR Preview */}
      <div style={{background:current.bg,borderRadius:20,padding:"20px 16px",
        marginBottom:16,textAlign:"center",border:`2px solid ${current.color}`,
        boxShadow:`0 4px 24px rgba(0,0,0,.3)`}}>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
          color:current.color,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6}}>
          {local.nombre}
        </p>
        <div style={{background:"#fff",borderRadius:12,padding:8,
          border:`3px solid ${current.color}`,display:"inline-block",marginBottom:10}}>
          <img src={qrBuild(getQRData(), current.bg.replace("#",""))}
            width={160} height={160} alt="QR preview"
            style={{display:"block",borderRadius:6}}/>
        </div>
        <div style={{background:current.color,borderRadius:30,
          padding:"5px 20px",display:"inline-block",marginBottom:6}}>
          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:"#0A0806"}}>
            {qrType==="mesa"?`Mesa ${mesaNum}`:
             qrType==="wifi"?"WiFi Gratis":
             qrType==="whatsapp"?"Escribinos por WA":
             "Promo Especial"}
          </p>
        </div>
        <p style={{fontFamily:"monospace",fontSize:8,color:current.color,
          opacity:.6,marginTop:4,wordBreak:"break-all",padding:"0 8px"}}>
          {getQRData()}
        </p>
      </div>
      <button type="button" onClick={()=>window.print()} className="pr" style={{
        width:"100%",background:current.color,color:"#0A0806",border:"none",
        borderRadius:14,padding:14,fontFamily:"'IBM Plex Mono',monospace",
        fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1,marginBottom:8}}>
        🖨️ IMPRIMIR ESTE QR
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CAT MODAL — nivel de módulo (evita useState condicional)
══════════════════════════════════════════════════════════════ */
function CatModal({local, cats, setCats, setGModal, toast}) {
  const ICONOS = ["◇","◉","◌","◎","✦","★","◈","▶","♦","❋","🍕","🥩","🍹","☕"];
  const [nNombre,setNN] = useState("");
  const [nIcono, setNI] = useState("◇");
  return (
    <BottomModal title="Nueva categoría" onClose={()=>setGModal(null)}>
      <GLbl>Ícono</GLbl>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        {ICONOS.map(ic=>(
          <button key={ic} onClick={()=>setNI(ic)} style={{
            background:nIcono===ic?"rgba(99,102,241,.15)":"var(--gs)",
            border:`1px solid ${nIcono===ic?"var(--gi)":"var(--gbr)"}`,
            borderRadius:8,width:40,height:40,fontSize:18,
            color:nIcono===ic?"var(--gi2)":"var(--gt)",cursor:"pointer"}}>
            {ic}
          </button>
        ))}
      </div>
      <GInput label="Nombre *" value={nNombre} onChange={setNN}
        placeholder="Ej: Pastas, Carnes, Vegano..."/>
      <div style={{display:"flex",gap:10,marginTop:4}}>
        <button onClick={()=>setGModal(null)} className="pr" style={{
          flex:1,background:"var(--gs)",color:"var(--gt)",
          border:"1px solid var(--gbr)",borderRadius:10,padding:12,
          fontFamily:"'Outfit',sans-serif",fontSize:13,cursor:"pointer"}}>
          Cancelar
        </button>
        <button onClick={async ()=>{
          if(!nNombre) return toast("Ingresá un nombre","err");
          if(local.restauranteId && supabase){
            const {data:cat,error} = await supabase.from("categorias")
              .insert({restaurante_id:local.restauranteId, label:nNombre, icon:nIcono, activa:true, orden:cats.length})
              .select().single();
            if(error){ toast("Error: "+error.message,"err"); return; }
            setCats(cs=>[...cs,{id:cat.id,label:cat.label,icon:cat.icon,activa:cat.activa}]);
          } else {
            setCats(cs=>[...cs,{
              id:nNombre.toLowerCase().replace(/\s+/g,"_")+Date.now(),
              label:nNombre,icon:nIcono,activa:true
            }]);
          }
          setGModal(null);
          toast("Categoría creada ✓");
        }} className="pr" style={{
          flex:2,background:"var(--gi)",color:"#fff",border:"none",
          borderRadius:10,padding:12,fontFamily:"'Outfit',sans-serif",
          fontSize:14,fontWeight:600,cursor:"pointer"}}>
          Crear categoría
        </button>
      </div>
    </BottomModal>
  );
}

/* ══════════════════════════════════════════════════════════════
   ADMIN APP — panel completo del dueño
   Tabs: Inicio · Pedidos · Carta · QRs · Caja · Gestión · Config
══════════════════════════════════════════════════════════════ */
/* ── Sonidos de notificación (Web Audio API, sin archivos externos) ── */
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const tonos = {
      nuevo:  [[880,0,.08],[880,.12,.08],[1100,.26,.12]],
      cocina: [[660,0,.10],[880,.18,.10]],
      listo:  [[523,0,.09],[659,.12,.09],[784,.25,.14]],
    };
    (tonos[type] || tonos.nuevo).forEach(([freq, delay, dur]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  } catch(e) { /* audio no disponible */ }
}

function pushNotify(title, body) {
  try {
    if (!("Notification" in window)) return;
    const send = () => new Notification(title, {
      body, icon: "/favicon.ico", badge: "/favicon.ico",
      tag: "menuqr-pedido", renotify: true,
    });
    if (Notification.permission === "granted") { send(); }
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(p => { if (p === "granted") send(); });
    }
  } catch(e) { /* notificaciones no disponibles */ }
}

function AdminApp({onBack, local, setLocal, cats, setCats, prods, setProds}) {

  /* ── State del admin */
  const [tab,setTab]         = useState("home");
  const [orders,setOrders]   = useState(INIT_ORDERS);
  const [clock,setClock]     = useState(new Date());
  const [toastMsg,setToastM] = useState(null);

  /* ── State de caja */
  const [cajaScr,setCajaScr] = useState("inicio");
  const [turno,setTurno]     = useState(null);
  const [histTurnos,setHist] = useState([]);
  const [cajero,setCajero]   = useState("");
  const [showArqAp,setArqAp] = useState(false);
  const [showArqCi,setArqCi] = useState(false);
  const [showTkt,setTkt]     = useState(null);
  const [arqVals,setArqV]    = useState(emptyArq());

  /* ── State de QR */
  const [qrSelected,setQRS]  = useState(null);
  const [mesaNumAdmin,setMesaNumAdmin] = useState(1);
  const [qrType,setQrType]   = useState("mesa");
  const [promoUrl,setPromoUrl] = useState("");

  /* ── State de gestión */
  const [gModal,setGModal]   = useState(null);

  /* ── State de tabs (lifted para evitar useState en nested components) */
  const [ordersFilter, setOrdersFilter] = useState("activos");
  const [cartaAc, setCartaAc]           = useState("");
  const [gSubTab, setGSubTab]           = useState("local");
  const [gActiveCat, setGActiveCat]     = useState("");

  /* ── State de venta rápida (pedido manual desde caja) */
  const [showVentaRapida, setShowVentaRapida] = useState(false);
  const [vrCart, setVrCart]                   = useState({});
  const [vrMesa, setVrMesa]                   = useState("mostrador");
  const [vrMesaNum, setVrMesaNum]             = useState(1);
  const [vrPay, setVrPay]                     = useState(null);
  const [vrLoading, setVrLoading]             = useState(false);

  /* ── State de POS embebido en Caja */
  const [cajaCart, setCajaCart]         = useState({});
  const [cajaPay, setCajaPay]           = useState(null);
  const [cajaMesaTipo, setCajaMesaTipo] = useState("mostrador");
  const [cajaMesaNum, setCajaMesaNum]   = useState(1);
  const [cajaOpenCat, setCajaOpenCat]   = useState(null);
  const [cajaLoading, setCajaLoading]   = useState(false);

  const vrTotal    = Object.values(vrCart).reduce((s,i)=>s+i.price*i.qty,0);
  const cajaTotal  = Object.values(cajaCart).reduce((s,i)=>s+i.price*i.qty,0);

  const vrAdd  = (prod) => setVrCart(c=>({...c,[prod.id]:{...prod,qty:(c[prod.id]?.qty||0)+1}}));
  const vrSub  = (prod) => setVrCart(c=>{const qty=(c[prod.id]?.qty||0)-1;if(qty<=0){const n={...c};delete n[prod.id];return n;}return{...c,[prod.id]:{...prod,qty}};});
  const cajaAdd= (prod) => setCajaCart(c=>({...c,[prod.id]:{...prod,qty:(c[prod.id]?.qty||0)+1}}));
  const cajaSub= (prod) => setCajaCart(c=>{const qty=(c[prod.id]?.qty||0)-1;if(qty<=0){const n={...c};delete n[prod.id];return n;}return{...c,[prod.id]:{...prod,qty}};});

  /* ── Pedir permiso de notificaciones al entrar */
  useEffect(()=>{
    if("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  },[]);

  /* ── Print ticket (recibo para el cliente) */
  const printTicket = (o) => {
    const PAY_LABELS={cash:"Efectivo",mp:"Mercado Pago",card:"Tarjeta Débito",trans:"Transferencia"};
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket</title>
    <style>
      @page{size:80mm auto;margin:0}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;width:80mm;padding:5mm 6mm}
      .c{text-align:center}
      .line{border-top:1px dashed #000;margin:6px 0}
      .row{display:flex;justify-content:space-between;padding:2px 0;font-size:11px}
      .logo{font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin-bottom:3px}
      .sub{font-size:9px;letter-spacing:1px;color:#555;margin-bottom:1px}
      .item{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #ccc}
      .iname{flex:1;font-size:12px}
      .iprice{min-width:56px;text-align:right;font-weight:bold;font-size:12px}
      .total{display:flex;justify-content:space-between;padding:5px 0;font-size:15px;font-weight:bold}
      .thanks{font-size:13px;font-weight:bold;text-align:center;margin:9px 0 4px;letter-spacing:1px}
      .footer{font-size:9px;color:#888;text-align:center;line-height:1.5}
    </style></head><body>
      <div class="c">
        <div class="logo">${local.nombre||"Restaurante"}</div>
        ${local.direccion?`<div class="sub">${local.direccion}</div>`:""}
        ${local.telefono?`<div class="sub">Tel: ${local.telefono}</div>`:""}
      </div>
      <div class="line"></div>
      <div class="row"><span>${new Date().toLocaleDateString("es-AR")}</span><span>${new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div class="row"><span>Pedido #${String(o.id).slice(-4)}</span><span>${o.table===0||o.table==="0"?"Mostrador":"Mesa "+o.table}</span></div>
      <div class="line"></div>
      ${o.items.map(it=>`<div class="item"><span class="iname">${it.qty}× ${it.name}</span><span class="iprice">${it.price?"$"+fmt(it.qty*(it.price||0)):""}</span></div>`).join("")}
      <div class="line"></div>
      <div class="total"><span>TOTAL</span><span>$${fmt(o.total)}</span></div>
      ${o.tip>0?`<div class="row"><span>Propina</span><span>+$${fmt(o.tip)}</span></div>`:""}
      <div class="row"><span>Pago</span><span><b>${PAY_LABELS[o.pay]||o.pay||"—"}</b></span></div>
      <div class="line"></div>
      <div class="thanks">¡Gracias!</div>
      <div class="footer">${local.email?local.email+"<br>":""}Emitido por MenuQR</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},1500)}</script>
    </body></html>`;
    const w=window.open("","_blank","width=420,height=620,toolbar=0,menubar=0,scrollbars=0");
    if(w){w.document.write(html);w.document.close();}
  };

  const vrConfirm = async(shouldPrint=false)=>{
    const items = Object.values(vrCart).filter(i=>i.qty>0);
    if(!items.length || !vrPay) return;
    setVrLoading(true);
    try {
      const mesaNum = vrMesa==="mostrador" ? 0 : vrMesaNum;
      const {data:pedido,error} = await supabase.from("pedidos").insert({
        restaurante_id: local.restauranteId,
        mesa_numero:    mesaNum,
        status:         "nuevo",
        metodo_pago:    vrPay,
        propina:        0,
        total:          vrTotal,
        nota:           vrMesa==="mostrador"?"Venta en mostrador":null,
      }).select().single();
      if(!error && pedido){
        await supabase.from("pedido_items").insert(
          items.map(i=>({pedido_id:pedido.id,producto_id:i.id,nombre:i.name,precio:i.price,cantidad:i.qty}))
        );
        if(shouldPrint) printTicket({id:pedido.id,table:mesaNum,items,total:vrTotal,pay:vrPay,tip:0});
      }
      setVrCart({}); setVrPay(null); setShowVentaRapida(false);
      toast("✓ Venta registrada");
    } catch(e){ toast("Error al guardar","err"); }
    finally { setVrLoading(false); }
  };

  const cajaConfirm = async(shouldPrint=false)=>{
    const items = Object.values(cajaCart).filter(i=>i.qty>0);
    if(!items.length || !cajaPay) return;
    setCajaLoading(true);
    try {
      const mesaNum = cajaMesaTipo==="mostrador" ? 0 : cajaMesaNum;
      const {data:pedido,error} = await supabase.from("pedidos").insert({
        restaurante_id: local.restauranteId,
        mesa_numero:    mesaNum,
        status:         "nuevo",
        metodo_pago:    cajaPay,
        propina:        0,
        total:          cajaTotal,
        nota:           cajaMesaTipo==="mostrador"?"Venta en mostrador":null,
      }).select().single();
      if(!error && pedido){
        await supabase.from("pedido_items").insert(
          items.map(i=>({pedido_id:pedido.id,producto_id:i.id,nombre:i.name,precio:i.price,cantidad:i.qty}))
        );
        if(shouldPrint) printTicket({id:pedido.id,table:mesaNum,items,total:cajaTotal,pay:cajaPay,tip:0});
      }
      setCajaCart({}); setCajaPay(null);
      toast("✓ Venta registrada");
    } catch(e){ toast("Error al guardar","err"); }
    finally { setCajaLoading(false); }
  };

  useEffect(()=>{
    // Actualizar reloj cada minuto (no cada segundo para evitar re-renders)
    const t=setInterval(()=>setClock(new Date()),60000);
    return()=>clearInterval(t);
  },[]);

  const toast = (msg,type="ok") => {
    setToastM({msg,type});
    setTimeout(()=>setToastM(null),2400);
  };

  /* ── Cargar turno activo de caja desde Supabase */
  useEffect(()=>{
    if(!supabase || !local.restauranteId) return;
    getTurnos(local.restauranteId).then(turnos=>{
      const open = turnos?.find(t=>t.estado==="abierto");
      if(open){
        setTurno({
          id: open.id, supabaseId: open.id,
          cajero: open.cajero||"Cajero",
          horaApertura: new Date(open.hora_apertura).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}),
          fecha: new Date(open.hora_apertura).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"}),
          fondoApertura: open.fondo_apertura||0,
          arqueoAp: open.arqueo_apertura||{},
          ventas: {efectivo:0,mercadopago:0,debito:0,credito:0,transferencia:0},
          arqueoFinal: null, horaCierre: null, estado:"abierto",
        });
        setCajaScr("turno");
      }
    });
  },[local.restauranteId]);

  /* ── Cargar pedidos del día y suscribirse en tiempo real */
  useEffect(()=>{
    if(!supabase || !local.restauranteId) return;
    const hoy = new Date().toISOString().slice(0,10);
    let knownIds = new Set(); // para detectar pedidos nuevos en el polling

    const mapPedido = p => ({
      id:p.id, table:p.mesa_numero,
      time:new Date(p.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}),
      status:p.status, items:(p.pedido_items||[]).map(i=>({name:i.nombre,qty:i.cantidad})),
      total:p.total, pay:p.metodo_pago||"", tip:p.propina||0,
    });

    // Cargar pedidos de hoy
    const loadPedidos = async () => {
      const {data} = await supabase.from("pedidos")
        .select("*, pedido_items(*)")
        .eq("restaurante_id", local.restauranteId)
        .gte("created_at", hoy+"T00:00:00")
        .order("created_at",{ascending:false});
      if(!data?.length) return [];
      return data.map(mapPedido);
    };

    loadPedidos().then(mapped => {
      if(mapped.length) {
        setOrders(mapped);
        mapped.forEach(p=>knownIds.add(p.id));
      }
    });

    // Suscribirse a nuevos pedidos en tiempo real (Realtime)
    const ch = supabase.channel("pedidos-admin-"+local.restauranteId)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"pedidos",filter:`restaurante_id=eq.${local.restauranteId}`},
        payload=>{
          const p=payload.new;
          if(knownIds.has(p.id)) return;
          knownIds.add(p.id);
          setOrders(os=>[mapPedido({...p,pedido_items:[]}), ...os]);
          toast(`🔔 Nuevo pedido · Mesa ${p.mesa_numero}`);
          playSound('nuevo');
          pushNotify("🔔 Nuevo pedido", `Mesa ${p.mesa_numero} · $${p.total?.toLocaleString('es-AR')||''}`);
        })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"pedidos",filter:`restaurante_id=eq.${local.restauranteId}`},
        payload=>{
          const p=payload.new;
          setOrders(os=>os.map(o=>o.id===p.id?{...o,status:p.status}:o));
          if(p.status==="preparando") playSound('cocina');
          if(p.status==="listo")      playSound('listo');
        })
      .subscribe();

    // ── Polling de respaldo cada 5 seg (por si Realtime no está habilitado en Supabase)
    const poll = setInterval(async () => {
      const mapped = await loadPedidos();
      setOrders(prev => {
        const prevStatuses = Object.fromEntries(prev.map(o=>[o.id,o.status]));
        // Detectar pedidos nuevos
        mapped.forEach(p => {
          if(!knownIds.has(p.id)) {
            knownIds.add(p.id);
            toast(`🔔 Nuevo pedido · Mesa ${p.table}`);
            playSound('nuevo');
            pushNotify("🔔 Nuevo pedido", `Mesa ${p.table} · $${p.total?.toLocaleString('es-AR')||''}`);
          } else if(prevStatuses[p.id] && prevStatuses[p.id]!==p.status) {
            // Detectar cambio de estado
            if(p.status==="preparando") playSound('cocina');
            if(p.status==="listo") {
              playSound('listo');
              pushNotify("✅ Pedido listo", `Mesa ${p.table} — pedido para entregar`);
            }
          }
        });
        // Actualizar estados sin perder datos locales
        return mapped.map(newP => {
          const old = prev.find(o=>o.id===newP.id);
          return old ? {...old, status:newP.status} : newP;
        });
      });
    }, 5000);

    return ()=>{
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  },[local.restauranteId]);

  const advance = async id=>{
    const o = orders.find(o=>o.id===id);
    if(!o) return;
    const next = STATUS_CFG[o.status]?.next;
    if(!next) return;
    setOrders(os=>os.map(x=>x.id===id?{...x,status:next}:x));
    if(supabase && local.restauranteId){
      await supabase.from("pedidos").update({status:next}).eq("id",id);
    }
    toast("Estado actualizado ✓");
    // WhatsApp al restaurante cuando el pedido está listo para entregar
    if(next==="listo" && local.whatsapp) {
      const mesa = o.table || "Mostrador";
      const items = (o.items||[]).map(i=>`• ${i.qty}x ${i.name}`).join("\n");
      const msg = `✅ *Pedido listo para entregar*\n📍 Mesa ${mesa}\n${items}\n💰 Total: $${fmt(o.total)}`;
      window.open(`https://wa.me/${local.whatsapp}?text=${encodeURIComponent(msg)}`,"_blank");
    }
  };

  const newCount  = orders.filter(o=>o.status==="nuevo").length;
  const revenue   = orders.filter(o=>o.status==="entregado").reduce((s,o)=>s+o.total+(o.tip||0),0);
  const tipsTotal = orders.filter(o=>o.status==="entregado").reduce((s,o)=>s+(o.tip||0),0);
  const active    = orders.filter(o=>o.status!=="entregado");

  /* ── Caja helpers */
  const makeVentas=()=>{
    const ent=orders.filter(o=>o.status==="entregado");
    return {
      efectivo:      ent.filter(o=>o.pay==="cash" ).reduce((s,o)=>s+o.total+(o.tip||0),0),
      mercadopago:   ent.filter(o=>o.pay==="mp"   ).reduce((s,o)=>s+o.total+(o.tip||0),0),
      debito:        ent.filter(o=>o.pay==="card" ).reduce((s,o)=>s+o.total+(o.tip||0),0),
      credito:       0,
      transferencia: ent.filter(o=>o.pay==="trans").reduce((s,o)=>s+o.total+(o.tip||0),0),
    };
  };

  const abrirTurno = async total => {
    const ventas0={efectivo:0,mercadopago:0,debito:0,credito:0,transferencia:0};
    const t={id:histTurnos.length+1,cajero:cajero.trim()||"Cajero",
      horaApertura:nowStr(),fecha:todStr(),fondoApertura:total,
      arqueoAp:{...arqVals},ventas:ventas0,
      arqueoFinal:null,horaCierre:null,estado:"abierto"};
    setTurno(t); setArqV(emptyArq()); setArqAp(false);
    setCajaScr("turno"); toast("Turno abierto ✓");
    if(supabase && local.restauranteId){
      const saved = await createTurno({
        restaurante_id: local.restauranteId,
        cajero: cajero.trim()||"Cajero",
        hora_apertura: new Date().toISOString(),
        fondo_apertura: total,
        arqueo_apertura: arqVals,
        estado: "abierto",
      });
      if(saved?.id) setTurno(prev=>({...prev, supabaseId: saved.id}));
    }
  };

  const confirmarZ = () => {
    const t={...turno,arqueoFinal:{...arqVals},ventas:makeVentas()};
    setTurno(t); setArqCi(false); setTkt({tipo:"Z",turno:t});
  };

  const ejecutarZ = async () => {
    const c={...turno,estado:"cerrado",horaCierre:nowStr()};
    setHist(h=>[c,...h]); setTurno(null); setTkt(null);
    setCajaScr("inicio"); toast("Cierre Z ejecutado ✓");
    if(supabase && turno?.supabaseId){
      await closeTurno(turno.supabaseId, arqVals, new Date().toISOString());
    }
  };

  /* ══════════════════════════════════════════
     MODALES DEL ADMIN (arqueo, ticket, QR)
  ══════════════════════════════════════════ */

  const ArqModal = ({title, onConfirm, onCancel, btnLabel, btnColor}) => {
    const total = BILLETES.reduce((s,b)=>s+(b.val*Number(arqVals[b.val]||0)),0);
    return (
      <AdminModal onClose={onCancel}>
        <div style={{padding:"14px 18px 0"}}>
          <ALbl>Conteo físico</ALbl>
          <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:19,fontWeight:700,
            color:"var(--abri)",marginBottom:14}}>{title}</h3>
          <div style={{background:"var(--ab)",border:"1px solid var(--abr)",
            borderRadius:12,overflow:"hidden",marginBottom:14}}>
            {BILLETES.map((b,i)=>{
              const q=Number(arqVals[b.val]||0);
              return (
                <div key={b.val} style={{display:"grid",gridTemplateColumns:"1fr 56px 80px",
                  alignItems:"center",padding:"10px 14px",
                  borderBottom:i<BILLETES.length-1?"1px solid var(--abr)":"none",
                  background:q>0?"rgba(0,255,136,.03)":"transparent"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
                    color:q>0?"var(--abri)":"var(--ad)"}}>{b.label}</span>
                  <input type="number" min="0" value={arqVals[b.val]}
                    onChange={e=>setArqV(v=>({...v,[b.val]:e.target.value}))}
                    placeholder="0"
                    style={{textAlign:"center",
                      background:q>0?"rgba(0,255,136,.08)":"var(--ac)",
                      border:`1px solid ${q>0?"rgba(0,255,136,.3)":"var(--abr)"}`,
                      borderRadius:8,padding:"7px 4px",
                      color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",
                      fontSize:13,fontWeight:600}}/>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                    color:q>0?"var(--ag)":"var(--am)",textAlign:"right"}}>
                    {q>0?`$${fmt(q*b.val)}`:"—"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
            borderRadius:14,padding:"12px 16px",marginBottom:16,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,
              fontWeight:600,color:"var(--at)"}}>Total contado</span>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,
              fontWeight:700,color:"var(--ag)"}}>${fmt(total)}</span>
          </div>
          <div style={{display:"flex",gap:10,paddingBottom:28}}>
            <button onClick={onCancel} className="pr" style={{flex:1,
              background:"var(--ac)",color:"var(--at)",border:"1px solid var(--abr)",
              borderRadius:14,padding:13,fontFamily:"'Outfit',sans-serif",
              fontSize:11,cursor:"pointer"}}>Cancelar</button>
            <button onClick={()=>onConfirm(total)} className="pr" style={{flex:2,
              background:btnColor,color:"#000",border:"none",borderRadius:14,
              padding:13,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
              fontWeight:700,cursor:"pointer",letterSpacing:.5}}>{btnLabel}</button>
          </div>
        </div>
      </AdminModal>
    );
  };

  const TktModal = ({tipo, t, onClose, onZ}) => {
    const vt=t.ventas;
    const tv=Object.values(vt).reduce((s,v)=>s+v,0);
    const ta=t.arqueoFinal
      ? Object.entries(t.arqueoFinal).reduce((s,[val,q])=>s+(Number(val)*Number(q||0)),0)
      : null;
    const diff = ta!==null ? ta-(tv+t.fondoApertura) : null;
    const isZ = tipo==="Z";
    return (
      <AdminModal onClose={onClose}>
        <div style={{margin:"12px 14px",background:"var(--ab)",
          border:"1px solid var(--abr)",borderRadius:12,
          padding:"18px 16px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,
            backgroundImage:"repeating-linear-gradient(90deg,transparent,transparent 6px,var(--abr) 6px,var(--abr) 12px)"}}/>
          <div style={{textAlign:"center",marginBottom:12,paddingTop:6}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,
              fontWeight:700,color:"var(--abri)"}}>{local.nombre.toUpperCase()}</p>
            <div style={{display:"inline-block",
              background:isZ?"rgba(255,59,92,.1)":"rgba(0,255,136,.1)",
              border:`1px solid ${isZ?"var(--ar)":"var(--ag)"}`,
              borderRadius:6,padding:"3px 12px",marginTop:8}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
                fontWeight:700,color:isZ?"var(--ar)":"var(--ag)",
                letterSpacing:2}}>INFORME {tipo}</p>
            </div>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
              color:"var(--ad)",marginTop:6}}>
              {todStr()} · {nowStr()} · Cajero: {t.cajero}
            </p>
          </div>
          <div style={{height:1,
            background:"repeating-linear-gradient(90deg,var(--abr),var(--abr) 4px,transparent 4px,transparent 8px)",
            marginBottom:10}}/>
          {[["Efectivo",vt.efectivo],["Mercado Pago",vt.mercadopago],
            ["Débito",vt.debito],["Crédito",vt.credito],
            ["Transferencia",vt.transferencia]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",
              padding:"5px 0",borderBottom:"1px dashed var(--abr)"}}>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                color:"var(--ad)"}}>{k}</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                color:"var(--abri)",fontWeight:600}}>${fmt(v)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
              fontWeight:700,color:"var(--abri)"}}>TOTAL VENTAS</span>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,
              fontWeight:700,color:"var(--ag)"}}>${fmt(tv)}</span>
          </div>
          {diff!==null && (
            <div style={{display:"flex",justifyContent:"space-between",
              padding:"10px 8px",borderRadius:8,
              background:diff>=0?"rgba(0,255,136,.06)":"rgba(255,59,92,.06)",
              border:`1px solid ${diff>=0?"var(--ag)":"var(--ar)"}`}}>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
                fontWeight:700,color:"var(--abri)"}}>DIFERENCIA</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,
                fontWeight:700,
                color:diff===0?"var(--ag)":diff>0?"var(--aam)":"var(--ar)"}}>
                {diff>=0?"+":""}{fmt(diff)}
              </span>
            </div>
          )}
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,
            backgroundImage:"repeating-linear-gradient(90deg,transparent,transparent 6px,var(--abr) 6px,var(--abr) 12px)"}}/>
        </div>
        <div style={{padding:"0 14px 28px",display:"flex",flexDirection:"column",gap:10}}>
          {isZ && turno?.estado==="abierto" && (
            <button onClick={onZ} className="pr" style={{width:"100%",
              background:"var(--ar)",color:"#fff",border:"none",borderRadius:14,
              padding:14,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
              fontWeight:700,cursor:"pointer",letterSpacing:1}}>
              ✕ EJECUTAR CIERRE Z
            </button>
          )}
          <button onClick={onClose} className="pr" style={{width:"100%",
            background:"var(--ac)",color:"var(--at)",border:"1px solid var(--abr)",
            borderRadius:14,padding:12,fontFamily:"'IBM Plex Mono',monospace",
            fontSize:11,cursor:"pointer"}}>Cerrar</button>
        </div>
      </AdminModal>
    );
  };

  const QRViewModal = ({tableNum, onClose}) => {
    const cleanBase = (local.baseUrl||'').replace(/^https?:\/\//,'');
    const data = `https://${cleanBase}/mesa/${tableNum}`;
    return (
      <AdminModal onClose={onClose}>
        <div style={{padding:"16px 20px 28px",textAlign:"center"}}>
          <ALbl>QR de mesa</ALbl>
          <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:700,
            color:"var(--abri)",marginBottom:20}}>Mesa {tableNum}</h3>
          <div style={{display:"inline-block",background:"#F5ECD7",borderRadius:20,
            padding:"20px 24px",marginBottom:16,border:"2px solid #C9A84C",
            boxShadow:"0 8px 40px rgba(0,0,0,.4)"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
              color:"#C9A84C",letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>
              {local.nombre}
            </p>
            <div style={{width:32,height:2,background:"#C9A84C",margin:"0 auto 12px",borderRadius:1}}/>
            <div style={{background:"#fff",borderRadius:12,padding:8,
              border:"3px solid #C9A84C",display:"inline-block"}}>
              <img src={qrBuild(data)} width={160} height={160}
                alt={`QR Mesa ${tableNum}`} style={{display:"block",borderRadius:6}}/>
            </div>
            <div style={{background:"#C9A84C",borderRadius:30,padding:"6px 24px",
              display:"inline-block",marginTop:12}}>
              <p style={{fontFamily:"'Playfair Display',serif",fontSize:18,
                fontWeight:700,color:"#1A1408"}}>Mesa {tableNum}</p>
            </div>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,
              color:"#7A6A50",marginTop:8,lineHeight:1.4}}>
              Escaneá para ver la carta<br/>y hacer tu pedido
            </p>
            <p style={{fontFamily:"monospace",fontSize:8,color:"#C8B898",marginTop:6}}>
              {local.baseUrl}/mesa/{tableNum}
            </p>
          </div>
          <button onClick={()=>window.print()} className="pr" style={{width:"100%",
            background:"var(--ag)",color:"#000",border:"none",borderRadius:14,
            padding:14,fontFamily:"'IBM Plex Mono',monospace",fontSize:13,
            fontWeight:700,cursor:"pointer",letterSpacing:1,marginBottom:10}}>
            🖨️ IMPRIMIR ESTE QR
          </button>
          <button onClick={onClose} className="pr" style={{width:"100%",
            background:"var(--ac)",color:"var(--at)",border:"1px solid var(--abr)",
            borderRadius:14,padding:12,fontFamily:"'IBM Plex Mono',monospace",
            fontSize:11,cursor:"pointer"}}>Cerrar</button>
        </div>
      </AdminModal>
    );
  };

  /* ══════════════════════════════════════════
     TABS DE NAVEGACIÓN
  ══════════════════════════════════════════ */
  const TABS = [
    {id:"home",    icon:"◈", label:"Inicio"},
    {id:"orders",  icon:"⊞", label:"Pedidos",  badge:newCount},
    {id:"carta",   icon:"≡", label:"Carta"},
    {id:"qr",      icon:"⬛", label:"QRs"},
    {id:"caja",    icon:"◉", label:"Caja"},
    {id:"gestion", icon:"✏", label:"Gestión"},
    {id:"config",  icon:"⚙", label:"Config"},
  ];

  /* ══════════════════════════════════════════
     HOME TAB
  ══════════════════════════════════════════ */
  const HomeTab = () => {
    const hour   = new Date().getHours();
    const greet  = hour < 13 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
    const payInfo = makeVentas();
    const cerrados = orders.filter(o=>o.status==="entregado").length;
    const mesasActivas = [...new Set(active.map(o=>o.table))].length;
    return (
    <div style={{padding:"18px 16px 0"}}>

      {/* ── Debug temporal: estado de conexión */}
      {!local.restauranteId && (
        <div style={{background:"#1a0808",border:"1px solid #7f1d1d",color:"#f87171",
          padding:"8px 12px",borderRadius:8,marginBottom:12,fontSize:11,fontFamily:"monospace"}}>
          ⚠️ Sin restauranteId — los pedidos en tiempo real no van a funcionar.<br/>
          Cerrá sesión y volvé a entrar con tu mail.
        </div>
      )}
      {local.restauranteId && (
        <div style={{background:"rgba(0,255,136,.06)",border:"1px solid rgba(0,255,136,.2)",color:"#00FF88",
          padding:"6px 12px",borderRadius:8,marginBottom:12,fontSize:10,fontFamily:"monospace"}}>
          ✓ Conectado · {local.restauranteId.slice(0,8)}...
        </div>
      )}

      {/* ── Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",
            letterSpacing:2,marginBottom:4}}>{greet.toUpperCase()}</p>
          <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:21,fontWeight:800,
            color:"var(--abri)",lineHeight:1.05,margin:0}}>
            {local.nombre||"Tu restaurante"}
          </h1>
        </div>
        <button onClick={()=>setShowVentaRapida(true)} className="pr" style={{
          background:"var(--ag)",color:"#060810",border:"none",borderRadius:12,
          padding:"9px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
          fontWeight:800,cursor:"pointer",letterSpacing:.5,flexShrink:0,
          boxShadow:"0 0 18px rgba(0,255,136,.28)",display:"flex",alignItems:"center",gap:6}}>
          ⚡ NUEVA VENTA
        </button>
      </div>

      {/* ── Revenue card */}
      <div style={{background:"linear-gradient(135deg,#040D0A 0%,#081812 100%)",
        border:"1px solid rgba(0,255,136,.18)",borderRadius:18,
        padding:"18px 20px",marginBottom:10,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-28,right:-28,width:110,height:110,
          borderRadius:"50%",background:"rgba(0,255,136,.05)",pointerEvents:"none"}}/>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
          color:"rgba(0,255,136,.55)",letterSpacing:2,marginBottom:6}}>INGRESOS HOY</p>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:40,fontWeight:700,
          color:"var(--ag)",letterSpacing:-2,lineHeight:1,marginBottom:8}}>
          ${fmt(revenue)}
        </p>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)"}}>
            {cerrados} {cerrados===1?"pedido cerrado":"pedidos cerrados"}
          </span>
          {tipsTotal>0 && (
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
              color:"rgba(0,255,136,.5)"}}>
              +${fmt(tipsTotal)} propinas 💝
            </span>
          )}
        </div>
      </div>

      {/* ── Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
        {[
          {label:"NUEVOS",   val:newCount,      color:"#FFB020", bg:"rgba(255,176,32,.08)", border:"rgba(255,176,32,.22)"},
          {label:"EN MESA",  val:mesasActivas,  color:"#3D8EFF", bg:"rgba(61,142,255,.08)", border:"rgba(61,142,255,.2)"},
          {label:"ACTIVOS",  val:active.length, color:"var(--ag)", bg:"rgba(0,255,136,.06)", border:"rgba(0,255,136,.18)"},
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,border:`1px solid ${s.border}`,
            borderRadius:14,padding:"14px 8px",textAlign:"center"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:30,fontWeight:700,
              color:s.color,lineHeight:1,marginBottom:5}}>{s.val}</p>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
              color:"var(--am)",letterSpacing:1.5}}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Payment breakdown (only if there are sales) */}
      {revenue>0 && (
        <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
          borderRadius:16,overflow:"hidden",marginBottom:10}}>
          <div style={{padding:"10px 14px 7px",borderBottom:"1px solid var(--abr)"}}>
            <ALbl>Métodos de pago hoy</ALbl>
          </div>
          {[
            {icon:"💵",label:"Efectivo",     val:payInfo.efectivo},
            {icon:"📲",label:"Mercado Pago", val:payInfo.mercadopago},
            {icon:"💳",label:"Débito",       val:payInfo.debito},
            {icon:"💳",label:"Crédito",      val:payInfo.credito},
            {icon:"🏦",label:"Transferencia",val:payInfo.transferencia},
          ].filter(p=>p.val>0).map((p,i,arr)=>(
            <div key={p.label} style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"9px 14px",
              borderBottom:i<arr.length-1?"1px solid var(--abr)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <span style={{fontSize:13}}>{p.icon}</span>
                <span style={{fontFamily:"'Outfit',sans-serif",fontSize:12,
                  color:"var(--at)"}}>{p.label}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:56,height:3,borderRadius:2,
                  background:"var(--abr)",overflow:"hidden"}}>
                  <div style={{width:`${Math.round(p.val/revenue*100)}%`,
                    height:"100%",background:"var(--ag)",borderRadius:2}}/>
                </div>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
                  fontWeight:600,color:"var(--abri)",minWidth:58,textAlign:"right"}}>
                  ${fmt(p.val)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent orders */}
      <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
        borderRadius:16,overflow:"hidden",marginBottom:8}}>
        <div style={{padding:"10px 14px 7px",borderBottom:"1px solid var(--abr)",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <ALbl>Últimos pedidos</ALbl>
          {orders.length>5 && (
            <button onClick={()=>setTab("orders")} style={{background:"none",border:"none",
              fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--abl)",
              cursor:"pointer",letterSpacing:.5}}>VER TODOS →</button>
          )}
        </div>
        {orders.length===0 ? (
          <div style={{padding:"22px 16px",textAlign:"center"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
              color:"var(--am)"}}>Sin pedidos aún hoy</p>
          </div>
        ) : orders.slice(0,5).map((o,i)=>{
          const s=STATUS_CFG[o.status];
          return (
            <div key={o.id} className="ar" style={{display:"flex",
              justifyContent:"space-between",alignItems:"center",
              padding:"10px 14px",
              borderBottom:i<Math.min(orders.length,5)-1?"1px solid var(--abr)":"none"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{width:34,height:34,borderRadius:9,background:s.dim,
                  border:`1px solid ${s.color}44`,display:"flex",
                  alignItems:"center",justifyContent:"center",
                  fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                  fontSize:14,color:s.color}}>{o.table}</div>
                <div>
                  <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,
                    fontSize:13,color:"var(--abri)",lineHeight:1.1}}>
                    Mesa {o.table}
                    <span style={{color:"var(--am)",fontWeight:400,fontSize:10}}> ·{o.id}</span>
                  </p>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                    color:"var(--ad)",marginTop:2}}>{o.time} · {o.pay}</p>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                  fontSize:13,color:"var(--ag)"}}>${fmt(o.total)}</p>
                {o.tip>0 && (
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                    color:"rgba(74,154,90,.7)"}}>+${fmt(o.tip)} 💝</p>
                )}
                <Chip status={o.status}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    );
  };

  /* ══════════════════════════════════════════
     VENTA RÁPIDA MODAL
  ══════════════════════════════════════════ */
  const VentaRapidaModal = () => {
    const catIds = [...new Set(prods.filter(p=>p.active).map(p=>p.cat))];
    const [vrActiveCat, setVrActiveCat] = useState(catIds[0]||"");
    const visProd = prods.filter(p=>p.active && p.cat===vrActiveCat);
    const VR_PAYS = [
      {id:"cash",  label:"Efectivo",      icon:"💵"},
      {id:"card",  label:"Tarjeta",       icon:"💳"},
      {id:"trans", label:"Transferencia", icon:"🏦"},
      {id:"mp",    label:"Mercado Pago",  icon:"📲"},
    ];
    return (
      <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.85)",
        display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
        <div style={{background:"var(--as)",border:"1px solid var(--abr)",
          borderRadius:"22px 22px 0 0",width:"100%",maxWidth:700,
          maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"18px 18px 12px",borderBottom:"1px solid var(--abr)",flexShrink:0}}>
            <div>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                color:"var(--am)",letterSpacing:1}}>CAJA</p>
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,
                color:"var(--abri)"}}>Venta Rápida</h2>
            </div>
            <button onClick={()=>{setShowVentaRapida(false);setVrCart({});setVrPay(null);}}
              style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:8,
                color:"var(--ad)",fontSize:18,width:36,height:36,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          {/* Body scroll */}
          <div style={{overflowY:"auto",flex:1,padding:"14px 16px"}}>
            {/* Mesa / mostrador selector */}
            <div style={{marginBottom:14}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                color:"var(--am)",letterSpacing:1,marginBottom:6}}>TIPO DE VENTA</p>
              <div style={{display:"flex",gap:8}}>
                {["mostrador","mesa"].map(t=>(
                  <button key={t} onClick={()=>setVrMesa(t)} style={{
                    flex:1,padding:"9px 0",borderRadius:10,cursor:"pointer",
                    fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,
                    letterSpacing:1,textTransform:"uppercase",
                    background:vrMesa===t?"var(--abl)":"var(--ac)",
                    color:vrMesa===t?"#fff":"var(--ad)",
                    border:`1px solid ${vrMesa===t?"var(--abl)":"var(--abr)"}`}}>{t}</button>
                ))}
              </div>
              {vrMesa==="mesa" && (
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                    color:"var(--ad)",letterSpacing:1}}>MESA Nº</p>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <button onClick={()=>setVrMesaNum(n=>Math.max(1,n-1))}
                      style={{width:32,height:32,borderRadius:8,border:"1px solid var(--abr)",
                        background:"var(--ac)",color:"var(--abri)",fontSize:16,cursor:"pointer"}}>−</button>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,
                      fontWeight:700,color:"var(--abri)",minWidth:28,textAlign:"center"}}>{vrMesaNum}</span>
                    <button onClick={()=>setVrMesaNum(n=>n+1)}
                      style={{width:32,height:32,borderRadius:8,border:"1px solid var(--abr)",
                        background:"var(--ac)",color:"var(--abri)",fontSize:16,cursor:"pointer"}}>+</button>
                  </div>
                </div>
              )}
            </div>
            {/* Categorías */}
            <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,scrollbarWidth:"none"}}>
              {catIds.map(cid=>{
                const cat = cats.find(c=>c.id===cid);
                return (
                  <button key={cid} onClick={()=>setVrActiveCat(cid)} style={{
                    flexShrink:0,padding:"7px 12px",borderRadius:20,cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
                    background:vrActiveCat===cid?"var(--abl)":"var(--ac)",
                    color:vrActiveCat===cid?"#fff":"var(--ad)",
                    border:`1px solid ${vrActiveCat===cid?"var(--abl)":"var(--abr)"}`}}>
                    {cat?.icon||""} {cat?.label||cid}
                  </button>
                );
              })}
            </div>
            {/* Productos */}
            <div style={{marginBottom:16}}>
              {visProd.map(p=>{
                const qty = vrCart[p.id]?.qty||0;
                return (
                  <div key={p.id} style={{display:"flex",alignItems:"center",
                    justifyContent:"space-between",padding:"11px 14px",
                    background:"var(--ac)",border:"1px solid var(--abr)",
                    borderRadius:12,marginBottom:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,
                        color:"var(--abri)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                        color:"var(--ag)",fontWeight:700}}>${fmt(p.price)}</p>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {qty>0 && <>
                        <button onClick={()=>vrSub(p)} style={{width:30,height:30,borderRadius:8,
                          border:"1px solid var(--abr)",background:"var(--as)",
                          color:"var(--abri)",fontSize:16,cursor:"pointer",
                          display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,
                          fontWeight:700,color:"var(--abri)",minWidth:20,textAlign:"center"}}>{qty}</span>
                      </>}
                      <button onClick={()=>vrAdd(p)} style={{width:30,height:30,borderRadius:8,
                        border:`1px solid ${qty>0?"var(--abl)":"var(--abr)"}`,
                        background:qty>0?"var(--abl)":"var(--ac)",
                        color:qty>0?"#fff":"var(--abri)",fontSize:16,cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Método de pago — siempre visible, vertical */}
            <div style={{marginTop:8,marginBottom:4}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                color:"var(--am)",letterSpacing:1,marginBottom:8}}>MÉTODO DE PAGO</p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {VR_PAYS.map(p=>(
                  <button key={p.id} onClick={()=>setVrPay(p.id)} style={{
                    width:"100%",padding:"12px 16px",borderRadius:12,cursor:"pointer",
                    display:"flex",alignItems:"center",gap:12,textAlign:"left",
                    fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,
                    background:vrPay===p.id?"var(--abl)":"var(--ac)",
                    color:vrPay===p.id?"#fff":"var(--abri)",
                    border:`1px solid ${vrPay===p.id?"var(--abl)":"var(--abr)"}`,
                    transition:"all .15s"}}>
                    <span style={{fontSize:20}}>{p.icon}</span>
                    {p.label}
                    {vrPay===p.id && <span style={{marginLeft:"auto",fontSize:12}}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Footer sticky */}
          {vrTotal>0 && (
            <div style={{padding:"14px 16px",borderTop:"1px solid var(--abr)",
              background:"var(--as)",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:12}}>
                <div>
                  {Object.values(vrCart).filter(i=>i.qty>0).map(i=>(
                    <p key={i.id} style={{fontFamily:"'IBM Plex Mono',monospace",
                      fontSize:10,color:"var(--at)"}}>
                      <span style={{color:"var(--am)"}}>{i.qty}×</span> {i.name}
                    </p>
                  ))}
                </div>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,
                  fontWeight:700,color:"var(--ag)"}}>${fmt(vrTotal)}</p>
              </div>
              {vrPay ? (
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>vrConfirm(true)} disabled={vrLoading} style={{
                    flex:1,padding:"13px 10px",
                    background:"var(--ac)",color:"var(--abri)",
                    border:"1px solid var(--abr)",borderRadius:12,
                    fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,
                    cursor:"pointer",display:"flex",alignItems:"center",
                    justifyContent:"center",gap:6,opacity:vrLoading?.7:1}}>
                    🖨️ Cobrar e imprimir
                  </button>
                  <button onClick={()=>vrConfirm(false)} disabled={vrLoading} style={{
                    flex:1,padding:"13px 10px",
                    background:"linear-gradient(135deg,#00FF88,#00C870)",
                    color:"#060810",border:"none",borderRadius:12,
                    fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:800,
                    cursor:"pointer",opacity:vrLoading?.7:1}}>
                    {vrLoading?"Guardando...":"✓ Confirmar"}
                  </button>
                </div>
              ) : (
                <div style={{padding:"13px 0",textAlign:"center",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--am)"}}>
                  Elegí un método de pago para continuar
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════
     ORDERS TAB — Kanban POS
  ══════════════════════════════════════════ */
  const OrdersTab = () => {
    const f    = ordersFilter;
    const setF = setOrdersFilter;

    /* ── Imprimir comanda ── */
    const printComanda = (o) => {
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comanda</title><style>
        @page{size:80mm auto;margin:4mm}
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;width:72mm}
        .c{text-align:center}.b{font-weight:bold}
        .line{border-top:1px dashed #000;margin:5px 0}
        .row{display:flex;justify-content:space-between;padding:3px 0}
        .name{font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:2px}
        .tag{font-size:10px;letter-spacing:3px;margin-top:2px}
        .mesa{font-size:28px;font-weight:bold;margin:6px 0}
        .item{display:flex;padding:3px 0;border-bottom:1px dotted #ccc}
        .qty{font-weight:bold;min-width:24px}
        .total{font-size:18px;font-weight:bold}
      </style></head><body>
        <div class="c">
          <div class="name">${local.nombre}</div>
          <div class="tag">COMANDA DE COCINA</div>
          <div class="mesa">MESA ${o.table}</div>
        </div>
        <div class="line"></div>
        <div class="row"><span>#${String(o.id).slice(-4)}</span><span>${o.time}</span></div>
        <div class="row"><span>Pago:</span><span class="b">${o.pay||"—"}</span></div>
        <div class="line"></div>
        ${o.items.map(it=>`<div class="item"><span class="qty">${it.qty}×</span><span style="flex:1;padding-left:8px">${it.name}</span></div>`).join('')}
        <div class="line"></div>
        <div class="row"><span class="b">TOTAL</span><span class="total">$${fmt(o.total)}</span></div>
        ${o.tip>0?`<div class="row"><span>Propina</span><span>+ $${fmt(o.tip)}</span></div>`:''}
        <div class="line"></div>
        <div class="c" style="font-size:9px;margin-top:6px;color:#888">MenuQR · ${new Date().toLocaleString('es-AR')}</div>
        <script>window.onload=function(){window.print();setTimeout(function(){window.close()},1200)}</script>
      </body></html>`;
      const w = window.open('','_blank','width=380,height=550,toolbar=0,menubar=0,scrollbars=0');
      if(w){w.document.write(html);w.document.close();}
    };

    /* ── Splits ── */
    const nuevos   = orders.filter(o=>o.status==="nuevo");
    const enCocina = orders.filter(o=>o.status==="preparando");
    const listos   = orders.filter(o=>o.status==="listo");
    const cerrados = orders.filter(o=>o.status==="entregado");

    /* ── Card de pedido ── */
    const OCard = ({o}) => {
      const s = STATUS_CFG[o.status];
      return (
        <div className="ar" style={{background:"var(--as)",
          border:`1px solid ${s.color}28`,
          borderTop:`3px solid ${s.color}`,
          borderRadius:12,marginBottom:8,overflow:"hidden"}}>
          {/* Cabecera */}
          <div style={{padding:"10px 12px 6px",display:"flex",
            justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                fontSize:20,color:s.color,lineHeight:1}}>M{o.table}</span>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                color:"var(--am)",marginTop:2}}>
                #{String(o.id).slice(-4)} · {o.time}
              </p>
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                fontSize:13,color:"var(--ag)"}}>${fmt(o.total)}</span>
              <button onClick={()=>printComanda(o)} title="Imprimir comanda" style={{
                background:"none",border:`1px solid var(--abr)`,borderRadius:6,
                padding:"4px 7px",color:"var(--ad)",fontSize:13,cursor:"pointer",
                lineHeight:1}}>🖨️</button>
            </div>
          </div>
          {/* Items */}
          <div style={{padding:"6px 12px 8px",borderTop:"1px solid var(--abr)"}}>
            {o.items.map((it,i)=>(
              <p key={i} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                color:"var(--at)",lineHeight:1.8}}>
                <span style={{color:s.color,fontWeight:700}}>{it.qty}×</span> {it.name}
              </p>
            ))}
            {o.pay && (
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                color:"var(--am)",marginTop:4}}>{o.pay}</p>
            )}
          </div>
          {/* Acción */}
          {s.next && (
            <button onClick={()=>advance(o.id)} className="pr" style={{
              width:"100%",background:`${s.color}14`,border:"none",
              borderTop:`1px solid ${s.color}30`,padding:"9px",
              fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,
              color:s.color,cursor:"pointer",letterSpacing:1.5}}>{s.action}</button>
          )}
        </div>
      );
    };

    /* ── Columna kanban ── */
    const KCol = ({title, color, colOrders}) => (
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10,
          padding:"8px 11px",background:`${color}10`,
          border:`1px solid ${color}28`,borderRadius:10}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:color,
            flexShrink:0,boxShadow:`0 0 7px ${color}`}}/>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
            fontWeight:700,color,letterSpacing:2,flex:1}}>{title}</span>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
            fontWeight:700,color,background:`${color}22`,
            borderRadius:12,padding:"1px 8px",minWidth:22,textAlign:"center"}}>
            {colOrders.length}
          </span>
        </div>
        {colOrders.length===0
          ? <div style={{textAlign:"center",padding:"20px 0"}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",letterSpacing:1}}>vacío</p>
            </div>
          : colOrders.map(o=><OCard key={o.id} o={o}/>)
        }
      </div>
    );

    return (
      <div style={{padding:"18px 16px 0"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",marginBottom:14}}>
          <div>
            <ALbl>Sala en vivo</ALbl>
            <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,
              color:"var(--abri)"}}>Pedidos</h2>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setShowVentaRapida(true)} style={{
              background:"linear-gradient(135deg,#00FF88,#00C870)",
              color:"#060810",border:"none",borderRadius:10,
              padding:"7px 12px",fontFamily:"'IBM Plex Mono',monospace",
              fontSize:9,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
              ＋ VENTA
            </button>
            {["activos","cerrados"].map(fi=>(
              <button key={fi} onClick={()=>setF(fi)} style={{
                background:f===fi?"var(--abl)":"var(--ac)",
                color:f===fi?"#fff":"var(--ad)",
                border:`1px solid ${f===fi?"var(--abl)":"var(--abr)"}`,
                borderRadius:10,padding:"7px 12px",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                fontWeight:700,cursor:"pointer",letterSpacing:1,
                textTransform:"uppercase"}}>{fi}</button>
            ))}
          </div>
        </div>

        {f==="activos" ? (
          <div style={{display:"flex",gap:10}}>
            <KCol title="NUEVOS"    color="#FFB020" colOrders={nuevos}/>
            <KCol title="EN COCINA" color="#3D8EFF" colOrders={enCocina}/>
            <KCol title="LISTOS"    color="#00FF88" colOrders={listos}/>
          </div>
        ) : (
          <div>
            {cerrados.length===0 && (
              <div style={{textAlign:"center",padding:"50px 0",color:"var(--am)"}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13}}>// sin pedidos cerrados</p>
              </div>
            )}
            {cerrados.map(o=><OCard key={o.id} o={o}/>)}
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════════
     CARTA TAB (toggle rápido)
  ══════════════════════════════════════════ */
  const CartaTab = () => {
    const catNames = [...new Set(prods.map(p=>p.cat))];
    const ac    = cartaAc || catNames[0] || "";
    const setAc = setCartaAc;
    const visProds = prods.filter(p=>p.cat===ac);
    const catLabel   = cats.find(c=>c.id===ac)?.label || ac;
    return (
      <div style={{padding:"18px 16px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",marginBottom:14}}>
          <div>
            <ALbl>Vista rápida</ALbl>
            <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,
              fontWeight:800,color:"var(--abri)"}}>Carta</h2>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,
              fontWeight:700,color:"var(--ag)"}}>{prods.filter(p=>p.active).length}</p>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
              color:"var(--am)",letterSpacing:1}}>VISIBLES</p>
          </div>
        </div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)",
          marginBottom:12}}>
          Toggle rápido. Para agregar o editar productos usá la pestaña <b style={{color:"var(--abri)"}}>Gestión</b>.
        </p>
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,
          scrollbarWidth:"none"}}>
          {catNames.map(c=>{
            const cat=cats.find(x=>x.id===c);
            return (
              <button key={c} onClick={()=>setAc(c)} style={{
                background:ac===c?"var(--abl)":"var(--ac)",
                border:`1px solid ${ac===c?"var(--abl)":"var(--abr)"}`,
                color:ac===c?"#fff":"var(--ad)",borderRadius:10,
                padding:"7px 13px",cursor:"pointer",whiteSpace:"nowrap",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                fontWeight:700,letterSpacing:.5,
                textTransform:"uppercase",transition:"all .2s"}}>
                {cat?.icon||""} {cat?.label||c}
              </button>
            );
          })}
        </div>
        <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
          borderRadius:16,overflow:"hidden"}}>
          {visProds.length===0 && (
            <div style={{padding:"30px",textAlign:"center",color:"var(--am)"}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>
                Sin productos — agregá desde Gestión
              </p>
            </div>
          )}
          {visProds.map((p,i)=>(
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,
              padding:"13px 16px",
              borderBottom:i<visProds.length-1?"1px solid var(--abr)":"none",
              opacity:p.active?1:.4,transition:"opacity .3s"}}>
              <span style={{fontSize:22,flexShrink:0}}>{p.emoji}</span>
              <Dot color={p.active?(p.sin_stock?"var(--aam)":"var(--ag)"):"var(--am)"}
                pulse={p.active&&!p.sin_stock}/>
              <div style={{flex:1}}>
                <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,
                  fontSize:14,color:"var(--abri)"}}>{p.name}
                  {p.sin_stock && (
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                      color:"var(--aam)",background:"rgba(255,176,32,.1)",
                      border:"1px solid rgba(255,176,32,.3)",borderRadius:4,
                      padding:"1px 5px",marginLeft:6,verticalAlign:"middle"}}>
                      SIN STOCK
                    </span>
                  )}
                </p>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                  color:"var(--ag)",marginTop:1}}>$ {fmt(p.price)}</p>
              </div>
              {/* Sin stock toggle */}
              <button onClick={async()=>{
                const next = !p.sin_stock;
                setProds(ps=>ps.map(x=>x.id===p.id?{...x,sin_stock:next}:x));
                if(supabase) await supabase.from("productos").update({sin_stock:next}).eq("id",p.id);
                toast(next?`"${p.name}" marcado sin stock`:`"${p.name}" con stock`);
              }} style={{
                background:p.sin_stock?"rgba(255,176,32,.15)":"var(--as)",
                border:`1px solid ${p.sin_stock?"rgba(255,176,32,.4)":"var(--abr)"}`,
                borderRadius:7,padding:"4px 8px",cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:8,fontWeight:700,
                color:p.sin_stock?"var(--aam)":"var(--am)",letterSpacing:.5,
                flexShrink:0}}>
                {p.sin_stock?"✓ SIN STOCK":"STOCK"}
              </button>
              <ToggleA on={p.active} onChange={()=>{
                setProds(ps=>ps.map(x=>x.id===p.id?{...x,active:!x.active}:x));
                toast(p.active?`"${p.name}" ocultado`:`"${p.name}" visible`);
              }}/>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* QRTab movido a nivel de módulo como QRTabComp — ver arriba de AdminApp */

  /* ══════════════════════════════════════════
     CAJA TAB
  ══════════════════════════════════════════ */
  const CajaTab = () => {
    const plan = local.plan||"free";
    const canCaja = PLAN_LIMITS[plan]?.caja !== false;
    const liveVentas = makeVentas();
    const tv = Object.values(liveVentas).reduce((s,v)=>s+v,0);

    const CAJA_PAYS = [
      {id:"cash",  label:"Efectivo",     icon:"💵"},
      {id:"mp",    label:"Mercado Pago", icon:"📲"},
      {id:"card",  label:"Débito",       icon:"💳"},
      {id:"trans", label:"Transf.",      icon:"🏦"},
    ];

    /* ── Categorías con productos activos */
    const catList = cats.filter(c=>prods.some(p=>p.active && p.cat===c.id));

    if(!canCaja) return (
      <div style={{padding:"18px 16px 0"}}>
        <div style={{background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.3)",
          borderRadius:20,padding:"32px 20px",textAlign:"center"}}>
          <p style={{fontSize:40,marginBottom:12}}>🔒</p>
          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:700,
            color:"var(--abri)",marginBottom:8}}>Función exclusiva Plan Pro</p>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--ad)",
            marginBottom:20,lineHeight:1.5}}>
            La gestión de caja, arqueos y cierre Z requieren plan Pro o Empresa.
          </p>
          <div style={{background:"var(--gi)",borderRadius:12,padding:"12px 24px",display:"inline-block"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,
              color:"#fff",letterSpacing:1}}>
              PLAN ACTUAL: {PLAN_LABELS[plan]||plan.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    );

    return (
      <div style={{padding:"18px 16px 0"}}>

        {/* ── Acceso rápido a venta */}
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",marginBottom:14}}>
          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
            color:"var(--am)",letterSpacing:2}}>CAJA</p>
          <button onClick={()=>setShowVentaRapida(true)} className="pr" style={{
            background:"var(--ag)",color:"#060810",border:"none",borderRadius:10,
            padding:"8px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
            fontWeight:800,cursor:"pointer",letterSpacing:.5,
            display:"flex",alignItems:"center",gap:6,
            boxShadow:"0 0 16px rgba(0,255,136,.25)"}}>
            ⚡ NUEVA VENTA
          </button>
        </div>

        {/* ── Estado del turno */}
        <div style={{background:"var(--ac)",
          border:`1px solid ${turno?"rgba(0,255,136,.2)":"rgba(255,59,92,.2)"}`,
          borderRadius:16,padding:"14px 18px",marginBottom:12,
          display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:42,height:42,borderRadius:11,
            background:turno?"rgba(0,255,136,.1)":"rgba(255,59,92,.1)",
            border:`1px solid ${turno?"rgba(0,255,136,.3)":"rgba(255,59,92,.3)"}`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
            {turno?"🔓":"🔒"}
          </div>
          <div style={{flex:1}}>
            <p style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,
              color:"var(--abri)"}}>{turno?"Turno activo":"Caja cerrada"}</p>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--ad)"}}>
              {turno?`${turno.cajero} · desde ${turno.horaApertura}`:"Sin turno activo"}
            </p>
          </div>
          {turno && (
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setTkt({tipo:"X",turno:{...turno}})} className="pr"
                style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",
                  borderRadius:9,padding:"6px 11px",cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:800,
                  color:"var(--aam)"}}>X</button>
              <button onClick={()=>{setArqV(emptyArq());setArqCi(true);}} className="pr"
                style={{background:"rgba(255,59,92,.07)",border:"1px solid rgba(255,59,92,.3)",
                  borderRadius:9,padding:"6px 11px",cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:800,
                  color:"var(--ar)"}}>Z</button>
            </div>
          )}
        </div>

        {/* ── Abrir turno */}
        {!turno && (
          <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
            borderRadius:14,padding:16,marginBottom:12}}>
            <ALbl>Cajero responsable</ALbl>
            <input value={cajero} onChange={e=>setCajero(e.target.value)}
              placeholder="Nombre del cajero..."
              style={{width:"100%",background:"var(--ab)",border:"1px solid var(--abr)",
                borderRadius:9,padding:"11px 13px",color:"var(--abri)",
                fontFamily:"'Outfit',sans-serif",fontSize:13,marginBottom:12}}/>
            <button onClick={()=>{setArqV(emptyArq());setArqAp(true);}} className="pr"
              style={{width:"100%",background:"var(--ag)",color:"#000",border:"none",
                borderRadius:12,padding:14,fontFamily:"'IBM Plex Mono',monospace",
                fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1,
                boxShadow:"0 0 18px rgba(0,255,136,.15)"}}>
              ▶ ABRIR TURNO
            </button>
          </div>
        )}

        {/* ══ POS: REGISTRAR VENTA ══ */}
        {turno && (
          <div style={{marginBottom:12}}>

            {/* Cabecera sección */}
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:8}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                color:"var(--am)",letterSpacing:2}}>REGISTRAR VENTA</p>
              {cajaTotal>0 && (
                <button onClick={()=>{setCajaCart({});setCajaPay(null);}}
                  style={{background:"none",border:"none",
                    fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                    color:"var(--ar)",cursor:"pointer",letterSpacing:.5}}>
                  LIMPIAR ×
                </button>
              )}
            </div>

            {/* Tipo de venta */}
            <div style={{display:"flex",gap:7,marginBottom:10}}>
              {["mostrador","mesa"].map(t=>(
                <button key={t} onClick={()=>setCajaMesaTipo(t)} style={{
                  flex:1,padding:"8px 0",borderRadius:9,cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
                  letterSpacing:1,textTransform:"uppercase",
                  background:cajaMesaTipo===t?"var(--abl)":"var(--ac)",
                  color:cajaMesaTipo===t?"#fff":"var(--ad)",
                  border:`1px solid ${cajaMesaTipo===t?"var(--abl)":"var(--abr)"}`}}>{t}</button>
              ))}
              {cajaMesaTipo==="mesa" && (
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <button onClick={()=>setCajaMesaNum(n=>Math.max(1,n-1))}
                    style={{width:28,height:28,borderRadius:7,border:"1px solid var(--abr)",
                      background:"var(--ac)",color:"var(--abri)",fontSize:14,cursor:"pointer"}}>−</button>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,fontWeight:700,
                    color:"var(--abri)",minWidth:22,textAlign:"center"}}>{cajaMesaNum}</span>
                  <button onClick={()=>setCajaMesaNum(n=>n+1)}
                    style={{width:28,height:28,borderRadius:7,border:"1px solid var(--abr)",
                      background:"var(--ac)",color:"var(--abri)",fontSize:14,cursor:"pointer"}}>+</button>
                </div>
              )}
            </div>

            {/* ── Layout dos columnas: productos izq | categorías der */}
            {catList.length===0 ? (
              <div style={{padding:"20px",textAlign:"center",background:"var(--ac)",
                borderRadius:14,border:"1px solid var(--abr)"}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--am)"}}>
                  Sin productos activos. Agregá en Gestión → Carta.
                </p>
              </div>
            ) : (
              <div style={{display:"flex",gap:8,height:400}}>

                {/* IZQUIERDA — productos de la categoría activa */}
                <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
                  {(()=>{
                    const activeCat = cajaOpenCat || catList[0]?.id;
                    const catProds = prods.filter(p=>p.active && p.cat===activeCat);
                    return catProds.length===0 ? (
                      <div style={{padding:"20px",textAlign:"center"}}>
                        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)"}}>
                          Sin productos en esta categoría
                        </p>
                      </div>
                    ) : catProds.map(p=>{
                      const qty = cajaCart[p.id]?.qty||0;
                      return (
                        <div key={p.id} className="pos-item">
                          {/* Nombre y precio */}
                          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,
                            color:"var(--abri)",marginBottom:4,lineHeight:1.2}}>{p.name}</p>
                          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,
                            fontWeight:700,color:"var(--ag)",marginBottom:12}}>${fmt(p.price)}</p>
                          {/* Controles +/- */}
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            {qty>0 && <>
                              <button onClick={()=>cajaSub(p)} className="pr"
                                style={{width:42,height:42,borderRadius:10,border:"1px solid var(--abr)",
                                  background:"var(--as)",color:"var(--abri)",fontSize:22,
                                  cursor:"pointer",display:"flex",alignItems:"center",
                                  justifyContent:"center",fontWeight:700}}>−</button>
                              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,
                                fontWeight:700,color:"var(--abri)",minWidth:28,textAlign:"center"}}>
                                {qty}
                              </span>
                            </>}
                            <button onClick={()=>cajaAdd(p)} className="pr"
                              style={{width:42,height:42,borderRadius:10,
                                border:`1px solid ${qty>0?"var(--abl)":"var(--abr)"}`,
                                background:qty>0?"var(--abl)":"var(--as)",
                                color:qty>0?"#fff":"var(--abri)",fontSize:22,
                                cursor:"pointer",display:"flex",alignItems:"center",
                                justifyContent:"center",fontWeight:700}}>+</button>
                            {qty>0 && (
                              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,
                                color:"var(--am)",marginLeft:4}}>
                                = ${fmt(p.price*qty)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* DERECHA — lista de categorías */}
                <div style={{width:100,overflowY:"auto",display:"flex",
                  flexDirection:"column",gap:6,flexShrink:0}}>
                  {catList.map(cat=>{
                    const isSel = (cajaOpenCat||catList[0]?.id)===cat.id;
                    const catQty = prods.filter(p=>p.active&&p.cat===cat.id)
                      .reduce((s,p)=>s+(cajaCart[p.id]?.qty||0),0);
                    return (
                      <button key={cat.id} onClick={()=>setCajaOpenCat(cat.id)}
                        className={`pos-cat${isSel?" sel":""}`} style={{border:"none"}}>
                        <span style={{fontSize:28}}>{cat.icon||"🍽️"}</span>
                        <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,
                          color:isSel?"var(--abl)":"var(--at)",textAlign:"center",
                          lineHeight:1.2,wordBreak:"break-word"}}>
                          {cat.label}
                        </span>
                        {catQty>0 && (
                          <span style={{background:"var(--abl)",color:"#fff",borderRadius:8,
                            padding:"2px 7px",fontFamily:"'IBM Plex Mono',monospace",
                            fontSize:11,fontWeight:700}}>{catQty}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Ticket y cobro */}
            {cajaTotal>0 && (
              <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
                borderRadius:14,marginTop:10,overflow:"hidden"}}>
                {/* Items del carrito */}
                <div style={{padding:"10px 14px 8px",borderBottom:"1px solid var(--abr)"}}>
                  {Object.values(cajaCart).filter(i=>i.qty>0).map(i=>(
                    <div key={i.id} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",padding:"4px 0",
                      fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>
                      <span style={{color:"var(--at)"}}><span style={{color:"var(--am)"}}>{i.qty}×</span> {i.name}</span>
                      <span style={{color:"var(--abri)",fontWeight:700,marginLeft:8}}>${fmt(i.price*i.qty)}</span>
                    </div>
                  ))}
                </div>
                {/* Total */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"10px 14px",borderBottom:"1px solid var(--abr)"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,
                    fontWeight:700,color:"var(--am)",letterSpacing:1}}>TOTAL</span>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,
                    fontWeight:700,color:"var(--ag)"}}>${fmt(cajaTotal)}</span>
                </div>
                {/* Método de pago */}
                <div style={{padding:"10px 14px",borderBottom:"1px solid var(--abr)"}}>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                    color:"var(--am)",letterSpacing:1.5,marginBottom:8}}>MÉTODO DE PAGO</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {CAJA_PAYS.map(p=>(
                      <button key={p.id} onClick={()=>setCajaPay(p.id)} className="pr" style={{
                        padding:"10px 10px",borderRadius:10,cursor:"pointer",
                        display:"flex",alignItems:"center",gap:8,
                        fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,
                        background:cajaPay===p.id?"var(--abl)":"var(--as)",
                        color:cajaPay===p.id?"#fff":"var(--abri)",
                        border:`1px solid ${cajaPay===p.id?"var(--abl)":"var(--abr)"}`,
                        transition:"all .15s"}}>
                        <span style={{fontSize:16}}>{p.icon}</span>
                        {p.label}
                        {cajaPay===p.id && <span style={{marginLeft:"auto",fontSize:12}}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Botones cobrar */}
                <div style={{padding:"10px 14px",display:"flex",gap:8}}>
                  <button onClick={()=>cajaConfirm(true)} disabled={!cajaPay||cajaLoading}
                    className="pr"
                    style={{flex:1,padding:"13px 8px",borderRadius:11,
                      cursor:cajaPay?"pointer":"not-allowed",
                      background:"var(--as)",color:cajaPay?"var(--abri)":"var(--am)",
                      border:"1px solid var(--abr)",fontFamily:"'Outfit',sans-serif",
                      fontSize:13,fontWeight:700,display:"flex",alignItems:"center",
                      justifyContent:"center",gap:6,opacity:cajaLoading?.7:1}}>
                    🖨️ Cobrar e imprimir
                  </button>
                  <button onClick={()=>cajaConfirm(false)} disabled={!cajaPay||cajaLoading}
                    className="pr"
                    style={{flex:1,padding:"13px 8px",borderRadius:11,
                      cursor:cajaPay?"pointer":"not-allowed",
                      background:cajaPay?"linear-gradient(135deg,#00FF88,#00C870)":"var(--ac)",
                      color:cajaPay?"#060810":"var(--am)",border:"none",
                      fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:800,
                      opacity:cajaLoading?.7:1}}>
                    {cajaLoading?"Guardando...":"✓ Cobrar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Resumen ventas del turno */}
        {turno && (
          <>
            <div style={{background:"linear-gradient(135deg,#060F12,#091A14)",
              border:"1px solid rgba(0,255,136,.2)",borderRadius:16,
              padding:"16px 20px",marginBottom:10}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                color:"rgba(0,255,136,.55)",letterSpacing:2,marginBottom:4}}>TOTAL DEL TURNO</p>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:30,
                fontWeight:700,color:"var(--ag)",letterSpacing:-1,lineHeight:1}}>
                ${fmt(tv)}
              </p>
            </div>
            <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
              borderRadius:14,overflow:"hidden",marginBottom:12}}>
              {[["💵","Efectivo",liveVentas.efectivo],
                ["📲","Mercado Pago",liveVentas.mercadopago],
                ["💳","Débito",liveVentas.debito],
                ["🏦","Transferencia",liveVentas.transferencia],
              ].map(([icon,label,val],i,arr)=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"10px 14px",
                  borderBottom:i<arr.length-1?"1px solid var(--abr)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    <span style={{fontSize:13}}>{icon}</span>
                    <span style={{fontFamily:"'Outfit',sans-serif",fontSize:12,
                      color:"var(--at)"}}>{label}</span>
                  </div>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
                    fontWeight:600,color:val>0?"var(--abri)":"var(--am)"}}>${fmt(val)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Historial de turnos */}
        {histTurnos.length>0 && (
          <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
            borderRadius:14,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"9px 14px 6px",borderBottom:"1px solid var(--abr)"}}>
              <ALbl>Historial de turnos</ALbl>
            </div>
            {histTurnos.slice(0,3).map((t,i)=>{
              const htv=Object.values(t.ventas).reduce((s,v)=>s+v,0);
              const hta=t.arqueoFinal
                ? Object.entries(t.arqueoFinal).reduce((s,[v,q])=>s+(Number(v)*Number(q||0)),0)
                : null;
              const d = hta!==null ? hta-(htv+t.fondoApertura) : null;
              return (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"10px 14px",
                  borderBottom:i<histTurnos.slice(0,3).length-1?"1px solid var(--abr)":"none",
                  cursor:"pointer"}}
                  onClick={()=>setTkt({tipo:"Z",turno:t})}>
                  <div>
                    <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,
                      fontSize:13,color:"var(--abri)"}}>
                      Turno #{t.id} · {t.cajero}
                    </p>
                    <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                      color:"var(--ad)"}}>{t.horaApertura} → {t.horaCierre}</p>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                      fontSize:13,color:"var(--ag)"}}>${fmt(htv)}</p>
                    {d!==null && (
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                        color:d===0?"var(--ag)":d>0?"var(--aam)":"var(--ar)"}}>
                        {d>=0?"+":""}{fmt(d)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Exportar ventas del día a CSV */}
        {orders.filter(o=>o.status==="entregado").length > 0 && (
          <button onClick={()=>{
            const hoy = new Date().toLocaleDateString("es-AR");
            const rows = [["Hora","Mesa","Items","Total","Método","Propina"]];
            orders.filter(o=>o.status==="entregado").forEach(o=>{
              rows.push([
                o.time,
                o.table||"Mostrador",
                (o.items||[]).map(i=>`${i.qty}x ${i.name}`).join(" | "),
                o.total,
                o.pay||"",
                o.tip||0
              ]);
            });
            const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
            const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `ventas_${hoy.replace(/\//g,"-")}.csv`;
            a.click();
          }} style={{
            width:"100%",background:"var(--ac)",border:"1px solid var(--abr)",
            borderRadius:12,padding:"12px 16px",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,
            color:"var(--at)",letterSpacing:1,marginBottom:8}}>
            ⬇ EXPORTAR VENTAS HOY (CSV)
          </button>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════════
     GESTIÓN TAB — todo editable
  ══════════════════════════════════════════ */
  const GestionTab = () => {
    const subTab    = gSubTab;
    const setSubTab = setGSubTab;

    /* ── Subcomponents inline */
    const LocalSection = () => (
      <div>
        <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
          borderRadius:16,padding:18,marginBottom:12}}>
          <GLbl c="var(--gi2)">Datos del restaurante</GLbl>
          <GInput label="Nombre del local" value={local.nombre}
            onChange={v=>setLocal(l=>({...l,nombre:v}))} placeholder="La Trattoria"/>
          <GInput label="Dirección" value={local.direccion}
            onChange={v=>setLocal(l=>({...l,direccion:v}))} placeholder="Av. Corrientes 1234"/>
          <GInput label="Teléfono" value={local.telefono}
            onChange={v=>setLocal(l=>({...l,telefono:v}))} placeholder="+54 11 1234-5678"/>
          <GInput label="Email" value={local.email}
            onChange={v=>setLocal(l=>({...l,email:v}))} placeholder="hola@tu-local.com"/>
          <GInput label="URL de tu carta (para QRs)" value={local.baseUrl}
            onChange={v=>setLocal(l=>({...l,baseUrl:v}))} placeholder="latrattoria.menuqr.app"/>
          <div style={{marginBottom:0}}>
            <GLbl>Descripción breve</GLbl>
            <textarea value={local.descripcion}
              onChange={e=>setLocal(l=>({...l,descripcion:e.target.value}))}
              placeholder="Una frase que describa tu restaurante..."
              style={{width:"100%",background:"var(--gb)",border:"1px solid var(--gbr)",
                borderRadius:10,padding:"11px 14px",color:"var(--gbri)",fontSize:14,
                resize:"none",height:72}}/>
          </div>
        </div>

        <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
          borderRadius:16,padding:18,marginBottom:12}}>
          <GLbl c="var(--gi2)">Apariencia</GLbl>
          <GLbl>Color principal de la carta</GLbl>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <input type="color" value={local.color||"#C9A84C"}
              onChange={e=>setLocal(l=>({...l,color:e.target.value}))}
              style={{width:52,height:42,border:"1px solid var(--gbr)",
                borderRadius:10,cursor:"pointer",background:"none",padding:4}}/>
            <div style={{flex:1,background:"var(--gb)",border:"1px solid var(--gbr)",
              borderRadius:10,padding:"11px 14px",color:"var(--gbri)",fontSize:14,
              fontFamily:"'IBM Plex Mono',monospace"}}>{local.color||"#C9A84C"}</div>
            <div style={{width:42,height:42,borderRadius:10,
              background:local.color||"#C9A84C",border:"1px solid var(--gbr)",flexShrink:0}}/>
          </div>
          <GLbl>Cantidad de mesas</GLbl>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <input type="range" min={1} max={60} value={local.mesas}
              onChange={e=>setLocal(l=>({...l,mesas:Number(e.target.value)}))}
              style={{flex:1,accentColor:"var(--gi)"}}/>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,
              fontWeight:700,color:"var(--gi2)",minWidth:32,textAlign:"center"}}>
              {local.mesas}
            </span>
          </div>
        </div>

        <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
          borderRadius:16,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"14px 18px 10px"}}><GLbl c="var(--gi2)">Funciones</GLbl></div>
          {[
            {k:"propina",   label:"Propina en pedidos",  sub:"El cliente puede dejar propina al pagar"},
            {k:"happyHour", label:"Happy Hour",           sub:"Activa descuentos por horario"},
          ].map((f,i)=>(
            <div key={f.k} style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"14px 18px",
              borderTop:"1px solid var(--gbr)"}}>
              <div>
                <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,
                  color:"var(--gbri)",marginBottom:2}}>{f.label}</p>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,
                  color:"var(--gd)"}}>{f.sub}</p>
              </div>
              <ToggleG on={local[f.k]} onChange={()=>{
                setLocal(l=>({...l,[f.k]:!l[f.k]}));
                toast(`${f.label} ${!local[f.k]?"activado":"desactivado"}`);
              }}/>
            </div>
          ))}
          {local.happyHour && (
            <div style={{padding:"12px 18px 16px",borderTop:"1px solid var(--gbr)",
              background:"rgba(99,102,241,.04)"}}>
              <GLbl>Horario de Happy Hour</GLbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[{k:"happyDesde",label:"Desde"},{k:"happyHasta",label:"Hasta"}].map(h=>(
                  <div key={h.k}>
                    <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                      color:"var(--gd)",marginBottom:5,letterSpacing:1.5}}>
                      {h.label.toUpperCase()}
                    </p>
                    <input type="time" value={local[h.k]}
                      onChange={e=>setLocal(l=>({...l,[h.k]:e.target.value}))}
                      style={{width:"100%",background:"var(--gb)",
                        border:"1px solid var(--gbr)",borderRadius:10,
                        padding:"9px 12px",color:"var(--gbri)",fontSize:14}}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
          borderRadius:16,padding:18,marginBottom:12}}>
          <GLbl c="var(--gi2)">QR WiFi</GLbl>
          <GInput label="Nombre de la red (SSID)" value={local.wifi_nombre}
            onChange={v=>setLocal(l=>({...l,wifi_nombre:v}))} placeholder="MiRed_WiFi"/>
          <GInput label="Contraseña" value={local.wifi_pass}
            onChange={v=>setLocal(l=>({...l,wifi_pass:v}))} placeholder="contraseña123"/>
        </div>

        <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
          borderRadius:16,padding:18,marginBottom:16}}>
          <GLbl c="var(--gi2)">QR WhatsApp</GLbl>
          <GInput label="Número (con código de país, sin +)" value={local.whatsapp}
            onChange={v=>setLocal(l=>({...l,whatsapp:v}))}
            placeholder="5491112345678" prefix="+"/>
          <GLbl>Mensaje predeterminado</GLbl>
          <textarea value={local.whatsapp_msg}
            onChange={e=>setLocal(l=>({...l,whatsapp_msg:e.target.value}))}
            placeholder="Mensaje que verá el cliente al escanear el QR de WhatsApp..."
            style={{width:"100%",background:"var(--gb)",border:"1px solid var(--gbr)",
              borderRadius:10,padding:"11px 14px",color:"var(--gbri)",fontSize:14,
              resize:"none",height:72}}/>
        </div>

        <button onClick={async ()=>{
          if(local.restauranteId && supabase){
            const {error} = await supabase.from("restaurantes").update({
              nombre:    local.nombre,
              descripcion: local.descripcion,
              direccion: local.direccion,
              telefono:  local.telefono,
              email:     local.email,
              color:     local.color,
              mesas:     local.mesas,
              base_url:  (local.baseUrl||"").replace(/^https?:\/\//,""),
              config: {
                propina:     local.propina,
                happyHour:   local.happyHour,
                happyDesde:  local.happyDesde,
                happyHasta:  local.happyHasta,
                wifi_nombre: local.wifi_nombre,
                wifi_pass:   local.wifi_pass,
                whatsapp:    local.whatsapp,
                whatsapp_msg:local.whatsapp_msg,
              }
            }).eq("id", local.restauranteId);
            if(error) toast("Error al guardar: "+error.message,"err");
            else toast("✓ Cambios guardados en la nube");
          } else {
            toast("✓ Cambios guardados localmente");
          }
        }} className="pr"
          style={{width:"100%",background:"var(--gi)",color:"#fff",border:"none",
            borderRadius:12,padding:14,fontFamily:"'Outfit',sans-serif",
            fontSize:15,fontWeight:600,cursor:"pointer"}}>
          Guardar cambios
        </button>
      </div>
    );

    const CartaSection = () => {
      const activeCat = gActiveCat || cats[0]?.id || "";
      const setAC     = setGActiveCat;
      const visProds = prods.filter(p=>p.cat===activeCat);

      const planLimit = PLAN_LIMITS[local.plan||"free"];
      const openNew = () => {
        if(prods.length >= planLimit.maxProds){
          toast(`Plan ${PLAN_LABELS[local.plan||"free"]}: máximo ${planLimit.maxProds} productos. Actualizá tu plan para agregar más.`,"warn");
          return;
        }
        setGModal({type:"prod",data:{
          id:Date.now(),cat:activeCat,name:"",desc:"",price:"",
          orig:"",emoji:"🍽️",tag:"",active:true,isNew:true,
        }});
      };
      const openEdit = p => setGModal({type:"prod",data:{...p,price:String(p.price),orig:String(p.orig||"")}});
      const deleteProd = async id => {
        setProds(ps=>ps.filter(p=>p.id!==id));
        if(local.restauranteId && supabase){
          await supabase.from("productos").delete().eq("id",id);
        }
        toast("Producto eliminado","warn");
      };
      const toggleProd = async id => {
        const p=prods.find(p=>p.id===id);
        const newActive = !p.active;
        setProds(ps=>ps.map(x=>x.id===id?{...x,active:newActive}:x));
        if(local.restauranteId && supabase){
          await supabase.from("productos").update({active:newActive}).eq("id",id);
        }
        toast(p.active?`"${p.name}" ocultado`:`"${p.name}" visible`);
      };

      return (
        <div style={{background:"var(--gb)",borderRadius:16,padding:"0 0 8px"}}>
          {/* Categorías */}
          <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
            borderRadius:16,padding:16,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:10}}>
              <GLbl c="var(--gi2)">Categorías</GLbl>
              <button onClick={()=>setGModal({type:"cat"})} style={{
                background:"none",border:"none",color:"var(--gi2)",
                fontSize:13,fontWeight:600,cursor:"pointer",
                fontFamily:"'Outfit',sans-serif"}}>+ Nueva</button>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {cats.map(cat=>(
                <div key={cat.id} style={{display:"flex",alignItems:"center",gap:5,
                  background:activeCat===cat.id?"rgba(99,102,241,.2)":"rgba(255,255,255,.06)",
                  border:`1px solid ${activeCat===cat.id?"rgba(99,102,241,.6)":"rgba(255,255,255,.12)"}`,
                  borderRadius:20,padding:"6px 12px 6px 10px",
                  opacity:cat.activa?1:.4,transition:"all .2s"}}>
                  <button onClick={()=>setAC(cat.id)} style={{background:"none",border:"none",
                    color:activeCat===cat.id?"var(--gi2)":"var(--gt)",fontSize:13,
                    fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",padding:0}}>
                    {cat.icon} {cat.label}
                  </button>
                  <button onClick={async()=>{
                    const newActiva = !cat.activa;
                    setCats(cs=>cs.map(c=>c.id===cat.id?{...c,activa:newActiva}:c));
                    if(local.restauranteId && supabase){
                      await supabase.from("categorias").update({activa:newActiva}).eq("id",cat.id);
                    }
                  }} style={{background:"none",border:"none",cursor:"pointer",
                    color:cat.activa?"var(--gd)":"var(--gr)",fontSize:10,
                    padding:0,lineHeight:1}}>
                    {cat.activa?"👁":"🙈"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Productos */}
          <div style={{display:"flex",justifyContent:"space-between",
            alignItems:"center",marginBottom:10}}>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--gd)"}}>
              {visProds.length} producto{visProds.length!==1?"s":""} ·{" "}
              <span style={{color:"var(--gg)"}}>
                {visProds.filter(p=>p.active).length} visible{visProds.filter(p=>p.active).length!==1?"s":""}
              </span>
            </p>
            <button onClick={openNew} className="pr" style={{
              background:"var(--gi)",color:"#fff",border:"none",borderRadius:10,
              padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",
              fontFamily:"'Outfit',sans-serif"}}>+ Agregar</button>
          </div>

          {visProds.length===0 && (
            <div style={{textAlign:"center",padding:"40px 0"}}>
              <p style={{fontSize:32,marginBottom:8}}>🍽️</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"var(--gt)"}}>
                Sin productos. Agregá el primero.
              </p>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            {visProds.map(prod=>(
              <div key={prod.id} className="ri" style={{
                background:"var(--gc)",
                border:`1px solid ${prod.active?"var(--gbr)":"rgba(239,68,68,.2)"}`,
                borderRadius:14,padding:"14px 16px",
                opacity:prod.active?1:.55,transition:"opacity .3s"}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <button onClick={()=>openEdit(prod)} style={{
                    width:48,height:48,borderRadius:12,background:"var(--gs)",
                    border:"1px solid var(--gbr)",fontSize:24,cursor:"pointer",
                    flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {prod.emoji}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,
                      marginBottom:3,flexWrap:"wrap"}}>
                      <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,
                        fontWeight:600,color:"var(--gbri)",lineHeight:1.2}}>{prod.name}</p>
                      {prod.tag && (
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                          fontWeight:700,color:"var(--gg2)",
                          background:"rgba(201,168,76,.12)",
                          border:"1px solid rgba(201,168,76,.3)",
                          padding:"2px 6px",borderRadius:4,letterSpacing:1}}>{prod.tag}</span>
                      )}
                      {!prod.active && (
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                          color:"var(--gr)",background:"rgba(239,68,68,.1)",
                          border:"1px solid rgba(239,68,68,.3)",
                          padding:"2px 6px",borderRadius:4,letterSpacing:1}}>OCULTO</span>
                      )}
                    </div>
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,
                      color:"var(--gd)",marginBottom:5,lineHeight:1.4,
                      display:"-webkit-box",WebkitLineClamp:1,
                      WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                      {prod.desc||"Sin descripción"}
                    </p>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,
                        fontWeight:600,color:"var(--gg2)"}}>$ {fmt(prod.price)}</span>
                      {prod.orig && (
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
                          color:"var(--gd)",textDecoration:"line-through"}}>
                          $ {fmt(prod.orig)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                    <button onClick={()=>openEdit(prod)} style={{
                      background:"var(--gs)",border:"1px solid var(--gbr)",borderRadius:8,
                      padding:"6px 10px",color:"var(--gt)",fontSize:11,cursor:"pointer",
                      fontFamily:"'Outfit',sans-serif"}}>✏️ Editar</button>
                    <button onClick={()=>toggleProd(prod.id)} style={{
                      background:"none",border:"1px solid var(--gbr)",borderRadius:8,
                      padding:"6px 10px",
                      color:prod.active?"var(--gd)":"var(--gg)",
                      fontSize:11,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                      {prod.active?"Ocultar":"Mostrar"}
                    </button>
                    <button onClick={()=>deleteProd(prod.id)} style={{
                      background:"none",border:"1px solid rgba(239,68,68,.2)",
                      borderRadius:8,padding:"6px 10px",color:"var(--gr)",
                      fontSize:11,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                      🗑 Borrar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const SUBTABS = [
      {id:"local",label:"🏠 Local"},
      {id:"carta",label:"📋 Carta"},
    ];

    return (
      <div style={{padding:"18px 16px 0"}}>
        <div style={{marginBottom:14}}>
          <ALbl>Editor completo</ALbl>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,
            color:"var(--abri)"}}>Gestión</h2>
        </div>
        {/* Sub-tabs */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {SUBTABS.map(st=>(
            <button key={st.id} onClick={()=>setSubTab(st.id)} style={{
              flex:1,background:subTab===st.id?"var(--gi)":"var(--ac)",
              color:subTab===st.id?"#fff":"var(--ad)",
              border:`1px solid ${subTab===st.id?"var(--gi)":"var(--abr)"}`,
              borderRadius:12,padding:"10px",
              fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,
              cursor:"pointer",transition:"all .2s"}}>
              {st.label}
            </button>
          ))}
        </div>
        {subTab==="local" && <LocalSection/>}
        {subTab==="carta" && <CartaSection/>}
      </div>
    );
  };

  /* ══════════════════════════════════════════
     CONFIG TAB
  ══════════════════════════════════════════ */
  const ConfigTab = () => (
    <div style={{padding:"18px 16px 0"}}>
      <div style={{marginBottom:14}}>
        <ALbl>Sistema</ALbl>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,
          color:"var(--abri)"}}>Configuración</h2>
      </div>
      <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
        borderRadius:16,overflow:"hidden",marginBottom:14}}>
        {[
          {k:"propina",   icon:"💝",label:"Propina en pedidos",  sub:"El cliente ve opciones de propina al pagar"},
          {k:"happyHour", icon:"🔥",label:"Happy Hour",           sub:`${local.happyDesde} – ${local.happyHasta} hs`},
        ].map((f,i)=>(
          <div key={f.k} style={{display:"flex",justifyContent:"space-between",
            alignItems:"center",padding:"16px 18px",
            borderBottom:i===0?"1px solid var(--abr)":"none"}}>
            <div>
              <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,fontSize:15,
                color:"var(--abri)",marginBottom:2}}>{f.icon} {f.label}</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,
                color:"var(--ad)"}}>{f.sub}</p>
            </div>
            <ToggleA on={local[f.k]} onChange={()=>{
              setLocal(l=>({...l,[f.k]:!l[f.k]}));
              toast(`${f.label} ${!local[f.k]?"activado":"desactivado"}`);
            }}/>
          </div>
        ))}
      </div>
      <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
        borderRadius:16,padding:18}}>
        <ALbl>Info del local</ALbl>
        {[
          {label:"Nombre",    val:local.nombre},
          {label:"Dirección", val:local.direccion},
          {label:"Mesas",     val:String(local.mesas)},
          {label:"URL carta", val:local.baseUrl},
        ].map((f,i)=>(
          <div key={f.label} style={{display:"flex",justifyContent:"space-between",
            padding:"9px 0",borderBottom:i<3?"1px solid var(--abr)":"none"}}>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
              color:"var(--ad)"}}>{f.label}</span>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
              fontWeight:600,color:"var(--abri)",maxWidth:"60%",
              textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",
              whiteSpace:"nowrap"}}>{f.val}</span>
          </div>
        ))}
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--am)",
          marginTop:10}}>
          Para editar estos datos andá a la pestaña Gestión →
        </p>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════
     MODALES DE GESTIÓN (producto, categoría)
  ══════════════════════════════════════════ */
  const renderGModal = () => {
    if(!gModal) return null;

    /* Modal de producto */
    if(gModal.type==="prod") {
      const form    = gModal.data;
      const setForm = (k,v) => setGModal(m=>({...m,data:{...m.data,[k]:v}}));

      const saveProd = async () => {
        if(!form.name||!form.price) return toast("Completá nombre y precio","err");
        const isNew = !!form.isNew;
        const payload = {
          restaurante_id: local.restauranteId,
          categoria_id:   form.cat,
          name:    form.name,
          desc:    form.desc||null,
          price:   Number(form.price),
          orig:    form.orig?Number(form.orig):null,
          emoji:   form.emoji||"🍽️",
          tag:     form.tag||null,
          active:  form.active!==false,
          orden:   form.orden||0,
        };
        if(!isNew) payload.id = form.id;

        if(local.restauranteId && supabase){
          const {data:saved,error} = await supabase.from("productos")
            .upsert(payload, {onConflict:"id"}).select().single();
          if(error){ toast("Error al guardar: "+error.message,"err"); return; }
          if(isNew) setProds(ps=>[...ps,{...saved,cat:saved.categoria_id}]);
          else setProds(ps=>ps.map(p=>p.id===saved.id?{...saved,cat:saved.categoria_id}:p));
        } else {
          const localData = {...payload, id:form.id||Date.now(), cat:form.cat};
          if(isNew) setProds(ps=>[...ps,localData]);
          else setProds(ps=>ps.map(p=>p.id===localData.id?localData:p));
        }
        setGModal(null);
        toast(isNew?"Producto agregado ✓":"Producto actualizado ✓");
      };

      return (
        <BottomModal title={form.isNew?"Nuevo producto":"Editar producto"}
          onClose={()=>setGModal(null)}>
          {/* Emoji picker */}
          <GLbl>Ícono</GLbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14,
            background:"var(--gb)",border:"1px solid var(--gbr)",
            borderRadius:12,padding:12}}>
            {EMOJIS.map(e=>(
              <button key={e} onClick={()=>setForm("emoji",e)} style={{
                background:form.emoji===e?"rgba(99,102,241,.2)":"none",
                border:`1px solid ${form.emoji===e?"var(--gi)":"transparent"}`,
                borderRadius:8,padding:6,fontSize:22,cursor:"pointer"}}>
                {e}
              </button>
            ))}
          </div>

          <GInput label="Nombre del plato *" value={form.name}
            onChange={v=>setForm("name",v)} placeholder="Ej: Bife de chorizo"/>

          <GLbl>Descripción</GLbl>
          <textarea value={form.desc} onChange={e=>setForm("desc",e.target.value)}
            placeholder="Ingredientes, preparación..."
            style={{width:"100%",background:"var(--gb)",border:"1px solid var(--gbr)",
              borderRadius:10,padding:"11px 14px",color:"var(--gbri)",fontSize:14,
              resize:"none",height:68,marginBottom:14}}/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div>
              <GLbl>Precio *</GLbl>
              <div style={{display:"flex",alignItems:"center",background:"var(--gb)",
                border:"1px solid var(--gbr)",borderRadius:10,overflow:"hidden"}}>
                <span style={{padding:"0 10px",fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:12,color:"var(--gd)",borderRight:"1px solid var(--gbr)",
                  height:42,display:"flex",alignItems:"center"}}>$</span>
                <input type="number" value={form.price}
                  onChange={e=>setForm("price",e.target.value)}
                  placeholder="0"
                  style={{flex:1,background:"none",border:"none",padding:"11px 12px",
                    color:"var(--gbri)",fontSize:14,fontFamily:"'IBM Plex Mono',monospace",
                    fontWeight:600}}/>
              </div>
            </div>
            <div>
              <GLbl>Precio original</GLbl>
              <div style={{display:"flex",alignItems:"center",background:"var(--gb)",
                border:"1px solid var(--gbr)",borderRadius:10,overflow:"hidden"}}>
                <span style={{padding:"0 10px",fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:12,color:"var(--gd)",borderRight:"1px solid var(--gbr)",
                  height:42,display:"flex",alignItems:"center"}}>$</span>
                <input type="number" value={form.orig||""}
                  onChange={e=>setForm("orig",e.target.value)}
                  placeholder="Vacío = sin descuento"
                  style={{flex:1,background:"none",border:"none",padding:"11px 12px",
                    color:"var(--gbri)",fontSize:14,fontFamily:"'IBM Plex Mono',monospace"}}/>
              </div>
            </div>
          </div>

          <GLbl>Categoría</GLbl>
          <select value={form.cat} onChange={e=>setForm("cat",e.target.value)}
            style={{width:"100%",background:"var(--gb)",border:"1px solid var(--gbr)",
              borderRadius:10,padding:"11px 14px",color:"var(--gbri)",fontSize:14,
              marginBottom:14}}>
            {cats.map(c=>(
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>

          <GLbl>Etiqueta</GLbl>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
            {["","CHEF","NUEVO","VEG","SIN TACC","PICANTE"].map(tag=>(
              <button key={tag} onClick={()=>setForm("tag",tag)} style={{
                background:form.tag===tag?"rgba(201,168,76,.15)":"var(--gs)",
                border:`1px solid ${form.tag===tag?"var(--gg2)":"var(--gbr)"}`,
                borderRadius:8,padding:"6px 12px",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,
                color:form.tag===tag?"var(--gg2)":"var(--gd)",cursor:"pointer",
                letterSpacing:.5}}>{tag||"Ninguna"}</button>
            ))}
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setGModal(null)} className="pr" style={{
              flex:1,background:"var(--gs)",color:"var(--gt)",
              border:"1px solid var(--gbr)",borderRadius:10,padding:12,
              fontFamily:"'Outfit',sans-serif",fontSize:13,cursor:"pointer"}}>
              Cancelar
            </button>
            <button onClick={saveProd} className="pr" style={{
              flex:2,background:"var(--gi)",color:"#fff",border:"none",
              borderRadius:10,padding:12,fontFamily:"'Outfit',sans-serif",
              fontSize:14,fontWeight:600,cursor:"pointer"}}>
              {form.isNew?"Agregar producto":"Guardar cambios"}
            </button>
          </div>
        </BottomModal>
      );
    }

    /* Modal de nueva categoría — extraído a nivel de módulo */
    if(gModal.type==="cat") {
      return <CatModal local={local} cats={cats} setCats={setCats} setGModal={setGModal} toast={toast}/>;
    }
        return null;
  };

  /* ══════════════════════════════════════════
     RENDER PRINCIPAL DEL ADMIN
  ══════════════════════════════════════════ */
  return (
    <div className="admin-wrap" style={{maxWidth:700,margin:"0 auto",minHeight:"100vh",
      background:"var(--ab)",paddingBottom:100,position:"relative"}}>
      <GS/>
      {showVentaRapida && <VentaRapidaModal/>}

      {/* DESKTOP SIDEBAR */}
      <div className="admin-sidebar" style={{display:"none"}}>
        <div className="admin-sidebar-logo" style={{display:"none",padding:"20px 18px 12px",
          borderBottom:"1px solid var(--abr)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,
              background:"linear-gradient(135deg,#003322,rgba(0,255,136,.3))",
              border:"1px solid rgba(0,255,136,.2)",display:"flex",
              alignItems:"center",justifyContent:"center",fontSize:17}}>🍽️</div>
            <div>
              <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:800,
                color:"var(--abri)",lineHeight:1}}>{local.nombre||"MenuQR"}</p>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                color:"var(--am)",letterSpacing:1,marginTop:2}}>PANEL ADMIN</p>
            </div>
          </div>
        </div>
        <nav className="admin-sidebar-nav" style={{display:"none",flexDirection:"column",
          padding:"12px 10px",flex:1,gap:2}}>
          {TABS.map(t=>{
            const a = tab===t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} className="pr" style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",
                background:a?"rgba(61,142,255,.15)":"transparent",
                color:a?"var(--abl)":"var(--am)",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,
                letterSpacing:.5,textAlign:"left",position:"relative",transition:".15s"}}>
                <span style={{fontSize:15,minWidth:20,textAlign:"center"}}>{t.icon}</span>
                <span style={{flex:1}}>{t.label}</span>
                {t.badge>0 && <span style={{background:"var(--aam)",color:"#060810",
                  borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700}}>{t.badge}</span>}
                {a && <div style={{position:"absolute",left:0,top:"20%",height:"60%",
                  width:3,borderRadius:2,background:"var(--abl)"}}/>}
              </button>
            );
          })}
        </nav>
        <div style={{padding:"14px 18px",borderTop:"1px solid var(--abr)",flexShrink:0}}>
          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
            color:"var(--abr)",letterSpacing:1}}>MENUQR · v1.0</p>
        </div>
      </div>

      {/* DESKTOP MAIN WRAPPER */}
      <div className="admin-main" style={{}}>

      {/* TOP BAR */}
      <div className="admin-topbar" style={{background:"var(--as)",borderBottom:"1px solid var(--abr)",
        padding:"14px 18px 10px",position:"sticky",top:0,zIndex:40,
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"none",border:"none",
            color:"var(--am)",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
            cursor:"pointer",letterSpacing:1,padding:0,marginRight:2}}>←</button>
          <div style={{width:30,height:30,borderRadius:8,
            background:"linear-gradient(135deg,#003322,rgba(0,255,136,.3))",
            border:"1px solid rgba(0,255,136,.2)",display:"flex",
            alignItems:"center",justifyContent:"center",fontSize:15}}>🍽️</div>
          <div>
            {/* Nombre dinámico */}
            <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:13,
              color:"var(--abri)",lineHeight:1}}>{local.nombre}</p>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
              <Dot color="var(--ag)" pulse/>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                color:"var(--ag)",letterSpacing:1}}>EN LÍNEA</p>
              {local.plan && local.plan!=="free" && (
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,
                  fontWeight:700,letterSpacing:1,
                  color:PLAN_COLORS_MAP[local.plan]||"var(--ag)",
                  background:(PLAN_COLORS_MAP[local.plan]||"#6366F1")+"15",
                  border:`1px solid ${(PLAN_COLORS_MAP[local.plan]||"#6366F1")}44`,
                  padding:"1px 5px",borderRadius:4}}>
                  {PLAN_LABELS[local.plan]||local.plan.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,
            fontWeight:700,color:"var(--abri)",
            animation:"blink 1s step-end infinite"}}>
            {clock.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
          </p>
          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
            color:"var(--am)"}}>{todStr()}</p>
        </div>
      </div>
      <div className="admin-content-scroll">

      {/* CONTENT */}
      {tab==="home"    && <HomeTab/>}
      {tab==="orders"  && <OrdersTab/>}
      {tab==="carta"   && <CartaTab/>}
      {tab==="qr"      && <QRTabComp mesaNum={mesaNumAdmin} setMesaNum={setMesaNumAdmin} qrType={qrType} setQrType={setQrType} promoUrl={promoUrl} setPromoUrl={setPromoUrl} local={local}/>}
      {tab==="caja"    && <CajaTab/>}
      {tab==="gestion" && <GestionTab/>}
      {tab==="config"  && <ConfigTab/>}

      </div>{/* end admin-content-scroll */}
      </div>{/* end admin-main */}

      {/* BOTTOM NAV */}
      <nav className="admin-bottomnav" style={{position:"fixed",bottom:0,left:"50%",
        transform:"translateX(-50%)",width:"100%",maxWidth:700,
        background:"var(--as)",borderTop:"2px solid var(--abr)",
        display:"flex",padding:"10px 0 18px",zIndex:50,
        boxShadow:"0 -4px 20px rgba(0,0,0,.4)"}}>
        {TABS.map(t=>{
          const a = tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} className="pr" style={{
              flex:1,background:"none",border:"none",
              display:"flex",flexDirection:"column",
              alignItems:"center",gap:4,cursor:"pointer",position:"relative",
              padding:"4px 0"}}>
              <span style={{fontSize:24,
                color:a?"var(--ag)":"var(--am)",
                textShadow:a?"0 0 12px var(--ag)":"none",
                transition:"all .2s"}}>{t.icon}</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                fontWeight:700,letterSpacing:.4,
                color:a?"var(--ag)":"var(--am)",
                transition:"color .2s"}}>{t.label}</span>
              {(t.badge||0)>0 && (
                <span style={{position:"absolute",top:0,right:"8%",
                  background:"var(--aam)",color:"#000",borderRadius:"50%",
                  width:14,height:14,fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:8,fontWeight:800,display:"flex",
                  alignItems:"center",justifyContent:"center"}}>
                  {t.badge}
                </span>
              )}
              {a && (
                <div style={{position:"absolute",bottom:-7,left:"50%",
                  transform:"translateX(-50%)",width:16,height:2,
                  background:"var(--ag)",borderRadius:2,
                  boxShadow:"0 0 6px var(--ag)"}}/>
              )}
            </button>
          );
        })}
      </nav>

      {/* ADMIN MODALS */}
      {showArqAp && (
        <ArqModal title="Arqueo de apertura" onConfirm={abrirTurno}
          onCancel={()=>setArqAp(false)} btnLabel="▶ ABRIR TURNO"
          btnColor="var(--ag)"/>
      )}
      {showArqCi && (
        <ArqModal title="Arqueo de cierre" onConfirm={confirmarZ}
          onCancel={()=>setArqCi(false)} btnLabel="GENERAR INFORME Z"
          btnColor="var(--ar)"/>
      )}
      {showTkt && (
        <TktModal tipo={showTkt.tipo} t={showTkt.turno}
          onClose={()=>setTkt(null)} onZ={ejecutarZ}/>
      )}
      {qrSelected && (
        <QRViewModal tableNum={qrSelected} onClose={()=>setQRS(null)}/>
      )}

      {/* GESTIÓN MODALS */}
      {renderGModal()}

      {/* TOAST */}
      {toastMsg && (
        <div style={{position:"fixed",bottom:24,left:"50%",
          transform:"translateX(-50%)",
          background:toastMsg.type==="err" ?"rgba(239,68,68,.15)"
                    :toastMsg.type==="warn"?"rgba(245,158,11,.15)"
                    :"rgba(0,255,136,.1)",
          border:`1px solid ${toastMsg.type==="err" ?"rgba(239,68,68,.4)"
                             :toastMsg.type==="warn"?"rgba(245,158,11,.4)"
                             :"rgba(0,255,136,.3)"}`,
          borderRadius:12,padding:"11px 20px",
          fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,
          color:toastMsg.type==="err" ?"#EF4444"
               :toastMsg.type==="warn"?"#F59E0B"
               :"var(--ag)",
          zIndex:400,whiteSpace:"nowrap",
          boxShadow:"0 4px 24px rgba(0,0,0,.5)",
          animation:"fadeUp .25s ease"}}>
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOT — estado compartido entre cliente y admin
══════════════════════════════════════════════════════════════ */
export default function MenuQR({
  local:  localProp,   setLocal:  setLocalProp,
  cats:   catsProp,    setCats:   setCatsProp,
  prods:  prodsProp,   setProds:  setProdsProp,
  forceMode,
  mesaInicial,
}) {
  const [mode,      setMode]      = useState(forceMode || "landing");
  const [authUser,  setAuthUser]  = useState(null);   // Supabase user
  const [showLogin, setShowLogin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  // Estado interno como fallback
  const [localInt,  setLocalInt]  = useState(INIT_LOCAL);
  const [catsInt,   setCatsInt]   = useState(INIT_CATS);
  const [prodsInt,  setProdsInt]  = useState(INIT_PRODS);

  const local    = localProp  ?? localInt;
  const setLocal = setLocalProp ?? setLocalInt;
  const cats     = catsProp   ?? catsInt;
  const setCats  = setCatsProp ?? setCatsInt;
  const prods    = prodsProp  ?? prodsInt;
  const setProds = setProdsProp ?? setProdsInt;

  // ── Verificar sesión al montar
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    // Detectar si el usuario llegó desde un link de recuperación de contraseña
    const isRecovery = window.location.hash.includes("type=recovery") ||
                       window.location.search.includes("type=recovery");
    if (isRecovery) {
      setRecoveryMode(true);
      setAuthLoading(false);
      // Limpiar el hash de la URL
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setAuthUser(session.user);
          loadRestaurantData(session.user.id);
        }
        setAuthLoading(false);
      });
    }
    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // El usuario llegó desde el link de recuperación — mostrar formulario de nueva contraseña
        setRecoveryMode(true);
        return;
      }
      if (session?.user) { setAuthUser(session.user); loadRestaurantData(session.user.id); }
      else { setAuthUser(null); if (!forceMode) setMode("landing"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Cargar datos del restaurante desde Supabase
  async function loadRestaurantData(userId) {
    if (!supabase) return;
    try {
      const { data: rest } = await supabase.from("restaurantes").select("*").eq("owner_id", userId).single();
      if (!rest) return;
      setLocal({
        nombre: rest.nombre, descripcion: rest.descripcion || "",
        direccion: rest.direccion || "", telefono: rest.telefono || "",
        email: rest.email || "", color: rest.color || "#C9A84C",
        mesas: rest.mesas || 10, restauranteId: rest.id,
        slug: rest.slug, baseUrl: rest.base_url || "",
        plan: rest.plan || "free",
        activo: rest.activo !== false,
        ...(rest.config || {}),
      });
      const [categorias, productos] = await Promise.all([
        getCategorias(rest.id),
        getProductos(rest.id),
      ]);
      if (categorias.length) setCats(categorias.map(c => ({ id:c.id, label:c.label, icon:c.icon, activa:c.activa })));
      if (productos.length)  setProds(productos.map(p => ({ id:p.id, cat:p.categoria_id, name:p.name, desc:p.desc, price:p.price, orig:p.orig, emoji:p.emoji, tag:p.tag, active:p.active })));
    } catch(e) { console.error("loadRestaurantData:", e); }
  }

  // ── Cuando se pide ir al admin: verificar auth
  function goAdmin() {
    if (authUser) { setMode("admin"); }
    else { setShowLogin(true); }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setAuthUser(null);
    setMode("landing");
  }

  function onLoginSuccess(user) {
    setAuthUser(user);
    setShowLogin(false);
    setMode("admin");
    loadRestaurantData(user.id);
  }

  if (authLoading) return (
    <div style={{background:"#060810",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <GS/>
      <div style={{width:40,height:40,border:"3px solid #1A2230",borderTopColor:"#C9A84C",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    </div>
  );

  return (
    <>
      <GS/>
      {recoveryMode && <ResetPasswordModal onDone={()=>{ setRecoveryMode(false); }} />}
      {showLogin && <LoginModal onSuccess={onLoginSuccess} onClose={()=>setShowLogin(false)} />}
      {mode==="landing" && (
        <LandingAuth setMode={setMode} goAdmin={goAdmin} authUser={authUser} onLogout={handleLogout}/>
      )}
      {mode==="client" && (
        <ClientApp onBack={()=>setMode("landing")} local={local} cats={cats} prods={prods}/>
      )}
      {mode==="admin" && authUser && (
        <AdminApp
          onBack={()=>setMode("landing")}
          local={local}    setLocal={setLocal}
          cats={cats}      setCats={setCats}
          prods={prods}    setProds={setProds}
          authUser={authUser} onLogout={handleLogout}
        />
      )}
      {mode==="admin" && !authUser && null}
    </>
  );
}

/* ── Landing con Auth ─────────────────────────────────────── */
function LandingAuth({ setMode, goAdmin, authUser, onLogout }) {
  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#0D0D0D",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:28,position:"relative",overflow:"hidden"}}>
      {/* Decorative blobs */}
      <div style={{position:"absolute",top:-80,right:-60,width:260,height:260,
        borderRadius:"50%",background:"rgba(249,115,22,.07)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:200,height:200,
        borderRadius:"50%",background:"rgba(249,115,22,.04)",pointerEvents:"none"}}/>

      <div style={{textAlign:"center",marginBottom:48,animation:"fadeUp .6s ease both",position:"relative"}}>
        {/* Logo */}
        <div style={{width:80,height:80,borderRadius:26,
          background:"linear-gradient(135deg,#F97316,#FB923C)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:38,margin:"0 auto 22px",
          boxShadow:"0 12px 40px rgba(249,115,22,.35)"}}>🍽️</div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#F97316",
          letterSpacing:4,fontWeight:700,marginBottom:10}}>MENUQR</p>
        <h1 style={{fontFamily:"'DM Sans',sans-serif",fontSize:34,fontWeight:800,
          color:"#FFF",lineHeight:1.1,marginBottom:10}}>
          {authUser ? "Bienvenido" : "Carta Digital"}
        </h1>
        {authUser
          ? <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#555"}}>{authUser.email}</p>
          : <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#555"}}>Explorá tu restaurante</p>
        }
      </div>

      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:14,
        animation:"fadeUp .6s ease .12s both",position:"relative"}}>
        {/* Carta */}
        <button onClick={()=>setMode("client")} className="pr" style={{
          background:"linear-gradient(135deg,#1A1A1A,#222)",
          border:"1px solid #2D2D2D",
          borderRadius:22,padding:"22px 24px",
          display:"flex",alignItems:"center",gap:18,
          cursor:"pointer",textAlign:"left",
          transition:"border-color .2s, box-shadow .2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#F97316";e.currentTarget.style.boxShadow="0 0 24px rgba(249,115,22,.15)"}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#2D2D2D";e.currentTarget.style.boxShadow="none"}}>
          <div style={{width:54,height:54,borderRadius:16,
            background:"linear-gradient(135deg,#F97316,#FB923C)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:28,flexShrink:0,boxShadow:"0 6px 20px rgba(249,115,22,.3)"}}>📱</div>
          <div style={{flex:1}}>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:17,
              color:"#FFF",marginBottom:5}}>Ver la carta</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#555"}}>
              Vista del cliente al escanear el QR
            </p>
          </div>
          <span style={{color:"#F97316",fontSize:22,fontWeight:300}}>›</span>
        </button>

        {/* Admin */}
        <button onClick={goAdmin} className="pr" style={{
          background:"linear-gradient(135deg,#0F1520,#131C2A)",
          border:"1px solid #1E2A3A",
          borderRadius:22,padding:"22px 24px",
          display:"flex",alignItems:"center",gap:18,
          cursor:"pointer",textAlign:"left",
          transition:"border-color .2s, box-shadow .2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#00FF88";e.currentTarget.style.boxShadow="0 0 24px rgba(0,255,136,.1)"}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#1E2A3A";e.currentTarget.style.boxShadow="none"}}>
          <div style={{width:54,height:54,borderRadius:16,
            background:"linear-gradient(135deg,#003322,#004433)",
            border:"1px solid rgba(0,255,136,.2)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:28,flexShrink:0}}>⚙️</div>
          <div style={{flex:1}}>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:17,
              color:"#FFF",marginBottom:5}}>Panel del dueño</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#4A6080"}}>
              {authUser ? "Pedidos, carta, QRs, caja y gestión" : "Iniciar sesión para acceder"}
            </p>
          </div>
          <span style={{color:"#00FF88",fontSize:22,fontWeight:300}}>›</span>
        </button>
      </div>

      {authUser && (
        <button onClick={onLogout} style={{marginTop:22,background:"none",
          border:"1px solid #222",borderRadius:10,
          padding:"8px 20px",color:"#444",cursor:"pointer",
          fontSize:12,fontFamily:"'DM Sans',sans-serif",transition:"color .2s"}}
          onMouseEnter={e=>e.currentTarget.style.color="#888"}
          onMouseLeave={e=>e.currentTarget.style.color="#444"}>
          Cerrar sesión
        </button>
      )}
      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:"#222",
        marginTop:28,letterSpacing:2}}>MENUQR · v1.0</p>
    </div>
  );
}
