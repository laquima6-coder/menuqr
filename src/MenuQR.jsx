import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import AdminPanel from "./pages/AdminPanel.jsx";
import QRCodeLib from "qrcode";
import { supabase, loginAdmin, logoutAdmin, getSession, getRestaurante, getCategorias, getProductos, createTurno, closeTurno, getTurnos } from "./lib/supabase.js";

/* ══════════════════════════════════════════════════════════════
   GLOBAL STYLES — dos paletas: cliente (cálida) + admin (técnica)
══════════════════════════════════════════════════════════════ */
export const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Outfit:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    :root {
      /* Cliente — dark + naranja */
      --cb:  #0D0D0D; --cs: #171717; --cc: #1F1F1F; --cbr: #2D2D2D;
      --cm:  #6B6B6B; --cd: #8A8A8A; --ct: #AAAAAA; --cbri:#FFFFFF;
      --cg:  #F97316; --cg2:#FB923C; --cgr:#22C55E; --crd:#EF4444;
      /* Admin — Dark Green | letras blancas | acento dorado */
      --ab:  #011A16; --as: #022E28; --ac: #033D35; --abr:#0A5C50;
      --am:  #7AC4B8; --ad: #A8D4CF; --at: #FFFFFF;  --abri:#FFFFFF;
      --ag:  #0D6B5E; --aam:#C9A84C; --ar: #E57373; --abl:#64B5F6;
      /* Gestión — Dark Green | letras blancas | acento dorado */
      --gb:  #011A16; --gs: #022E28; --gc: #033D35; --gbr:#0A5C50;
      --gm:  #7AC4B8; --gd: #A8D4CF; --gt: #FFFFFF;  --gbri:#FFFFFF;
      --gi:  #0D6B5E; --gi2:#C9A84C; --gg: #4CAF7D; --gr: #E57373; --gam:#C9A84C;
      --gg2: #0D6B5E;
    }

    * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent }
    body { background:#011A16 }
    ::-webkit-scrollbar { width:7px }
    ::-webkit-scrollbar-track { background:transparent }
    ::-webkit-scrollbar-thumb { background:#0A5A50; border-radius:4px }
    ::-webkit-scrollbar-thumb:hover { background:#0D7A6E }

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
    /* Desktop: sidebar vertical on right, content fills left. Zoom entire wrap. */
    @media (min-width: 700px) {
      .admin-wrap {
        zoom: 1.3;
        width: calc(100vw / 1.3) !important;
        height: calc(100vh / 1.3) !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: row !important;
        max-width: none !important;
        margin: 0 !important;
        overflow: hidden;
        padding-bottom: 0 !important;
      }
      .admin-sidebar {
        display: flex !important;
        flex-direction: column;
        width: 200px;
        min-width: 200px;
        height: 100%;
        background: var(--as);
        border-left: 1px solid var(--abr);
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
        height: 100%;
        background: var(--ab);
      }
      .admin-topbar {
        position: sticky !important;
        top: 0;
      }
      .admin-content-scroll {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding-bottom: 24px !important;
      }
      .admin-content-scroll::-webkit-scrollbar { width:8px }
      .admin-content-scroll::-webkit-scrollbar-track { background:rgba(0,0,0,.2) }
      .admin-content-scroll::-webkit-scrollbar-thumb { background:#3A2A18; border-radius:4px }
      .admin-content-scroll::-webkit-scrollbar-thumb:hover { background:#5A4020 }
      .admin-bottomnav { display: none !important; }
      .admin-sidebar-nav { display: flex !important; }
      .admin-sidebar-logo { display: flex !important; }
    }
    @media (min-width: 1100px) {
      .admin-wrap {
        zoom: 1.45;
        width: calc(100vw / 1.45) !important;
        height: calc(100vh / 1.45) !important;
      }
      .admin-sidebar { width: 215px; min-width: 215px; }
    }
    @media (min-width: 1400px) {
      .admin-wrap {
        zoom: 1.6;
        width: calc(100vw / 1.6) !important;
        height: calc(100vh / 1.6) !important;
      }
      .admin-sidebar { width: 230px; min-width: 230px; }
    }
    /* Mobile: thin icon-only sidebar on right */
    @media (max-width: 699px) {
      .admin-wrap {
        display: flex !important;
        flex-direction: row !important;
        height: 100dvh !important;
        overflow: hidden !important;
        max-width: none !important;
        padding-bottom: 0 !important;
        margin: 0 !important;
      }
      .admin-sidebar {
        display: flex !important;
        flex-direction: column !important;
        width: 58px !important;
        min-width: 58px !important;
        height: 100dvh !important;
        overflow-y: auto !important;
        border-left: 1px solid var(--abr) !important;
        order: 2 !important;
      }
      .admin-sidebar-nav {
        display: flex !important;
        padding: 6px 4px !important;
        gap: 1px !important;
        flex: 1 !important;
      }
      .admin-sidebar-nav button {
        padding: 10px 4px !important;
        justify-content: center !important;
        gap: 3px !important;
        flex-direction: column !important;
      }
      .admin-sidebar-nav button span:nth-child(2) { display: none !important; }
      .admin-sidebar-logo { display: none !important; }
      .admin-bottomnav { display: none !important; }
      .admin-main {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        min-width: 0 !important;
        order: 1 !important;
      }
      .admin-content-scroll {
        display: block !important;
        flex: 1 !important;
        overflow-y: auto !important;
        padding-bottom: 8px !important;
      }
      .admin-topbar { position: sticky !important; top: 0 !important; }
    }

    /* ── PRODUCT CARD MOBILE BASE ───────────────────────────── */
    .mpc-name  { font-size: 17px !important; font-weight: 700 !important; line-height: 1.25 !important; }
    .mpc-desc  { font-size: 13px !important; color: #999 !important; }
    .mpc-price { font-size: 20px !important; font-weight: 800 !important; }
    .mpg       { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; }

    /* ── PRODUCT CARD HOVER ──────────────────────────────────── */
    .mpc-card {
      cursor: pointer;
      transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease !important;
    }
    .mpc-card:hover {
      transform: translateY(-3px) scale(1.01);
    }
    @media (min-width: 768px) {
      .mpc-card:hover {
        border-color: var(--cg) !important;
        box-shadow: 0 0 18px rgba(249,115,22,.35), 0 6px 20px rgba(0,0,0,.5) !important;
        transform: translateY(-4px) scale(1.02);
      }
      /* Bigger text on desktop */
      .mpc-name  { font-size: 17px !important; line-height: 1.3 !important; margin-bottom: 5px !important; }
      .mpc-desc  { font-size: 13px !important; color: #888 !important; -webkit-line-clamp: 3 !important; }
      .mpc-price { font-size: 20px !important; font-weight: 800 !important; }
      .mpc-add   { width: 32px !important; height: 32px !important; font-size: 22px !important; border-radius: 9px !important; }
      /* Card inner padding */
      .mpc-info  { padding: 8px 8px 9px !important; }
    }
    @media (min-width: 1100px) {
      .mpc-name  { font-size: 19px !important; }
      .mpc-desc  { font-size: 14px !important; color: #888 !important; }
      .mpc-price { font-size: 23px !important; }
      .mpc-add   { width: 36px !important; height: 36px !important; font-size: 24px !important; }
    }
    /* ── PUBLIC MENU — RESPONSIVE DESKTOP / TABLET ────────── */
    @media (min-width: 768px) {
      /* Outer wrapper: remove 430px cap */
      .mpo { max-width: none !important; width: 100% !important; }
      /* Sidebar: expand from 74px to 180px with text visible */
      .msr { width: 180px !important; min-width: 180px !important; }
      .msr-name { font-size: 9px !important; -webkit-line-clamp: 3 !important; }
      .msr-catbtn {
        flex-direction: row !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 10px 14px !important;
        text-align: left !important;
        justify-content: flex-start !important;
      }
      .msr-catemoji { font-size: 18px !important; }
      .msr-catlabel {
        font-size: 11px !important;
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: unset !important;
        text-align: left !important;
        max-width: none !important;
      }
      /* Main content: bigger header */
      .mhd { padding: 28px 32px 20px !important; }
      .mhd-title { font-size: 30px !important; }
      .mhd-desc { font-size: 13px !important; color: #888 !important; }
      /* Category section header */
      .mcat-hdr-label { font-size: 13px !important; letter-spacing: 2px !important; }
      /* Product grid: auto-fill with min 170px columns */
      .mpg { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)) !important; gap: 14px !important; padding: 0 18px 18px !important; }
      /* Product card text */
      .mpc-name { font-size: 17px !important; line-height: 1.3 !important; margin-bottom: 4px !important; }
      .mpc-desc { font-size: 13px !important; color: #777 !important; -webkit-line-clamp: 3 !important; }
      .mpc-price { font-size: 20px !important; }
      .mpc-add { width: 30px !important; height: 30px !important; font-size: 20px !important; border-radius: 8px !important; }
    }
    @media (min-width: 1100px) {
      .msr { width: 220px !important; min-width: 220px !important; }
      .mpg { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important; gap: 16px !important; }
      .mhd-title { font-size: 38px !important; }
      .mpc-name { font-size: 19px !important; }
      .mpc-desc { font-size: 14px !important; }
      .mpc-price { font-size: 23px !important; }
      .mpc-add { width: 34px !important; height: 34px !important; font-size: 22px !important; }
    }
    /* Cart view: wider on desktop */
    @media (min-width: 768px) {
      .cv { max-width: 700px !important; margin: 0 auto !important; }
    }
    /* Admin orders: bigger on desktop */
    @media (min-width: 700px) {
      .admin-ocard-mesa { font-size: 24px !important; }
      .admin-ocard-item { font-size: 15px !important; line-height: 2.2 !important; }
      .admin-nota { font-size: 13px !important; padding: 10px 16px !important; border-radius: 10px !important; }
      /* Carta tab — 2-column grid + bigger elements */
      .admin-carta-list { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 0 !important; border-radius: 16px !important; overflow: hidden !important; }
      .admin-carta-item { border-bottom: 1px solid var(--abr) !important; }
      .admin-carta-row { padding: 16px 20px !important; gap: 16px !important; }
      .admin-carta-img { width: 54px !important; height: 54px !important; border-radius: 10px !important; }
      .admin-carta-name { font-size: 16px !important; }
      .admin-carta-price { font-size: 14px !important; margin-top: 4px !important; }
    }
    @media (min-width: 1400px) {
      .admin-carta-list { grid-template-columns: repeat(3, 1fr) !important; }
      .admin-carta-img { width: 64px !important; height: 64px !important; }
      .admin-carta-name { font-size: 18px !important; }
      .admin-carta-price { font-size: 16px !important; }
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
  feat_solicitudes:true, feat_promo10:true,
  wifi_nombre:"LaTrattoria_WiFi", wifi_pass:"bienvenido2024",
  whatsapp:"5491112345678", whatsapp_msg:"Hola! Quiero hacer una consulta.",
  baseUrl:"latrattoria.menuqr.app",
  plan:"free", restauranteId:null, slug:"", logo_url:"",
  activo:true,
};

export const INIT_CATS = [];

export const INIT_PRODS = [];

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
  {id:"mp",    icon:"💳", color:"#009EE3", bg:"#EBF7FF"},
  {id:"trans", icon:"🏦", color:"#7C3AED", bg:"#F5F3FF"},
  {id:"cash",  icon:"💵", color:"#16A34A", bg:"#F0FDF4"},
  {id:"card",  icon:"💰", color:"#F97316", bg:"#FFF7ED"},
];
const PAY_LABELS = {
  mp:   {es:"Mercado Pago",  en:"Mercado Pago",   sub:{es:"QR o link de pago",   en:"QR or payment link", pt:"QR ou link de pagamento", it:"QR o link",       fr:"QR ou lien",      de:"QR oder Link",    zh:"扫码付款",       ja:"QRまたはリンク",   ko:"QR 또는 링크"}},
  trans:{es:"Transferencia", en:"Bank Transfer",  sub:{es:"CVU / Alias",          en:"Account / Alias",    pt:"CVU / Alias",              it:"IBAN / Alias",    fr:"Virement",        de:"Überweisung",     zh:"银行转账",       ja:"振込",            ko:"계좌이체"}},
  cash: {es:"Efectivo",      en:"Cash",           sub:{es:"Le cobrás el mozo",    en:"Pay the waiter",     pt:"Pague ao garçom",          it:"Al cameriere",    fr:"Au serveur",      de:"Beim Kellner",    zh:"付现金",         ja:"スタッフに現金",   ko:"직원에게 현금"}},
  card: {es:"Débito / Créd", en:"Debit / Credit", sub:{es:"Visa, Master, Amex",   en:"Visa, Master, Amex", pt:"Visa, Master, Amex",       it:"Visa, Master",    fr:"Visa, Mastercard",de:"Visa, Mastercard",zh:"信用/借记卡",    ja:"クレジットカード",  ko:"신용/체크카드"}},
};
const tPay = (id,lang) => { const p=PAY_LABELS[id]; if(!p) return id; return p[lang]||p.es; };
const tPaySub = (id,lang) => { const p=PAY_LABELS[id]; if(!p||!p.sub) return ""; return p.sub[lang]||p.sub.es; };

const EMOJIS = ["🍕","🥩","🍝","🧀","🥗","🍺","🍷","🍹","🥟","🍔","🍖","🫕","🪵","🍮","🍨","🍰","☕","🥐","🌮","🐟","🦐","🍄","☀️","🔥","🥘","🫙","🧆","🥙"];

/* ══════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════ */
const fmt    = n => Number(n||0).toLocaleString("es-AR");
const nowStr = () => new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
const todStr = () => new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"});
const emptyArq = () => Object.fromEntries(BILLETES.map(b=>[b.val,""]));
// QR client-side — no external API dependency
const QRImage = ({data, size=200, light="#F5ECD7", dark="#0A0806", style={}}) => {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if(!data) return;
    QRCodeLib.toDataURL(data, {
      width: size, margin: 2,
      color: { dark, light: light.startsWith('#') ? light : '#'+light }
    }).then(url => setSrc(url)).catch(()=>{});
  }, [data, size, light, dark]);
  if(!src) return (
    <div style={{width:size,height:size,background:"#f0f0f0",borderRadius:8,
      display:"flex",alignItems:"center",justifyContent:"center",...style}}>
      <span style={{fontSize:10,color:"#aaa",fontFamily:"monospace"}}>QR...</span>
    </div>
  );
  return <img src={src} width={size} height={size} alt="QR" style={{display:"block",borderRadius:8,...style}}/>;
};

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

const GLbl = ({children, color="var(--gd)", c}) => (
  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,
    textTransform:"uppercase",color:c||color,marginBottom:7}}>{children}</p>
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
    overlay: { position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20 },
    card:    { background:"#FFFFFF",border:"1px solid #E0E0E0",borderRadius:18,padding:"32px 28px",width:"100%",maxWidth:400,animation:"scaleIn .2s ease" },
    tabs:    { display:"flex",gap:4,background:"#F0FDFA",borderRadius:10,padding:4,marginBottom:24 },
    tab:     (a) => ({ flex:1,padding:"9px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:".85rem",fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:".2s",background:a?"#2A1C0E":"transparent",color:a?"#F5F0E8":"#7A6050" }),
    label:   { display:"block",fontSize:".75rem",color:"#7A6050",marginBottom:5,textTransform:"uppercase",letterSpacing:".04em",fontFamily:"'DM Sans',sans-serif" },
    input:   { width:"100%",padding:"11px 14px",background:"#F5F5F5",border:"1px solid #E0E0E0",borderRadius:8,color:"#1A1A1A",fontSize:".95rem",outline:"none",marginBottom:14,fontFamily:"'DM Sans',sans-serif" },
    btn:     { width:"100%",padding:13,background:"#C9A84C",border:"none",borderRadius:8,color:"#0D0804",fontSize:"1rem",fontWeight:800,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" },
    err:     { background:"#1a0808",border:"1px solid #7f1d1d",color:"#f87171",padding:"9px 12px",borderRadius:7,fontSize:".82rem",marginBottom:12,fontFamily:"'DM Sans',sans-serif" },
    close:   { position:"absolute",top:14,right:16,background:"none",border:"none",color:"#7A6050",cursor:"pointer",fontSize:20 },
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
  {code:"gn",flag:"🇵🇾",name:"GN"},
];
const TR = {
  welcome:      {es:"BIENVENIDO A",     en:"WELCOME TO",         pt:"BEM-VINDO A",        it:"BENVENUTI DA",       fr:"BIENVENUE À",       de:"WILLKOMMEN BEI",     zh:"欢迎光临",          ja:"ようこそ",          ko:"어서오세요", gn:"EGUAHẼPORÃ"},
  menu:         {es:"Menú",             en:"Menu",               pt:"Cardápio",            it:"Menu",               fr:"Menu",              de:"Speisekarte",        zh:"菜单",              ja:"メニュー",          ko:"메뉴", gn:"Tembi'u"},
  myOrder:      {es:"Tu pedido",        en:"Your order",         pt:"Seu pedido",          it:"Il tuo ordine",      fr:"Votre commande",    de:"Ihre Bestellung",    zh:"您的订单",          ja:"ご注文",            ko:"주문 내역", gn:"Che mba'e"},
  viewOrder:    {es:"Ver mi pedido",    en:"View my order",      pt:"Ver meu pedido",      it:"Vedi ordine",        fr:"Voir ma commande",  de:"Bestellung anzeigen",zh:"查看订单",          ja:"注文を見る",         ko:"주문 보기", gn:"Hecha che mba'e"},
  subtotal:     {es:"Subtotal",         en:"Subtotal",           pt:"Subtotal",            it:"Subtotale",          fr:"Sous-total",        de:"Zwischensumme",      zh:"小计",              ja:"小計",              ko:"소계", gn:"Subtotal"},
  total:        {es:"Total",            en:"Total",              pt:"Total",               it:"Totale",             fr:"Total",             de:"Gesamt",             zh:"合计",              ja:"合計",              ko:"합계", gn:"Añetegua"},
  tip:          {es:"Propina",          en:"Tip",                pt:"Gorjeta",             it:"Mancia",             fr:"Pourboire",         de:"Trinkgeld",          zh:"小费",              ja:"チップ",            ko:"팁", gn:"Ypykue"},
  tipQ:         {es:"¿Dejar propina?",  en:"Leave a tip?",       pt:"Deixar gorjeta?",     it:"Lasciare mancia?",   fr:"Laisser un pourboire?",de:"Trinkgeld geben?",zh:"是否给小费？",      ja:"チップを追加？",     ko:"팁을 남기시겠어요?", gn:"¿Rejapo ypykue?"},
  noTip:        {es:"Sin propina",      en:"No tip",             pt:"Sem gorjeta",         it:"Senza mancia",       fr:"Sans pourboire",    de:"Kein Trinkgeld",     zh:"不给小费",          ja:"チップなし",         ko:"팁 없음", gn:"Ndaipóri ypykue"},
  other:        {es:"Otra cantidad:",   en:"Custom amount:",     pt:"Outro valor:",        it:"Altro importo:",     fr:"Autre montant:",    de:"Anderer Betrag:",    zh:"其他金额：",         ja:"その他の金額：",      ko:"다른 금액：", gn:"Ambuéva:"},
  notes:        {es:"Aclaraciones",     en:"Notes",              pt:"Observações",         it:"Note",               fr:"Remarques",         de:"Anmerkungen",        zh:"备注",              ja:"備考",              ko:"메모", gn:"Ñemoñe'ẽ"},
  notesHint:    {es:"Ej: sin cebolla, alergia al gluten...", en:"E.g: no onion, gluten allergy...", pt:"Ex: sem cebola...", it:"Es: senza cipolla...", fr:"Ex: sans oignon...", de:"Z.B.: ohne Zwiebel...", zh:"例如：不要洋葱...", ja:"例：玉ねぎなし...", ko:"예: 양파 없이...", gn:"Pe: ndaipóri sevói..."},
  payMethod:    {es:"Método de pago",   en:"Payment method",     pt:"Forma de pagamento",  it:"Metodo di pagamento",fr:"Mode de paiement",  de:"Zahlungsmethode",    zh:"支付方式",          ja:"お支払い方法",       ko:"결제 방법", gn:"Mba'éichapa reñomboherã"},
  confirm:      {es:"Confirmar pedido →",en:"Confirm order →",  pt:"Confirmar pedido →",  it:"Conferma ordine →",  fr:"Confirmer commande →",de:"Bestellung bestätigen →",zh:"确认订单 →",    ja:"注文を確定 →",       ko:"주문 확인 →", gn:"Moneĩ tembi'u →"},
  choosePay:    {es:"Elegí un método de pago",en:"Choose a payment method",pt:"Escolha um método",it:"Scegli un metodo",fr:"Choisissez un mode",de:"Zahlungsmethode wählen",zh:"请选择支付方式",ja:"お支払い方法を選択",ko:"결제 방법 선택", gn:"Eiporavo mba'éichapa"},
  orderReceived:{es:"PEDIDO RECIBIDO",         en:"ORDER RECEIVED",     pt:"PEDIDO RECEBIDO",     it:"ORDINE RICEVUTO",    fr:"COMMANDE REÇUE",    de:"BESTELLUNG ERHALTEN",zh:"订单已接收",        ja:"ご注文受付",         ko:"주문 접수됨", gn:"TEMBI'U OÑEMOÑE'Ẽ"},
  thanks:       {es:"¡Gracias!",        en:"Thank you!",         pt:"Obrigado!",            it:"Grazie!",            fr:"Merci!",            de:"Danke!",             zh:"谢谢！",            ja:"ありがとうございます！",ko:"감사합니다!", gn:"Aguyje!"},
  estTime:      {es:"Tiempo estimado: 15–20 min.", en:"Estimated time: 15–20 min.", pt:"Tempo estimado: 15–20 min.", it:"Tempo stimato: 15–20 min.", fr:"Temps estimé: 15–20 min.", de:"Geschätzte Zeit: 15–20 Min.", zh:"预计时间：15–20分钟", ja:"お待ち時間：15–20分", ko:"예상 시간: 15–20분", gn:"Aravo: 15–20 min."},
  orderMore:    {es:"Pedir más",        en:"Order more",         pt:"Pedir mais",           it:"Ordina ancora",      fr:"Commander plus",    de:"Mehr bestellen",     zh:"继续点餐",          ja:"追加注文",           ko:"더 주문하기", gn:"Embyaty hetave"},
  backHome:     {es:"← Inicio",         en:"← Back",             pt:"← Início",             it:"← Indietro",         fr:"← Retour",          de:"← Zurück",           zh:"← 返回",            ja:"← 戻る",            ko:"← 뒤로", gn:"← Pype"},
  happyHour:    {es:"◈ Happy Hour activo",en:"◈ Happy Hour active",pt:"◈ Happy Hour ativo",it:"◈ Happy Hour attivo",fr:"◈ Happy Hour actif", de:"◈ Happy Hour aktiv", zh:"◈ 快乐时光进行中",  ja:"◈ ハッピーアワー中",  ko:"◈ 해피아워 진행중", gn:"◈ Happy Hour opyta"},
  cash:         {es:"Efectivo",         en:"Cash",               pt:"Dinheiro",             it:"Contanti",           fr:"Espèces",           de:"Bargeld",            zh:"现金",              ja:"現金",              ko:"현금", gn:"Viru"},
  card:         {es:"Tarjeta",          en:"Card",               pt:"Cartão",               it:"Carta",              fr:"Carte",             de:"Karte",              zh:"刷卡",              ja:"カード",            ko:"카드", gn:"Tarjeta"},
  transfer:     {es:"Transferencia",    en:"Transfer",           pt:"Transferência",         it:"Bonifico",           fr:"Virement",          de:"Überweisung",        zh:"转账",              ja:"振込",              ko:"이체", gn:"Jerure"},
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
/* ══ Happy Hour Banner ── isolated so its 1-second timer
     does NOT re-render the rest of ClientApp ══════════════ */
function HappyHourBanner({happyHasta, happyHour, lang}) {
  const calcSecs = () => {
    const [h,m] = (happyHasta||"21:00").split(":").map(Number);
    const now = new Date(), end = new Date();
    end.setHours(h,m,0,0);
    return Math.max(0, Math.floor((end - now) / 1000));
  };
  const [secs,setSecs] = useState(calcSecs);
  useEffect(()=>{
    const id = setInterval(()=>setSecs(s=>s>0?s-1:0),1000);
    return ()=>clearInterval(id);
  },[]);
  const fmt = s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  if(!happyHour||secs<=0) return null;
  return (
    <div style={{background:"linear-gradient(90deg,#1A0D00,#120900)",borderBottom:"1px solid rgba(201,168,76,.15)",padding:"7px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#C9A84C",fontWeight:600}}>Happy Hour · hasta {happyHasta}hs</div>
      <span style={{fontFamily:"monospace",fontSize:14,fontWeight:900,color:"#C9A84C",letterSpacing:2}}>{fmt(secs)}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   WA ORDER FLOW — Pedido completo desde la vitrina
═══════════════════════════════════════════════════ */

function TrackPedido({ pedidoId, initialStatus }) {
  const LABELS = {
    pendiente_pago:  {icon:"⏳", label:"Esperando confirmación de pago", color:"#f59e0b"},
    nuevo:           {icon:"✅", label:"Pago confirmado — en preparación", color:"#22c55e"},
    preparando:      {icon:"👨‍🍳", label:"En cocina", color:"#22c55e"},
    listo:           {icon:"📦", label:"Listo para enviar", color:"#3b82f6"},
    en_camino:       {icon:"🛵", label:"En camino a tu domicilio", color:"#C9A84C"},
    entregado:       {icon:"🎉", label:"Entregado", color:"#22c55e"},
  };
  const [status, setStatus] = React.useState(initialStatus || "pendiente_pago");

  React.useEffect(() => {
    if (!pedidoId || !supabase) return;
    const channel = supabase.channel("track-"+pedidoId)
      .on("postgres_changes", {event:"UPDATE", schema:"public", table:"pedidos", filter:`id=eq.${pedidoId}`},
        (payload) => { if(payload.new?.status) setStatus(payload.new.status); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pedidoId]);

  const info = LABELS[status] || {icon:"📋", label:status, color:"rgba(255,255,255,.5)"};
  const STEPS = ["pendiente_pago","nuevo","preparando","listo","en_camino","entregado"];
  const currentStep = STEPS.indexOf(status);
  const stepDots = STEPS.map((s,i) => {
    const done = i <= currentStep;
    const sl = LABELS[s];
    return (
      <div key={s} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:1}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:done?sl.color:"rgba(255,255,255,.12)",
          transition:"all .4s",boxShadow:done?`0 0 6px ${sl.color}`:"none"}}/>
        <div style={{fontSize:9,color:done?sl.color:"rgba(255,255,255,.2)",textAlign:"center",lineHeight:1.2,fontFamily:"'DM Sans',sans-serif"}}>{sl.icon}</div>
      </div>
    );
  });
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{fontSize:28}}>{info.icon}</div>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:info.color}}>{info.label}</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,.35)",marginTop:2}}>Actualizamos el estado en tiempo real</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",position:"relative",paddingTop:4}}>
        <div style={{position:"absolute",top:9,left:"5%",right:"5%",height:2,background:"rgba(255,255,255,.08)",borderRadius:1}}/>
        <div style={{position:"absolute",top:9,left:"5%",width:Math.max(0,Math.min(currentStep/(STEPS.length-1)*90,90))+"%",height:2,background:info.color,borderRadius:1,transition:"width .5s"}}/>
        {stepDots}
      </div>
    </div>
  );
}

function WAOrderFlow({local, prods, cats, tipo, onClose}) {
  const [step, setStep]     = React.useState(1);
  const [cart, setCart]     = React.useState({});
  const [activeCat, setAC]  = React.useState((cats.filter(c=>c.activa!==false)[0]||{}).id||"");
  const [name, setName]     = React.useState("");
  const [phone, setPhone]   = React.useState("");
  const [direc, setDirec]   = React.useState("");
  const [nota, setNota]     = React.useState("");
  const [saving, setSaving]       = React.useState(false);
  const [done, setDone]           = React.useState(false);
  const [waPay, setWaPay]         = React.useState("");
  const [entreCalles, setEC]      = React.useState("");
  const [direcSugg, setDirecSugg] = React.useState([]);
  const [suggLoading, setSuggLoad]= React.useState(false);
  const [zoneInfo, setZoneInfo]   = React.useState(null); // {zona, distKm} | {fuera,distKm} | null
  const [zoneLoading, setZoneLoad]= React.useState(false);
  const [savedAddrs, setSavedAddrs]= React.useState([]);
  const [pedidoId, setPedidoId]       = React.useState(null);
  const [trackStatus, setTrackStatus]  = React.useState(null);
  const [mapContainerId]          = React.useState("wa-route-map-"+Math.random().toString(36).slice(2));
  const routeMapRef               = React.useRef(null);

  // Load saved addresses when phone changes
  React.useEffect(()=>{
    if(!phone.trim()) return setSavedAddrs([]);
    try {
      const stored = JSON.parse(localStorage.getItem("mq_addrs_"+phone.replace(/\D/g,""))||"[]");
      setSavedAddrs(Array.isArray(stored)?stored:[]);
    } catch { setSavedAddrs([]); }
  },[phone]);

  // TomTom address autocomplete
  const direcTimer = React.useRef(null);
  const handleDirecChange = (val) => {
    setDirec(val);
    setZoneInfo(null);
    clearTimeout(direcTimer.current);
    if(!val.trim()||val.length<4){ setDirecSugg([]); return; }
    setSuggLoad(true);
    direcTimer.current = setTimeout(async()=>{
      try {
        // Nominatim (OpenStreetMap) — free, no API key required
        const rLat = local.delivery_config?.lat || "";
        const rLng = local.delivery_config?.lng || "";
        const viewbox = rLat && rLng ? `&viewbox=${Number(rLng)-0.3},${Number(rLat)+0.2},${Number(rLng)+0.3},${Number(rLat)-0.2}&bounded=0` : "";
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&countrycodes=ar&limit=5${viewbox}`;
        const res = await fetch(url, { headers: { "Accept-Language": "es" } });
        const data = await res.json();
        const suggestions = (data||[]).map(r=>({
          label: r.display_name,
          lat: parseFloat(r.lat), lon: parseFloat(r.lon),
        }));
        setDirecSugg(suggestions.slice(0,5));
      } catch { setDirecSugg([]); }
      finally { setSuggLoad(false); }
    }, 500);
  };

  // Check delivery zone when address is selected
  const [direcPos, setDirecPos] = React.useState(null); // {lat, lon} from autocomplete
  const checkZone = async (sugg) => {
    // sugg can be {label, lat, lon} object or plain string (saved address)
    const label = typeof sugg === "string" ? sugg : sugg.label;
    const pos   = typeof sugg === "object" && sugg.lat ? {lat: sugg.lat, lon: sugg.lon} : null;
    setDirec(label);
    setDirecPos(pos);
    setDirecSugg([]);
    if(!local.delivery_config?.enabled||!local.delivery_config?.lat) return;
    setZoneLoad(true);
    const result = await checkDeliveryZone(label, local, pos);
    setZoneInfo(result);
    setZoneLoad(false);
  };

  // Draw route map (step 3)
  React.useEffect(()=>{
    if(!routeMapRef.current||!TOMTOM_KEY||!direc||!local.delivery_config?.lat) return;
    let map;
    (async()=>{
      try {
        const [{default:tt}, svc] = await Promise.all([
          import("@tomtom-international/web-sdk-maps"),
          import("@tomtom-international/web-sdk-services"),
          import("@tomtom-international/web-sdk-maps/dist/maps.css"),
        ]);
        let cPos = null;
        if(direcPos?.lat) {
          cPos = {lat: direcPos.lat, lon: direcPos.lon};
        } else {
          const geocodeUrl = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(direc)}.json?key=${TOMTOM_KEY}&limit=1&countrySet=AR&lat=${local.delivery_config.lat}&lon=${local.delivery_config.lng}`;
          const geocRes = await fetch(geocodeUrl);
          const geocData = await geocRes.json();
          cPos = geocData?.results?.[0]?.position;
        }
        if(!cPos) return;
        const rLat = local.delivery_config.lat;
        const rLng = local.delivery_config.lng;
        const midLat = (rLat + cPos.lat)/2;
        const midLng = (rLng + cPos.lon)/2;
        map = tt.map({
          key: TOMTOM_KEY,
          container: routeMapRef.current,
          style: "tomtom://vector/1/basic-night",
          center: [midLng, midLat],
          zoom: 11,
        });
        map.on("load", async()=>{
          // Restaurant marker
          const rEl = document.createElement("div");
          rEl.style.cssText="width:14px;height:14px;background:#C9A84C;border:2px solid #fff;border-radius:50%";
          new tt.Marker({element:rEl}).setLngLat([rLng, rLat]).addTo(map);
          // Customer marker
          const cEl = document.createElement("div");
          cEl.style.cssText="width:14px;height:14px;background:#25D366;border:2px solid #fff;border-radius:50%";
          new tt.Marker({element:cEl}).setLngLat([cPos.lon, cPos.lat]).addTo(map);
          // Route
          try {
            const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${rLat},${rLng}:${cPos.lat},${cPos.lon}/json?key=${TOMTOM_KEY}&routeType=fastest&traffic=true`;
            const routeRes = await fetch(routeUrl);
            const routeData = await routeRes.json();
            const coords = (routeData?.routes?.[0]?.legs?.[0]?.points||[]).map(p=>[p.longitude, p.latitude]);
            if(coords.length>0){
              map.addSource("route",{type:"geojson",data:{type:"Feature",geometry:{type:"LineString",coordinates:coords}}});
              map.addLayer({id:"route-line",type:"line",source:"route",paint:{"line-color":"#25D366","line-width":4,"line-opacity":0.85}});
              // Update ETA from actual route
              const secs = routeData?.routes?.[0]?.summary?.travelTimeInSeconds;
              if(secs && setZoneInfo) {
                const mins = Math.round(secs/60);
                setZoneInfo(zi=> zi? {...zi, etaMins: mins} : null);
              }
            }
          } catch(e){ console.warn("route err",e); }
        });
      } catch(e){ console.warn("map err",e); }
    })();
    return ()=>{ if(map) try{map.remove();}catch(_){} };
  },[step===3, direc, direcPos, !!zoneInfo]);

  const activeCats = cats.filter(c=>c.activa!==false);
  const catProds   = prods.filter(p=>p.cat===activeCat&&(p.active||p.active==null));
  const cartItems  = Object.entries(cart).filter(([,q])=>q>0).map(([id,qty])=>{
    const p=prods.find(x=>String(x.id)===String(id)); return p?{...p,qty}:null;
  }).filter(Boolean);
  const total = cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const totalQty = cartItems.reduce((s,i)=>s+i.qty,0);

  const addItem = p => setCart(c=>({...c,[p.id]:(c[p.id]||0)+1}));
  const remItem = p => setCart(c=>{const q=(c[p.id]||0)-1;if(q<=0){const n={...c};delete n[p.id];return n;}return{...c,[p.id]:q};});

  const canGoStep2 = cartItems.length>0;
  const canGoStep3 = name.trim()&&(tipo!=="delivery"||direc.trim());

  const WASVG = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.996 0C5.374 0 0 5.373 0 11.996c0 2.133.56 4.133 1.54 5.867L.047 23.53a.5.5 0 00.612.632l5.828-1.528A11.935 11.935 0 0011.996 24C18.619 24 24 18.619 24 11.996 24 5.373 18.619 0 11.996 0zm0 21.818a9.794 9.794 0 01-4.992-1.367l-.358-.212-3.718.975 1.002-3.618-.234-.372a9.794 9.794 0 01-1.518-5.228c0-5.419 4.409-9.818 9.818-9.818s9.818 4.399 9.818 9.818-4.399 9.822-9.818 9.822z"/>
    </svg>
  );

  const saveAddress = () => {
    if(!phone.trim()||!direc.trim()) return;
    try {
      const key = "mq_addrs_"+phone.replace(/\D/g,"");
      const existing = JSON.parse(localStorage.getItem(key)||"[]");
      const updated = [direc, ...existing.filter(a=>a!==direc)].slice(0,3);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  };

  const sendWA = async () => {
    setSaving(true);
    if(tipo==="delivery") {
      saveAddress();
      const deliveryCost = (zoneInfo&&!zoneInfo.fuera)?(zoneInfo.zona.precio||0):(local.delivery_precio||0);
      const totalConEnvio = total + deliveryCost;
      try {
        const pid = crypto.randomUUID();
        const notaStr = ["DELIVERY","Dir:"+direc,entreCalles?"Entre:"+entreCalles:null,
          "Cliente:"+name,phone?"Tel:"+phone:null,nota?"Obs:"+nota:null
        ].filter(Boolean).join(" | ");
        if(supabase && local.restauranteId) {
          const {error:_pedErr}=await supabase.from("pedidos").insert({
            id:pid, restaurante_id:local.restauranteId,
            mesa_numero:0, status:"pendiente_pago", metodo_pago:waPay||"transferencia",
            propina:0, total:totalConEnvio, nota:notaStr,
            tipo_pedido:"delivery",
            nombre_cliente:name||null,
            telefono_cliente:phone||null,
            direccion_cliente:direc||null,
            entrecalles:entreCalles||null,
          });
          if(_pedErr) throw new Error("pedidos: "+_pedErr.message);
          const {error:_itmErr}=await supabase.from("pedido_items").insert(
            cartItems.map(i=>({pedido_id:pid,producto_id:i.id,nombre:i.name||"?",precio:Math.round(i.price||0),cantidad:i.qty}))
          );
          if(_itmErr) throw new Error("items: "+_itmErr.message);
        }
        setPedidoId(pid);
        setTrackStatus("pendiente_pago");
      } catch(e){ console.warn("delivery err",e); }
      setSaving(false);
      setDone(true);
      return;
    }
    // Retiro: abre WhatsApp
    const totalConEnvio = total;
    if(supabase && local.restauranteId) {
      try {
        const pid = crypto.randomUUID();
        const notaStr = ["RETIRO","Cliente:"+name,phone?"Tel:"+phone:null,nota?"Nota:"+nota:null].filter(Boolean).join(" | ");
        const {error:_pedErr2}=await supabase.from("pedidos").insert({
          id:pid, restaurante_id:local.restauranteId,
          mesa_numero:0, status:"nuevo", metodo_pago:waPay||"whatsapp",
          propina:0, total:totalConEnvio, nota:notaStr,
          tipo_pedido:"retiro",
          nombre_cliente:name||null,
          telefono_cliente:phone||null,
        });
        if(_pedErr2) throw new Error("pedidos: "+_pedErr2.message);
        const {error:_itmErr2}=await supabase.from("pedido_items").insert(
          cartItems.map(i=>({pedido_id:pid,producto_id:i.id,nombre:i.name||"?",precio:Math.round(i.price||0),cantidad:i.qty}))
        );
        if(_itmErr2) throw new Error("items: "+_itmErr2.message);
      } catch(e){ console.warn("wa order err",e); }
    }
    const lineas = cartItems.map(i=>"• "+i.qty+"x "+i.name+" — $"+fmt(i.price*i.qty)).join("\n");
    const msg = "*Hola "+local.nombre+"! Quiero hacer un pedido* 🍽️\n\n"
      +"🏪 *RETIRO en el local*\n"
      +"👤 "+name+(phone?" · 📱 "+phone:"")+"\n\n"
      +"*Mi pedido:*\n"+lineas+"\n\n💰 *Total: $"+fmt(totalConEnvio)+"*"
      +(nota?"\n📝 "+nota:"")
      +(waPay?"\n💳 Pago: "+{"efectivo":"Efectivo","debito":"Débito","mp":"Mercado Pago","trans":"Transferencia"}[waPay]:"");
    window.open("https://wa.me/"+(local.whatsapp_vitrina_numero||local.telefono||"").replace(/\D/g,"")+"?text="+encodeURIComponent(msg),"_blank");
    setSaving(false);
    setDone(true);
  };
  const TRACK_LABELS = {
    pendiente_pago:"⏳ Esperando pago",
    nuevo:"✅ Pago confirmado — preparando",
    preparando:"👨‍🍳 En cocina",
    listo:"📦 Listo para enviar",
    en_camino:"🛵 En camino",
    entregado:"✅ Entregado"
  };

  if(done && tipo==="delivery") return (
    <div style={{position:"fixed",inset:0,background:"var(--cb)",zIndex:9999,
      display:"flex",flexDirection:"column",overflowY:"auto"}}>
      <div style={{padding:"16px",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",border:"none",color:"var(--cbri)",cursor:"pointer",fontSize:18,width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
      </div>
      <div style={{padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:16}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(201,168,76,.15)",border:"2px solid #C9A84C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>🛵</div>
        <div>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,color:"var(--cbri)",marginBottom:6}}>¡Pedido registrado!</h2>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"rgba(255,255,255,.5)",lineHeight:1.6}}>Completá el pago para que empecemos a prepararlo.</p>
        </div>
        {/* Estado del pedido */}
        <div style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",textAlign:"left"}}>
          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(255,255,255,.3)",letterSpacing:2,marginBottom:8}}>ESTADO DEL PEDIDO</p>
          <TrackPedido pedidoId={pedidoId} initialStatus={trackStatus}/>
        </div>
        {/* Alias para pagar */}
        {local.alias_pago&&(
          <div style={{width:"100%",background:"rgba(201,168,76,.08)",border:"1px solid rgba(201,168,76,.35)",borderRadius:14,padding:"14px 16px",textAlign:"left"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(201,168,76,.8)",letterSpacing:2,marginBottom:10}}>ALIAS PARA EL PAGO</p>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,fontWeight:700,color:"#fff"}}>{local.alias_pago}</div>
              <button onClick={()=>navigator.clipboard.writeText(local.alias_pago)}
                style={{background:"#C9A84C",border:"none",borderRadius:8,padding:"8px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:"#1C1008",cursor:"pointer"}}>📋 Copiar</button>
            </div>
            {local.alias_titular&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,.4)",marginTop:4}}>Titular: {local.alias_titular}</p>}
          </div>
        )}
        {/* Enviar comprobante */}
        {(local.telefono||local.whatsapp_vitrina_numero)&&(
          <div style={{width:"100%",background:"rgba(201,168,76,.08)",border:"1px solid rgba(201,168,76,.3)",borderRadius:10,padding:"10px 14px",marginBottom:8,textAlign:"center",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#D4A843",lineHeight:1.5}}>
            💬 Una vez hecho el pago, compartí el comprobante a este número:<br/>
            <span style={{fontWeight:800,fontSize:15}}>
              {local.whatsapp||local.whatsapp_vitrina_numero||local.telefono||"—"}
            </span>
          </div>
        )}
        {(local.telefono||local.whatsapp_vitrina_numero)&&(
          <button onClick={()=>window.open("https://wa.me/"+(local.telefono||local.whatsapp_vitrina_numero||"").replace(/\D/g,"")+"?text="+encodeURIComponent("Hola! Te mando el comprobante de pago de mi pedido 🧾"),"_blank")}
            style={{width:"100%",background:"#25D366",border:"none",borderRadius:12,padding:"14px",fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            📲 Enviar comprobante por WhatsApp
          </button>
        )}
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,.3)",lineHeight:1.6}}>
          Tu pedido estará visible aquí. Actualizamos el estado a medida que avanza.
        </p>
      </div>
    </div>
  );

  if(done) return (
    <div style={{position:"fixed",inset:0,background:"var(--cb)",zIndex:9999,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:32,textAlign:"center"}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(37,211,102,.15)",
        border:"2px solid #25D366",display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:36,marginBottom:20}}>✅</div>
      <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,color:"var(--cbri)",marginBottom:8}}>¡Pedido armado!</h2>
      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"var(--cm)",marginBottom:6,lineHeight:1.6}}>
        Se abrió WhatsApp con tu pedido escrito.<br/>Solo tocá <b style={{color:"#25D366"}}>Enviar</b> y el local lo recibe.
      </p>
      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"rgba(255,255,255,.35)",marginBottom:28}}>
        🏪 Retiro — te avisan cuando está listo
      </p>
      <button onClick={onClose} style={{background:"#25D366",color:"#fff",border:"none",
        borderRadius:12,padding:"14px 36px",fontFamily:"'Outfit',sans-serif",
        fontSize:15,fontWeight:700,cursor:"pointer"}}>
        Volver
      </button>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"var(--cb)",zIndex:9999,
      display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div style={{padding:"14px 16px 10px",borderBottom:"1px solid rgba(255,255,255,.07)",
        display:"flex",alignItems:"center",gap:10,flexShrink:0,
        background:"rgba(0,0,0,.3)",backdropFilter:"blur(10px)"}}>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",border:"none",
          color:"var(--cbri)",cursor:"pointer",fontSize:18,width:34,height:34,
          borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:800,color:"var(--cbri)",lineHeight:1}}>
            {tipo==="delivery"?"🛵 Pedir con delivery":"🏪 Retirar en local"}
          </div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#25D366",marginTop:1}}>{local.nombre}</div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          {[1,2,3].map(s=>(
            <div key={s} style={{height:6,borderRadius:3,transition:"all .3s",
              width:step>=s?20:6,
              background:step>=s?"#25D366":"rgba(255,255,255,.15)"}}/>
          ))}
        </div>
      </div>

      {/* Step labels */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
        {[{n:1,l:"Tu pedido"},{n:2,l:"Tus datos"},{n:3,l:"Confirmar"}].map(s=>(
          <div key={s.n} style={{flex:1,textAlign:"center",padding:"8px 4px",
            borderBottom:step===s.n?"2px solid #25D366":"2px solid transparent",
            fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:1,
            color:step===s.n?"#25D366":step>s.n?"rgba(37,211,102,.5)":"rgba(255,255,255,.25)"}}>
            {step>s.n?"✓ ":""}{s.l.toUpperCase()}
          </div>
        ))}
      </div>

      {/* STEP 1 — Productos */}
      {step===1 && (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto",
            flexShrink:0,borderBottom:"1px solid rgba(255,255,255,.05)"}}>
            {activeCats.map(c=>(
              <button key={c.id} onClick={()=>setAC(c.id)} style={{
                background:activeCat===c.id?"rgba(37,211,102,.15)":"rgba(255,255,255,.04)",
                border:"1px solid "+(activeCat===c.id?"rgba(37,211,102,.4)":"rgba(255,255,255,.1)"),
                borderRadius:20,padding:"6px 14px",cursor:"pointer",whiteSpace:"nowrap",
                fontFamily:"'DM Sans',sans-serif",fontSize:13,
                fontWeight:activeCat===c.id?700:400,
                color:activeCat===c.id?"#25D366":"var(--cm)"}}>
                {c.nombre}
              </button>
            ))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"4px 16px 8px"}}>
            {catProds.length===0 && (
              <p style={{textAlign:"center",color:"rgba(255,255,255,.3)",
                fontFamily:"'DM Sans',sans-serif",fontSize:13,padding:32}}>
                No hay productos en esta categoría
              </p>
            )}
            {catProds.map(p=>{
              const qty=cart[p.id]||0;
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  {p.img&&<img src={p.img} alt={p.name} style={{width:52,height:52,
                    borderRadius:10,objectFit:"cover",flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,
                      color:"var(--cbri)",lineHeight:1.2,marginBottom:2}}>{p.name}</div>
                    {p.desc&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,
                      color:"var(--cm)",overflow:"hidden",display:"-webkit-box",
                      WebkitLineClamp:1,WebkitBoxOrient:"vertical"}}>{p.desc}</div>}
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,
                      fontWeight:700,color:"#25D366",marginTop:3}}>${fmt(p.price)}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    {qty>0?(
                      <>
                        <button onClick={()=>remItem(p)} style={{width:30,height:30,borderRadius:8,
                          background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",
                          color:"var(--cbri)",fontSize:18,cursor:"pointer",
                          display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>−</button>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,
                          fontWeight:700,color:"#25D366",minWidth:20,textAlign:"center"}}>{qty}</span>
                        <button onClick={()=>addItem(p)} style={{width:30,height:30,borderRadius:8,
                          background:"#25D366",border:"none",color:"#fff",fontSize:18,cursor:"pointer",
                          display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
                      </>
                    ):(
                      <button onClick={()=>addItem(p)} style={{width:30,height:30,borderRadius:8,
                        background:"rgba(37,211,102,.12)",border:"1px solid rgba(37,211,102,.3)",
                        color:"#25D366",fontSize:18,cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2 — Datos */}
      {step===2 && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
          {/* Nombre */}
          <div style={{marginBottom:16}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:7,textTransform:"uppercase"}}>Tu nombre *</p>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Juan García"
              style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,padding:"12px 14px",color:"var(--cbri)",fontSize:14,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
          {/* Teléfono */}
          <div style={{marginBottom:16}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:7,textTransform:"uppercase"}}>Teléfono</p>
            <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="1123456789"
              style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,padding:"12px 14px",color:"var(--cbri)",fontSize:14,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
          {tipo==="delivery" && (<>
            {/* Saved addresses */}
            {savedAddrs.length>0&&(
              <div style={{marginBottom:12}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:1.5,color:"rgba(37,211,102,.6)",marginBottom:6,textTransform:"uppercase"}}>📍 Direcciones anteriores</p>
                {savedAddrs.map((a,i)=>(
                  <button key={i} onClick={()=>checkZone(a)} style={{
                    width:"100%",textAlign:"left",background:"rgba(37,211,102,.07)",
                    border:"1px solid rgba(37,211,102,.2)",borderRadius:8,
                    padding:"9px 12px",color:"var(--cbri)",fontSize:13,
                    fontFamily:"'DM Sans',sans-serif",cursor:"pointer",marginBottom:5}}>
                    📍 {a}
                  </button>
                ))}
              </div>
            )}
            {/* Dirección con autocomplete */}
            <div style={{marginBottom:8,position:"relative"}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:7,textTransform:"uppercase"}}>Dirección de entrega *</p>
              <input type="text" value={direc} onChange={e=>handleDirecChange(e.target.value)}
                placeholder="Calle, número, piso..."
                style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,padding:"12px 14px",color:"var(--cbri)",fontSize:14,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}}/>
              {direc.length>3&&!direcSugg.length&&!suggLoading&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,.35)",marginTop:5,marginBottom:0}}>💡 Si no aparecen sugerencias podés escribir la dirección completa manualmente</p>}
              {suggLoading&&<span style={{position:"absolute",right:14,top:38,fontSize:11,color:"rgba(255,255,255,.3)"}}>...</span>}
              {direcSugg.length>0&&(
                <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a1a1a",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,zIndex:99,overflow:"hidden",marginTop:2}}>
                  {direcSugg.map((s,i)=>(
                    <button key={i} onClick={()=>checkZone(s)} style={{
                      width:"100%",textAlign:"left",background:"transparent",border:"none",
                      borderBottom:i<direcSugg.length-1?"1px solid rgba(255,255,255,.07)":"none",
                      padding:"10px 14px",color:"var(--cbri)",fontSize:13,
                      fontFamily:"'DM Sans',sans-serif",cursor:"pointer"}}>
                      📍 {typeof s==="string"?s:s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Zone info */}
            {zoneLoading&&<p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"rgba(255,255,255,.35)",marginBottom:10}}>Verificando zona...</p>}
            {zoneInfo&&!zoneInfo.fuera&&(
              <div style={{background:"rgba(37,211,102,.08)",border:"1px solid rgba(37,211,102,.25)",borderRadius:10,padding:"10px 14px",marginBottom:10}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#00FF88",margin:0}}>
                  ✓ {zoneInfo.zona.nombre} · {zoneInfo.distKm} km · ${zoneInfo.zona.precio} envío · ~{zoneInfo.zona.minutos} min
                </p>
              </div>
            )}
            {zoneInfo&&zoneInfo.fuera&&(
              <div style={{background:"rgba(255,68,68,.08)",border:"1px solid rgba(255,68,68,.25)",borderRadius:10,padding:"10px 14px",marginBottom:10}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#FF4444",margin:0}}>
                  ⚠️ Esta dirección está fuera de nuestra zona de delivery
                </p>
              </div>
            )}
            {/* Entre calles */}
            <div style={{marginBottom:16}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:7,textTransform:"uppercase"}}>Entre calles</p>
              <input type="text" value={entreCalles} onChange={e=>setEC(e.target.value)} placeholder="Ej: Lavalle y Corrientes"
                style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,padding:"12px 14px",color:"var(--cbri)",fontSize:14,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}}/>
            </div>
          </>)}
          {/* Observaciones */}
          <div style={{marginBottom:16}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:7,textTransform:"uppercase"}}>Observaciones / alergias</p>
            <textarea value={nota} onChange={e=>setNota(e.target.value)} placeholder="Sin cebolla, doble queso, alérgico a..." rows={3}
              style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,padding:"12px 14px",color:"var(--cbri)",fontSize:14,resize:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
        </div>
      )}

      {/* STEP 3 — Confirmar */}
      {step===3 && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
          <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",
            borderRadius:14,padding:"14px 16px",marginBottom:12}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(255,255,255,.3)",
              letterSpacing:2,marginBottom:12}}>TU PEDIDO</p>
            {cartItems.map(i=>(
              <div key={i.id} style={{display:"flex",justifyContent:"space-between",
                padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.05)",
                fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--cbri)"}}>
                <span>{i.qty}× {i.name}</span>
                <span style={{color:"#25D366"}}>${fmt(i.price*i.qty)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,
              fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:800}}>
              <span style={{color:"var(--cbri)"}}>Total</span>
              <span style={{color:"#25D366"}}>${fmt(total)}</span>
            </div>
          </div>
          <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",
            borderRadius:14,padding:"14px 16px",marginBottom:16}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(255,255,255,.3)",
              letterSpacing:2,marginBottom:10}}>DATOS DE ENTREGA</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--cbri)",marginBottom:4}}>
              {tipo==="delivery"?"📍 Delivery a: "+direc+(entreCalles?" (entre "+entreCalles+")":""):"🏪 Retiro en el local"}
            </p>
            {tipo==="delivery"&&zoneInfo&&!zoneInfo.fuera&&(
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#00FF88",marginBottom:4}}>
                🛵 {zoneInfo.zona.nombre} · ${zoneInfo.zona.precio} envío · ~{zoneInfo.etaMins||zoneInfo.zona.minutos} min
              </p>
            )}
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"rgba(255,255,255,.5)"}}>
              👤 {name}{phone?" · 📱 "+phone:""}
            </p>
            {nota&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"rgba(255,255,255,.35)",marginTop:4}}>📝 {nota}</p>}
            {tipo==="delivery"&&TOMTOM_KEY&&direc&&local.delivery_config?.lat&&(
              <div ref={routeMapRef} style={{width:"100%",height:160,borderRadius:10,overflow:"hidden",marginTop:10,border:"1px solid rgba(255,255,255,.1)"}}/>
            )}
          </div>
          {/* Forma de pago WA */}
          <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(255,255,255,.3)",letterSpacing:2,marginBottom:10}}>FORMA DE PAGO</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                ...(tipo!=="delivery"?[
                  {id:"efectivo",icon:"💵",label:"Efectivo"},
                  {id:"debito",icon:"💳",label:"Débito"},
                ]:[]),
                {id:"mp",icon:"📲",label:"Mercado Pago"},
                {id:"trans",icon:"🏦",label:"Transferencia"},
              ].map(p=>(
                <button key={p.id} onClick={()=>setWaPay(p.id)}
                  style={{background:waPay===p.id?"rgba(37,211,102,.15)":"rgba(255,255,255,.04)",
                    border:`2px solid ${waPay===p.id?"#25D366":"rgba(255,255,255,.12)"}`,
                    borderRadius:12,padding:"12px 10px",cursor:"pointer",textAlign:"left",transition:"all .15s",position:"relative"}}>
                  <span style={{fontSize:22,display:"block",marginBottom:5}}>{p.icon}</span>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,color:waPay===p.id?"#25D366":"rgba(255,255,255,.55)"}}>{p.label}</div>
                  {waPay===p.id&&<div style={{position:"absolute",top:7,right:7,width:16,height:16,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:800}}>✓</div>}
                </button>
              ))}
            </div>
          </div>
          {/* Alias MP / Transferencia en WAOrderFlow */}
          {(waPay==="mp"||waPay==="trans")&&local.alias_pago&&(
            <div style={{background:"rgba(201,168,76,.08)",border:"1px solid rgba(201,168,76,.35)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:2,color:"rgba(201,168,76,.8)",marginBottom:10,textTransform:"uppercase"}}>
                {waPay==="mp"?"💳 Pagar con Mercado Pago":"🏦 Transferencia bancaria"}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:local.alias_titular?6:0}}>
                <div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:19,fontWeight:700,color:"#fff",letterSpacing:.5}}>{local.alias_pago}</div>
                  {local.alias_titular&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,.45)",marginTop:3}}>Titular: {local.alias_titular}</div>}
                </div>
                <button onClick={()=>navigator.clipboard.writeText(local.alias_pago)}
                  style={{background:"#C9A84C",border:"none",borderRadius:9,padding:"9px 16px",fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,color:"#1C1008",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                  📋 Copiar
                </button>
              </div>
              {tipo==="delivery"&&(
                <div style={{background:"rgba(37,211,102,.08)",border:"1px solid rgba(37,211,102,.2)",borderRadius:10,padding:"10px 12px",marginTop:10}}>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"rgba(255,255,255,.65)",margin:"0 0 4px",lineHeight:1.6}}>
                    Hacé el pago y después enviá el comprobante por WhatsApp. Tu pedido entra a preparación cuando confirmemos el pago.
                  </p>
                  {(local.telefono||local.whatsapp_vitrina_numero)&&(
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#D4A843",margin:"0 0 8px",lineHeight:1.5,textAlign:"center"}}>
                      📱 Compartí el comprobante a este número:<br/>
                      <strong>{local.whatsapp||local.whatsapp_vitrina_numero||local.telefono}</strong>
                    </p>
                  )}
                  {(local.telefono||local.whatsapp_vitrina_numero)&&(
                    <button onClick={()=>window.open("https://wa.me/"+(local.telefono||local.whatsapp_vitrina_numero||"").replace(/\D/g,"")+"?text="+encodeURIComponent("Hola! Te envío el comprobante de pago de mi pedido 🧾"),"_blank")}
                      style={{background:"#25D366",border:"none",borderRadius:8,padding:"9px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      📲 Enviar comprobante por WhatsApp
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {tipo!=="delivery"&&(
          <div style={{background:"rgba(37,211,102,.06)",border:"1px solid rgba(37,211,102,.2)",
            borderRadius:12,padding:"12px 16px",marginBottom:16}}>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"rgba(255,255,255,.45)",lineHeight:1.6}}>
              Al tocar <b style={{color:"#25D366"}}>Enviar por WhatsApp</b> se abre la app con el pedido ya escrito. Solo tocás enviar y el local lo recibe de inmediato.
            </p>
          </div>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div style={{padding:"10px 16px 24px",borderTop:"1px solid rgba(255,255,255,.07)",
        background:"var(--cb)",flexShrink:0}}>
        {step===1 && cartItems.length>0&&(
          <div style={{display:"flex",justifyContent:"space-between",
            alignItems:"center",marginBottom:10,padding:"0 2px"}}>
            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"rgba(255,255,255,.4)"}}>
              {totalQty} {totalQty===1?"producto":"productos"}
            </span>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,
              fontWeight:700,color:"#25D366"}}>${fmt(total)}</span>
          </div>
        )}
        {step===1&&(
          <button onClick={()=>setStep(2)} disabled={!canGoStep2}
            style={{width:"100%",background:canGoStep2?"#25D366":"rgba(255,255,255,.08)",
              color:canGoStep2?"#fff":"rgba(255,255,255,.25)",border:"none",
              borderRadius:12,padding:"14px",fontFamily:"'Outfit',sans-serif",
              fontSize:15,fontWeight:700,cursor:canGoStep2?"pointer":"default"}}>
            {canGoStep2?"Continuar — "+totalQty+" productos →":"Agregá productos para continuar"}
          </button>
        )}
        {step===2&&(
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(1)} style={{flex:1,background:"rgba(255,255,255,.06)",
              border:"1px solid rgba(255,255,255,.12)",color:"var(--cbri)",borderRadius:12,
              padding:14,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer"}}>
              ← Atrás
            </button>
            <button onClick={()=>{ setStep(3); if(tipo==="delivery"&&direc.trim()&&!zoneInfo&&local.delivery_config?.enabled&&local.delivery_config?.lat) checkZone(direc); }} disabled={!canGoStep3}
              style={{flex:2,background:canGoStep3?"#25D366":"rgba(255,255,255,.08)",
                color:canGoStep3?"#fff":"rgba(255,255,255,.25)",border:"none",
                borderRadius:12,padding:14,fontFamily:"'Outfit',sans-serif",
                fontSize:15,fontWeight:700,cursor:canGoStep3?"pointer":"default"}}>
              Ver resumen →
            </button>
          </div>
        )}
        {step===3&&(
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(2)} style={{flex:1,background:"rgba(255,255,255,.06)",
              border:"1px solid rgba(255,255,255,.12)",color:"var(--cbri)",borderRadius:12,
              padding:14,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer"}}>
              ← Atrás
            </button>
            <button onClick={sendWA} disabled={saving||(tipo==="delivery"&&!(waPay==="mp"||waPay==="trans"))}
              style={{flex:2,background:saving?"rgba(37,211,102,.5)":(tipo==="delivery"&&!(waPay==="mp"||waPay==="trans"))?"rgba(255,255,255,.08)":"#25D366",
                color:(tipo==="delivery"&&!(waPay==="mp"||waPay==="trans"))?"rgba(255,255,255,.25)":"#fff",border:"none",borderRadius:12,padding:14,
                fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {tipo==="delivery"
                ? (saving?"Registrando...":"🛵 Confirmar pedido")
                : <>{WASVG()}{saving?"Abriendo WhatsApp...":"Enviar por WhatsApp"}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function VitrinaInfo({local, cats, prods}) {
const [mesasData, setMesasData] = React.useState({libres:0, ocupadas:0, total:0, hayMesas:false});
const [copied, setCopied] = React.useState(false);
const [showDescuento, setShowDescuento] = React.useState(false);
const [showCarta, setShowCarta] = React.useState(false);
const [cartaCat, setCartaCat] = React.useState(null);

React.useEffect(()=>{
  if(!supabase||!local.restauranteId) return;
  const load = async () => {
    const {data} = await supabase.from("mesas")
      .select("id,status")
      .eq("restaurante_id", local.restauranteId);
    if(data && data.length > 0) {
      const libres = data.filter(m=>m.status==="libre").length;
      const ocupadas = data.filter(m=>m.status==="ocupado").length;
      setMesasData({libres, ocupadas, total:data.length, hayMesas:true});
    }
  };
  load();
  const ch = supabase.channel("vitrina-mesas-"+local.restauranteId)
    .on("postgres_changes",{event:"*",schema:"public",table:"mesas",
      filter:`restaurante_id=eq.${local.restauranteId}`}, load)
    .subscribe();
  return ()=>supabase.removeChannel(ch);
},[]);

const waNum = local.phone || local.wpp || local.whatsapp || local.telefono || "";

const handleCopyWA = () => {
  if(!waNum) return;
  navigator.clipboard.writeText(waNum).then(()=>{
    setCopied(true);
    setTimeout(()=>setCopied(false), 2500);
  }).catch(()=>{
    const el = document.createElement("textarea");
    el.value = waNum;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2500);
  });
};

const platos = [
  {src:"https://images.unsplash.com/photo-1558030006-450675393462?w=300&h=300&fit=crop", nombre:"Bife Premium"},
  {src:"https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop", nombre:"Pizza Artesanal"},
  {src:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop", nombre:"Hamburguesa Gourmet"},
  {src:"https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=300&fit=crop", nombre:"Pasta Fresca"},
  {src:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop", nombre:"Bowl Verde"},
  {src:"https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=300&fit=crop", nombre:"Vinos Selectos"},
];

const pasos = [
  {ico:"📱", t:"Escaneás el QR", d:"Cada mesa tiene su código único"},
  {ico:"🍽️", t:"Elegís de la carta", d:"Menú completo con fotos y precios"},
  {ico:"👨‍🍳", t:"Entra a cocina", d:"Sin intermediarios, al instante"},
  {ico:"🔔", t:"Lo recibís en la mesa", d:"Sentate y disfrutá"},
];

const pct = mesasData.total > 0 ? Math.round((mesasData.ocupadas / mesasData.total) * 100) : 0;
const circleR = 36;
const circleC = 2 * Math.PI * circleR;

return (
  <div style={{background:"#0a0a0a", minHeight:"100vh", fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#fff", overflowX:"hidden"}}>

    <style>{`
      @keyframes vitFadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      @keyframes vitPulse { 0%,100% { box-shadow:0 0 0 0 rgba(0,255,136,.5); } 70% { box-shadow:0 0 0 8px rgba(0,255,136,0); } }
      .vit-s1 { animation: vitFadeUp .55s .05s ease both; }
      .vit-s2 { animation: vitFadeUp .55s .15s ease both; }
      .vit-s3 { animation: vitFadeUp .55s .25s ease both; }
      .vit-s4 { animation: vitFadeUp .55s .35s ease both; }
      .vit-s5 { animation: vitFadeUp .55s .45s ease both; }
      .vit-plate { transition: transform .3s ease; overflow:hidden; border-radius:18px; }
      .vit-plate:hover { transform: scale(1.03); }
      .vit-plate:hover .vit-overlay { opacity:1 !important; }
      .vit-plate img { transition: transform .4s ease; width:100%; height:100%; object-fit:cover; display:block; }
      .vit-plate:hover img { transform: scale(1.1); }
      .vit-copy-btn:active { transform: scale(.97); }
      .vit-s6 { animation: vitFadeUp .55s .50s ease both; }
      .vit-s7 { animation: vitFadeUp .55s .55s ease both; }
    `}</style>

    {/* ===== HERO ===== */}
    <div style={{position:"relative", height:400, overflow:"hidden"}}>
      <img
        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=500&fit=crop"
        alt="restaurante"
        style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}}
      />
      <div style={{position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,.88) 100%)"}}/>
      <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", padding:"0 24px 44px", textAlign:"center"}}>
        {local.logo_url && (
          <img src={local.logo_url} alt="logo" style={{width:76, height:76, borderRadius:20, objectFit:"cover", border:"2px solid rgba(201,168,76,.65)", marginBottom:16, boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}/>
        )}
        <h1 style={{margin:"0 0 10px", fontSize:40, fontWeight:900, color:"#fff", letterSpacing:"-1.5px", lineHeight:1, textShadow:"0 4px 24px rgba(0,0,0,.6)"}}>{local.nombre}</h1>
        {local.descripcion && (
          <p style={{margin:"0 0 20px", fontSize:14, color:"rgba(255,255,255,.6)", lineHeight:1.55, maxWidth:280}}>{local.descripcion}</p>
        )}
        <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center"}}>
          <div style={{display:"inline-flex", alignItems:"center", gap:7, background:"rgba(255,255,255,.1)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,.18)", borderRadius:100, padding:"7px 15px"}}>
            <div style={{width:7, height:7, borderRadius:"50%", background:"#00FF88", animation:"vitPulse 2s ease-in-out infinite", flexShrink:0}}/>
            <span style={{fontSize:12, fontWeight:700, color:"#fff"}}>Abierto ahora</span>
          </div>
          <div style={{display:"inline-flex", alignItems:"center", gap:7, background:"rgba(232,160,32,.18)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:"1px solid rgba(232,160,32,.4)", borderRadius:100, padding:"7px 15px"}}>
            <span style={{fontSize:12, fontWeight:700, color:"#e8a020"}}>✦ Menú Digital</span>
          </div>
        </div>
      </div>
    </div>

    <div style={{padding:"24px 14px 64px", display:"flex", flexDirection:"column", gap:20, maxWidth:520, margin:"0 auto"}}>

      {/* ===== CÓMO FUNCIONA ===== */}
      <div className="vit-s1" style={{background:"rgba(255,255,255,.03)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(201,168,76,.2)", borderRadius:24, padding:"22px 18px", position:"relative", overflow:"hidden"}}>
        <div style={{position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(201,168,76,.5), transparent)"}}/>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:20}}>
          <div style={{width:30, height:30, borderRadius:9, background:"linear-gradient(135deg,#e8a020,#c9a84c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0}}>✦</div>
          <span style={{fontSize:12, fontWeight:800, color:"rgba(255,255,255,.85)", letterSpacing:1.8, textTransform:"uppercase"}}>Cómo funciona</span>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          {pasos.map((p,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"16px 13px", position:"relative", overflow:"hidden"}}>
              <div style={{position:"absolute", top:9, right:11, fontSize:10, fontWeight:900, color:"rgba(201,168,76,.22)", letterSpacing:.5}}>0{i+1}</div>
              <div style={{fontSize:28, marginBottom:10}}>{p.ico}</div>
              <div style={{fontSize:13, fontWeight:700, color:"rgba(255,255,255,.88)", lineHeight:1.25, marginBottom:5}}>{p.t}</div>
              <div style={{fontSize:11, color:"rgba(255,255,255,.36)", lineHeight:1.4}}>{p.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== CARTA ===== */}
      <div className="vit-s2" style={{background:"rgba(255,255,255,.03)", border:"1px solid rgba(201,168,76,.25)", borderRadius:24, padding:"20px 18px", display:"flex", alignItems:"center", gap:16}}>
        <div style={{flex:1}}>
          <div style={{width:50, height:50, borderRadius:"50%", border:"2px solid rgba(201,168,76,.4)", background:"rgba(201,168,76,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:12}}>📖</div>
          <div style={{fontFamily:"Georgia,serif", fontSize:30, fontWeight:900, color:"#fff", lineHeight:1, marginBottom:4}}>CARTA</div>
          <div style={{fontSize:9, fontWeight:700, letterSpacing:2, color:"rgba(201,168,76,.8)", marginBottom:14}}>EXPLORÁ NUESTRO MENÚ</div>
          <button onClick={()=>{setShowCarta(true); setCartaCat(null);}}
            style={{display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#b8900a,#c9a020,#e0b830)", color:"#000", fontSize:12, fontWeight:800, letterSpacing:1, padding:"10px 18px", borderRadius:8, border:"none", cursor:"pointer"}}>
            VER CARTA &nbsp;›
          </button>
        </div>
        {prods&&prods.length>0&&prods.find(p=>p.imagen) ? (
          <img src={prods.find(p=>p.imagen).imagen} alt="plato" style={{width:105, height:105, borderRadius:12, objectFit:"cover", flexShrink:0, border:"1px solid rgba(201,168,76,.2)"}}/>
        ) : (
          <img src="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=300&fit=crop" alt="plato" style={{width:105, height:105, borderRadius:12, objectFit:"cover", flexShrink:0, border:"1px solid rgba(201,168,76,.2)"}}/>
        )}
      </div>

      {/* ===== DELIVERY + RETIRO ===== */}
      <div className="vit-s6" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
        <div style={{background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:18, padding:"16px 14px"}}>
          <div style={{fontSize:22, marginBottom:8}}>🛵</div>
          <div style={{fontSize:13, fontWeight:800, color:"#fff", marginBottom:4}}>DELIVERY</div>
          <div style={{fontSize:10, color:"rgba(255,255,255,.4)", lineHeight:1.4, marginBottom:10}}>Pedís desde casa y te lo llevamos</div>
          <div style={{fontSize:10, color:"rgba(201,168,76,.8)", fontWeight:700}}>30-45 min · hasta 5 km</div>
        </div>
        {local.retiro_habilitado !== false ? (
          <div style={{background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:18, padding:"16px 14px"}}>
            <div style={{fontSize:22, marginBottom:8}}>🏪</div>
            <div style={{fontSize:13, fontWeight:800, color:"#fff", marginBottom:4}}>RETIRO</div>
            <div style={{fontSize:10, color:"rgba(255,255,255,.4)", lineHeight:1.4, marginBottom:10}}>Pasás a buscar al local sin costo</div>
            <div style={{fontSize:10, color:"rgba(201,168,76,.8)", fontWeight:700}}>{local.retiro_horario||"Lun-Dom 12-23 hs"}</div>
          </div>
        ) : (
          <div style={{background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)", borderRadius:18, padding:"16px 14px", opacity:.4}}>
            <div style={{fontSize:22, marginBottom:8}}>🏪</div>
            <div style={{fontSize:13, fontWeight:800, color:"#fff", marginBottom:4}}>RETIRO</div>
            <div style={{fontSize:10, color:"rgba(255,255,255,.4)", lineHeight:1.4}}>No disponible</div>
          </div>
        )}
      </div>

      {/* ===== MÉTODOS DE PAGO ===== */}
      {local.metodos_pago && local.metodos_pago.length > 0 && (
        <div className="vit-s7" style={{background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:24, padding:"18px"}}>
          <div style={{fontSize:11, fontWeight:800, color:"rgba(255,255,255,.85)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:14}}>💳 Métodos de pago</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            {(local.metodos_pago||[]).map(m=>{
              const icons={efectivo:"💵",tarjeta:"💳",mercadopago:"📲",transferencia:"🏦"};
              const labels={efectivo:"Efectivo",tarjeta:"Tarjeta",mercadopago:"Mercado Pago",transferencia:"Transferencia"};
              return (
                <div key={m} style={{background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, padding:"12px", textAlign:"center"}}>
                  <div style={{fontSize:20, marginBottom:4}}>{icons[m]||"💰"}</div>
                  <div style={{fontSize:11, fontWeight:700, color:"rgba(255,255,255,.8)"}}>{labels[m]||m}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MESAS ===== */}
      <div className="vit-s3" style={{background:"rgba(255,255,255,.03)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,.07)", borderRadius:24, padding:"22px 20px", position:"relative", overflow:"hidden"}}>
        <div style={{position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(0,255,136,.35),transparent)"}}/>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20}}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <div style={{width:8, height:8, borderRadius:"50%", background:"#00FF88", animation:"vitPulse 2s ease-in-out infinite", flexShrink:0}}/>
            <span style={{fontSize:11, fontWeight:800, color:"#00FF88", letterSpacing:2}}>EN VIVO</span>
          </div>
          <span style={{fontSize:11, color:"rgba(255,255,255,.32)", fontWeight:600, letterSpacing:.5}}>OCUPACIÓN ACTUAL</span>
        </div>
        {mesasData.hayMesas ? (
          <div style={{display:"flex", alignItems:"center", gap:22}}>
            <div style={{position:"relative", width:90, height:90, flexShrink:0}}>
              <svg viewBox="0 0 90 90" style={{width:90, height:90, transform:"rotate(-90deg)"}}>
                <circle cx="45" cy="45" r={circleR} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="9"/>
                <circle cx="45" cy="45" r={circleR} fill="none"
                  stroke={pct > 70 ? "#ff6b6b" : pct > 40 ? "#FFB020" : "#00FF88"}
                  strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={String(circleC)}
                  strokeDashoffset={String(circleC * (1 - pct / 100))}
                  style={{transition:"stroke-dashoffset .8s ease, stroke .4s ease"}}
                />
              </svg>
              <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
                <span style={{fontSize:18, fontWeight:900, color:"#fff", lineHeight:1}}>{pct}%</span>
                <span style={{fontSize:9, color:"rgba(255,255,255,.38)", letterSpacing:.5, marginTop:2}}>ocup.</span>
              </div>
            </div>
            <div style={{flex:1, display:"flex", flexDirection:"column", gap:10}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontSize:13, color:"rgba(255,255,255,.5)"}}>Libres</span>
                <span style={{fontSize:22, fontWeight:900, color:"#00FF88", lineHeight:1}}>{mesasData.libres}</span>
              </div>
              <div style={{height:1, background:"rgba(255,255,255,.05)"}}/>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontSize:13, color:"rgba(255,255,255,.5)"}}>Ocupadas</span>
                <span style={{fontSize:22, fontWeight:900, color:"#FFB020", lineHeight:1}}>{mesasData.ocupadas}</span>
              </div>
              <div style={{height:1, background:"rgba(255,255,255,.05)"}}/>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontSize:13, color:"rgba(255,255,255,.5)"}}>Total</span>
                <span style={{fontSize:22, fontWeight:900, color:"rgba(255,255,255,.65)", lineHeight:1}}>{mesasData.total}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{textAlign:"center", padding:"10px 0"}}>
            <div style={{fontSize:36, marginBottom:10}}>🪑</div>
            <div style={{fontSize:15, fontWeight:700, color:"rgba(255,255,255,.7)"}}>Mesas disponibles</div>
            <div style={{fontSize:12, color:"rgba(255,255,255,.33)", marginTop:5}}>Consultá al mozo sobre disponibilidad</div>
          </div>
        )}
      </div>

      {/* ===== DESCUENTO 10% ===== */}
      {local.feat_primera_visita !== false && (
        <div className="vit-s4" style={{position:"relative", borderRadius:24, overflow:"hidden"}}>
          <div style={{position:"absolute", inset:0, background:"linear-gradient(135deg,#e8a020 0%,#c9a84c 45%,#7a4f00 100%)"}}/>
          <div style={{position:"absolute", top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.08)"}}/>
          <div style={{position:"absolute", bottom:-40, left:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,.06)"}}/>
          <div style={{position:"relative", padding:"26px 22px"}}>
            <div style={{display:"flex", alignItems:"flex-start", gap:16, marginBottom:20}}>
              <div style={{fontSize:44, lineHeight:1, flexShrink:0}}>🎁</div>
              <div>
                <div style={{display:"flex", alignItems:"baseline", gap:8, marginBottom:5}}>
                  <span style={{fontSize:48, fontWeight:900, color:"#fff", lineHeight:1}}>10%</span>
                  <span style={{fontSize:18, fontWeight:800, color:"rgba(255,255,255,.8)"}}>OFF</span>
                </div>
                <div style={{fontSize:16, fontWeight:800, color:"#fff", lineHeight:1.15}}>Primera visita</div>
                <div style={{fontSize:12, color:"rgba(255,255,255,.6)", marginTop:4}}>Descuento exclusivo para clientes nuevos</div>
              </div>
            </div>
            <button onClick={()=>setShowDescuento(true)}
              style={{width:"100%", background:"rgba(255,255,255,.22)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.38)", borderRadius:14, padding:"14px 16px", fontSize:14, fontWeight:800, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, letterSpacing:.3}}>
              🎉 Ver cómo reclamarlo
            </button>
          </div>
        </div>
      )}

      {/* ===== WIFI ===== */}
      {!!local.wifi_ssid && (
        <div style={{background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:24, padding:"20px 18px", position:"relative", overflow:"hidden"}}>
          <div style={{position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)"}}/>
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:14}}>
            <div style={{width:44, height:44, borderRadius:14, background:"rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0}}>📶</div>
            <div>
              <div style={{fontSize:15, fontWeight:800, color:"rgba(255,255,255,.9)"}}>WiFi Gratis</div>
              <div style={{fontSize:12, color:"rgba(255,255,255,.36)", marginTop:2}}>Conectate mientras estás acá</div>
            </div>
          </div>
          <div style={{background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:"14px 16px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
              <span style={{fontSize:11, color:"rgba(255,255,255,.4)"}}>Red</span>
              <span style={{fontSize:13, fontWeight:700, color:"#fff"}}>{local.wifi_ssid}</span>
            </div>
            <div style={{height:1, background:"rgba(255,255,255,.06)", marginBottom:8}}/>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{fontSize:11, color:"rgba(255,255,255,.4)"}}>Contraseña</span>
              <span style={{fontSize:13, fontWeight:700, color:"#c9a84c", letterSpacing:1}}>{local.wifi_pass}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== WHATSAPP ===== */}
      {!!waNum && (
        <div className="vit-s5" style={{background:"rgba(255,255,255,.03)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(37,211,102,.15)", borderRadius:24, padding:"22px 20px", position:"relative", overflow:"hidden"}}>
          <div style={{position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(37,211,102,.35),transparent)"}}/>
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:14}}>
            <div style={{width:44, height:44, borderRadius:14, background:"rgba(37,211,102,.1)", border:"1px solid rgba(37,211,102,.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0}}>💬</div>
            <div>
              <div style={{fontSize:15, fontWeight:800, color:"rgba(255,255,255,.9)"}}>Contacto</div>
              <div style={{fontSize:12, color:"rgba(255,255,255,.36)", marginTop:2}}>Para pedidos a domicilio o retiro</div>
            </div>
          </div>
          <p style={{margin:"0 0 14px", fontSize:13, color:"rgba(255,255,255,.42)", lineHeight:1.6}}>
            Copiá nuestro número y escribinos por WhatsApp para hacer tu pedido fuera del local.
          </p>
          <div style={{background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:12}}>
            <span style={{fontSize:18, fontWeight:700, color:"#fff", letterSpacing:.5}}>{waNum}</span>
            <span style={{fontSize:10, fontWeight:800, color:"rgba(37,211,102,.55)", letterSpacing:1}}>WA</span>
          </div>
          <button className="vit-copy-btn" onClick={handleCopyWA}
            style={{width:"100%", background:copied?"rgba(37,211,102,.15)":"rgba(37,211,102,.07)", border:`1px solid ${copied?"rgba(37,211,102,.5)":"rgba(37,211,102,.17)"}`, borderRadius:14, padding:"13px", fontSize:14, fontWeight:700, color:copied?"#25D366":"rgba(255,255,255,.68)", cursor:"pointer", transition:"all .25s", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
            {copied ? "✅ ¡Número copiado!" : "📋 Copiar número"}
          </button>
        </div>
      )}

    </div>

    {/* ===== MODAL CARTA ===== */}
    {showCarta && (
      <div style={{position:"fixed", inset:0, zIndex:300, background:"#080808", display:"flex", flexDirection:"column"}}>
        <div style={{padding:"14px 16px", display:"flex", alignItems:"center", gap:14, borderBottom:"1px solid rgba(255,255,255,.07)", background:"#0d0d0d", flexShrink:0}}>
          <button onClick={()=>setShowCarta(false)} style={{width:36, height:36, borderRadius:10, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", color:"#fff", fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>‹</button>
          <div style={{fontFamily:"Georgia,serif", fontSize:20, fontWeight:900}}>Nuestra <span style={{color:"#c9a020"}}>Carta</span></div>
        </div>
        <div style={{display:"flex", gap:8, padding:"12px 14px", overflowX:"auto", borderBottom:"1px solid rgba(255,255,255,.06)", background:"#0d0d0d", flexShrink:0, WebkitOverflowScrolling:"touch"}}>
          {(cats||[]).map(c=>(
            <button key={c.id} onClick={()=>setCartaCat(c.id)}
              style={{padding:"7px 16px", borderRadius:30, fontSize:12, fontWeight:700, whiteSpace:"nowrap", cursor:"pointer", border:`1px solid ${cartaCat===c.id?"transparent":"rgba(255,255,255,.1)"}`, background:cartaCat===c.id?"linear-gradient(135deg,#b8900a,#c9a020)":"transparent", color:cartaCat===c.id?"#000":"rgba(255,255,255,.5)", transition:"all .2s"}}>
              {c.nombre}
            </button>
          ))}
        </div>
        <div style={{flex:1, overflowY:"auto", padding:"14px"}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            {(prods||[]).filter(p=>!cartaCat||p.categoria_id===cartaCat).map(p=>(
              <div key={p.id} style={{background:"#111", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, overflow:"hidden"}}>
                <img
                  src={p.imagen||"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300&h=200&fit=crop"}
                  alt={p.nombre}
                  style={{width:"100%", height:150, objectFit:"cover", display:"block"}}
                  onError={e=>{e.target.src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300&h=200&fit=crop";}}
                />
                <div style={{padding:"12px"}}>
                  <div style={{fontSize:15, fontWeight:700, color:"#fff", marginBottom:4, lineHeight:1.3}}>{p.nombre}</div>
                  {p.descripcion && <div style={{fontSize:11, color:"rgba(255,255,255,.4)", lineHeight:1.4, marginBottom:8}}>{p.descripcion}</div>}
                  <div style={{fontSize:19, fontWeight:800, color:"#c9a020"}}>${p.precio}</div>
                </div>
              </div>
            ))}
          </div>
          {(prods||[]).filter(p=>!cartaCat||p.categoria_id===cartaCat).length===0&&(
            <div style={{textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,.3)"}}>
              <div style={{fontSize:40, marginBottom:12}}>🍽️</div>
              <div style={{fontSize:14}}>No hay productos en esta categoría</div>
            </div>
          )}
          {/* ===== PROMO QR EN CARTA ===== */}
          {local?.promo_desc && (
            <div style={{margin:"24px 0 8px", background:"linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.06))", border:"1px solid rgba(201,168,76,.25)", borderRadius:16, padding:"20px 16px", textAlign:"center"}}>
              <div style={{fontSize:11, fontWeight:700, letterSpacing:2, color:"rgba(201,168,76,.7)", marginBottom:8, textTransform:"uppercase"}}>Promoción activa</div>
              <div style={{fontSize:16, fontWeight:800, color:"#fff", marginBottom:12, lineHeight:1.4}}>{local.promo_desc}</div>
              <div style={{display:"flex", justifyContent:"center", marginBottom:12}}>
                <QRImg
                  data={(local.slug?`${window.location.origin}/menu/${local.slug}/promo`:`${window.location.origin}/promo`)+"?desc="+encodeURIComponent(local.promo_desc)}
                  size={160}
                  style={{width:120, height:120, background:"#fff", borderRadius:10, padding:4}}
                />
              </div>
              <div style={{fontSize:11, color:"rgba(255,255,255,.4)"}}>Escaneá para más info</div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* ===== MODAL DESCUENTO ===== */}
    {showDescuento && (
      <div onClick={()=>setShowDescuento(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,.72)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center"}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#141414", border:"1px solid rgba(201,168,76,.22)", borderRadius:"24px 24px 0 0", padding:"32px 22px 52px", width:"100%", maxWidth:480, position:"relative", overflow:"hidden"}}>
          <div style={{position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#e8a020,transparent)"}}/>
          <div style={{textAlign:"center", marginBottom:28}}>
            <div style={{fontSize:60, marginBottom:14}}>🎁</div>
            <h2 style={{margin:"0 0 8px", fontSize:28, fontWeight:900, background:"linear-gradient(135deg,#e8a020,#c9a84c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>¡Tu 10% OFF!</h2>
            <p style={{margin:0, fontSize:14, color:"rgba(255,255,255,.42)", lineHeight:1.5}}>Exclusivo para tu primera visita al local</p>
          </div>
          <div style={{background:"rgba(201,168,76,.06)", border:"1px solid rgba(201,168,76,.15)", borderRadius:16, padding:"20px 18px", marginBottom:20}}>
            <div style={{fontSize:11, fontWeight:800, color:"#e8a020", letterSpacing:1.8, marginBottom:16}}>CÓMO RECLAMARLO</div>
            {["Pedí tu comida normalmente desde la carta","Cuando llegue la cuenta, avisale al mozo que es tu primera visita","Mostrá esta pantalla como comprobante","¡El mozo aplicará el 10% de descuento!"].map((paso,i)=>(
              <div key={i} style={{display:"flex", alignItems:"flex-start", gap:12, marginBottom:i<3?13:0}}>
                <div style={{width:24, height:24, borderRadius:7, background:"linear-gradient(135deg,#e8a020,#c9a84c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"#fff", flexShrink:0, marginTop:1}}>{i+1}</div>
                <span style={{fontSize:13, color:"rgba(255,255,255,.62)", lineHeight:1.5, paddingTop:3}}>{paso}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowDescuento(false)}
            style={{width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.09)", borderRadius:14, padding:"14px", fontSize:14, fontWeight:700, color:"rgba(255,255,255,.55)", cursor:"pointer"}}>
            Cerrar
          </button>
        </div>
      </div>
    )}
  </div>
);
}


// ─── CARTA V3 CLIENT VIEW — matches AdminPanel Preview() exactly ──────────────
const CDV3_RENDER_TPLS = [
  {id:'nobu',      bg:'#0a0a0a', ac:'#C41E3A', font:"'Helvetica Neue',Arial,sans-serif",      catH:'divider',    prodS:'horizontal',   dark:true,  mood:'Minimalista premium', headerAlign:'center'},
  {id:'bistro',    bg:'#f8f4e8', ac:'#1a3a5c', font:"'Georgia',serif",                        catH:'divider',    prodS:'compact-list', dark:false, mood:'Clásico francés',     headerAlign:'center'},
  {id:'parrilla',  bg:'#120a04', ac:'#C9A84C', font:"'Georgia',serif",                        catH:'banner',     prodS:'horizontal',   dark:true,  mood:'Rústico premium',     headerAlign:'left'},
  {id:'lamaison',  bg:'#0d0d08', ac:'#C9A84C', font:"'Raleway','Helvetica Neue',sans-serif",  catH:'text-only',  prodS:'horizontal',   dark:true,  mood:'Cocina de autor',     headerAlign:'center'},
  {id:'trattoria', bg:'#1a0a04', ac:'#D4503A', font:"'Georgia',serif",                        catH:'bold-label', prodS:'vertical',     dark:true,  mood:'Italiano tradicional',headerAlign:'left'},
  {id:'botanico',  bg:'#0a1208', ac:'#4A9A5A', font:"'Georgia',serif",                        catH:'pill',       prodS:'compact-list', dark:true,  mood:'Orgánico & natural',  headerAlign:'center'},
  {id:'izakaya',   bg:'#08080f', ac:'#6B48D0', font:"'Helvetica Neue',Arial,sans-serif",      catH:'divider',    prodS:'horizontal',   dark:true,  mood:'Bar japonés',         headerAlign:'center'},
  {id:'cevicheria',bg:'#041218', ac:'#00A8C6', font:"'Helvetica Neue',Arial,sans-serif",      catH:'divider',    prodS:'full-photo',   dark:true,  mood:'Mar & ceviche',       headerAlign:'center'},
  {id:'grand',     bg:'#F8F5F0', ac:'#8B1A1A', font:"'Georgia',serif",                        catH:'banner',     prodS:'vertical',     dark:false, mood:'Fine dining formal',  headerAlign:'center'},
  {id:'finedining',bg:'#FAFAF8', ac:'#2C2C2C', font:"'Georgia',serif",                        catH:'text-only',  prodS:'compact-list', dark:false, mood:'Minimalista blanco',  headerAlign:'center'},
  {id:'neon',      bg:'#0a0512', ac:'#FF006E', font:"'Helvetica Neue',Arial,sans-serif",      catH:'pill',       prodS:'full-photo',   dark:true,  mood:'Bar urbano',          headerAlign:'center'},
  {id:'coastal',   bg:'#F0F8FF', ac:'#1A6B8A', font:"'Georgia',serif",                        catH:'divider',    prodS:'horizontal',   dark:false, mood:'Fresco mediterráneo', headerAlign:'center'},
  {id:'asador',    bg:'#0f0a06', ac:'#C9A84C', font:"'Georgia',serif",                        catH:'banner',     prodS:'horizontal',   dark:true,  mood:'Asador clásico',      headerAlign:'left'},
  {id:'sake',      bg:'#0a0508', ac:'#E8748A', font:"'Helvetica Neue',Arial,sans-serif",      catH:'text-only',  prodS:'compact-list', dark:true,  mood:'Japonés minimalista', headerAlign:'center'},
  {id:'pergola',   bg:'#f5f0e8', ac:'#5A3A1A', font:"'Georgia',serif",                        catH:'bold-label', prodS:'vertical',     dark:false, mood:'Jardín mediterráneo', headerAlign:'left'},
  {id:'moderno',   bg:'#FAFAFA', ac:'#1A1A1A', font:"'Helvetica Neue',Arial,sans-serif",      catH:'divider',    prodS:'compact-list', dark:false, mood:'Contemporáneo',       headerAlign:'center'},
  {id:'fusion',    bg:'#0c0c14', ac:'#FFB830', font:"'Helvetica Neue',Arial,sans-serif",      catH:'pill',       prodS:'vertical',     dark:true,  mood:'Fusión asiática',     headerAlign:'center'},
];

function CartaV3ClientView({ cartaV3, local, cats, prods, cart, add, rem, cartCount, setView, effectiveVitrina, lang, onCampanita, grandTotal }) {
  const baseTpl = CDV3_RENDER_TPLS.find(t=>t.id===cartaV3.templateId) || CDV3_RENDER_TPLS[0];
  const tpl = { ...baseTpl, bg:cartaV3.bgColor||baseTpl.bg, ac:cartaV3.accentColor||baseTpl.ac, font:cartaV3.fontFamily||baseTpl.font };
  const bgColor=tpl.bg, accentColor=tpl.ac, fontFamily=tpl.font;
  const tc = tpl.dark===false ? '#1a1a1a' : '#ffffff';
  const blocks = cartaV3.blocks || [{id:'cats',type:'categorias',on:true,data:{}}];
  const activeCats = cats.filter(c=>c.activa!==false);
  const isGrid = tpl.prodS==='vertical';
  const align = tpl.headerAlign==='left' ? 'left' : 'center';
  const heroBlock    = blocks.find(b=>b.type==='hero');
  const catsBlock    = blocks.find(b=>b.type==='categorias');
  const contactBlock = blocks.find(b=>b.type==='contacto');
  const pagoBlock    = blocks.find(b=>b.type==='pago');
  const qrBlock      = blocks.find(b=>b.type==='qr');

  // Category header — identical to AdminPanel cdv3CatHeader
  function cv3H(cat) {
    const ac=accentColor;
    if(tpl.catH==='divider') return(
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 4px 10px'}}>
        <div style={{flex:1,height:1,background:`${ac}35`}}/>
        <span style={{fontSize:12,fontWeight:700,color:ac,letterSpacing:2,textTransform:'uppercase',fontFamily,whiteSpace:'nowrap'}}>{cat.emoji?cat.emoji+' ':''}{tCat(cat.label,lang)}</span>
        <div style={{flex:1,height:1,background:`${ac}35`}}/>
      </div>
    );
    if(tpl.catH==='bold-label') return(
      <div style={{display:'flex',alignItems:'center',padding:'14px 0 8px',borderBottom:`2px solid ${ac}`}}>
        {cat.emoji&&<span style={{fontSize:18,marginRight:8}}>{cat.emoji}</span>}
        <span style={{fontSize:14,fontWeight:900,color:ac,letterSpacing:1,textTransform:'uppercase',fontFamily,flex:1}}>{tCat(cat.label,lang)}</span>
      </div>
    );
    if(tpl.catH==='pill') return(
      <div style={{display:'flex',justifyContent:'center',padding:'10px 0 6px'}}>
        <div style={{background:ac,borderRadius:20,padding:'7px 20px',display:'flex',alignItems:'center',gap:8}}>
          {cat.emoji&&<span style={{fontSize:16}}>{cat.emoji}</span>}
          <span style={{fontSize:13,fontWeight:700,color:'#fff',letterSpacing:.5}}>{tCat(cat.label,lang)}</span>
        </div>
      </div>
    );
    if(tpl.catH==='text-only') return(
      <div style={{display:'flex',alignItems:'baseline',padding:'20px 0 10px'}}>
        <span style={{fontSize:13,fontWeight:700,color:ac,letterSpacing:2,textTransform:'uppercase',fontFamily,flex:1}}>{cat.emoji?cat.emoji+' ':''}{tCat(cat.label,lang)}</span>
      </div>
    );
    // banner
    return(
      <div style={{padding:'10px 14px',background:`${ac}20`,border:`1px solid ${ac}35`,borderRadius:6,margin:'8px 0'}}>
        <span style={{fontSize:13,fontWeight:800,color:ac,letterSpacing:1,textTransform:'uppercase',fontFamily}}>{cat.emoji?cat.emoji+' ':''}{tCat(cat.label,lang)}</span>
      </div>
    );
  }

  // Product card — identical to AdminPanel cdv3ProdCard + cart buttons
  function cv3P(item) {
    const inCart=cart[item.id]?.qty||0;
    const imgSrc=item.foto_url||item.imagen||'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop';
    const name=item.name||item.nombre||'';
    const price='$ '+fmt(item.price??item.precio??0);
    const desc=(item.desc||item.descripcion||'').slice(0,58);
    const ar=!effectiveVitrina&&(item.sin_stock?(
      <span style={{fontSize:10,color:`${tc}55`,flexShrink:0}}>Agotado</span>
    ):inCart===0?(
      <button onClick={e=>{e.stopPropagation();add(item);}} className="pr" style={{width:28,height:28,borderRadius:7,background:accentColor,border:'none',color:tpl.dark?'#000':'#fff',fontSize:17,fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
    ):(
      <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>rem(item.id)} className="pr" style={{width:26,height:26,borderRadius:6,background:`${accentColor}22`,border:`1px solid ${accentColor}44`,color:accentColor,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
        <span style={{fontSize:13,fontWeight:700,color:accentColor,minWidth:16,textAlign:'center'}}>{inCart}</span>
        <button onClick={()=>add(item)} className="pr" style={{width:26,height:26,borderRadius:6,background:accentColor,border:'none',color:tpl.dark?'#000':'#fff',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
      </div>
    ));
    if(tpl.prodS==='horizontal') return(
      <div key={item.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${accentColor}12`}}>
        <img src={imgSrc} alt="" style={{width:62,height:62,borderRadius:8,objectFit:'cover',flexShrink:0}} onError={e=>e.target.style.display='none'}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:tc,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
          {desc&&<div style={{fontSize:10,color:`${tc}55`,lineHeight:1.4,marginTop:2,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{desc}</div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:800,color:accentColor,minWidth:52,textAlign:'right'}}>{price}</div>
          {ar}
        </div>
      </div>
    );
    if(tpl.prodS==='compact-list') return(
      <div key={item.id} style={{display:'flex',alignItems:'center',padding:'11px 0',borderBottom:`1px solid ${accentColor}18`}}>
        <div style={{flex:1,minWidth:0,paddingRight:8}}>
          <div style={{fontSize:13,fontWeight:600,color:tc,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
          {desc&&<div style={{fontSize:10,color:`${tc}55`,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{desc}</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <div style={{fontFamily:"'Courier New',monospace",fontSize:14,fontWeight:700,color:accentColor}}>{price}</div>
          {ar}
        </div>
      </div>
    );
    if(tpl.prodS==='full-photo') return(
      <div key={item.id} style={{borderRadius:10,overflow:'hidden',marginBottom:8,position:'relative'}}>
        <img src={imgSrc} alt="" style={{width:'100%',height:140,objectFit:'cover',display:'block'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,.88))',padding:'20px 12px 10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:'#fff',lineHeight:1.3}}>{name}</div>
              {desc&&<div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginTop:2}}>{desc}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0,marginLeft:10}}>
              <div style={{fontSize:15,fontWeight:800,color:accentColor}}>{price}</div>
              {ar}
            </div>
          </div>
        </div>
      </div>
    );
    // vertical
    return(
      <div key={item.id} style={{background:'rgba(255,255,255,.05)',borderRadius:10,overflow:'hidden',border:`1px solid ${accentColor}22`}}>
        <img src={imgSrc} alt="" style={{width:'100%',height:105,objectFit:'cover',display:'block'}}/>
        <div style={{padding:'7px 9px'}}>
          <div style={{fontSize:12,fontWeight:700,color:tc,lineHeight:1.3}}>{name}</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'3px 0 2px'}}>
            <div style={{fontSize:13,fontWeight:800,color:accentColor}}>{price}</div>
            {ar}
          </div>
          {desc&&<div style={{fontSize:10,color:`${tc}55`,lineHeight:1.4}}>{desc}</div>}
        </div>
      </div>
    );
  }

  return(
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:bgColor,display:'flex',flexDirection:'column',fontFamily}}>
      <GS/>
      {/* Sticky header */}
      <div style={{position:'sticky',top:0,zIndex:30,background:`${bgColor}EE`,backdropFilter:'blur(12px)',borderBottom:`1px solid ${accentColor}20`,padding:'10px 14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {local.logo_url?(<img src={local.logo_url} alt="" style={{width:36,height:36,borderRadius:8,objectFit:'cover',flexShrink:0,border:`1px solid ${accentColor}40`}}/>):(
            <div style={{width:36,height:36,borderRadius:8,background:`${accentColor}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{local.emoji||'🍽️'}</div>
          )}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:700,color:tc,fontFamily,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{local.nombre}</div>
            {local.mesa&&<div style={{fontSize:10,fontWeight:700,color:accentColor,marginTop:1}}>Mesa {local.mesa}</div>}
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0}}>
            {!effectiveVitrina&&local?.mesa&&local?.feat_solicitudes!==false&&onCampanita&&(
              <button onClick={onCampanita} style={{width:34,height:34,borderRadius:10,background:`${accentColor}22`,border:`1px solid ${accentColor}44`,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🛎️</button>
            )}
            {!effectiveVitrina&&cartCount>0&&(
              <button onClick={()=>setView('cart')} style={{background:accentColor,border:'none',borderRadius:20,padding:'7px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:12,fontWeight:800,color:tpl.dark?'#000':'#fff'}}>🛒 {cartCount}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content — matches AdminPanel Preview() */}
      <div style={{flex:1,overflowY:'auto',paddingBottom:effectiveVitrina?24:100}}>
        {/* HERO */}
        {heroBlock?.on&&(heroBlock.data?.titulo||heroBlock.data?.sub||heroBlock.data?.logo||local?.nombre)&&(
          <div style={{padding:'22px 18px 14px',textAlign:align,borderBottom:`1px solid ${accentColor}25`}}>
            {heroBlock.data?.logo&&<img src={heroBlock.data.logo} alt="" style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',margin:`0 ${align==='center'?'auto':0} 12px`,display:'block',border:`2px solid ${accentColor}`}} onError={e=>e.target.style.display='none'}/>}
            <div style={{fontSize:24,fontWeight:800,color:accentColor,letterSpacing:.3,fontFamily}}>{heroBlock.data?.titulo||local?.nombre||''}</div>
            {heroBlock.data?.sub&&<div style={{fontSize:12,color:`${tc}80`,marginTop:5,lineHeight:1.5}}>{heroBlock.data.sub}</div>}
            {tpl.mood&&<div style={{fontSize:9,color:`${accentColor}55`,marginTop:8,letterSpacing:2,textTransform:'uppercase'}}>{tpl.mood}</div>}
          </div>
        )}

        {/* CATEGORÍAS */}
        {(!catsBlock||catsBlock.on)&&(
          <div style={{padding:'8px 14px 20px'}}>
            {activeCats.map(cat=>{
              const catProds=prods.filter(p=>(p.cat||p.categoria_id)===cat.id&&p.active!==false&&p.activo!==false);
              if(!catProds.length) return null;
              return(
                <div key={cat.id} style={{marginBottom:4}}>
                  {cv3H(cat)}
                  <div style={{paddingTop:6}}>
                    {isGrid?(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(138px,1fr))',gap:8}}>
                        {catProds.map(item=>cv3P(item))}
                      </div>
                    ):(
                      <div>{catProds.map(item=>cv3P(item))}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CONTACTO */}
        {contactBlock?.on&&(contactBlock.data?.tel||contactBlock.data?.dir||contactBlock.data?.hs)&&(
          <div style={{margin:'0 14px 14px',padding:'12px 14px',background:`${accentColor}12`,borderRadius:10,border:`1px solid ${accentColor}30`}}>
            <div style={{fontSize:9,fontWeight:700,color:accentColor,letterSpacing:1,marginBottom:8}}>CONTACTO</div>
            {contactBlock.data.tel&&<div style={{fontSize:13,color:tc,marginBottom:4}}>📞 {contactBlock.data.tel}</div>}
            {contactBlock.data.dir&&<div style={{fontSize:13,color:tc,marginBottom:4}}>📍 {contactBlock.data.dir}</div>}
            {contactBlock.data.hs&&<div style={{fontSize:13,color:tc}}>🕐 {contactBlock.data.hs}</div>}
          </div>
        )}

        {/* PAGO */}
        {pagoBlock?.on&&pagoBlock.data?.alias&&(
          <div style={{margin:'0 14px 14px',padding:'14px',background:`${accentColor}10`,borderRadius:10,border:`1px solid ${accentColor}40`}}>
            <div style={{fontSize:9,fontWeight:700,color:accentColor,letterSpacing:1,marginBottom:8}}>💳 {(pagoBlock.data.lbl||'PAGO').toUpperCase()}</div>
            <div style={{fontFamily:"'Courier New',monospace",fontSize:16,fontWeight:700,color:tc,letterSpacing:.5}}>{pagoBlock.data.alias}</div>
            {pagoBlock.data.titular&&<div style={{fontSize:11,color:`${tc}70`,marginTop:3}}>Titular: {pagoBlock.data.titular}</div>}
          </div>
        )}

        {/* QR */}
        {qrBlock?.on&&qrBlock.data?.url&&(()=>{
          const qrBg=bgColor.replace('#',''), qrFg=accentColor.replace('#','');
          return(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',margin:'0 14px 18px',padding:'16px',background:`${accentColor}08`,borderRadius:10,border:`1px solid ${accentColor}25`}}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=${qrFg}&bgcolor=${qrBg}&data=${encodeURIComponent(qrBlock.data.url)}`} alt="QR" style={{width:130,height:130,borderRadius:8}}/>
              {qrBlock.data.lbl&&<div style={{fontSize:11,color:`${tc}70`,marginTop:8,textAlign:'center'}}>{qrBlock.data.lbl}</div>}
            </div>
          );
        })()}

        <div style={{height:24}}/>
      </div>

      {/* Floating cart button */}
      {!effectiveVitrina&&cartCount>0&&(
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:40,width:'calc(100% - 32px)',maxWidth:398}}>
          <button onClick={()=>setView('cart')} style={{width:'100%',background:accentColor,border:'none',borderRadius:16,padding:'15px 20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 8px 28px rgba(0,0,0,.35)',fontFamily}}>
            <div style={{background:'rgba(0,0,0,.2)',borderRadius:10,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#fff'}}>{cartCount}</div>
            <div style={{fontSize:15,fontWeight:800,color:tpl.dark===false?'#fff':'#000'}}>Ver mi pedido</div>
            <div style={{fontSize:15,fontWeight:800,color:tpl.dark===false?'#fff':'#000'}}>$ {grandTotal?new Intl.NumberFormat('es-AR',{minimumFractionDigits:0}).format(grandTotal):''}</div>
          </button>
        </div>
      )}
    </div>
  );
}



export function ClientApp({onBack, local, cats, prods, vitrina=false, sinPedidos=false}) {
  const [view,setView]   = useState("menu"); // menu | cart | done
  const [cart,setCart]   = useState({});
  const [activeCat,setAC]= useState("TODO");

  const [pay,setPay]     = useState(null);
  const [pay2,setPay2]   = useState(null);   // unused legacy
  const [mixto1,setMixto1] = useState(null); // método 1 en pago mixto
  const [mixto2,setMixto2] = useState(null); // método 2 en pago mixto
  const [splitAmt,setSplitAmt]   = useState("");
  const [splitAmt2,setSplitAmt2] = useState("");
  const [note,setNote]   = useState("");
  const [tipPct,setTipPct] = useState(null); // null | 0 | 10 | 15 | 20
  const [tipCustom,setTC]  = useState("");
  const [pcMode,setPCMode] = useState(()=>typeof window!=="undefined"&&window.innerWidth>=1024);
  const [lastPedidoId,setLastPedidoId] = useState(null);
  const [orderStatus,setOrderStatus]   = useState("nuevo");
  useEffect(()=>{
    const h=()=>setPCMode(window.innerWidth>=1024);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  const [showSolicitudes, setShowSolicitudes] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [solicEnviada, setSolicEnviada]       = useState(null);
  const [showDividir, setShowDividir]         = useState(false);
  const [dividirN, setDividirN]               = useState(2);
  const [lang,setLang]     = useState(()=>localStorage.getItem("menuqr_lang")||"es");
  const effectiveVitrina = vitrina || sinPedidos;
  const [promoActiva,setPromoActiva] = useState(()=>{
    if(vitrina || sinPedidos) return false;
    try { return !!JSON.parse(localStorage.getItem("menuqr_promo10_"+(local.restauranteId||"x"))||"null"); } catch{ return false; }
  });
  const T = (key) => t(key,lang);
  const changeLang = (code) => { setLang(code); localStorage.setItem("menuqr_lang",code); };

  /* ── Auto-traducción de productos ── */
  const transCacheRef = React.useRef({});
  const [translatedProds, setTranslatedProds] = useState(prods);

  const mtTranslate = React.useCallback(async(text, tgt)=>{
    if(!text||!tgt||tgt==="es") return text;
    const key=tgt+"::"+text;
    if(transCacheRef.current[key]) return transCacheRef.current[key];
    try{
      const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0,400))}&langpair=es|${tgt}&de=laquima6@gmail.com`);
      const d=await r.json();
      const tr=d.responseData?.translatedText||text;
      transCacheRef.current[key]=tr;
      return tr;
    }catch{ return text; }
  },[]);

  React.useEffect(()=>{
    if(lang==="es"){ setTranslatedProds(prods); return; }
    let cancelled=false;
    const run=async()=>{
      const result=[];
      for(const p of prods){
        if(cancelled) break;
        const [name,desc]=await Promise.all([
          mtTranslate(p.name,lang),
          p.desc?mtTranslate(p.desc,lang):Promise.resolve(p.desc),
        ]);
        result.push({...p,name,desc});
        if(!cancelled) setTranslatedProds([...result]);
      }
    };
    run();
    return()=>{ cancelled=true; };
  },[lang, prods]);
  // secs timer moved to HappyHourBanner component to prevent full re-renders

  // Solo productos activos
  // activa !== false: muestra categorías con activa=true O activa=null (por defecto visibles)
  const activeCats  = cats.filter(c=>c.activa !== false);
  const catItems    = prods.filter(p=>p.cat===activeCat && (p.active || p.active==null));
  const items       = Object.values(cart);
  const subTotal    = items.reduce((s,i)=>s+i.price*i.qty,0);
  const tipAmt      = tipPct===0 ? 0 : tipPct ? Math.round(subTotal*(tipPct/100))
                      : tipCustom ? Number(tipCustom) : 0;
  const descuento10 = promoActiva && local.feat_promo10 && subTotal>0 ? Math.round(subTotal*0.10) : 0;
  const grandTotal  = subTotal - descuento10 + tipAmt;
  const cartCount   = items.reduce((s,i)=>s+i.qty,0);

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

  const sendSolicitud = async (tipo) => {
    setSolicEnviada(tipo);
    setTimeout(()=>setSolicEnviada(null), 3000);
    if(!supabase || !local.restauranteId) return;
    try {
      await supabase.from("solicitudes").insert({
        restaurante_id: local.restauranteId,
        mesa: String(local.mesa||"Mostrador"),
        tipo, estado:"pendiente",
      });
    } catch(e){ console.warn("solicitud err:", e.message); }
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

  /* ═══════════════════════════════════════
     VITRINA INFO — mesas + cómo funciona + promo
  ═══════════════════════════════════════ */


  /* ── PC DONE VIEW — OPCION C */
  if(view==="done"&&pcMode){
    const ac=local.color||"#C9A84C";
    const creamBg="#F5F0E8";
    const warmBorder="#D4C4A8";
    const warmMuted="#7A6050";
    const warmText="#2C1810";
    const darkPanel="#C9A84C";
    const STEPS2=[
      {key:"nuevo",     icon:"📋", label:"Recibido",    sub:"En espera de la cocina"},
      {key:"preparando",icon:"🍳", label:"Preparando",  sub:"Tu pedido está siendo preparado"},
      {key:"listo",     icon:"🔔", label:"¡Listo!",     sub:"Ya va a salir"},
      {key:"entregado", icon:"🎉", label:"Entregado",   sub:"¡Buen provecho!"},
    ];
    const stepIdx2=STEPS2.findIndex(s=>s.key===orderStatus);
    const curStep2=STEPS2[Math.max(0,stepIdx2)];
    const isDone2=orderStatus==="listo"||orderStatus==="entregado";
    return(
      <div style={{display:"flex",height:"100vh",overflow:"hidden",fontFamily:"Georgia,serif"}}>
        <GS/>
        {/* LEFT */}
        <div style={{width:320,flexShrink:0,background:darkPanel,display:"flex",flexDirection:"column",borderRight:"1px solid #2A1C0E"}}>
          <div style={{padding:"28px 24px 18px",borderBottom:"1px solid #2A1C0E"}}>
            <div style={{fontSize:38,marginBottom:8}}>{local.emoji||"🍽️"}</div>
            <div style={{fontSize:20,fontWeight:700,color:"#F5F0E8",fontStyle:"italic"}}>{local.nombre}</div>
            {local.mesa&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#4A3020",marginTop:4}}>Mesa <span style={{fontSize:22,fontWeight:700,color:ac,fontStyle:"italic"}}>{local.mesa}</span></div>}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,letterSpacing:2,color:"#5A3A20",textTransform:"uppercase",marginBottom:12}}>Tu pedido</div>
            {items.map(i=>(
              <div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #2A1C0E",fontFamily:"'DM Sans',sans-serif"}}>
                <span style={{fontSize:12,fontStyle:"italic",color:"#D4C4A8"}}>{i.qty}× {i.name}</span>
                <span style={{fontSize:11,color:ac,fontWeight:700}}>$ {fmt(i.price*i.qty)}</span>
              </div>
            ))}
          </div>
          <div style={{padding:"14px 20px",borderTop:"1px solid #2A1C0E",background:"#140C04"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#5A3A20",letterSpacing:2,textTransform:"uppercase"}}>Total</span>
              <span style={{fontSize:22,fontWeight:700,color:ac,fontStyle:"italic"}}>$ {fmt(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — cream tracking */}
        <div style={{flex:1,background:creamBg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px"}}>
          <div style={{width:"100%",maxWidth:500}}>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{fontSize:56,marginBottom:12}}>{curStep2.icon}</div>
              <div style={{fontSize:28,fontWeight:700,color:isDone2?"#4A7A50":warmText,marginBottom:6}}>{curStep2.label}</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:warmMuted}}>{curStep2.sub}</div>
              {lastPedidoId&&<div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:10,background:"#4A9A5A18",border:"1px solid #4A9A5A33",borderRadius:20,padding:"4px 12px"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#4A9A5A"}}/><span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,color:"#4A7A50",letterSpacing:1}}>EN VIVO</span></div>}
            </div>
            {/* Steps */}
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:32}}>
              {STEPS2.map((s,i)=>{
                const done=i<=stepIdx2; const active=i===stepIdx2;
                return(
                  <div key={s.key} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderRadius:12,border:`1px solid ${active?"#4A9A5A44":done?"#C9A84C33":warmBorder}`,background:active?"#4A9A5A0A":done?"#C9A84C0A":creamBg,transition:".3s"}}>
                    <span style={{fontSize:22,flexShrink:0}}>{s.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,color:active?"#4A7A50":done?warmText:warmMuted}}>{s.label}</div>
                      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:warmMuted}}>{s.sub}</div>
                    </div>
                    <div style={{width:8,height:8,borderRadius:"50%",background:active?"#4A9A5A":done?ac:warmBorder,boxShadow:active?"0 0 8px #4A9A5A":"none",flexShrink:0}}/>
                  </div>
                );
              })}
            </div>
            {lastPedidoId&&local.slug&&(
              <a href={`/${local.slug}/pedido/${lastPedidoId}`} target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  padding:"12px",marginBottom:10,
                  background:"rgba(74,154,90,.08)",border:"1px solid rgba(74,154,90,.3)",
                  borderRadius:10,textDecoration:"none",
                  fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:"#4A7A50"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"#4A9A5A",flexShrink:0}}/>
                Seguir mi pedido en vivo →
              </a>
            )}
            <div style={{display:"flex",gap:12}}>
              <button onClick={reset} className="pr" style={{flex:1,background:"#EEE8D8",border:`1px solid ${warmBorder}`,borderRadius:10,padding:13,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:warmMuted,cursor:"pointer"}}>Hacer otro pedido</button>
              <button onClick={onBack} className="pr" style={{flex:1,background:warmText,border:"none",borderRadius:10,padding:13,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:creamBg,cursor:"pointer"}}>Volver al inicio</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

    if(view==="done") {
    const STEPS=[
      {key:"nuevo",     icon:"📋", label:"Recibido",    sub:"En espera de la cocina"},
      {key:"preparando",icon:"🍳", label:"Preparando",  sub:"Tu pedido está siendo preparado"},
      {key:"listo",     icon:"🔔", label:"¡Listo!",     sub:"Ya va a salir"},
      {key:"entregado", icon:"🎉", label:"Entregado",   sub:"¡Buen provecho!"},
    ];
    const stepIdx = STEPS.findIndex(s=>s.key===orderStatus);
    const curStep = STEPS[Math.max(0,stepIdx)];
    const acColor = local.color||"#C9A84C";
    const isDone  = orderStatus==="listo"||orderStatus==="entregado";
  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"var(--cb)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:24,textAlign:"center"}}>
      <GS/>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",marginBottom:16}}>
        {LANGS.map(l=><button key={l.code} onClick={()=>changeLang(l.code)} style={{background:lang===l.code?"rgba(201,168,76,.25)":"rgba(10,8,6,.7)",border:`1px solid ${lang===l.code?"var(--cg)":"rgba(255,255,255,.12)"}`,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,color:lang===l.code?"var(--cg)":"rgba(255,255,255,.6)",backdropFilter:"blur(8px)",lineHeight:1.2,minWidth:36,textAlign:"center"}}>{l.flag} {l.name}</button>)}
      </div>

      {/* LIVE ORDER TRACKER */}
      <div style={{width:"100%",maxWidth:340,background:"var(--cc)",border:"1px solid var(--cbr)",borderRadius:20,padding:"22px 20px",marginBottom:20,animation:"scaleIn .5s cubic-bezier(.34,1.56,.64,1) both"}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:42,marginBottom:6,lineHeight:1}}>{curStep.icon}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,
            color:isDone?"#4A9A5A":acColor,marginBottom:3}}>{curStep.label}</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--cm)"}}>{curStep.sub}</div>
        </div>
        {/* Step progress */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
          {STEPS.map((s,i)=>{
            const done=i<=stepIdx; const active=i===stepIdx;
            return(
              <React.Fragment key={s.key}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{
                    width:active?34:26,height:active?34:26,borderRadius:"50%",
                    background:done?(active?acColor:"rgba(201,168,76,.25)"):"rgba(255,255,255,.05)",
                    border:`2px solid ${done?acColor:"rgba(255,255,255,.08)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:active?16:11,transition:"all .4s",
                    boxShadow:active?`0 0 14px ${acColor}50`:"none"}}>
                    {done&&!active?"✓":s.icon}
                  </div>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:7,fontWeight:700,
                    color:done?acColor:"rgba(255,255,255,.18)",textTransform:"uppercase",
                    letterSpacing:.5,maxWidth:52,lineHeight:1.2,textAlign:"center"}}>{s.label}</div>
                </div>
                {i<STEPS.length-1&&<div style={{width:22,height:2,flexShrink:0,marginBottom:14,
                  background:i<stepIdx?acColor:"rgba(255,255,255,.07)",transition:"background .4s"}}/>}
              </React.Fragment>
            );
          })}
        </div>
        {lastPedidoId&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:10}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#4A9A5A"}}/>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#4A9A5A",letterSpacing:1}}>EN VIVO</div>
          </div>
        )}
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
          {descuento10>0 && !!local.feat_promo10 && (
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"8px 12px",marginTop:4,
              background:"rgba(0,204,112,.08)",border:"1px solid rgba(0,204,112,.25)",
              borderRadius:10}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:700,
                color:"#00CC70",display:"flex",alignItems:"center",gap:6}}>
                🎁 Descuento primera visita (10%)
              </span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,
                fontWeight:700,color:"#00CC70"}}>− $ {fmt(descuento10)}</span>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,
            fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:700,color:"var(--cg)"}}>
            <span>{T('total')}</span><span>$ {fmt(grandTotal)}</span>
          </div>
        </div>
        {/* Tracking link */}
        {lastPedidoId&&local.slug&&(
          <a href={`/${local.slug}/pedido/${lastPedidoId}`} target="_blank" rel="noreferrer"
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              width:"100%",maxWidth:340,padding:"12px",marginBottom:12,
              background:"rgba(74,154,90,.1)",border:"1px solid rgba(74,154,90,.3)",
              borderRadius:14,textDecoration:"none",
              fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:"#4A9A5A"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#4A9A5A",flexShrink:0}}/>
            Seguir mi pedido en vivo →
          </a>
        )}
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
          <button onClick={()=>{ reset(); if(onBack) onBack(); }} className="pr" style={{flex:1,background:"var(--cg)",
            border:"none",borderRadius:14,padding:13,
            fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,
            color:"#0A0806",cursor:"pointer"}}>Inicio</button>
        </div>
      </div>
    </div>
  );
  }

  /* ── CART */
  /* ── PC CART VIEW — OPCION C */
  if(view==="cart"&&pcMode){
    const ac=local.color||"#C9A84C";
    const creamBg="#F5F0E8";
    const warmBorder="#D4C4A8";
    const warmMuted="#7A6050";
    const warmText="#2C1810";
    const darkPanel="#1C1008";
    const confirmOrder = async()=>{
      if(!pay) return;
      const cartItems=Object.values(cart).filter(i=>i.qty>0);
      const subtotal=cartItems.reduce((s,i)=>s+i.price*i.qty,0);
      const tipAmount=tipPct!=null?(tipPct===0?0:Math.round(subtotal*tipPct/100)):0;
      const descuentoAplicado=promoActiva&&subtotal>0?Math.round(subtotal*0.10):0;
      const mesa=local.mesa||1;
      const isMixtoPC=pay==="mixto";
      const m1amtPC=parseFloat(splitAmt)||0;
      const grandTotalPC=subtotal-descuentoAplicado+tipAmount;
      const m2amtPC=isMixtoPC?Math.max(0,grandTotalPC-m1amtPC):0;
      const pagoFinalPC=isMixtoPC&&mixto1&&mixto2?`${mixto1}(\$${fmt(m1amtPC)})+${mixto2}(\$${fmt(m2amtPC)})`:pay;
      let errorMsg=null; let pedidoId=null;
      if(!supabase) errorMsg="Supabase no configurado";
      else if(!local.restauranteId) errorMsg="Sin restauranteId";
      else {
        try {
          pedidoId=crypto.randomUUID();
          const {error}=await supabase.from("pedidos").insert({id:pedidoId,restaurante_id:local.restauranteId,mesa_numero:mesa,status:"nuevo",metodo_pago:pagoFinalPC,propina:tipAmount,total:subtotal-descuentoAplicado+tipAmount,nota:[note,descuentoAplicado>0?`DESCUENTO_PRIMERA_VEZ_10%_$${descuentoAplicado}`:null].filter(Boolean).join(" | ")||null});
          if(error){errorMsg=error.message;alert("Error pedido: "+error.message);}
          else{
            if(descuentoAplicado>0){localStorage.removeItem("menuqr_promo10_"+(local.restauranteId||"x"));setPromoActiva(false);}
            const its=cartItems.map(i=>({pedido_id:pedidoId,producto_id:i.id,nombre:i.nombre||i.name||"?",precio:Math.round(i.precio??i.price??0),cantidad:i.qty}));
            const {error:itmErr}=await supabase.from("pedido_items").insert(its);
            if(itmErr){errorMsg=itmErr.message;alert("Error items: "+itmErr.message);}
          }
        } catch(e){errorMsg=e.message;alert("Error pedido: "+e.message);}
      }
      if(errorMsg) localStorage.setItem("menuqr_last_order_error",errorMsg);
      else{localStorage.removeItem("menuqr_last_order_error");setLastPedidoId(pedidoId);setOrderStatus("nuevo");}
      setView("done");
    };
    return(
      <div style={{display:"flex",height:"100vh",overflow:"hidden",fontFamily:"Georgia,serif"}}>
        <GS/>
        {/* LEFT PANEL */}
        <div style={{width:320,flexShrink:0,background:darkPanel,display:"flex",flexDirection:"column",borderRight:"1px solid #2A1C0E"}}>
          <div style={{padding:"28px 24px 18px",borderBottom:"1px solid #2A1C0E"}}>
            <button onClick={()=>setView("menu")} className="pr" style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:ac,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,marginBottom:14,padding:0}}>← Volver a la carta</button>
            <div style={{fontSize:38,marginBottom:8}}>{local.emoji||"🍽️"}</div>
            <div style={{fontSize:20,fontWeight:700,color:"#F5F0E8",fontStyle:"italic"}}>{local.nombre}</div>
            {local.mesa&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#4A3020",marginTop:4}}>Mesa <span style={{fontSize:22,fontWeight:700,color:ac,fontStyle:"italic"}}>{local.mesa}</span></div>}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,letterSpacing:2,color:"#5A3A20",textTransform:"uppercase",marginBottom:12}}>Resumen del pedido</div>
            {items.map(i=>(
              <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #2A1C0E"}}>
                <span style={{fontSize:18,flexShrink:0}}>{i.emoji||"🍽️"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontStyle:"italic",color:"#D4C4A8",fontFamily:"'DM Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.name}</div>
                  <div style={{fontSize:10,color:"#5A3A20",fontFamily:"'DM Sans',sans-serif"}}>{i.qty} × $ {fmt(i.price)}</div>
                </div>
                <div style={{fontSize:11,color:ac,fontFamily:"'DM Sans',sans-serif",fontWeight:700,flexShrink:0}}>$ {fmt(i.price*i.qty)}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"14px 20px",borderTop:"1px solid #2A1C0E",background:"#140C04"}}>
            {tipAmt>0&&<div style={{display:"flex",justifyContent:"space-between",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#5A3A20",marginBottom:4}}><span>💝 Propina</span><span>+ $ {fmt(tipAmt)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#5A3A20",letterSpacing:2,textTransform:"uppercase"}}>Total</span>
              <span style={{fontSize:22,fontWeight:700,color:ac,fontStyle:"italic"}}>$ {fmt(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — cream form */}
        <div style={{flex:1,background:creamBg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"20px 40px 16px",borderBottom:`2px solid ${warmBorder}`,flexShrink:0}}>
            <span style={{fontSize:13,letterSpacing:4,textTransform:"uppercase",color:warmText,fontFamily:"'DM Sans',sans-serif",fontWeight:700}}>Confirmar pedido</span>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"24px 40px"}}>
            {/* Modo solo informativo */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div>
            <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,color:"var(--abri)",marginBottom:2}}>📵 Modo informativo (sin pedidos)</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)"}}>Los clientes ven la carta y el WhatsApp, pero no pueden hacer pedidos</p>
          </div>
          <ToggleA on={!!local.feat_sin_pedidos} onChange={()=>setLocal(l=>({...l,feat_sin_pedidos:!l.feat_sin_pedidos}))}/>
        </div>

        {/* Propina */}
            {local.propina&&(
              <div style={{marginBottom:24}}>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,letterSpacing:2,color:warmMuted,textTransform:"uppercase",marginBottom:10}}>¿Dejás propina?</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[{label:"No, gracias",val:0},{label:"10%",val:10},{label:"15%",val:15},{label:"20%",val:20}].map(t=>(
                    <button key={t.val} onClick={()=>{setTipPct(t.val);setTC("");}} className="pr" style={{background:tipPct===t.val?"#EDE4CE":"#EEE8D8",border:`1px solid ${tipPct===t.val?ac:warmBorder}`,borderRadius:10,padding:"10px 6px",cursor:"pointer",textAlign:"center",transition:".2s"}}>
                      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,color:tipPct===t.val?warmText:warmMuted}}>{t.label}</div>
                      {t.val>0&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:warmMuted,marginTop:2}}>$ {fmt(Math.round(subTotal*(t.val/100)))}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Nota */}
            <div style={{marginBottom:24}}>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,letterSpacing:2,color:warmMuted,textTransform:"uppercase",marginBottom:8}}>Observaciones</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Sin sal, alergia a mariscos, sin gluten..." style={{width:"100%",background:"#EEE8D8",border:`1px solid ${warmBorder}`,borderRadius:10,padding:"12px 16px",color:warmText,fontFamily:"'DM Sans',sans-serif",fontSize:13,resize:"none",height:72,outline:"none"}}/>
            </div>
            {/* Pago */}
            <div style={{marginBottom:28}}>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,letterSpacing:2,color:warmMuted,textTransform:"uppercase",marginBottom:10}}>Forma de pago</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                {PAYS.map(p=>(
                  <button key={p.id} onClick={()=>setPay(p.id)} className="pr" style={{background:pay===p.id?"#EDE4CE":"#EEE8D8",border:`2px solid ${pay===p.id?ac:warmBorder}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:".2s"}}>
                    <span style={{fontSize:24,display:"block",marginBottom:6}}>{p.icon}</span>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:pay===p.id?warmText:warmMuted}}>{p.label}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:warmMuted}}>{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            {/* MP/Transfer alias card — PC */}
            {(pay==="mp"||pay==="trans"||(pay==="mixto"&&(mixto1==="mp"||mixto1==="trans"||mixto2==="mp"||mixto2==="trans"))) && (
              <div style={{marginBottom:20,background:"#FFF8EC",border:"1px solid #C9A84C66",borderRadius:14,padding:"16px 18px"}}>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#8A6A30",marginBottom:10}}>
                  {pay==="mp"?"💳 Datos para pagar por Mercado Pago":"🏦 Datos para transferencia bancaria"}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
                  <div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,fontWeight:700,color:"#1C1008",letterSpacing:.5}}>{local.mp_alias||local.alias_pago||"Sin configurar — ir a panel admin"}</div>
                    {(local.mp_titular||local.alias_titular)&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#7A6050",marginTop:2}}>Titular: {local.mp_titular||local.alias_titular}</div>}
                  </div>
                  <button onClick={()=>{navigator.clipboard.writeText(local.mp_alias||local.alias_pago||"");}} className="pr"
                    style={{background:"#C9A84C",border:"none",borderRadius:8,padding:"8px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,color:"#1C1008",cursor:"pointer",whiteSpace:"nowrap"}}>
                    📋 Copiar alias
                  </button>
                </div>
                {local.whatsapp&&(
                  <a href={`https://wa.me/${local.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent("Hola! Te envío el comprobante de pago de mi pedido en "+local.name+".")}`}
                    target="_blank" rel="noreferrer"
                    style={{display:"flex",alignItems:"center",gap:8,background:"#25D366",borderRadius:9,padding:"9px 14px",textDecoration:"none",marginTop:4}}>
                    <span style={{fontSize:18}}>📱</span>
                    <div>
                      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:"#fff"}}>Enviar comprobante por WhatsApp</div>
                      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,.8)"}}>Compartí el comprobante a: <strong>{local.whatsapp||local.telefono||"este número"}</strong></div>
                    </div>
                  </a>
                )}
              </div>
            )}
            {/* Confirm */}
            <div style={{borderTop:`1px solid ${warmBorder}`,paddingTop:20}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:20,fontWeight:700,color:warmText,marginBottom:16,fontFamily:"'DM Sans',sans-serif"}}>
                <span>Total a pagar</span><span style={{color:"#8A6A30"}}>$ {fmt(grandTotal)}</span>
              </div>
              <button onClick={confirmOrder} disabled={!pay} className="pr" style={{width:"100%",background:pay?darkPanel:"#C8B898",border:"none",borderRadius:10,padding:15,fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:700,color:pay?creamBg:"#A09080",cursor:pay?"pointer":"not-allowed",letterSpacing:.5,textTransform:"uppercase",transition:".2s"}}>
                {pay?"CONFIRMAR PEDIDO →":"ELEGÍ UNA FORMA DE PAGO"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

    if(view==="cart") return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#F6F6F6",paddingBottom:120,fontFamily:"'DM Sans',sans-serif"}}>
      <GS/>
      {/* Header */}
      <div style={{background:"#FFF",padding:"16px 16px 14px",borderBottom:"1px solid #EBEBEB",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:20,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
        <button onClick={()=>setView("menu")} className="pr" style={{width:38,height:38,borderRadius:10,background:"#F5F5F5",border:"1px solid #E8E8E8",color:"#333",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:"#111"}}>{T('myOrder')}</div>
          <div style={{fontSize:12,color:"#999",marginTop:1}}>{local.mesa?`Mesa ${local.mesa} · `:"Pedido · "}{items.length} producto{items.length!==1?"s":""}</div>
        </div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:800,color:local.color||"#C9A84C"}}>$ {fmt(grandTotal)}</div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Items */}
        <div style={{background:"#FFF",borderRadius:16,overflow:"hidden",marginBottom:12,border:"1px solid #EBEBEB"}}>
          {items.map((item,i)=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderBottom:i<items.length-1?"1px solid #F5F5F5":"none"}}>
              {/* Foto o emoji */}
              {item.foto_url?(
                <img src={item.foto_url} alt={item.name} style={{width:54,height:54,borderRadius:10,objectFit:"cover",flexShrink:0,border:"1px solid #F0F0F0"}}
                  onError={e=>{e.target.style.display="none";e.target.nextSibling&&(e.target.nextSibling.style.display="flex");}}/>
              ):(
                <div style={{width:54,height:54,borderRadius:10,background:(local.color||"#C9A84C")+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{item.emoji||"🍽️"}</div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111",lineHeight:1.25,marginBottom:2}}>{item.name}</div>
                <div style={{fontSize:12,color:"#999"}}>$ {fmt(item.price)} c/u</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:800,color:local.color||"#C9A84C"}}>$ {fmt(item.price*item.qty)}</div>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <button onClick={()=>rem(item.id)} className="pr" style={{width:26,height:26,borderRadius:7,background:"#F5F5F5",border:"1px solid #E8E8E8",color:"#555",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>−</button>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:13,color:"#111",minWidth:16,textAlign:"center"}}>{item.qty}</span>
                  <button onClick={()=>add(item)} className="pr" style={{width:26,height:26,borderRadius:7,background:local.color||"#C9A84C",border:"none",color:"#fff",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
                </div>
              </div>
            </div>
          ))}
          {/* Total row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#FAFAFA",borderTop:"1px solid #EBEBEB"}}>
            <span style={{fontSize:12,color:"#999",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>Total</span>
            <span style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:local.color||"#C9A84C"}}>$ {fmt(subTotal)}</span>
          </div>
        </div>

        {/* Descuento promo */}
        {promoActiva && descuento10>0 && local.feat_promo10 && (
          <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:12,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>🎁 Descuento primera visita</div>
              <div style={{fontSize:11,color:"#4ADE80",marginTop:1}}>10% aplicado</div>
            </div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:800,color:"#16A34A"}}>− $ {fmt(descuento10)}</div>
          </div>
        )}

        {/* Propina */}
        {local.propina && (
          <div style={{background:"#FFF",borderRadius:14,padding:"14px 16px",marginBottom:12,border:"1px solid #EBEBEB"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>¿Dejás propina? 💝</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[{label:"No",val:0},{label:"10%",val:10},{label:"15%",val:15},{label:"20%",val:20}].map(t=>(
                <button key={t.val} onClick={()=>{setTipPct(t.val);setTC("");}} className="pr" style={{background:tipPct===t.val?(local.color||"#C9A84C"):"#F5F5F5",border:"none",borderRadius:10,padding:"10px 4px",cursor:"pointer",textAlign:"center",transition:".15s"}}>
                  <div style={{fontSize:12,fontWeight:700,color:tipPct===t.val?"#fff":"#333"}}>{t.label}</div>
                  {t.val>0&&<div style={{fontSize:10,color:tipPct===t.val?"rgba(255,255,255,.8)":"#999",marginTop:1}}>$ {fmt(Math.round(subTotal*t.val/100))}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nota */}
        <div style={{background:"#FFF",borderRadius:14,padding:"14px 16px",marginBottom:12,border:"1px solid #EBEBEB"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{T('notes')}</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Sin sal, alergia a mariscos, sin gluten..."
            style={{width:"100%",background:"#F8F8F8",border:"1px solid #EBEBEB",borderRadius:10,padding:"11px 14px",color:"#111",fontSize:13,resize:"none",height:64,outline:"none",boxSizing:"border-box"}}/>
        </div>

        {/* Método de pago */}
        <div style={{background:"#FFF",borderRadius:14,padding:"14px 16px",marginBottom:12,border:"1px solid #EBEBEB"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>{T('payMethod')}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            {PAYS.map(p=>(
              <button key={p.id} onClick={()=>{setPay(p.id);setPay2(null);setSplitAmt("");setSplitAmt2("");}} className="pr" style={{
                background:p.bg,
                border:`2px solid ${pay===p.id?p.color:p.color+"44"}`,
                borderRadius:14,padding:"14px 12px",cursor:"pointer",textAlign:"left",transition:"all .15s",position:"relative",
                boxShadow:pay===p.id?`0 4px 16px ${p.color}35`:"0 1px 4px rgba(0,0,0,.06)",
                transform:pay===p.id?"scale(1.02)":"scale(1)"}}>
                <span style={{fontSize:28,display:"block",marginBottom:7}}>{p.icon}</span>
                <div style={{fontSize:13,fontWeight:800,color:p.color,marginBottom:2}}>{tPay(p.id,lang)}</div>
                <div style={{fontSize:10,color:p.color+"99"}}>{tPaySub(p.id,lang)}</div>
                {pay===p.id&&<div style={{position:"absolute",top:8,right:8,width:18,height:18,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:800}}>✓</div>}
              </button>
            ))}
            {/* Pago mixto */}
            <button onClick={()=>{setPay("mixto");setMixto1(null);setMixto2(null);setSplitAmt("");setSplitAmt2("");}} className="pr" style={{
              background:"#FFFBEB",
              border:`2px solid ${pay==="mixto"?"#F59E0B":"#F59E0B44"}`,
              borderRadius:14,padding:"14px 12px",cursor:"pointer",textAlign:"left",transition:"all .15s",
              boxShadow:pay==="mixto"?"0 4px 16px #F59E0B35":"0 1px 4px rgba(0,0,0,.06)",
              transform:pay==="mixto"?"scale(1.02)":"scale(1)",position:"relative"}}>
              <span style={{fontSize:28,display:"block",marginBottom:7}}>÷</span>
              <div style={{fontSize:13,fontWeight:800,color:"#F59E0B",marginBottom:2}}>Pago mixto</div>
              <div style={{fontSize:10,color:"#F59E0B99"}}>2 métodos</div>
              {pay==="mixto"&&<div style={{position:"absolute",top:8,right:8,width:18,height:18,borderRadius:"50%",background:"#F59E0B",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:800}}>✓</div>}
            </button>
          </div>

          {/* Pago mixto expandido */}
          {pay==="mixto"&&(
            <div style={{background:"#F8F8F8",borderRadius:12,padding:"14px",marginTop:4,border:"1px solid #EBEBEB"}}>
              <button onClick={()=>{setPay(null);setMixto1(null);setMixto2(null);setSplitAmt("");setSplitAmt2("");}} style={{width:"100%",background:"none",border:"1px solid #F59E0B55",borderRadius:10,padding:"9px",fontSize:12,fontWeight:700,color:"#F59E0B",cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>✕ Cancelar pago mixto</button>
              {/* Total a dividir */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,padding:"8px 10px",background:"#FFF",borderRadius:8,border:"1px solid #E8E8E8"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#999"}}>TOTAL A DIVIDIR</span>
                <span style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,color:local.color||"#C9A84C"}}>$ {fmt(grandTotal)}</span>
              </div>
              {/* Método 1 */}
              <div style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:1,marginBottom:8}}>MÉTODO 1</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {PAYS.map(p=>(
                  <button key={p.id} onClick={()=>{setMixto1(p.id);if(mixto2===p.id)setMixto2(null);}} className="pr"
                    style={{flexShrink:0,padding:"7px 12px",borderRadius:20,
                      background:mixto1===p.id?p.color:"#FFF",
                      border:`2px solid ${mixto1===p.id?p.color:p.color+"44"}`,
                      fontSize:12,fontWeight:700,color:mixto1===p.id?"#fff":p.color,cursor:"pointer",transition:"all .15s"}}>
                    {p.icon} {tPay(p.id,lang)}
                  </button>
                ))}
              </div>
              {mixto1&&(
                <input type="number" inputMode="numeric" placeholder="Monto método 1"
                  value={splitAmt}
                  onChange={e=>{setSplitAmt(e.target.value);const r=grandTotal-Number(e.target.value||0);if(r>=0)setSplitAmt2(String(Math.round(r)));}}
                  style={{width:"100%",background:"#FFF",border:"1px solid #DDD",borderRadius:10,padding:"10px 14px",fontSize:14,color:"#111",outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
              )}
              {/* Método 2 */}
              <div style={{fontSize:11,fontWeight:700,color:"#999",letterSpacing:1,marginBottom:8}}>MÉTODO 2</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {PAYS.filter(p=>p.id!==mixto1).map(p=>(
                  <button key={p.id} onClick={()=>setMixto2(p.id)} className="pr"
                    style={{flexShrink:0,padding:"7px 12px",borderRadius:20,
                      background:mixto2===p.id?p.color:"#FFF",
                      border:`2px solid ${mixto2===p.id?p.color:p.color+"44"}`,
                      fontSize:12,fontWeight:700,color:mixto2===p.id?"#fff":p.color,cursor:"pointer",transition:"all .15s"}}>
                    {p.icon} {tPay(p.id,lang)}
                  </button>
                ))}
              </div>
              {mixto2&&(
                <input type="number" inputMode="numeric" placeholder="Monto método 2 (auto)"
                  value={splitAmt2}
                  onChange={e=>setSplitAmt2(e.target.value)}
                  style={{width:"100%",background:"#FFF",border:"1px solid #DDD",borderRadius:10,padding:"10px 14px",fontSize:14,color:"#111",outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
              )}
              {/* 50/50 */}
              {mixto1&&mixto2&&(
                <button onClick={()=>{const h=Math.ceil(grandTotal/2);setSplitAmt(String(h));setSplitAmt2(String(grandTotal-h));}}
                  style={{background:"none",border:`1.5px solid ${local.color||"#C9A84C"}`,borderRadius:8,padding:"6px 14px",color:local.color||"#C9A84C",fontSize:12,fontWeight:800,cursor:"pointer"}}>
                  ÷ 50/50
                </button>
              )}
            </div>
          )}
        </div>

        {/* Alias MP/Transfer */}
        {(pay==="mp"||pay==="trans"||(pay==="mixto"&&(mixto1==="mp"||mixto1==="trans"||mixto2==="mp"||mixto2==="trans")))&&(
          <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:"#D97706",marginBottom:8,textTransform:"uppercase"}}>
              {(pay==="mp"||(pay==="mixto"&&(mixto1==="mp"||mixto2==="mp")))?"💳 Mercado Pago":"🏦 Transferencia"}
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:local.whatsapp?10:0}}>
              <div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,fontWeight:700,color:"#111"}}>{local.mp_alias||local.alias_pago||"Sin configurar"}</div>
                {local.mp_titular&&<div style={{fontSize:11,color:"#888",marginTop:2}}>Titular: {local.mp_titular}</div>}
              </div>
              <button onClick={()=>navigator.clipboard.writeText(local.mp_alias)} className="pr"
                style={{background:local.color||"#C9A84C",border:"none",borderRadius:9,padding:"8px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer",whiteSpace:"nowrap"}}>
                📋 Copiar
              </button>
            </div>
            <div style={{background:"#FFF7E6",border:"1px solid #F6D860",borderRadius:10,padding:"10px 12px",marginBottom:local.whatsapp?8:0,display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
              <div style={{fontSize:12,color:"#92400E",lineHeight:1.5,fontWeight:600}}>
                Compartí el comprobante de pago para que tu pedido entre a cocina.
              </div>
            </div>
            {local.whatsapp&&(
              <a href={`https://wa.me/${local.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent("Hola! Te envío el comprobante de pago de mi pedido en "+local.nombre+".")}`}
                target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",gap:10,background:"#25D366",borderRadius:10,padding:"10px 14px",textDecoration:"none"}}>
                <span style={{fontSize:18}}>📱</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Enviar comprobante por WhatsApp</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.85)"}}>Compartí a: <strong>{local.whatsapp||local.telefono||"este número"}</strong></div>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Dividir la cuenta */}
        {subTotal>0&&(
          <div style={{background:"#FFF",border:"1px solid #EBEBEB",borderRadius:14,overflow:"hidden",marginBottom:12}}>
            <button onClick={()=>setShowDividir(s=>!s)} style={{width:"100%",background:"none",border:"none",padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <span style={{fontSize:13,fontWeight:600,color:"#333",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>÷</span> Dividir la cuenta</span>
              <span style={{color:"#999",fontSize:12}}>{showDividir?"▲":"▼"}</span>
            </button>
            {showDividir&&(
              <div style={{padding:"0 16px 14px",borderTop:"1px solid #F0F0F0"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,margin:"10px 0"}}>
                  <button onClick={()=>setDividirN(n=>Math.max(2,n-1))} style={{width:34,height:34,borderRadius:10,background:"#F5F5F5",border:"1px solid #E8E8E8",color:"#333",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:local.color||"#C9A84C",flex:1,textAlign:"center"}}>{dividirN} personas</span>
                  <button onClick={()=>setDividirN(n=>n+1)} style={{width:34,height:34,borderRadius:10,background:"#F5F5F5",border:"1px solid #E8E8E8",color:"#333",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
                <div style={{background:"#F8F8F8",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#999"}}>Cada uno paga:</span>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:local.color||"#C9A84C"}}>$ {fmt(Math.ceil(grandTotal/dividirN))}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA fijo */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,padding:"12px 16px 28px",background:"linear-gradient(transparent,#F6F6F6 28%)"}}>
        {(pay&&(pay!=="mixto"||(mixto1&&mixto2)))&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:"#FFF",border:"1px solid #EBEBEB",borderRadius:14,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
            <div>
              <div style={{fontSize:11,color:"#999"}}>{tipAmt>0?"Subtotal + propina":"Total"}</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:local.color||"#C9A84C"}}>$ {fmt(grandTotal)}</div>
            </div>
            {tipAmt>0&&<div style={{fontSize:12,color:"#16A34A"}}>💝 +$ {fmt(tipAmt)}</div>}
          </div>
        )}
        <button onClick={async()=>{
          const isMixto = pay==="mixto";
          if(!pay) return;
          if(isMixto&&(!mixto1||!mixto2)) return;
          const cartItems=Object.values(cart).filter(i=>i.qty>0);
          const subtotal=cartItems.reduce((s,i)=>s+i.price*i.qty,0);
          const tipAmount=tipPct!=null?(tipPct===0?0:Math.round(subtotal*tipPct/100)):0;
          const descuentoAplicado=promoActiva&&subtotal>0?Math.round(subtotal*0.10):0;
          const totalFinal=subtotal-descuentoAplicado+tipAmount;
          const mesa=local.mesa||1;
          const m1amt=Number(splitAmt)||Math.ceil(totalFinal/2);
          const m2amt=Number(splitAmt2)||totalFinal-m1amt;
          const pagoFinal = isMixto
            ? `${mixto1}($${fmt(m1amt)})+${mixto2}($${fmt(m2amt)})`
            : pay;
          let pedidoId; let errorMsg=null;
          if(!supabase) errorMsg="Supabase no configurado";
          else if(!local.restauranteId) errorMsg="Sin restauranteId";
          else {
            try {
              pedidoId=crypto.randomUUID();
              const {error}=await supabase.from("pedidos").insert({id:pedidoId,restaurante_id:local.restauranteId,mesa_numero:mesa,status:"nuevo",metodo_pago:pagoFinal,propina:tipAmount,total:totalFinal,nota:[note,descuentoAplicado>0?`DESCUENTO_PRIMERA_VEZ_10%_$${descuentoAplicado}`:null].filter(Boolean).join(" | ")||null});
              if(error){errorMsg=error.message;alert("Error pedido: "+error.message);}
              else{
                if(descuentoAplicado>0){localStorage.removeItem("menuqr_promo10_"+(local.restauranteId||"x"));setPromoActiva(false);}
                const its=cartItems.map(i=>({pedido_id:pedidoId,producto_id:i.id,nombre:i.nombre||i.name||"?",precio:Math.round(i.precio??i.price??0),cantidad:i.qty}));
                const {error:itmErr2}=await supabase.from("pedido_items").insert(its);
                if(itmErr2){errorMsg=itmErr2.message;alert("Error items: "+itmErr2.message);}
              }
            } catch(e){errorMsg=e.message;}
          }
          if(errorMsg) localStorage.setItem("menuqr_last_order_error",errorMsg);
          else{localStorage.removeItem("menuqr_last_order_error");setLastPedidoId(pedidoId);setOrderStatus("nuevo");}
          setView("done");
        }} className="pr" style={{
          width:"100%",
          background:(pay&&(pay!=="mixto"||(mixto1&&mixto2)))?(local.color||"#C9A84C"):"#E0E0E0",
          color:(pay&&(pay!=="mixto"||(mixto1&&mixto2)))?"#fff":"#999",
          border:"none",borderRadius:16,padding:"16px",
          fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,
          cursor:(pay&&(pay!=="mixto"||(mixto1&&mixto2)))?"pointer":"not-allowed",
          boxShadow:(pay&&(pay!=="mixto"||(mixto1&&mixto2)))?"0 8px 28px rgba(0,0,0,.15)":"none",
          transition:"all .25s"}}>
          {(pay&&(pay!=="mixto"||(mixto1&&mixto2)))?T('confirm'):T('choosePay')}
        </button>
      </div>
    </div>
  );

  /* ── CARTA V3 VIEW (overrides both PC and mobile menu) */
  if(view==="menu"){
    const _cv3=local?.carta_v3;
    const _pub=local?.carta_publicada_en||{};
    const _surf=vitrina?'vitrina':'mesa';
    // Show if templateId set AND surface not explicitly disabled
    if(_cv3?.templateId&&_pub[_surf]!==false){
      return <CartaV3ClientView cartaV3={_cv3} local={local} cats={cats} prods={translatedProds} cart={cart} add={add} rem={rem} cartCount={cartCount} setView={setView} effectiveVitrina={effectiveVitrina} lang={lang} onCampanita={()=>setShowSolicitudes(true)} grandTotal={grandTotal}/>;
    }
  }

  /* ── PC MENU VIEW — OPCION C: BISTRO CLASICO */
  if(view==="menu"&&pcMode){
    const ac=local.color||"#C9A84C";
    const featured=prods.filter(p=>p.active||p.active==null).sort((a,b)=>(b.tag==="CHEF"?1:0)-(a.tag==="CHEF"?1:0)||b.price-a.price)[0];
    const creamBg="#F5F0E8";
    const warmBorder="#D4C4A8";
    const warmMuted="#7A6050";
    const warmText="#2C1810";
    const darkPanel="#1C1008";
    return(
      <div style={{display:"flex",height:"100vh",overflow:"hidden",fontFamily:"Georgia,serif"}}>
        <GS/>
        {/* LEFT PANEL — dark order panel */}
        <div style={{width:320,flexShrink:0,background:darkPanel,display:"flex",flexDirection:"column",overflowY:"auto",borderRight:"1px solid #2A1C0E"}}>
          {/* Branding */}
          <div style={{padding:"28px 24px 20px",borderBottom:"1px solid #2A1C0E"}}>
            <div style={{fontSize:40,marginBottom:10}}>{local.emoji||"🍽️"}</div>
            <div style={{fontSize:20,fontWeight:700,color:"#F5F0E8",fontStyle:"italic",letterSpacing:-.3}}>{local.nombre}</div>
            {local.descripcion&&<div style={{fontSize:9,color:"#5A3A20",letterSpacing:3,textTransform:"uppercase",marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>{local.descripcion}</div>}
            <div style={{width:40,height:2,background:ac,margin:"12px 0"}}/>
            {local.mesa&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#4A3020"}}>Mesa <span style={{fontSize:22,fontWeight:700,color:ac,fontStyle:"italic"}}>{local.mesa}</span></div>}
          </div>
          {/* Order list */}
          <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,letterSpacing:2.5,color:"#5A3A20",textTransform:"uppercase",marginBottom:16}}>Tu pedido</div>
            {items.length===0?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"30px 0",fontFamily:"'DM Sans',sans-serif"}}>
                <span style={{fontSize:28}}>📋</span>
                <span style={{fontSize:11,color:"#3A2210",fontStyle:"italic"}}>Seleccioná un producto</span>
              </div>
            ):(
              items.map(i=>(
                <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #2A1C0E"}}>
                  <span style={{fontSize:20,flexShrink:0}}>{i.emoji||"🍽️"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontStyle:"italic",color:"#D4C4A8",fontFamily:"'DM Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.name}</div>
                    <div style={{fontSize:10,color:ac,fontFamily:"'DM Sans',sans-serif"}}>$ {fmt(i.price*i.qty)}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <button onClick={()=>rem(i.id)} className="pr" style={{width:20,height:20,borderRadius:4,border:"1px solid #3A2A10",background:"#2A1C0E",color:"#888",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>−</button>
                    <span style={{fontSize:11,fontWeight:700,color:"#D4C4A8",minWidth:14,textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}>{i.qty}</span>
                    <button onClick={()=>add(i)} className="pr" style={{width:20,height:20,borderRadius:4,border:"none",background:ac,color:darkPanel,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>+</button>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Footer */}
          <div style={{padding:"16px 20px",borderTop:"1px solid #2A1C0E",background:"#140C04"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#5A3A20",letterSpacing:2,textTransform:"uppercase"}}>Total</span>
              <span style={{fontSize:22,fontWeight:700,color:ac,fontStyle:"italic"}}>$ {fmt(grandTotal)}</span>
            </div>
            <div style={{height:1,background:"#2A1C0E",marginBottom:12}}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:10}}>
              {["💵 Efectivo","💳 Tarjeta","📱 QR","🧾 Cuenta"].map(opt=>(
                <button key={opt} onClick={()=>{setPay(opt.split(" ")[1]);}} className="pr" style={{background:pay===opt.split(" ")[1]?"#2A1A08":"#1C1008",border:`1px solid ${pay===opt.split(" ")[1]?ac+"55":"#2A1C0E"}`,borderRadius:6,padding:"7px 2px",textAlign:"center",cursor:"pointer",transition:".15s"}}>
                  <span style={{display:"block",fontSize:14,marginBottom:2}}>{opt.split(" ")[0]}</span>
                  <span style={{fontSize:8,color:pay===opt.split(" ")[1]?ac:"#4A3020",fontFamily:"'DM Sans',sans-serif",display:"block"}}>{opt.split(" ").slice(1).join(" ")}</span>
                </button>
              ))}
            </div>
            <button
              onClick={()=>setView("cart")}
              className="pr"
              disabled={cartCount===0}
              style={{width:"100%",background:cartCount>0?ac:"#2A1C0E",border:"none",borderRadius:8,padding:13,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:cartCount>0?darkPanel:"#3A2A10",cursor:cartCount>0?"pointer":"not-allowed",letterSpacing:.8,textTransform:"uppercase"}}>
              {cartCount>0?`CONFIRMAR PEDIDO (${cartCount})`:"SELECCIONÁ PRODUCTOS"}
            </button>
          </div>
        </div>

        {/* RIGHT — warm carta */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:creamBg}}>
          {/* Header with category tabs */}
          <div style={{padding:"18px 32px 14px",borderBottom:`2px solid ${warmBorder}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <span style={{fontSize:13,letterSpacing:4,textTransform:"uppercase",color:warmText,fontFamily:"'DM Sans',sans-serif",fontWeight:700}}>La Carta</span>
            {local.mesa&&local.feat_solicitudes!==false&&(
              <button onClick={()=>setShowSolicitudes(true)} style={{width:34,height:34,borderRadius:10,background:"#EAE0CC",border:`1px solid ${warmBorder}`,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🛎️</button>
            )}
            <div style={{flex:1,display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none",justifyContent:"flex-end"}}>
              {[{id:"TODO",icon:"",label:lang==="en"?"All":lang==="pt"?"Tudo":lang==="fr"?"Tout":lang==="de"?"Alle":lang==="it"?"Tutto":lang==="zh"?"全部":lang==="ja"?"全て":lang==="ko"?"전체":lang==="gn"?"Mba'etéva":"Todo"},...activeCats].map(cat=>(
                <button key={cat.id} onClick={()=>setAC(cat.id)} className="pr" style={{
                  padding:"6px 18px",fontSize:11,cursor:"pointer",
                  color:activeCat===cat.id?warmText:warmMuted,
                  borderBottom:`2px solid ${activeCat===cat.id?ac:"transparent"}`,
                  background:"transparent",border:"none",borderBottomWidth:2,
                  borderBottomStyle:"solid",borderBottomColor:activeCat===cat.id?ac:"transparent",
                  fontFamily:"'DM Sans',sans-serif",fontWeight:600,whiteSpace:"nowrap",
                  transition:".15s",flexShrink:0}}>
                  {cat.icon?cat.icon+" ":""}{cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Featured */}
          {featured&&(activeCat==="TODO"||activeCat===featured.cat)&&(()=>{
            const inCart=cart[featured.id]?.qty||0;
            return(
              <div style={{padding:"16px 32px 0",flexShrink:0}}>
                <div style={{background:"#EAE0CC",border:`1px solid ${warmBorder}`,borderLeft:`4px solid ${ac}`,borderRadius:12,padding:"18px 24px",display:"flex",gap:20,alignItems:"center"}}>
                  {featured.foto_url?(
                    <img src={featured.foto_url} alt={featured.name} style={{width:80,height:80,objectFit:"cover",borderRadius:8,flexShrink:0}}
                      onError={e=>{e.target.style.display="none";const s=document.createElement("span");s.style.fontSize="56px";e.target.parentNode.insertBefore(s,e.target);s.textContent=featured.emoji||"🍽️";}}/>
                  ):(
                    <span style={{fontSize:56,flexShrink:0}}>{featured.emoji||"🍽️"}</span>
                  )}
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,fontWeight:700,letterSpacing:2,color:"#8A6A30",textTransform:"uppercase",marginBottom:4}}>✦ Recomendado del día</div>
                    <div style={{fontSize:22,fontWeight:700,color:warmText,marginBottom:3}}>{featured.name}</div>
                    {featured.desc&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:warmMuted,lineHeight:1.5,marginBottom:12}}>{featured.desc}</div>}
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <span style={{fontSize:20,color:"#8A6A30"}}>$ {fmt(featured.price)}</span>
                      {featured.sin_stock?(
                        <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#888"}}>Agotado</span>
                      ):inCart===0?(
                        <button onClick={()=>add(featured)} className="pr" style={{background:warmText,border:"none",borderRadius:8,padding:"9px 20px",fontSize:12,fontWeight:700,color:creamBg,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",letterSpacing:.5}}>+ Agregar al pedido</button>
                      ):(
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <button onClick={()=>rem(featured.id)} className="pr" style={{width:28,height:28,borderRadius:6,background:"#D4C4A8",border:`1px solid ${warmBorder}`,color:warmMuted,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>−</button>
                          <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,color:warmText,minWidth:14,textAlign:"center"}}>{inCart}</span>
                          <button onClick={()=>add(featured)} className="pr" style={{width:28,height:28,borderRadius:6,background:warmText,border:"none",color:creamBg,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Carta scroll */}
          <div style={{flex:1,overflowY:"auto",padding:"16px 32px 32px"}}>
            {activeCats.filter(cat=>activeCat==="TODO"||activeCat===cat.id).map(cat=>{
              const catProds=prods.filter(p=>p.cat===cat.id&&(p.active||p.active==null));
              if(!catProds.length) return null;
              return(
                <div key={cat.id} style={{marginBottom:8}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,letterSpacing:3,textTransform:"uppercase",color:warmMuted,padding:"16px 0 8px",borderBottom:`1px solid ${warmBorder}`}}>{cat.icon} {cat.label}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10,padding:"10px 0"}}>
                    {catProds.map(item=>{
                      const inCart=cart[item.id]?.qty||0;
                      const disc=item.orig?Math.round((1-item.price/item.orig)*100):null;
                      return(
                        <div key={item.id} style={{background:inCart>0?"#EDE4CE":"#EEE8D8",border:`1px solid ${inCart>0?ac+"88":warmBorder}`,borderRadius:10,display:"flex",gap:12,alignItems:"center",padding:"12px 14px",transition:".2s",cursor:"pointer"}}
                          onClick={inCart===0&&!item.sin_stock?()=>add(item):undefined}>
                          {item.foto_url?(
                            <img src={item.foto_url} alt={item.name} style={{width:44,height:44,objectFit:"cover",borderRadius:8,flexShrink:0}}
                              onError={e=>{e.target.style.display="none";const s=document.createElement("span");s.style.fontSize="36px";e.target.parentNode.insertBefore(s,e.target);s.textContent=item.emoji||"🍽️";}}/>
                          ):(
                            <span style={{fontSize:36,flexShrink:0}}>{item.emoji||"🍽️"}</span>
                          )}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:700,color:warmText,marginBottom:2}}>{item.name}</div>
                            {item.desc&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:warmMuted,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.desc}</div>}
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                            <span style={{fontSize:15,color:"#8A6A30"}}>{disc?<><span style={{textDecoration:"line-through",fontSize:11,color:warmMuted,marginRight:4}}>$ {fmt(item.orig)}</span></>:""}$ {fmt(item.price)}</span>
                            {item.tag&&<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:4,background:item.tag==="CHEF"?"#C9A84C22":"#4A9A5A22",color:item.tag==="CHEF"?"#8A6A30":"#4A7A50",border:`1px solid ${item.tag==="CHEF"?"#C9A84C55":"#4A9A5A44"}`}}>{item.tag}</span>}
                            {item.sin_stock?(
                              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:"#888"}}>Agotado</span>
                            ):inCart===0?(
                              <button onClick={e=>{e.stopPropagation();add(item);}} className="pr" style={{width:28,height:28,borderRadius:7,background:warmText,border:"none",color:creamBg,fontSize:17,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>+</button>
                            ):(
                              <div style={{display:"flex",alignItems:"center",gap:5}} onClick={e=>e.stopPropagation()}>
                                <button onClick={()=>rem(item.id)} className="pr" style={{width:24,height:24,borderRadius:5,background:"#D4C4A8",border:`1px solid ${warmBorder}`,color:warmMuted,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>−</button>
                                <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:warmText,minWidth:14,textAlign:"center"}}>{inCart}</span>
                                <button onClick={()=>add(item)} className="pr" style={{width:24,height:24,borderRadius:5,background:warmText,border:"none",color:creamBg,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  /* ── MENU VIEW — REDISEÑO MOBILE LIMPIO */
  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#F6F6F6",display:"flex",flexDirection:"column",position:"relative",fontFamily:"'DM Sans',sans-serif"}}>
      <GS/>

      {/* ══ STICKY TOP: Header + Category chips ══ */}
      <div style={{position:"sticky",top:0,zIndex:30,background:"#FFF",borderBottom:"1px solid #EBEBEB",boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px 10px"}}>
          {local.logo_url?(
            <img src={local.logo_url} alt="" style={{width:44,height:44,borderRadius:12,objectFit:"cover",flexShrink:0,border:"1px solid #EBEBEB"}}/>
          ):(
            <div style={{width:44,height:44,borderRadius:12,background:local.color||"#C9A84C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{local.emoji||"🍽️"}</div>
          )}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,color:"#111",lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{local.nombre}</div>
            {local.descripcion&&<div style={{fontSize:11,color:"#999",lineHeight:1.3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{local.descripcion}</div>}
            {local.mesa?<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,color:local.color||"#C9A84C",marginTop:2}}>Mesa {local.mesa}</div>:null}
          </div>
          {!effectiveVitrina&&cartCount>0&&(
            <button onClick={()=>setView("cart")} style={{flexShrink:0,background:local.color||"#C9A84C",border:"none",borderRadius:22,padding:"8px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:800,color:"#fff"}}>🛒 {cartCount}</span>
            </button>
          )}
          {!effectiveVitrina&&(
            <div style={{flexShrink:0,display:"flex",gap:6,alignItems:"center"}}>
              {local.mesa&&local.feat_solicitudes!==false&&(
                <button onClick={()=>setShowSolicitudes(true)} className="pr" style={{width:36,height:36,borderRadius:10,background:"#F5F5F5",border:"1px solid #EBEBEB",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🛎️</button>
              )}
              <button onClick={()=>setShowLang(true)} style={{width:36,height:36,borderRadius:10,background:"#F5F5F5",border:"1px solid #EBEBEB",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {LANGS.find(l=>l.code===lang)?.flag||"🌐"}
              </button>
            </div>
          )}
        </div>

        {/* Category chips */}
        <div style={{display:"flex",gap:8,padding:"0 14px 12px",overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
          {[{id:"TODO",icon:"",label:lang==="en"?"All":lang==="pt"?"Tudo":lang==="fr"?"Tout":lang==="de"?"Alle":lang==="it"?"Tutto":lang==="zh"?"全部":lang==="ja"?"全て":lang==="ko"?"전체":lang==="gn"?"Mba'etéva":"Todo"},...activeCats].map(cat=>(
            <button key={cat.id} onClick={()=>setAC(cat.id)} className="pr" style={{
              flexShrink:0,borderRadius:20,padding:"7px 16px",
              background:activeCat===cat.id?(local.color||"#C9A84C"):"#F0F0F0",
              color:activeCat===cat.id?"#fff":"#444",
              border:"none",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,
              cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap",
              boxShadow:activeCat===cat.id?"0 2px 8px rgba(0,0,0,.18)":"none"}}>
              {cat.icon?cat.icon+" ":""}{tCat(cat.label,lang)}
            </button>
          ))}
        </div>
      </div>

      {/* ══ SCROLLABLE CONTENT ══ */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:effectiveVitrina?24:100}}>
        <HappyHourBanner happyHasta={local.happyHasta} happyHour={local.happyHour} lang={lang}/>
        {effectiveVitrina && <VitrinaInfo local={local} cats={cats} prods={prods}/>}


        {/* Products by category */}
        {activeCats.filter(cat=>activeCat==="TODO"||activeCat===cat.id).map(cat=>{
          const catProds=translatedProds.filter(p=>p.cat===cat.id&&(p.active||p.active==null));
          if(!catProds.length) return null;
          const ac=local.color||"#C9A84C";
          return(
            <section key={cat.id} id={`cat-${cat.id}`} style={{marginBottom:8}}>
              {/* Category header */}
              <div style={{padding:"18px 16px 10px",background:"#F6F6F6"}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:"#111",letterSpacing:-.2}}>{cat.icon?cat.icon+" ":""}{tCat(cat.label,lang)}</div>
              </div>

              {/* Product list */}
              <div style={{background:"#FFF",borderRadius:0}}>
                {catProds.map((item,idx)=>{
                  const inCart=cart[item.id]?.qty||0;
                  const disc=item.orig?Math.round((1-item.price/item.orig)*100):null;
                  return(
                    <div key={item.id} style={{
                      display:"flex",alignItems:"center",gap:14,
                      padding:"14px 16px",
                      borderBottom:idx<catProds.length-1?"1px solid #F5F5F5":"none",
                      background:inCart>0?ac+"08":"#FFF",
                      transition:"background .15s"}}>
                      {/* Text content */}
                      <div style={{flex:1,minWidth:0}}>
                        {item.tag&&<Tag tag={item.tag}/>}
                        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:"#111",lineHeight:1.25,marginBottom:3}}>{item.name}</div>
                        {item.desc&&<div style={{fontSize:12,color:"#999",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:4}}>{item.desc}</div>}
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,color:ac,lineHeight:1}}>$ {fmt(item.price)}</div>
                          {item.orig&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#BBB",textDecoration:"line-through"}}>$ {fmt(item.orig)}</div>}
                          {disc&&<div style={{fontSize:10,fontWeight:800,color:"#22C55E",background:"#F0FDF4",borderRadius:4,padding:"1px 5px"}}>-{disc}%</div>}
                        </div>
                      </div>

                      {/* Image + add/remove */}
                      <div style={{position:"relative",flexShrink:0}}>
                        {item.foto_url?(
                          <img src={item.foto_url} alt={item.name} style={{width:80,height:80,borderRadius:12,objectFit:"cover",display:"block",border:"1px solid #F0F0F0"}}
                            onError={e=>{const p=e.target.parentElement;p.innerHTML=`<div style="width:80px;height:80px;border-radius:12px;background:#F5F5F5;display:flex;align-items:center;justify-content:center;font-size:30px">${item.emoji||"🍽️"}</div>`;}}/>
                        ):(
                          <div style={{width:80,height:80,borderRadius:12,background:ac+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,border:`1px solid ${ac}20`}}>{item.emoji||"🍽️"}</div>
                        )}
                        {!effectiveVitrina&&!item.sin_stock&&(
                          inCart===0?(
                            <button onClick={()=>add(item)} className="pr" style={{position:"absolute",bottom:-8,right:-8,width:30,height:30,borderRadius:15,background:ac,border:"2px solid #FFF",color:"#fff",fontSize:20,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,.2)",touchAction:"manipulation",lineHeight:1}}>+</button>
                          ):(
                            <div style={{position:"absolute",bottom:-10,right:-10,display:"flex",alignItems:"center",gap:0,background:"#FFF",borderRadius:16,boxShadow:"0 2px 10px rgba(0,0,0,.15)",border:`1px solid ${ac}40`,overflow:"hidden"}}>
                              <button onClick={()=>rem(item.id)} className="pr" style={{width:28,height:28,background:"none",border:"none",color:ac,fontSize:17,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation",lineHeight:1}}>−</button>
                              <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:12,color:ac,minWidth:16,textAlign:"center"}}>{inCart}</span>
                              <button onClick={()=>add(item)} className="pr" style={{width:28,height:28,background:ac,border:"none",color:"#fff",fontSize:17,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation",lineHeight:1}}>+</button>
                            </div>
                          )
                        )}
                        {!effectiveVitrina&&item.sin_stock&&(
                          <div style={{position:"absolute",inset:0,borderRadius:12,background:"rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{fontSize:9,fontWeight:800,color:"#999",background:"#EEE",borderRadius:4,padding:"2px 5px"}}>Agotado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Footer */}
        <div style={{textAlign:"center",padding:"20px 0 8px"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#CCC",letterSpacing:2}}>MENUQR</div>
        </div>
      </div>

      {/* ══ FLOATING CART BUTTON ══ */}
      {!effectiveVitrina&&cartCount>0&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:40,width:"calc(100% - 32px)",maxWidth:398}}>
          <button onClick={()=>setView("cart")} className="pr" style={{width:"100%",background:local.color||"#C9A84C",border:"none",borderRadius:16,padding:"15px 20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 8px 28px rgba(0,0,0,.25)",transition:"all .2s"}}>
            <div style={{background:"rgba(0,0,0,.15)",borderRadius:10,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:900,color:"#fff"}}>{cartCount}</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,color:"#fff",letterSpacing:.3}}>Ver mi pedido</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,color:"#fff"}}>$ {fmt(grandTotal)}</div>
          </button>
        </div>
      )}

      {/* ══ LANG MODAL ══ */}
      {showLang&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"flex-end"}} onClick={()=>setShowLang(false)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,margin:"0 auto",background:"#FFF",borderRadius:"22px 22px 0 0",padding:"20px 16px 36px",boxShadow:"0 -8px 40px rgba(0,0,0,.15)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:"#DDD",margin:"0 auto 18px"}}/>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,color:"#111",textAlign:"center",marginBottom:16}}>Idioma / Language</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {LANGS.map(l=>(
                <button key={l.code} onClick={()=>{changeLang(l.code);setShowLang(false);}} className="pr" style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"12px 14px",borderRadius:12,cursor:"pointer",textAlign:"left",
                  background:lang===l.code?"#F0FDF4":"#FAFAFA",
                  border:`1px solid ${lang===l.code?"#BBF7D0":"#EBEBEB"}`}}>
                  <span style={{fontSize:22}}>{l.flag}</span>
                  <span style={{fontSize:14,fontWeight:700,color:lang===l.code?"#16A34A":"#333"}}>{l.name}</span>
                  {lang===l.code&&<span style={{marginLeft:"auto",color:"#16A34A",fontSize:14}}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ══ SOLICITUDES MODAL ══ */}
      {!effectiveVitrina&&showSolicitudes&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"flex-end"}} onClick={()=>setShowSolicitudes(false)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,margin:"0 auto",background:"#FFF",borderRadius:"22px 22px 0 0",padding:"20px 16px 36px",boxShadow:"0 -8px 40px rgba(0,0,0,.15)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:"#DDD",margin:"0 auto 18px"}}/>
            <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:"#111",marginBottom:4,textAlign:"center"}}>Solicitar al local</h3>
            <p style={{fontSize:12,color:"#999",textAlign:"center",marginBottom:20}}>Mesa {local.mesa} · tap para enviar</p>
            {solicEnviada&&(
              <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"8px 14px",marginBottom:14,textAlign:"center"}}>
                <span style={{fontSize:13,color:"#16A34A",fontWeight:700}}>✓ Solicitud enviada</span>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[
                {tipo:"mozo",icon:"🙋",label:"Llamar al mozo"},
                {tipo:"cuenta",icon:"💳",label:"Pedir la cuenta"},
                {tipo:"cubiertos",icon:"🍴",label:"Cubiertos"},
                {tipo:"hielo",icon:"🧊",label:"Hielo"},
                {tipo:"pan",icon:"🍞",label:"Pan"},
                {tipo:"servilletas",icon:"🧻",label:"Servilletas"},
              ].map(s=>(
                <button key={s.tipo} onClick={()=>sendSolicitud(s.tipo)} className="pr" style={{
                  background:solicEnviada===s.tipo?"#F0FDF4":"#FAFAFA",
                  border:`1px solid ${solicEnviada===s.tipo?"#BBF7D0":"#EBEBEB"}`,
                  borderRadius:14,padding:"14px 10px",cursor:"pointer",textAlign:"center",transition:"all .2s"}}>
                  <span style={{fontSize:26,display:"block",marginBottom:6}}>{s.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:solicEnviada===s.tipo?"#16A34A":"#333"}}>{s.label}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setShowSolicitudes(false)} style={{width:"100%",background:"none",border:"1px solid #EBEBEB",borderRadius:12,padding:"12px",fontSize:13,color:"#999",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cerrar</button>
          </div>
        </div>
      )}

    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   QR TAB — componente a nivel de módulo para evitar remounts
══════════════════════════════════════════════════════════════ */
function QRTabComp({ mesaNum, setMesaNum, qrType, setQrType, promoUrl, setPromoUrl, local }) {
  // Asegurar que baseUrl incluye el slug del restaurante
  const configuredBase = (local.baseUrl||"").replace(/^https?:\/\//,"");
  const slug_ = local.slug || "";
  const _prodHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'menuqr-ten.vercel.app'
    : window.location.host;
  const baseUrl = configuredBase
    ? (configuredBase.includes("/") ? configuredBase : configuredBase + (slug_ ? "/"+slug_ : ""))
    : (_prodHost + (slug_ ? "/"+slug_ : ""));
  const getQRData = () => {
    const base = `https://${baseUrl}`;
    switch(qrType){
      case "mesa":      return `${base}/mesa/${mesaNum}`;
      case "wifi":      return `WIFI:T:WPA;S:${local.wifi_nombre};P:${local.wifi_pass};;`;
      case "whatsapp":  return local.feat_whatsapp_vitrina&&local.whatsapp_vitrina_numero ? `https://${baseUrl}/vitrina` : `https://wa.me/${local.whatsapp}?text=${encodeURIComponent(local.whatsapp_msg||"")}`;
      case "promo":     return promoUrl || `${base}/promo`;
      case "vitrina":   return `${base}/vitrina`;
      case "cocina":    return `${base}/cocina`;
      default:          return base;
    }
  };
  const QR_TYPES = [
    {id:"mesa",     icon:"🪑", label:"Mesa",      desc:"Un QR único por mesa",               color:"#C9A84C"},
    {id:"vitrina",  icon:"🪟", label:"Vitrina",   desc:"Carta en la puerta / vidrio",        color:"#C9A84C"},
    {id:"cocina",   icon:"👨‍🍳", label:"Cocina",    desc:"Pantalla de pedidos en cocina",      color:"#C9A84C"},
    {id:"wifi",     icon:"📶", label:"WiFi",      desc:"Conectarse al escanear",             color:"#C9A84C"},
    {id:"whatsapp", icon:"💬", label:"WhatsApp",  desc:"Pedidos por WA — flujo completo",    color:"#C9A84C"},
    {id:"promo",    icon:"🔥", label:"Promo",     desc:"URL personalizada de promo",         color:"#C9A84C"},
  ];
  const current = QR_TYPES.find(t=>t.id===qrType) || QR_TYPES[0];
  const qrData  = getQRData();

  return (
    <div style={{background:"var(--ab)",minHeight:"100%",padding:"18px 14px 32px"}}>
      {/* Header */}
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Panel del dueño</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:"#FFF",lineHeight:1}}>Generador de QRs</h2>
      </div>

      {/* Type selector grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
        {QR_TYPES.map(t=>(
          <button key={t.id} type="button" onClick={()=>setQrType(t.id)} className="pr" style={{
            background:qrType===t.id?`${t.color}18`:"var(--ac)",
            border:`1px solid ${qrType===t.id?t.color+"88":"#1E1E1E"}`,
            borderRadius:12,padding:"12px 10px",cursor:"pointer",textAlign:"left",
            transition:"all .2s",boxShadow:qrType===t.id?`0 0 12px ${t.color}22`:"none"}}>
            <span style={{fontSize:22,display:"block",marginBottom:5}}>{t.icon}</span>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,color:qrType===t.id?t.color:"#CCC",marginBottom:2,lineHeight:1}}>{t.label}</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"var(--ad)",lineHeight:1.3}}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Config por tipo */}
      <div style={{background:"var(--as)",border:"1px solid var(--abr)",borderRadius:14,padding:"14px 14px",marginBottom:16}}>
        {qrType==="mesa"&&(
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:current.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>Número de mesa</div>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
              <input type="range" min={1} max={local.mesas||10} value={mesaNum}
                onChange={e=>setMesaNum(Number(e.target.value))}
                style={{flex:1,accentColor:current.color}}/>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,fontWeight:700,color:current.color,minWidth:32,textAlign:"center"}}>{mesaNum}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
              {Array.from({length:Math.min(local.mesas||10,15)},(_,i)=>i+1).map(n=>(
                <button key={n} type="button" onClick={()=>setMesaNum(n)} className="pr" style={{
                  background:mesaNum===n?`${current.color}18`:"#1A1A1A",
                  border:`1px solid ${mesaNum===n?current.color+"88":"#2A2A2A"}`,
                  borderRadius:8,padding:"7px 4px",fontFamily:"'IBM Plex Mono',monospace",
                  fontWeight:700,fontSize:13,color:mesaNum===n?current.color:"var(--ad)",cursor:"pointer"}}>
                  {n}
                </button>
              ))}
              {(local.mesas||10)>15&&(
                <div style={{gridColumn:"1/-1",textAlign:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--ad)",padding:"4px 0"}}>+{(local.mesas||10)-15} más</div>
              )}
            </div>
          </div>
        )}
        {qrType==="vitrina"&&(
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:current.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Vitrina — carta de entrada</div>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)",lineHeight:1.5,marginBottom:10}}>Pegá este QR en la puerta o vidrio. El cliente ve toda la carta sin poder hacer pedidos.</p>
            <div style={{background:"rgba(139,92,246,.06)",border:"1px solid rgba(139,92,246,.2)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#8B5CF6",letterSpacing:.5,marginBottom:4}}>URL</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)",wordBreak:"break-all"}}>{qrData}</div>
            </div>
          </div>
        )}
        {qrType==="cocina"&&(
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:current.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Pantalla de cocina</div>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)",lineHeight:1.5,marginBottom:10}}>Abre la pantalla de cocina para que el equipo vea y gestione los pedidos en tiempo real.</p>
            <div style={{background:"rgba(249,115,22,.06)",border:"1px solid rgba(249,115,22,.2)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#F97316",letterSpacing:.5,marginBottom:4}}>URL</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)",wordBreak:"break-all"}}>{qrData}</div>
            </div>
          </div>
        )}
        {qrType==="wifi"&&(
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:current.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Datos del WiFi</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--am)",marginBottom:4}}>Red: <b style={{color:"#CCC"}}>{local.wifi_nombre||"Sin configurar"}</b></div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--am)",marginBottom:8}}>Contraseña: <b style={{color:"#CCC"}}>{local.wifi_pass||"Sin configurar"}</b></div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)"}}>Editá estos datos en Gestión →</div>
          </div>
        )}
        {qrType==="whatsapp"&&(
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:current.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>QR de Pedidos WhatsApp</div>
            {local.feat_whatsapp_vitrina&&local.whatsapp_vitrina_numero ? (
              <>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--am)",marginBottom:4}}>
                  ✅ Flujo de pedidos activado · <b style={{color:"#25D366"}}>+{local.whatsapp_vitrina_numero}</b>
                </div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)",marginBottom:8,lineHeight:1.5}}>
                  El cliente escanea → elige productos → llena sus datos → abre WhatsApp con el pedido listo
                </div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)"}}>Configurar en tab WhatsApp →</div>
              </>
            ) : (
              <>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#FF6B6B",marginBottom:6}}>
                  ⚠️ Activá el flujo de pedidos en el tab WhatsApp primero
                </div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)"}}>Sin flujo activo abre WA directo →</div>
              </>
            )}
          </div>
        )}
        {qrType==="promo"&&(
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:current.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>URL de la promo</div>
            <div style={{display:"flex",alignItems:"center",background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:10,overflow:"hidden",marginBottom:8}}>
              <span style={{padding:"0 10px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--ad)",borderRight:"1px solid #2A2A2A",height:40,display:"flex",alignItems:"center",flexShrink:0}}>URL</span>
              <input value={promoUrl} onChange={e=>setPromoUrl(e.target.value)}
                placeholder="https://instagram.com/tu_promo"
                style={{flex:1,background:"none",border:"none",padding:"10px 12px",color:"#CCC",fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}/>
            </div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"var(--ad)"}}>Puede ser cualquier URL — Instagram, promo especial, etc.</div>
          </div>
        )}
      </div>

      {/* QR Preview */}
      <div style={{background:"#FFFFFF",borderRadius:20,padding:"24px 16px",marginBottom:16,textAlign:"center",border:`1px solid ${current.color}44`,boxShadow:`0 4px 32px ${current.color}11`}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:current.color,letterSpacing:2.5,textTransform:"uppercase",marginBottom:10}}>{local.nombre}</div>
        <div style={{background:"#FFF",borderRadius:14,padding:10,border:`3px solid ${current.color}`,display:"inline-block",marginBottom:14}}>
          <QRImage data={qrData} size={200} light="#FFFFFF" dark="#1A1A1A"/>
        </div>
        <div style={{background:current.color,borderRadius:30,padding:"7px 24px",display:"inline-block",marginBottom:6}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:"#fff"}}>
            {qrType==="mesa"?`Mesa ${mesaNum}`:
             qrType==="wifi"?"WiFi Gratis":
             qrType==="whatsapp"?"Pedí por WhatsApp ▶":
             qrType==="vitrina"?"Ver la Carta":
             qrType==="cocina"?"Pantalla Cocina":
             "Promo Especial"}
          </div>
        </div>
        <div style={{fontFamily:"monospace",fontSize:8,color:current.color,opacity:.4,marginTop:6,wordBreak:"break-all",padding:"0 8px"}}>{qrData}</div>
      </div>

      {/* Helper to build the print card HTML */}
      {(()=>{
        const buildQRHtml = async(forPrint)=>{
          const qrUrl = await QRCodeLib.toDataURL(qrData,{width:320,margin:2,color:{dark:"#0A0806",light:"#FFFFFF"}});
          const label = qrType==="mesa"?`Mesa ${mesaNum}`:qrType==="wifi"?"WiFi Gratis":qrType==="whatsapp"?"Pedí por WhatsApp":qrType==="vitrina"?"Ver la Carta":qrType==="cocina"?"Pantalla Cocina":"Promo Especial";
          return {qrUrl, label};
        };
        const getHtml=(qrUrl,label,forPrint)=>`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR ${label}</title>
<style>
  @page{size:A4;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;overflow:hidden;background:#fff}
  body{display:flex;align-items:center;justify-content:center;height:100%;background:#fff}
  .card{text-align:center;padding:40px 56px;border:3px solid ${current.color};border-radius:28px;background:#fff}
  .name{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${current.color};margin-bottom:18px;font-family:monospace}
  .qr{background:#fff;border:3px solid ${current.color};border-radius:14px;padding:12px;display:inline-block;margin-bottom:18px}
  .lbl{background:${current.color};color:#0A0806;border-radius:30px;padding:9px 32px;display:inline-block;font-size:17px;font-weight:700;margin-bottom:12px;font-family:sans-serif}
  .url{font-size:9px;color:#999;word-break:break-all;max-width:260px;margin:0 auto;font-family:monospace}
</style></head><body>
<div class="card">
  <div class="name">${local.nombre||"MenuQR"}</div>
  <div class="qr"><img src="${qrUrl}" width="260" height="260"/></div><br>
  <div class="lbl">${label}</div>
  <div class="url">${qrData}</div>
</div>${forPrint?`<script>window.onload=function(){window.print();setTimeout(function(){window.close()},1500)}<\/script>`:""}
</body></html>`;
        return(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {/* IMPRIMIR */}
            <button type="button" onClick={async()=>{
              const {qrUrl,label}=await buildQRHtml(true);
              const w=window.open("","_blank","width=520,height=640,toolbar=0,menubar=0");
              if(w){w.document.write(getHtml(qrUrl,label,true));w.document.close();}
            }} className="pr" style={{
              width:"100%",background:current.color,color:"#0A0806",border:"none",
              borderRadius:12,padding:13,fontFamily:"'IBM Plex Mono',monospace",
              fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
              🖨️ IMPRIMIR
            </button>
            {/* DESCARGAR PDF */}
            <button type="button" onClick={async()=>{
              const {qrUrl,label}=await buildQRHtml(false);
              const html=getHtml(qrUrl,label,false);
              const blob=new Blob([html],{type:"text/html"});
              const a=document.createElement("a");
              a.href=URL.createObjectURL(blob);
              const slug=(local.nombre||"menuqr").toLowerCase().replace(/\s+/g,"-");
              const lbl=(label).toLowerCase().replace(/\s+/g,"-");
              a.download=`qr-${slug}-${lbl}.html`;
              a.click();
              URL.revokeObjectURL(a.href);
            }} className="pr" style={{
              width:"100%",background:"var(--ag)",color:"#fff",border:"none",
              borderRadius:12,padding:13,fontFamily:"'IBM Plex Mono',monospace",
              fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
              📥 DESCARGAR (PDF / imprenta)
            </button>
            {/* DESCARGAR IMAGEN PNG — canvas con nombre + QR + mesa */}
            <button type="button" onClick={async()=>{
              const qrSize=500;
              const pad=40;
              const headerH=70;
              const labelH=70;
              const footerH=40;
              const totalH=headerH+qrSize+labelH+footerH+pad*2;
              const totalW=qrSize+pad*2;
              const canvas=document.createElement("canvas");
              canvas.width=totalW; canvas.height=totalH;
              const ctx=canvas.getContext("2d");
              // background
              ctx.fillStyle="#FFFFFF";
              ctx.fillRect(0,0,totalW,totalH);
              // border
              ctx.strokeStyle=current.color;
              ctx.lineWidth=6;
              const r=24;
              ctx.beginPath();ctx.moveTo(r,3);ctx.lineTo(totalW-r,3);ctx.quadraticCurveTo(totalW-3,3,totalW-3,r);ctx.lineTo(totalW-3,totalH-r);ctx.quadraticCurveTo(totalW-3,totalH-3,totalW-r,totalH-3);ctx.lineTo(r,totalH-3);ctx.quadraticCurveTo(3,totalH-3,3,totalH-r);ctx.lineTo(3,r);ctx.quadraticCurveTo(3,3,r,3);ctx.closePath();ctx.stroke();
              // restaurant name
              ctx.fillStyle=current.color;
              ctx.font="bold 22px monospace";
              ctx.textAlign="center";
              ctx.letterSpacing="4px";
              ctx.fillText((local.nombre||"MenuQR").toUpperCase(),totalW/2,pad+36);
              // QR image
              const qrUrl=await QRCodeLib.toDataURL(qrData,{width:qrSize,margin:1,color:{dark:"#0A0806",light:"#FFFFFF"}});
              const img=new Image();
              await new Promise(res=>{img.onload=res;img.src=qrUrl;});
              ctx.drawImage(img,pad,pad+headerH,qrSize,qrSize);
              // label pill
              const lbl=qrType==="mesa"?`Mesa ${mesaNum}`:qrType==="wifi"?"WiFi Gratis":qrType==="whatsapp"?"Pedí por WhatsApp":qrType==="vitrina"?"Ver la Carta":qrType==="cocina"?"Pantalla Cocina":"Promo";
              const lblY=pad+headerH+qrSize+16;
              const pillW=Math.min(260,totalW-pad*2);
              const pillX=(totalW-pillW)/2;
              ctx.fillStyle=current.color;
              ctx.beginPath();ctx.roundRect(pillX,lblY,pillW,44,22);ctx.fill();
              ctx.fillStyle="#0A0806";
              ctx.font="bold 20px sans-serif";
              ctx.textAlign="center";
              ctx.fillText(lbl,totalW/2,lblY+28);
              // url footer
              ctx.fillStyle="#999999";
              ctx.font="12px monospace";
              ctx.fillText(qrData.length>50?qrData.substring(0,50)+"...":qrData,totalW/2,lblY+44+footerH-8);
              // download or share
              const fileSlug=(local.nombre||"menuqr").toLowerCase().replace(/\s+/g,"-");
              const fileLbl=qrType==="mesa"?`mesa-${mesaNum}`:qrType==="cocina"?"cocina":qrType==="vitrina"?"vitrina":"qr";
              const fileName=`qr-${fileSlug}-${fileLbl}.png`;
              canvas.toBlob(async(blob)=>{
                if(navigator.share && navigator.canShare && navigator.canShare({files:[new File([blob],"qr.png",{type:"image/png"})]})){
                  try{
                    await navigator.share({
                      title:`QR ${lbl} — ${local.nombre||"MenuQR"}`,
                      text:`Escaneá el QR para ver la carta de ${local.nombre||"tu restaurante"}`,
                      files:[new File([blob],fileName,{type:"image/png"})]
                    });
                  }catch(e){
                    // user cancelled share or error — fallback to download
                    const a=document.createElement("a");
                    a.href=URL.createObjectURL(blob);
                    a.download=fileName;
                    a.click();
                  }
                } else {
                  const a=document.createElement("a");
                  a.href=URL.createObjectURL(blob);
                  a.download=fileName;
                  a.click();
                }
              },"image/png");
            }} className="pr" style={{
              width:"100%",background:"var(--ag)",color:"#fff",border:"none",
              borderRadius:12,padding:13,fontFamily:"'IBM Plex Mono',monospace",
              fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
              🖼️ DESCARGAR IMAGEN (.png)
            </button>
            {qrType==="vitrina" && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent("¡Mirá la carta de " + (local.nombre||"nuestro restaurante") + " y hacé tu pedido desde acá! 👉 " + qrData)}`}
                target="_blank" rel="noreferrer"
                style={{
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  width:"100%",background:"#25D366",color:"#fff",
                  borderRadius:12,padding:13,fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1,
                  textDecoration:"none",boxSizing:"border-box",marginTop:8
                }}>
                📲 COMPARTIR POR WHATSAPP
              </a>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CAT MODAL — nivel de módulo (evita useState condicional)
══════════════════════════════════════════════════════════════ */
function CatModal({local, cats, setCats, setGModal, toast, onCreated, editData}) {
  const ICONOS = ["◇","◉","◌","◎","✦","★","◈","▶","♦","❋","🍕","🥩","🍹","☕"];
  const [nNombre,setNN] = useState(editData?.label || "");
  const [nIcono, setNI] = useState(editData?.icon || "◇");
  const isEdit = !!editData;
  return (
    <BottomModal title={isEdit?"Editar categoría":"Nueva categoría"} onClose={()=>setGModal(null)}>
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
          if(isEdit){
            setCats(cs=>cs.map(c=>c.id===editData.id?{...c,label:nNombre,icon:nIcono}:c));
            if(local.restauranteId && supabase){
              await supabase.from("categorias").update({label:nNombre,icon:nIcono}).eq("id",editData.id);
            }
            setGModal(null);
            toast("Categoría actualizada");
          } else {
            if(local.restauranteId && supabase){
              const {data:cat,error} = await supabase.from("categorias")
                .insert({restaurante_id:local.restauranteId, label:nNombre, icon:nIcono, activa:true, orden:cats.length})
                .select().single();
              if(error){ toast("Error: "+error.message,"err"); return; }
              setCats(cs=>[...cs,{id:cat.id,label:cat.label,icon:cat.icon,activa:cat.activa}]);
              onCreated?.(cat.id);
            } else {
              const newId=nNombre.toLowerCase().replace(/\s+/g,"_")+Date.now();
              setCats(cs=>[...cs,{id:newId,label:nNombre,icon:nIcono,activa:true}]);
              onCreated?.(newId);
            }
            setGModal(null);
            toast("Categoria creada - ahora agrega productos");
          }
        }} className="pr" style={{
          flex:2,background:"var(--gi)",color:"#fff",border:"none",
          borderRadius:10,padding:12,fontFamily:"'Outfit',sans-serif",
          fontSize:14,fontWeight:600,cursor:"pointer"}}>
          {isEdit?"Guardar cambios":"Crear categoría"}
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
      nuevo:    [[880,0,.08],[880,.12,.08],[1100,.26,.12]],
      cocina:   [[660,0,.10],[880,.18,.10]],
      listo:    [[523,0,.09],[659,.12,.09],[784,.25,.14]],
      solicitud:[[1318,0,.06],[1047,.1,.06],[1318,.2,.06],[1047,.3,.1],[1318,.45,.15]],
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


/* ══════════════════════════════════════════
   GESTIÓN TAB — todo editable
══════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════
   REPORTES — ventas históricas con gráfico SVG
   ═══════════════════════════════════════════════════ */
function ReportesTab({local}) {
  const [rango, setRango]       = useState("7d");   // 7d | 30d | mes
  const [datos, setDatos]       = useState([]);      // [{fecha, total, qty, pagos:{}}]
  const [loading, setLoading]   = useState(false);
  const [rsub, setRsub]         = useState("ventas"); // ventas | productos | pagos

  const RANGOS = [{id:"7d",label:"7 días"},{id:"30d",label:"30 días"},{id:"mes",label:"Este mes"}];

  const fechaDesde = () => {
    const d = new Date();
    if(rango==="7d")  { d.setDate(d.getDate()-6); }
    else if(rango==="30d") { d.setDate(d.getDate()-29); }
    else { d.setDate(1); }
    d.setHours(0,0,0,0);
    return d.toISOString();
  };

  useEffect(()=>{
    if(!local.restauranteId) return;
    setLoading(true);
    (async()=>{
      const {data} = await supabase
        .from("pedidos")
        .select("created_at, total, metodo_pago, status, pedido_items(nombre, cantidad, precio)")
        .eq("restaurante_id", local.restauranteId)
        .gte("created_at", fechaDesde())
        .order("created_at",{ascending:true});
      if(!data) { setLoading(false); return; }
      // Agrupar por día
      const byDay = {};
      data.forEach(p=>{
        const dia = p.created_at.slice(0,10);
        if(!byDay[dia]) byDay[dia] = {fecha:dia, total:0, qty:0, pagos:{cash:0,mp:0,card:0,trans:0,mixto:0}};
        byDay[dia].total += p.total||0;
        byDay[dia].qty++;
        const pago = p.metodo_pago||"";
        if(pago.includes("+")) byDay[dia].pagos.mixto += p.total||0;
        else if(pago==="cash") byDay[dia].pagos.cash += p.total||0;
        else if(pago==="mp")   byDay[dia].pagos.mp   += p.total||0;
        else if(pago==="card") byDay[dia].pagos.card += p.total||0;
        else if(pago==="trans")byDay[dia].pagos.trans += p.total||0;
        else                   byDay[dia].pagos.cash += p.total||0;
      });
      // Rellenar días vacíos
      const desde = new Date(fechaDesde());
      const hoy   = new Date();
      const dias  = [];
      const cur   = new Date(desde);
      while(cur <= hoy) {
        const key = cur.toISOString().slice(0,10);
        dias.push(byDay[key] || {fecha:key, total:0, qty:0, pagos:{cash:0,mp:0,card:0,trans:0,mixto:0}});
        cur.setDate(cur.getDate()+1);
      }
      // Agregar items vendidos
      const itemMap = {};
      data.forEach(p=>{
        (p.pedido_items||[]).forEach(it=>{
          const k = it.nombre;
          if(!itemMap[k]) itemMap[k] = {nombre:k, cantidad:0, total:0};
          itemMap[k].cantidad += it.cantidad||0;
          itemMap[k].total    += (it.precio||0)*(it.cantidad||0);
        });
      });
      setDatos({dias, items: Object.values(itemMap).sort((a,b)=>b.cantidad-a.cantidad)});
      setLoading(false);
    })();
  },[local.restauranteId, rango]);

  if(!datos.dias) return (
    <div style={{padding:24,textAlign:"center",color:"var(--gd)",fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>
      {loading ? "Cargando..." : "Sin datos"}
    </div>
  );

  const dias   = datos.dias || [];
  const items  = datos.items || [];
  const totalGeneral  = dias.reduce((s,d)=>s+d.total,0);
  const totalPedidos  = dias.reduce((s,d)=>s+d.qty,0);
  const ticketProm    = totalPedidos ? Math.round(totalGeneral/totalPedidos) : 0;
  const maxVal        = Math.max(...dias.map(d=>d.total), 1);
  const totalPagos    = {
    cash:  dias.reduce((s,d)=>s+d.pagos.cash,0),
    mp:    dias.reduce((s,d)=>s+d.pagos.mp,0),
    card:  dias.reduce((s,d)=>s+d.pagos.card,0),
    trans: dias.reduce((s,d)=>s+d.pagos.trans,0),
    mixto: dias.reduce((s,d)=>s+d.pagos.mixto,0),
  };

  const fmtFecha = (iso) => {
    const d = new Date(iso+"T12:00:00");
    return d.toLocaleDateString("es",{day:"2-digit",month:"2-digit"});
  };

  const BAR_H = 120;

  return (
    <div style={{padding:"18px 16px 100px"}}>
      {/* Selector de rango */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {RANGOS.map(r=>(
          <button key={r.id} onClick={()=>setRango(r.id)} style={{
            flex:1,padding:"9px",borderRadius:10,cursor:"pointer",
            fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,
            background:rango===r.id?"var(--gi)":"var(--ac)",
            color:rango===r.id?"#fff":"var(--ad)",
            border:`1px solid ${rango===r.id?"var(--gi)":"var(--abr)"}`,
            transition:"all .2s"}}>
            {r.label}
          </button>
        ))}
      </div>

      {loading && <div style={{textAlign:"center",padding:40,color:"var(--gd)",fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>Cargando reportes...</div>}

      {!loading && (<>
        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          {[
            {label:"INGRESOS",   value:`$${fmt(totalGeneral)}`,  color:"var(--ag)"},
            {label:"PEDIDOS",    value:totalPedidos,               color:"var(--abl)"},
            {label:"TICKET PROM",value:`$${fmt(ticketProm)}`,    color:"var(--am)"},
          ].map(k=>(
            <div key={k.label} style={{background:"var(--ac)",border:"1px solid var(--abr)",
              borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                color:"var(--am)",letterSpacing:1,marginBottom:4}}>{k.label}</p>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,
                fontWeight:700,color:k.color,margin:0,lineHeight:1}}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Sub-tabs */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[{id:"ventas",label:"📈 Ventas"},{id:"productos",label:"🏆 Productos"},{id:"pagos",label:"💳 Pagos"}].map(s=>(
            <button key={s.id} onClick={()=>setRsub(s.id)} style={{
              flex:1,padding:"8px",borderRadius:10,cursor:"pointer",
              fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:600,
              background:rsub===s.id?"var(--gi)":"var(--ac)",
              color:rsub===s.id?"#fff":"var(--ad)",
              border:`1px solid ${rsub===s.id?"var(--gi)":"var(--abr)"}`,
              transition:"all .2s"}}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── VENTAS: gráfico de barras SVG ── */}
        {rsub==="ventas" && (
          <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:"16px 12px"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",
              letterSpacing:1,marginBottom:12}}>INGRESOS POR DÍA</p>
            {totalGeneral===0 ? (
              <p style={{textAlign:"center",color:"var(--gd)",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,padding:"30px 0"}}>Sin ventas en este período</p>
            ) : (
              <div style={{overflowX:"auto"}}>
                <svg width={Math.max(dias.length*36+20, 300)} height={BAR_H+40} style={{display:"block"}}>
                  {dias.map((d,i)=>{
                    const barH = d.total ? Math.max((d.total/maxVal)*BAR_H, 4) : 2;
                    const x = i*36+10;
                    const y = BAR_H - barH;
                    const isHoy = d.fecha===new Date().toISOString().slice(0,10);
                    return (
                      <g key={d.fecha}>
                        <rect x={x} y={y} width={24} height={barH}
                          rx={4} fill={isHoy?"var(--abl)":"var(--gi)"}
                          opacity={d.total?1:.25}/>
                        {d.total>0 && (
                          <text x={x+12} y={y-4} textAnchor="middle"
                            fontSize={8} fill="var(--am)" fontFamily="IBM Plex Mono">
                            ${d.total>=1000?Math.round(d.total/1000)+"k":d.total}
                          </text>
                        )}
                        <text x={x+12} y={BAR_H+14} textAnchor="middle"
                          fontSize={8} fill="var(--at)" fontFamily="IBM Plex Mono">
                          {fmtFecha(d.fecha)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
            {/* Detalle por día */}
            {dias.filter(d=>d.total>0).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,7).map(d=>(
              <div key={d.fecha} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"7px 0",borderTop:"1px solid var(--abr)"}}>
                <div>
                  <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:"var(--abri)"}}>
                    {new Date(d.fecha+"T12:00:00").toLocaleDateString("es",{weekday:"short",day:"2-digit",month:"2-digit"})}
                  </span>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)",marginLeft:8}}>
                    {d.qty} pedido{d.qty!==1?"s":""}
                  </span>
                </div>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:"var(--ag)"}}>
                  ${fmt(d.total)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── PRODUCTOS MÁS VENDIDOS ── */}
        {rsub==="productos" && (
          <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:"16px 12px"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",
              letterSpacing:1,marginBottom:12}}>PRODUCTOS MÁS VENDIDOS</p>
            {items.length===0 ? (
              <p style={{textAlign:"center",color:"var(--gd)",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,padding:"30px 0"}}>Sin datos en este período</p>
            ) : items.slice(0,15).map((it,i)=>{
              const maxCant = items[0].cantidad;
              return (
                <div key={it.nombre} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
                      color:"var(--abri)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                        color:"var(--am)",marginRight:6}}>#{i+1}</span>
                      {it.nombre}
                    </span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                      color:"var(--am)",flexShrink:0,marginLeft:8}}>{it.cantidad} uds</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:"var(--as)"}}>
                    <div style={{height:6,borderRadius:3,
                      background:`linear-gradient(90deg,var(--gi),var(--abl))`,
                      width:`${(it.cantidad/maxCant)*100}%`,transition:"width .4s"}}/>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--ag)"}}>
                      ${fmt(it.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGOS ── */}
        {rsub==="pagos" && (
          <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:"16px 12px"}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",
              letterSpacing:1,marginBottom:12}}>BREAKDOWN POR MÉTODO</p>
            {totalGeneral===0 ? (
              <p style={{textAlign:"center",color:"var(--gd)",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,padding:"30px 0"}}>Sin ventas en este período</p>
            ) : [
              {id:"cash", label:"Efectivo",     icon:"💵"},
              {id:"mp",   label:"Mercado Pago", icon:"📲"},
              {id:"card", label:"Débito",        icon:"💳"},
              {id:"trans",label:"Transferencia", icon:"🏦"},
              {id:"mixto",label:"Pago mixto",    icon:"÷"},
            ].filter(p=>totalPagos[p.id]>0).map(p=>{
              const pct = totalGeneral ? Math.round((totalPagos[p.id]/totalGeneral)*100) : 0;
              return (
                <div key={p.id} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:"var(--abri)"}}>
                      {p.icon} {p.label}
                    </span>
                    <div style={{textAlign:"right"}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:"var(--ag)"}}>
                        ${fmt(totalPagos[p.id])}
                      </span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                        color:"var(--am)",marginLeft:6}}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{height:8,borderRadius:4,background:"var(--as)"}}>
                    <div style={{height:8,borderRadius:4,background:"var(--abl)",
                      width:`${pct}%`,transition:"width .4s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>)}
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   GESTIÓN DE PERSONAL — mozos, roles, turnos
   ═══════════════════════════════════════════════════ */
function PersonalSection({local, toast}) {
  const [mozos, setMozos]         = useState([]);
  const [turnos, setTurnos]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [editMozo, setEditMozo]   = useState(null); // mozo being edited
  const [draft, setDraft]         = useState({nombre:"",rol:"mozo",pin:""});
  const [psub, setPsub]           = useState("mozos"); // mozos | turnos

  const ROLES = [
    {id:"mozo",    label:"Mozo/a",      icon:"🙋"},
    {id:"cajero",  label:"Cajero/a",    icon:"💰"},
    {id:"cocina",  label:"Cocina",      icon:"👨‍🍳"},
    {id:"admin",   label:"Admin",       icon:"⚙️"},
  ];

  // Load from Supabase config.mozos
  useEffect(()=>{
    if(!local.restauranteId) return;
    (async()=>{
      setLoading(true);
      const {data} = await supabase.from("restaurantes").select("config").eq("id",local.restauranteId).single();
      if(data?.config?.mozos) setMozos(data.config.mozos);
      if(data?.config?.turnos_personal) setTurnos(data.config.turnos_personal);
      setLoading(false);
    })();
  },[local.restauranteId]);

  const saveMozos = async(newMozos, newTurnos) => {
    const updMozos = newMozos !== undefined ? newMozos : mozos;
    const updTurnos = newTurnos !== undefined ? newTurnos : turnos;
    if(!local.restauranteId) return;
    await supabase.from("restaurantes").update({
      config: supabase.rpc ? undefined : undefined
    }).eq("id",local.restauranteId);
    // Use jsonb merge approach via RPC or direct update
    const {error} = await supabase.from("restaurantes")
      .update({config: {mozos: updMozos, turnos_personal: updTurnos}})
      .eq("id", local.restauranteId);
    // Note: this replaces config — we need to merge
    if(error) toast("Error al guardar","err");
  };

  const saveMozosOnly = async(newMozos) => {
    if(!local.restauranteId) return;
    // First fetch current config to merge
    const {data} = await supabase.from("restaurantes").select("config").eq("id",local.restauranteId).single();
    const cfg = {...(data?.config||{}), mozos: newMozos};
    const {error} = await supabase.from("restaurantes").update({config: cfg}).eq("id",local.restauranteId);
    if(error) toast("Error al guardar","err");
  };

  const saveTurnosOnly = async(newTurnos) => {
    if(!local.restauranteId) return;
    const {data} = await supabase.from("restaurantes").select("config").eq("id",local.restauranteId).single();
    const cfg = {...(data?.config||{}), turnos_personal: newTurnos};
    const {error} = await supabase.from("restaurantes").update({config: cfg}).eq("id",local.restauranteId);
    if(error) toast("Error al guardar","err");
  };

  const addOrEditMozo = async() => {
    if(!draft.nombre.trim()) { toast("Ingresá un nombre","err"); return; }
    let newMozos;
    if(editMozo) {
      newMozos = mozos.map(m=>m.id===editMozo.id ? {...m,...draft} : m);
    } else {
      newMozos = [...mozos, {...draft, id: Date.now().toString(), activo:true, en_turno:false}];
    }
    setMozos(newMozos);
    await saveMozosOnly(newMozos);
    setShowAdd(false); setEditMozo(null); setDraft({nombre:"",rol:"mozo",pin:""});
    toast(editMozo?"Empleado actualizado ✓":"Empleado agregado ✓");
  };

  const deleteMozo = async(id) => {
    const newMozos = mozos.filter(m=>m.id!==id);
    setMozos(newMozos);
    await saveMozosOnly(newMozos);
    toast("Empleado eliminado","warn");
  };

  const toggleTurno = async(mozo) => {
    const ahora = new Date().toISOString();
    let newTurnos = [...turnos];
    let newMozos;
    if(mozo.en_turno) {
      // Close turno
      newTurnos = turnos.map(t=>t.mozo_id===mozo.id && !t.fin ? {...t, fin:ahora} : t);
      newMozos = mozos.map(m=>m.id===mozo.id ? {...m,en_turno:false} : m);
      toast(`${mozo.nombre} salió del turno`);
    } else {
      // Open turno
      newTurnos = [...turnos, {id:Date.now().toString(), mozo_id:mozo.id, nombre:mozo.nombre, rol:mozo.rol, inicio:ahora, fin:null}];
      newMozos = mozos.map(m=>m.id===mozo.id ? {...m,en_turno:true} : m);
      toast(`${mozo.nombre} inició turno ✓`);
    }
    setMozos(newMozos);
    setTurnos(newTurnos);
    await saveMozosOnly(newMozos);
    await saveTurnosOnly(newTurnos);
  };

  const fmtDur = (inicio, fin) => {
    const ms = new Date(fin||new Date()) - new Date(inicio);
    const h = Math.floor(ms/3600000);
    const m = Math.floor((ms%3600000)/60000);
    return h>0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fmtHora = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"});
  };

  const hoy = new Date().toDateString();
  const turnosHoy = turnos.filter(t=>new Date(t.inicio).toDateString()===hoy);

  return (
    <div style={{paddingBottom:80}}>
      {/* Sub-nav */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[{id:"mozos",label:"👥 Empleados"},{id:"turnos",label:"🕐 Turnos hoy"}].map(s=>(
          <button key={s.id} onClick={()=>setPsub(s.id)} style={{
            flex:1,padding:"9px",borderRadius:10,cursor:"pointer",
            fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,
            background:psub===s.id?"var(--gi)":"var(--ac)",
            color:psub===s.id?"#fff":"var(--ad)",
            border:`1px solid ${psub===s.id?"var(--gi)":"var(--abr)"}`,
            transition:"all .2s"}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── EMPLEADOS ── */}
      {psub==="mozos" && (<>
        <button onClick={()=>{setShowAdd(true);setEditMozo(null);setDraft({nombre:"",rol:"mozo",pin:""}); }} style={{
          width:"100%",padding:"12px",borderRadius:12,border:"1px dashed var(--gi)",
          background:"rgba(99,102,241,.05)",color:"var(--gi)",
          fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,
          cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",
          justifyContent:"center",gap:8}}>
          + Agregar empleado
        </button>

        {loading && <p style={{textAlign:"center",color:"var(--gd)",fontSize:12}}>Cargando...</p>}

        {mozos.map(m=>{
          const role = ROLES.find(r=>r.id===m.rol)||ROLES[0];
          return (
            <div key={m.id} style={{background:"var(--gc)",border:"1px solid var(--gbr)",
              borderRadius:14,padding:"14px 16px",marginBottom:10,
              display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,
                background:m.en_turno?"rgba(0,255,136,.15)":"var(--gb)",
                border:`2px solid ${m.en_turno?"#00FF88":"var(--gbr)"}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {role.icon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,
                  color:"var(--gi2)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.nombre}</p>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--gd)",margin:0}}>
                  {role.label} {m.pin ? `· PIN: ${m.pin}` : ""}
                </p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <button onClick={()=>toggleTurno(m)} style={{
                  padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:.5,
                  background:m.en_turno?"rgba(255,59,92,.12)":"rgba(0,255,136,.12)",
                  color:m.en_turno?"var(--gr)":"#00CC70",transition:"all .15s"}}>
                  {m.en_turno?"SALIR":"ENTRAR"}
                </button>
                <button onClick={()=>{setEditMozo(m);setDraft({nombre:m.nombre,rol:m.rol,pin:m.pin||""});setShowAdd(true);}} style={{
                  width:30,height:30,borderRadius:8,border:"1px solid var(--gbr)",
                  background:"var(--gb)",color:"var(--gd)",cursor:"pointer",fontSize:14,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>✏</button>
                <button onClick={()=>deleteMozo(m.id)} style={{
                  width:30,height:30,borderRadius:8,border:"none",
                  background:"rgba(255,59,92,.1)",color:"var(--gr)",cursor:"pointer",fontSize:14,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            </div>
          );
        })}

        {mozos.length===0 && !loading && (
          <div style={{textAlign:"center",padding:"40px 20px",color:"var(--gd)",
            fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>
            Sin empleados registrados.<br/>Agregá el primero arriba.
          </div>
        )}
      </>)}

      {/* ── TURNOS HOY ── */}
      {psub==="turnos" && (<>
        {turnosHoy.length===0 ? (
          <div style={{textAlign:"center",padding:"40px 20px",color:"var(--gd)",
            fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>
            Sin turnos registrados hoy.
          </div>
        ) : (
          <div>
            {turnosHoy.sort((a,b)=>new Date(b.inicio)-new Date(a.inicio)).map(t=>(
              <div key={t.id} style={{background:"var(--gc)",border:"1px solid var(--gbr)",
                borderRadius:14,padding:"12px 16px",marginBottom:8,
                display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,
                  background:!t.fin?"rgba(0,255,136,.15)":"var(--gb)",
                  border:`2px solid ${!t.fin?"#00FF88":"var(--gbr)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                  {ROLES.find(r=>r.id===t.rol)?.icon||"🙋"}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,
                    color:"var(--gi2)",margin:0}}>{t.nombre}</p>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                    color:"var(--gd)",margin:0}}>
                    {fmtHora(t.inicio)} → {t.fin ? fmtHora(t.fin) : "activo"}
                  </p>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,
                    color:!t.fin?"#00CC70":"var(--gi2)",margin:0}}>
                    {fmtDur(t.inicio, t.fin)}
                  </p>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,
                    color:"var(--gd)",margin:0}}>
                    {!t.fin?"en turno":"completado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </>)}

      {/* ── MODAL ADD/EDIT ── */}
      {showAdd && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget){setShowAdd(false);setEditMozo(null);}}}>
          <div style={{background:"var(--ab)",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",
            width:"100%",maxWidth:480}}>
            <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,
              color:"var(--gi2)",marginBottom:20}}>
              {editMozo?"Editar empleado":"Nuevo empleado"}
            </h3>
            <div style={{marginBottom:14}}>
              <label style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--gd)",
                letterSpacing:1,display:"block",marginBottom:6}}>NOMBRE</label>
              <input value={draft.nombre} onChange={e=>setDraft(d=>({...d,nombre:e.target.value}))}
                placeholder="Nombre del empleado"
                style={{width:"100%",background:"var(--ac)",border:"1px solid var(--abr)",
                  borderRadius:10,padding:"11px 14px",color:"var(--gi2)",
                  fontFamily:"'Outfit',sans-serif",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--gd)",
                letterSpacing:1,display:"block",marginBottom:6}}>ROL</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {ROLES.map(r=>(
                  <button key={r.id} onClick={()=>setDraft(d=>({...d,rol:r.id}))} style={{
                    padding:"10px",borderRadius:10,cursor:"pointer",
                    display:"flex",alignItems:"center",gap:8,
                    fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,
                    background:draft.rol===r.id?"var(--gi)":"var(--ac)",
                    color:draft.rol===r.id?"#fff":"var(--ad)",
                    border:`1px solid ${draft.rol===r.id?"var(--gi)":"var(--abr)"}`}}>
                    <span style={{fontSize:16}}>{r.icon}</span>{r.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--gd)",
                letterSpacing:1,display:"block",marginBottom:6}}>PIN (opcional)</label>
              <input value={draft.pin} onChange={e=>setDraft(d=>({...d,pin:e.target.value.replace(/\D/g,"").slice(0,6)}))}
                placeholder="1234" type="text" inputMode="numeric" maxLength={6}
                style={{width:"100%",background:"var(--ac)",border:"1px solid var(--abr)",
                  borderRadius:10,padding:"11px 14px",color:"var(--gi2)",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:18,letterSpacing:8,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowAdd(false);setEditMozo(null);}} style={{
                flex:1,padding:"13px",borderRadius:12,border:"1px solid var(--abr)",
                background:"var(--ac)",color:"var(--ad)",
                fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={addOrEditMozo} style={{
                flex:1.5,padding:"13px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,var(--gi),var(--gi2))",color:"#fff",
                fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:800,cursor:"pointer"}}>
                {editMozo?"Guardar cambios":"Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GestionTab({local,setLocal,cats,setCats,prods,setProds,gSubTab,setGSubTab,gActiveCat,setGActiveCat,gModal,setGModal,toast,orders=[],setOrders,onEditOrder}) {
  const subTab    = gSubTab;
  const setSubTab = setGSubTab;

  /* ── Draft para formulario local (evita perdida de foco en inputs) */
  const [localDraft, setLocalDraft] = useState({});
  useEffect(()=>{
    if(local.restauranteId) setLocalDraft({
      nombre:       local.nombre       || '',
      descripcion:  local.descripcion  || '',
      direccion:    local.direccion    || '',
      telefono:     local.telefono     || '',
      email:        local.email        || '',
      baseUrl:      local.baseUrl      || '',
      wifi_nombre:  local.wifi_nombre  || '',
      wifi_pass:    local.wifi_pass    || '',
      whatsapp:     local.whatsapp     || '',
      whatsapp_msg: local.whatsapp_msg || '',
      mp_alias:     local.mp_alias     || '',
      mp_titular:   local.mp_titular   || '',
    });
  },[local.restauranteId]);

  /* ── Subcomponents inline */
  const LocalSection = () => (
    <div>
      {/* Logo del local */}
      <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
        borderRadius:16,padding:18,marginBottom:12}}>
        <GLbl c="var(--gi2)">Logo</GLbl>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
          <div style={{width:72,height:72,borderRadius:14,background:"var(--gb)",
            border:"1px solid var(--gbr)",display:"flex",alignItems:"center",
            justifyContent:"center",overflow:"hidden",flexShrink:0}}>
            {local.logo_url
              ? <img src={local.logo_url} alt="logo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <span style={{fontSize:28}}>🍽️</span>}
          </div>
          <div style={{flex:1}}>
            <label style={{display:"flex",alignItems:"center",gap:8,
              background:"rgba(99,102,241,.08)",border:"1px dashed rgba(99,102,241,.4)",
              borderRadius:10,padding:"10px 14px",cursor:"pointer"}}>
              <span style={{fontSize:18}}>📷</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,
                  color:"var(--gi2)"}}>Subir logo</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--gd)"}}>
                  JPG, PNG o WebP
                </div>
              </div>
              <input type="file" accept="image/*" style={{display:"none"}}
                onChange={async e=>{
                  const file = e.target.files?.[0];
                  if(!file || !supabase) return;
                  const ext = file.name.split(".").pop();
                  const path = `logos/${local.restauranteId}/logo.${ext}`;
                  const {error:upErr} = await supabase.storage.from("fotos").upload(path, file, {upsert:true});
                  if(upErr){ toast("Error al subir: "+upErr.message,"err"); return; }
                  const {data:{publicUrl}} = supabase.storage.from("fotos").getPublicUrl(path);
                  setLocal(l=>({...l,logo_url:publicUrl}));
                  if(local.restauranteId){
                    await supabase.from("restaurantes").update({logo_url:publicUrl}).eq("id",local.restauranteId);
                  }
                  toast("Logo subido");
                }}/>
            </label>
            {local.logo_url && (
              <button onClick={async()=>{
                setLocal(l=>({...l,logo_url:""}));
                if(local.restauranteId){
                  await supabase.from("restaurantes").update({logo_url:""}).eq("id",local.restauranteId);
                }
                toast("Logo eliminado","warn");
              }} style={{background:"none",border:"none",color:"var(--gr)",
                fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                marginTop:6,padding:0}}>
                Quitar logo ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
        borderRadius:16,padding:18,marginBottom:12}}>
        <GLbl c="var(--gi2)">Datos del restaurante</GLbl>
        <GInput label="Nombre del local" value={localDraft.nombre||""}
          onChange={v=>setLocalDraft(d=>({...d,nombre:v}))} placeholder="La Trattoria"/>
        <GInput label="Dirección" value={localDraft.direccion||""}
          onChange={v=>setLocalDraft(d=>({...d,direccion:v}))} placeholder="Av. Corrientes 1234"/>
        <GInput label="Teléfono" value={localDraft.telefono||""}
          onChange={v=>setLocalDraft(d=>({...d,telefono:v}))} placeholder="+54 11 1234-5678"/>
        <GInput label="Email" value={localDraft.email||""}
          onChange={v=>setLocalDraft(d=>({...d,email:v}))} placeholder="hola@tu-local.com"/>
        <GInput label="URL de tu carta (para QRs)" value={localDraft.baseUrl||""}
          onChange={v=>setLocalDraft(d=>({...d,baseUrl:v}))} placeholder="latrattoria.menuqr.app"/>
        <div style={{marginBottom:0}}>
          <GLbl>Descripción breve</GLbl>
          <textarea value={localDraft.descripcion||""}
            onChange={e=>setLocalDraft(d=>({...d,descripcion:e.target.value}))}
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
          {k:"propina",         label:"Propina en pedidos",       sub:"El cliente puede dejar propina al pagar"},
          {k:"happyHour",       label:"Happy Hour",                sub:"Activa descuentos por horario"},
          {k:"feat_solicitudes",label:"Llamar al mozo (🛎️)",       sub:"Botón para llamar al mozo desde la mesa"},
          {k:"feat_promo10",    label:"Descuento primera visita",  sub:"10% de descuento para clientes nuevos via QR vitrina"},
          {k:"feat_primera_visita", label:"Descuento 10% vitrina (informativo)", sub:"Muestra card de 10% descuento primera visita en la vitrina pública"},
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
            <ToggleG on={local[f.k]} onChange={async ()=>{
              const newVal = !local[f.k];
              setLocal(l=>({...l,[f.k]:newVal}));
              toast(`${f.label} ${newVal?"activado":"desactivado"}`);
              if(local.restauranteId && supabase){
                const {data:cur} = await supabase.from("restaurantes").select("config").eq("id",local.restauranteId).single();
                await supabase.from("restaurantes").update({config:{...(cur?.config||{}),[f.k]:newVal}}).eq("id",local.restauranteId);
              }
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
        <GInput label="Nombre de la red (SSID)" value={localDraft.wifi_nombre||""}
          onChange={v=>setLocalDraft(d=>({...d,wifi_nombre:v}))} placeholder="MiRed_WiFi"/>
        <GInput label="Contraseña" value={localDraft.wifi_pass||""}
          onChange={v=>setLocalDraft(d=>({...d,wifi_pass:v}))} placeholder="contraseña123"/>
      </div>

      <div style={{background:"var(--gc)",border:"1px solid var(--gbr)",
        borderRadius:16,padding:18,marginBottom:16}}>
        <GLbl c="var(--gi2)">QR WhatsApp</GLbl>
        <GInput label="Número (con código de país, sin +)" value={localDraft.whatsapp||""}
          onChange={v=>setLocalDraft(d=>({...d,whatsapp:v}))}
          placeholder="5491112345678" prefix="+"/>
        <GLbl>Mensaje predeterminado</GLbl>
        <textarea value={localDraft.whatsapp_msg||""}
          onChange={e=>setLocalDraft(d=>({...d,whatsapp_msg:e.target.value}))}
          placeholder="Mensaje que verá el cliente al escanear el QR de WhatsApp..."
          style={{width:"100%",background:"var(--gb)",border:"1px solid var(--gbr)",
            borderRadius:10,padding:"11px 14px",color:"var(--gbri)",fontSize:14,
            resize:"none",height:72}}/>
      </div>

      <button onClick={async ()=>{
        setLocal(l=>({...l,...localDraft}));
        if(local.restauranteId && supabase){
          const {error} = await supabase.from("restaurantes").update({
            nombre:    localDraft.nombre,
            descripcion: localDraft.descripcion,
            direccion: localDraft.direccion,
            telefono:  localDraft.telefono,
            email:     localDraft.email,
            color:     local.color,
            mesas:     local.mesas,
            base_url:  (localDraft.baseUrl||"").replace(/^https?:\/\//,""),
            config: {
              propina:           local.propina,
              feat_solicitudes:  local.feat_solicitudes!==undefined ? local.feat_solicitudes : true,
              feat_promo10:      !!local.feat_promo10,
              happyHour:   local.happyHour,
              happyDesde:  local.happyDesde,
              happyHasta:  local.happyHasta,
              wifi_nombre: localDraft.wifi_nombre,
              wifi_pass:   localDraft.wifi_pass,
              whatsapp:    localDraft.whatsapp,
              whatsapp_msg:localDraft.whatsapp_msg,
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
                <button onClick={()=>setGModal({type:"cat",editData:{...cat}})}
                  style={{background:"none",border:"none",cursor:"pointer",
                  color:"rgba(99,102,241,.7)",fontSize:11,
                  padding:"0 2px",lineHeight:1}} title="Editar categoría">
                  ✏
                </button>
                <button onClick={async()=>{
                  const hasProd = prods.some(p=>p.cat===cat.id);
                  if(hasProd){
                    const ok = window.confirm(`"${cat.label}" tiene productos. ¿Borrar igual? Los productos quedarán sin categoría.`);
                    if(!ok) return;
                  }
                  setCats(cs=>cs.filter(c=>c.id!==cat.id));
                  if(activeCat===cat.id){
                    const rest = cats.filter(c=>c.id!==cat.id);
                    setAC(rest[0]?.id||"");
                  }
                  if(local.restauranteId && supabase){
                    await supabase.from("categorias").delete().eq("id",cat.id);
                  }
                  toast(`Categoría "${cat.label}" eliminada`,"warn");
                }} style={{background:"none",border:"none",cursor:"pointer",
                  color:"rgba(239,68,68,.7)",fontSize:12,
                  padding:"0 2px",lineHeight:1}} title="Borrar categoría">
                  ×
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
                  flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                  overflow:"hidden",padding:0}}>
                  {prod.foto_url
                    ? <img src={prod.foto_url} alt={prod.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>
                    : prod.emoji}
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
    {id:"local",   label:"🏠 Local"},
    {id:"carta",   label:"📋 Carta"},
    {id:"personal",label:"👥 Personal"},
    {id:"tickets", label:"🎫 Tickets"},
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
      {subTab==="local"    && LocalSection()}
      {subTab==="carta"    && CartaSection()}
      {subTab==="personal" && <PersonalSection local={local} toast={toast}/>}
      {subTab==="tickets"  && (()=>{
        const PAY_L3={cash:"Efectivo",mp:"Mercado Pago",card:"Tarjeta",trans:"Transferencia"};
        const closed = [...orders].filter(o=>o.status==="entregado").sort((a,b)=>b.id>a.id?1:-1);
        return (
          <div>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)",marginBottom:12}}>
              Pedidos cerrados de hoy. Tocá uno para editar productos o corregir errores.
            </p>
            {closed.length===0 && (
              <div style={{textAlign:"center",padding:"40px 20px",
                fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"var(--am)"}}>
                No hay pedidos cerrados aún
              </div>
            )}
            {closed.map(o=>{
              const mesa=(o.table===0||o.table==="0"||o.table===null)?"Mostrador":"Mesa "+o.table;
              return (
                <div key={o.id} style={{background:"var(--as)",border:"1px solid var(--abr)",
                  borderRadius:12,padding:"12px 14px",marginBottom:8,
                  display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                      fontSize:13,color:"var(--abri)"}}>{mesa}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                      color:"var(--am)",marginTop:2}}>#{String(o.id).slice(-4)} · {o.time}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,
                      color:"var(--ad)",marginTop:4,whiteSpace:"nowrap",overflow:"hidden",
                      textOverflow:"ellipsis"}}>
                      {(o.items||[]).map(it=>`${it.qty}× ${it.name}`).join(", ")}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                      fontSize:14,color:"var(--abri)"}}>${(o.total||0).toFixed(0)}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                      color:"var(--am)"}}>{PAY_L3[o.pay]||o.pay||"—"}</div>
                    <button onClick={()=>onEditOrder&&onEditOrder(o)} style={{
                      marginTop:6,padding:"5px 12px",borderRadius:8,border:"1px solid var(--abl)",
                      background:"transparent",color:"var(--abl)",
                      fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,
                      cursor:"pointer",letterSpacing:.5}}>✏️ Editar</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

/* ══════════════════════════════════════════
   CONFIG TAB
══════════════════════════════════════════ */
function ConfigTab({local,setLocal,toast,adminPinUnlocked}) {
  const [cfgDraft, setCfgDraft] = useState({});
  useEffect(()=>{
    if(local.restauranteId) setCfgDraft({
      nombre:       local.nombre       || '',
      descripcion:  local.descripcion  || '',
      direccion:    local.direccion    || '',
      telefono:     local.telefono     || '',
      email:        local.email        || '',
      baseUrl:      local.baseUrl      || '',
      wifi_nombre:  local.wifi_nombre  || '',
      wifi_pass:    local.wifi_pass    || '',
      whatsapp:     local.whatsapp     || '',
      whatsapp_msg: local.whatsapp_msg || '',
      mp_alias:     local.mp_alias     || '',
      mp_titular:   local.mp_titular   || '',
    });
  },[local.restauranteId]);

  const [newPin, setNewPin]     = React.useState("");
  const [pinMsg, setPinMsg]     = React.useState("");
  const savePin = async () => {
    const p = newPin.trim();
    if(p.length!==4||!/^\d{4}$/.test(p)){ setPinMsg("La clave debe ser 4 dígitos"); return; }
    setLocal(l=>({...l,admin_pin:p}));
    setPinMsg("✓ Clave guardada");
    setNewPin("");
    if(local.restauranteId&&supabase){
      const {data:cur}=await supabase.from("restaurantes").select("config").eq("id",local.restauranteId).single();
      await supabase.from("restaurantes").update({config:{...(cur?.config||{}),admin_pin:p}}).eq("id",local.restauranteId);
    }
  };
  const removePin = async () => {
    setLocal(l=>({...l,admin_pin:""}));
    setPinMsg("Clave eliminada");
    if(local.restauranteId&&supabase){
      const {data:cur}=await supabase.from("restaurantes").select("config").eq("id",local.restauranteId).single();
      await supabase.from("restaurantes").update({config:{...(cur?.config||{}),admin_pin:""}}).eq("id",local.restauranteId);
    }
  };

  const saveAll = async () => {
    setLocal(l=>({...l,...cfgDraft}));
    if(local.restauranteId && supabase){
      const {error} = await supabase.from("restaurantes").update({
        nombre:      cfgDraft.nombre,
        descripcion: cfgDraft.descripcion,
        direccion:   cfgDraft.direccion,
        telefono:    cfgDraft.telefono,
        email:       cfgDraft.email,
        color:       local.color,
        mesas:       local.mesas,
        base_url:    (cfgDraft.baseUrl||"").replace(/^https?:\/\//,""),
        config: {
          propina:           local.propina,
        feat_solicitudes:  local.feat_solicitudes!==undefined ? local.feat_solicitudes : true,
        feat_promo10:      !!local.feat_promo10,
          happyHour:   local.happyHour,
          happyDesde:  local.happyDesde,
          happyHasta:  local.happyHasta,
          wifi_nombre: cfgDraft.wifi_nombre,
          wifi_pass:   cfgDraft.wifi_pass,
          whatsapp:    cfgDraft.whatsapp,
          whatsapp_msg:cfgDraft.whatsapp_msg,
          horarios:                local.horarios || {},
          feat_whatsapp_vitrina:   !!local.feat_whatsapp_vitrina,
          whatsapp_vitrina_numero: local.whatsapp_vitrina_numero || "",
          feat_sin_pedidos:        !!local.feat_sin_pedidos,
          whatsapp_delivery:       !!local.whatsapp_delivery,
          whatsapp_retiro:         !!local.whatsapp_retiro,
          mp_mostrar_alias:        !!local.mp_mostrar_alias,
          mp_alias:                cfgDraft.mp_alias || "",
          mp_titular:              cfgDraft.mp_titular || "",
        }
      }).eq("id", local.restauranteId);
      if(error) toast("Error al guardar: "+error.message,"err");
      else toast("✓ Cambios guardados");
    } else {
      toast("✓ Cambios guardados localmente");
    }
  };

  return (
  <div style={{padding:"18px 16px 24px"}}>
    <div style={{marginBottom:18}}>
      <ALbl>Sistema</ALbl>
      <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:"var(--abri)"}}>Configuración</h2>
    </div>

    {/* Logo */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:18,marginBottom:12}}>
      <ALbl>Logo del local</ALbl>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:72,height:72,borderRadius:14,background:"var(--as)",border:"1px solid var(--abr)",
          display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
          {local.logo_url
            ? <img src={local.logo_url} alt="logo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : <span style={{fontSize:28}}>🍽️</span>}
        </div>
        <div style={{flex:1}}>
          <label style={{display:"flex",alignItems:"center",gap:8,
            background:"rgba(201,168,76,.07)",border:"1px dashed rgba(201,168,76,.3)",
            borderRadius:10,padding:"10px 14px",cursor:"pointer"}}>
            <span style={{fontSize:18}}>📷</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:"var(--abri)"}}>Subir logo</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--ad)"}}>JPG, PNG o WebP</div>
            </div>
            <input type="file" accept="image/*" style={{display:"none"}}
              onChange={async e=>{
                const file = e.target.files?.[0];
                if(!file || !supabase) return;
                const ext = file.name.split(".").pop();
                const path = `logos/${local.restauranteId}/logo.${ext}`;
                const {error:upErr} = await supabase.storage.from("fotos").upload(path, file, {upsert:true});
                if(upErr){ toast("Error al subir: "+upErr.message,"err"); return; }
                const {data:{publicUrl}} = supabase.storage.from("fotos").getPublicUrl(path);
                setLocal(l=>({...l,logo_url:publicUrl}));
                if(local.restauranteId) await supabase.from("restaurantes").update({logo_url:publicUrl}).eq("id",local.restauranteId);
                toast("Logo subido ✓");
              }}/>
          </label>
          {local.logo_url && (
            <button onClick={async()=>{
              setLocal(l=>({...l,logo_url:""}));
              if(local.restauranteId) await supabase.from("restaurantes").update({logo_url:""}).eq("id",local.restauranteId);
              toast("Logo eliminado","warn");
            }} style={{background:"none",border:"none",color:"var(--ar)",fontSize:11,cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",marginTop:6,padding:0}}>
              Quitar logo ×
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Datos */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:18,marginBottom:12}}>
      <ALbl>Datos del restaurante</ALbl>
      <GInput label="Nombre del local" value={cfgDraft.nombre||""} onChange={v=>setCfgDraft(d=>({...d,nombre:v}))} placeholder="La Trattoria"/>
      <GInput label="Dirección" value={cfgDraft.direccion||""} onChange={v=>setCfgDraft(d=>({...d,direccion:v}))} placeholder="Av. Corrientes 1234"/>
      <GInput label="Teléfono" value={cfgDraft.telefono||""} onChange={v=>setCfgDraft(d=>({...d,telefono:v}))} placeholder="+54 11 1234-5678"/>
      <GInput label="Email" value={cfgDraft.email||""} onChange={v=>setCfgDraft(d=>({...d,email:v}))} placeholder="hola@tu-local.com"/>
      <GInput label="URL de tu carta (para QRs)" value={cfgDraft.baseUrl||""} onChange={v=>setCfgDraft(d=>({...d,baseUrl:v}))} placeholder="latrattoria.menuqr.app"/>
      <div style={{marginBottom:0}}>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ad)",marginBottom:7}}>Descripción breve</p>
        <textarea value={cfgDraft.descripcion||""} onChange={e=>setCfgDraft(d=>({...d,descripcion:e.target.value}))}
          placeholder="Una frase que describa tu restaurante..."
          style={{width:"100%",background:"var(--as)",border:"1px solid var(--abr)",borderRadius:10,
            padding:"11px 14px",color:"var(--abri)",fontSize:14,resize:"none",height:72,boxSizing:"border-box"}}/>
      </div>
    </div>

    {/* Apariencia */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:18,marginBottom:12}}>
      <ALbl>Apariencia</ALbl>
      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ad)",marginBottom:7}}>Color principal de la carta</p>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <input type="color" value={local.color||"#C9A84C"}
          onChange={e=>setLocal(l=>({...l,color:e.target.value}))}
          style={{width:52,height:42,border:"1px solid var(--abr)",borderRadius:10,cursor:"pointer",background:"none",padding:4}}/>
        <div style={{flex:1,background:"var(--as)",border:"1px solid var(--abr)",borderRadius:10,
          padding:"11px 14px",color:"var(--abri)",fontSize:14,fontFamily:"'IBM Plex Mono',monospace"}}>{local.color||"#C9A84C"}</div>
        <div style={{width:42,height:42,borderRadius:10,background:local.color||"#C9A84C",border:"1px solid var(--abr)",flexShrink:0}}/>
      </div>
      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ad)",marginBottom:7}}>Cantidad de mesas</p>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <input type="range" min={1} max={60} value={local.mesas||10}
          onChange={e=>setLocal(l=>({...l,mesas:Number(e.target.value)}))}
          style={{flex:1,accentColor:"var(--ag)"}}/>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:700,
          color:"var(--abri)",minWidth:32,textAlign:"center"}}>{local.mesas||10}</span>
      </div>
    </div>

    {/* Funciones */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,overflow:"hidden",marginBottom:12}}>
      <div style={{padding:"14px 18px 10px"}}><ALbl>Funciones</ALbl></div>
      {[
        {k:"propina",         icon:"💝", label:"Propina en pedidos",       sub:"El cliente puede dejar propina al pagar"},
        {k:"happyHour",       icon:"🔥", label:"Happy Hour",                sub:"Activa descuentos por horario"},
        {k:"feat_solicitudes",icon:"🛎️", label:"Llamar al mozo",            sub:"Botón para llamar al mozo desde la mesa"},
        {k:"feat_promo10",    icon:"🎁", label:"Descuento primera visita",  sub:"10% de descuento para clientes nuevos via QR vitrina"},
      ].map(f=>(
        <div key={f.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"14px 18px",borderTop:"1px solid var(--abr)"}}>
          <div>
            <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,color:"var(--abri)",marginBottom:2}}>{f.icon} {f.label}</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)"}}>{f.sub}</p>
          </div>
          <ToggleA on={local[f.k]} onChange={async ()=>{
            const newVal=!local[f.k];
            setLocal(l=>({...l,[f.k]:newVal}));
            if(local.restauranteId&&supabase){
              const {data:cur}=await supabase.from("restaurantes").select("config").eq("id",local.restauranteId).single();
              await supabase.from("restaurantes").update({config:{...(cur?.config||{}),[f.k]:newVal}}).eq("id",local.restauranteId);
              toast(`${f.label} ${newVal?"activado":"desactivado"}`);
            }
          }}/>
        </div>
      ))}
      {local.happyHour && (
        <div style={{padding:"12px 18px 16px",borderTop:"1px solid var(--abr)",background:"rgba(201,168,76,.04)"}}>
          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ad)",marginBottom:10}}>Horario de Happy Hour</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{k:"happyDesde",label:"Desde"},{k:"happyHasta",label:"Hasta"}].map(h=>(
              <div key={h.k}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--ad)",marginBottom:5,letterSpacing:1.5}}>{h.label.toUpperCase()}</p>
                <input type="time" value={local[h.k]||""}
                  onChange={e=>setLocal(l=>({...l,[h.k]:e.target.value}))}
                  style={{width:"100%",background:"var(--as)",border:"1px solid var(--abr)",borderRadius:10,padding:"9px 12px",color:"var(--abri)",fontSize:14}}/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Horarios */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,overflow:"hidden",marginBottom:12}}>
      <div style={{padding:"14px 18px 10px"}}><ALbl>Horarios de apertura</ALbl></div>
      {[
        {k:"lun",label:"Lunes"},
        {k:"mar",label:"Martes"},
        {k:"mie",label:"Miércoles"},
        {k:"jue",label:"Jueves"},
        {k:"vie",label:"Viernes"},
        {k:"sab",label:"Sábado"},
        {k:"dom",label:"Domingo"},
      ].map(d=>{
        const dia = (local.horarios||{})[d.k]||{abierto:false,desde:"09:00",hasta:"23:00"};
        const setDia = (upd) => setLocal(l=>({...l,horarios:{...(l.horarios||{}),[d.k]:{...dia,...upd}}}));
        return (
          <div key={d.k} style={{borderTop:"1px solid var(--abr)",padding:"10px 18px",
            display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,width:110,flexShrink:0}}>
              <ToggleA on={dia.abierto} onChange={()=>setDia({abierto:!dia.abierto})}/>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,
                color:dia.abierto?"var(--abri)":"var(--ad)"}}>{d.label}</span>
            </div>
            {dia.abierto ? (
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                <input type="time" value={dia.desde} onChange={e=>setDia({desde:e.target.value})}
                  style={{flex:1,background:"var(--as)",border:"1px solid var(--abr)",borderRadius:8,
                    padding:"7px 10px",color:"var(--abri)",fontSize:13}}/>
                <span style={{color:"var(--ad)",fontSize:12}}>a</span>
                <input type="time" value={dia.hasta} onChange={e=>setDia({hasta:e.target.value})}
                  style={{flex:1,background:"var(--as)",border:"1px solid var(--abr)",borderRadius:8,
                    padding:"7px 10px",color:"var(--abri)",fontSize:13}}/>
              </div>
            ) : (
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)"}}>Cerrado</span>
            )}
          </div>
        );
      })}
    </div>

    {/* WiFi */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:18,marginBottom:12}}>
      <ALbl>QR WiFi</ALbl>
      <GInput label="Nombre de la red (SSID)" value={cfgDraft.wifi_nombre||""} onChange={v=>setCfgDraft(d=>({...d,wifi_nombre:v}))} placeholder="MiRed_WiFi"/>
      <GInput label="Contraseña" value={cfgDraft.wifi_pass||""} onChange={v=>setCfgDraft(d=>({...d,wifi_pass:v}))} placeholder="contraseña123"/>
    </div>

    {/* WhatsApp */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:18,marginBottom:16}}>
      <ALbl>QR WhatsApp</ALbl>
      <GInput label="Número (con código de país, sin +)" value={cfgDraft.whatsapp||""}
        onChange={v=>setCfgDraft(d=>({...d,whatsapp:v}))} placeholder="5491112345678" prefix="+"/>
      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ad)",marginBottom:7,marginTop:14}}>Mensaje predeterminado</p>
      <textarea value={cfgDraft.whatsapp_msg||""} onChange={e=>setCfgDraft(d=>({...d,whatsapp_msg:e.target.value}))}
        placeholder="Mensaje que verá el cliente al escanear el QR de WhatsApp..."
        style={{width:"100%",background:"var(--as)",border:"1px solid var(--abr)",borderRadius:10,
          padding:"11px 14px",color:"var(--abri)",fontSize:14,resize:"none",height:72,boxSizing:"border-box"}}/>
    </div>

    {/* WhatsApp Vitrina */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,overflow:"hidden",marginBottom:12}}>
      <div style={{padding:"14px 18px 10px"}}><ALbl>Vitrina — Pedidos por WhatsApp</ALbl></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"14px 18px",borderTop:"1px solid var(--abr)"}}>
        <div>
          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,color:"var(--abri)",marginBottom:2}}>📲 Activar botón de WhatsApp</p>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)"}}>Muestra un botón en la vitrina para pedir por WA</p>
        </div>
        <ToggleA on={local.feat_whatsapp_vitrina} onChange={()=>setLocal(l=>({...l,feat_whatsapp_vitrina:!l.feat_whatsapp_vitrina}))}/>
      </div>
      {local.feat_whatsapp_vitrina && (
        <div style={{padding:"12px 18px 16px",borderTop:"1px solid var(--abr)",background:"rgba(37,211,102,.04)"}}>
          <GInput label="Número WhatsApp (con código de país, sin +)"
            value={local.whatsapp_vitrina_numero||""}
            onChange={v=>setLocal(l=>({...l,whatsapp_vitrina_numero:v}))}
            placeholder="5491112345678" prefix="+"/>
          <div style={{marginTop:12}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ad)",marginBottom:10}}>Tipos de pedido disponibles</p>
            {[
              {k:"whatsapp_delivery",icon:"🛵",label:"Delivery",sub:"Envío a domicilio"},
              {k:"whatsapp_retiro",  icon:"🏪",label:"Retiro en local",sub:"El cliente pasa a buscar"},
            ].map(op=>(
              <div key={op.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div>
                  <p style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,color:"var(--abri)",marginBottom:2}}>{op.icon} {op.label}</p>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--ad)"}}>{op.sub}</p>
                </div>
                <ToggleA on={local[op.k]} onChange={()=>setLocal(l=>({...l,[op.k]:!l[op.k]}))}/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Pagos digitales — alias MP / CVU */}
    <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,overflow:"hidden",marginBottom:12}}>
      <div style={{padding:"14px 18px 10px"}}><ALbl>Pagos digitales</ALbl></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"14px 18px",borderTop:"1px solid var(--abr)"}}>
        <div>
          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,color:"var(--abri)",marginBottom:2}}>📲 Mostrar alias al cliente</p>
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)"}}>Cuando elige MP o Transferencia ve tu alias y puede copiarlo</p>
        </div>
        <ToggleA on={local.mp_mostrar_alias} onChange={()=>setLocal(l=>({...l,mp_mostrar_alias:!l.mp_mostrar_alias}))}/>
      </div>
      {local.mp_mostrar_alias&&(
        <div style={{padding:"12px 18px 16px",borderTop:"1px solid var(--abr)",background:"rgba(201,168,76,.04)",display:"flex",flexDirection:"column",gap:10}}>
          <GInput label="Alias de Mercado Pago / CVU" value={cfgDraft.mp_alias||""}
            onChange={v=>setCfgDraft(d=>({...d,mp_alias:v}))} placeholder="tu.alias.mp"/>
          <GInput label="Titular de la cuenta" value={cfgDraft.mp_titular||""}
            onChange={v=>setCfgDraft(d=>({...d,mp_titular:v}))} placeholder="Juan Pérez"/>
          <div style={{background:"var(--as)",border:"1px solid var(--abr)",borderRadius:10,padding:"10px 14px"}}>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--ad)",marginBottom:4}}>Vista previa — lo que verá el cliente</p>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <div>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:"var(--ag)"}}>{cfgDraft.mp_alias||"tu.alias.mp"}</p>
                {cfgDraft.mp_titular&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--at)"}}>{cfgDraft.mp_titular}</p>}
              </div>
              <div style={{background:"var(--ag)",borderRadius:7,padding:"5px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,color:"var(--ab)"}}>COPIAR</div>
            </div>
          </div>
        </div>
      )}
    </div>

    <button onClick={saveAll} className="pr"
      style={{width:"100%",background:"var(--ag)",color:"#0A0806",border:"none",borderRadius:12,
        padding:14,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8}}>
      Guardar cambios
    </button>

    {/* ── Clave de acceso ─────────────────────────────────── */}
    <div style={{background:"var(--as)",border:"1px solid var(--abr)",
      borderRadius:14,padding:18,marginBottom:16}}>
      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:1.5,
        color:"var(--am)",marginBottom:6}}>SEGURIDAD</p>
      <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,
        color:"var(--abri)",marginBottom:4}}>Clave de Gestión y Configuración</h3>
      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--am)",marginBottom:14,lineHeight:1.5}}>
        {local.admin_pin
          ? `Clave activa: ${"•".repeat(4)}  (podés cambiarla o eliminarla)`
          : "Sin clave. Cualquiera con acceso al panel puede entrar a Gestión y Config."}
      </p>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input
          type="number"
          value={newPin}
          onChange={e=>{ setPinMsg(""); setNewPin(e.target.value.replace(/\D/g,"").slice(0,4)); }}
          placeholder="Nueva clave (4 dígitos)"
          maxLength={4}
          style={{flex:1,padding:"10px 12px",borderRadius:10,border:"1px solid var(--abr)",
            background:"var(--ac)",color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",
            fontSize:18,letterSpacing:6,outline:"none",textAlign:"center"}}
        />
        <button onClick={savePin} style={{padding:"10px 16px",borderRadius:10,
          border:"none",background:"var(--abl)",color:"#fff",
          fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>
          Guardar
        </button>
      </div>
      {local.admin_pin && (
        <button onClick={removePin} style={{width:"100%",padding:"9px",borderRadius:10,
          border:"1px solid rgba(255,59,92,.4)",background:"rgba(255,59,92,.08)",
          color:"var(--ar)",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          🗑 Eliminar clave
        </button>
      )}
      {pinMsg && <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,
        color:pinMsg.startsWith("✓")?"var(--ag)":"var(--ar)",marginTop:8}}>{pinMsg}</p>}
    </div>
    <div style={{height:100}}/>
  </div>
  );
}

class AdminErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("AdminApp error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{background:"#0d1117",minHeight:"100vh",display:"flex",
          flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"#1a0808",border:"1px solid #7f1d1d",borderRadius:16,
            padding:32,maxWidth:400,textAlign:"center"}}>
            <p style={{fontSize:40,marginBottom:16}}>⚠️</p>
            <p style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:700,
              color:"#f87171",marginBottom:12}}>Error en el panel</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#9ca3af",
              marginBottom:24,lineHeight:1.5}}>
              {this.state.error?.message || "Ocurrió un error inesperado."}
            </p>
            <button onClick={()=>{ this.setState({hasError:false,error:null}); window.location.reload(); }}
              style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:10,
                padding:"10px 24px",fontFamily:"'Outfit',sans-serif",fontSize:14,
                fontWeight:700,cursor:"pointer"}}>
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


function CocinaTab({local, QRCodeLib, toast}) {
const slug = local.slug || local.baseUrl || "";
const cocinaUrl = slug ? `${window.location.origin}/${slug}/cocina` : "";
const [qrImg, setQrImg] = React.useState(null);
React.useEffect(()=>{
  if(!cocinaUrl) return;
  QRCodeLib.toDataURL(cocinaUrl,{width:260,margin:2,color:{dark:"#0A0806",light:"#FFFFFF"}})
    .then(setQrImg).catch(()=>{});
},[cocinaUrl]);
return (
  <div style={{padding:"18px 16px 0"}}>
    <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",letterSpacing:1.5,marginBottom:4}}>COCINA</p>
    <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:"var(--abri)",marginBottom:6}}>Pantalla de cocina</h2>
    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--ad)",marginBottom:20,lineHeight:1.5}}>
      Escaneá este QR desde la tablet de la cocina. Se abre la pantalla con todos los pedidos activos en tiempo real — sin login, sin panel.
    </p>
    {!slug ? (
      <div style={{background:"rgba(255,59,92,.08)",border:"1px solid rgba(255,59,92,.3)",borderRadius:12,padding:16,textAlign:"center"}}>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--ar)"}}>Configurá el slug de tu local en Config para generar el QR.</p>
      </div>
    ) : (<>
      <div style={{background:"#fff",borderRadius:16,padding:20,display:"flex",flexDirection:"column",alignItems:"center",gap:12,marginBottom:16,maxWidth:300,margin:"0 auto 16px"}}>
        {qrImg
          ? <img src={qrImg} alt="QR Cocina" style={{width:220,height:220,borderRadius:8}}/>
          : <div style={{width:220,height:220,background:"#f0f0f0",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontSize:12,color:"#999"}}>Generando QR...</div>}
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#333",textAlign:"center",letterSpacing:.5}}>👨‍🍳 COCINA</div>
      </div>
      <div style={{background:"var(--as)",border:"1px solid var(--abr)",borderRadius:12,padding:"12px 14px",marginBottom:12}}>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)",marginBottom:4,letterSpacing:1}}>URL COCINA</p>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--abl)",wordBreak:"break-all",lineHeight:1.4}}>{cocinaUrl}</p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={()=>{navigator.clipboard?.writeText(cocinaUrl);toast&&toast("Link copiado");}} style={{flex:1,minWidth:100,padding:"11px",borderRadius:10,border:"1px solid var(--abr)",background:"var(--ac)",color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer"}}>📋 Copiar link</button>
        <button onClick={()=>window.open(cocinaUrl,"_blank")} style={{flex:1,minWidth:100,padding:"11px",borderRadius:10,border:"none",background:"var(--abl)",color:"#fff",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer"}}>🔗 Abrir</button>
        <button onClick={()=>{if(navigator.share){navigator.share({title:"Pantalla Cocina",text:"Pantalla de cocina en tiempo real",url:cocinaUrl}).catch(()=>{});}else{navigator.clipboard?.writeText(cocinaUrl);toast&&toast("Link copiado");}}} style={{flex:1,minWidth:100,padding:"11px",borderRadius:10,border:"none",background:"#10b981",color:"#fff",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer"}}>📤 Compartir</button>
      </div>
      <div style={{background:"rgba(61,142,255,.06)",border:"1px solid rgba(61,142,255,.2)",borderRadius:12,padding:"12px 14px"}}>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)",lineHeight:1.8}}>
          ✅ Pedidos en tiempo real<br/>
          🔔 Suena cuando entra uno nuevo<br/>
          👆 Pueden marcar En cocina → Listo → Entregado<br/>
          🔒 Sin login
        </p>
      </div>
      <div style={{height:100}}/>
    </>)}
  </div>
);
}

function EditPayModal({editPayModal, setEditPayModal, setOrders, toast}) {
const METHODS = [
  {id:"cash", label:"Efectivo",       icon:"💵"},
  {id:"mp",   label:"Mercado Pago",   icon:"📲"},
  {id:"card", label:"Débito/Créd.",   icon:"💳"},
  {id:"trans",label:"Transferencia",  icon:"🏦"},
];
const [selPay, setSelPay] = useState(editPayModal.pay);
const savePay = async () => {
  if(!supabase||!selPay||selPay===editPayModal.pay){setEditPayModal(null);return;}
  await supabase.from("pedidos").update({metodo_pago:selPay}).eq("id",editPayModal.id);
  setOrders(os=>os.map(o=>o.id===editPayModal.id?{...o,pay:selPay}:o));
  toast("✓ Método de pago actualizado");
  setEditPayModal(null);
};
return (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:9999,
    display:"flex",alignItems:"flex-end",justifyContent:"center"}}
    onClick={e=>{if(e.target===e.currentTarget)setEditPayModal(null);}}>
    <div style={{background:"var(--ab)",borderRadius:"20px 20px 0 0",
      padding:"24px 20px 40px",width:"100%",maxWidth:480}}>
      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
        color:"var(--am)",letterSpacing:1.5,marginBottom:6}}>EDITAR PAGO</p>
      <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,
        color:"var(--gi2)",marginBottom:18}}>
        ¿Cómo se cobró?
      </h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {METHODS.map(m=>(
          <button key={m.id} onClick={()=>setSelPay(m.id)} style={{
            padding:"14px 10px",borderRadius:12,cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:6,
            fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,
            background:selPay===m.id?"var(--gi)":"var(--ac)",
            color:selPay===m.id?"#fff":"var(--ad)",
            border:`1.5px solid ${selPay===m.id?"var(--gi)":"var(--abr)"}`,
            transition:"all .15s"}}>
            <span style={{fontSize:22}}>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setEditPayModal(null)} style={{
          flex:1,padding:13,borderRadius:12,border:"1px solid var(--abr)",
          background:"var(--ac)",color:"var(--ad)",
          fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          Cancelar
        </button>
        <button onClick={savePay} style={{
          flex:1.5,padding:13,borderRadius:12,border:"none",
          background:"linear-gradient(135deg,var(--gi),var(--gi2))",color:"#fff",
          fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:800,cursor:"pointer"}}>
          Guardar
        </button>
      </div>
    </div>
  </div>
);
}

function EditOrderModal({editOrderModal, setEditOrderModal, setOrders, toast, doPrint}) {
const o = editOrderModal;
const PAY_LBL2={cash:"Efectivo",mp:"Mercado Pago",card:"Tarjeta Débito",trans:"Transferencia"};
const [items, setItems] = useState(o.items.map(it=>({...it})));
const total = items.reduce((s,it)=>s+(it.price||0)*(it.qty||1),0);
const saveEdit = async (andPrint=false) => {
  if(!supabase) return;
  // Update pedido total
  await supabase.from("pedidos").update({total}).eq("id",o.id);
  // Delete old items and reinsert
  await supabase.from("pedido_items").delete().eq("pedido_id",o.id);
  if(items.length>0){
    await supabase.from("pedido_items").insert(
      items.map(it=>({pedido_id:o.id,producto_id:it.id||null,nombre:it.name,precio:it.price,cantidad:it.qty}))
    );
  }
  const updated = {...o, items, total};
  setOrders(os=>os.map(x=>x.id===o.id?updated:x));
  toast("✓ Ticket actualizado");
  if(andPrint && doPrint) doPrint(updated);
  setEditOrderModal(null);
};
const mesaLabel=(o.table===0||o.table==="0"||o.table===null)?"Mostrador":"Mesa "+o.table;
return (
  <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,.85)",
    display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}
    onClick={e=>{if(e.target===e.currentTarget)setEditOrderModal(null);}}>
    <div style={{background:"var(--ab)",borderRadius:16,padding:"20px 18px",
      width:"100%",maxWidth:380,maxHeight:"85vh",overflowY:"auto"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
        color:"var(--am)",letterSpacing:2,marginBottom:4}}>EDITAR TICKET</div>
      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,
        color:"var(--abri)",marginBottom:4}}>{mesaLabel}</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
        color:"var(--am)",marginBottom:16}}>#{String(o.id).slice(-4)} · {o.time}</div>
      {/* Items */}
      {items.map((it,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
          padding:"8px 0",borderBottom:"1px solid var(--abr)"}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--abri)"}}>{it.qty}× {it.name}</div>
            {it.price>0&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--am)"}}>
              ${(it.price*it.qty).toFixed(0)}
            </div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setItems(prev=>{
              const n=[...prev];
              if(n[i].qty>1){n[i]={...n[i],qty:n[i].qty-1};}
              else{n.splice(i,1);}
              return n;
            })} style={{width:28,height:28,borderRadius:8,border:"1px solid var(--abr)",
              background:"var(--ac)",color:"var(--ar)",fontSize:16,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>−</button>
            <button onClick={()=>setItems(prev=>{
              const n=[...prev];n[i]={...n[i],qty:n[i].qty+1};return n;
            })} style={{width:28,height:28,borderRadius:8,border:"1px solid var(--abr)",
              background:"var(--ac)",color:"var(--ag)",fontSize:16,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>+</button>
          </div>
        </div>
      ))}
      {items.length===0&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,
        color:"var(--am)",fontStyle:"italic",padding:"12px 0"}}>Sin productos</div>}
      {/* Total */}
      <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 4px",
        fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,fontSize:14,color:"var(--abri)"}}>
        <span>TOTAL</span><span>${total.toFixed(0)}</span>
      </div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
        color:"var(--am)",marginBottom:16}}>
        Pago: {PAY_LBL2[o.pay]||o.pay||"—"}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>setEditOrderModal(null)} style={{flex:1,minWidth:90,padding:"12px",
          borderRadius:12,border:"1px solid var(--abr)",background:"var(--ac)",
          color:"var(--ad)",fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          Cancelar
        </button>
        <button onClick={()=>saveEdit(false)} style={{flex:1,minWidth:90,padding:"12px",borderRadius:12,
          border:"none",background:"linear-gradient(135deg,#00FF88,#00C870)",
          color:"#060810",fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:800,cursor:"pointer"}}>
          Guardar
        </button>
        {doPrint&&<button onClick={()=>saveEdit(true)} style={{flex:2,minWidth:140,padding:"12px",borderRadius:12,
          border:"none",background:"linear-gradient(135deg,#3D8EFF,#2563eb)",
          color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:800,cursor:"pointer"}}>
          🖨️ Guardar e Imprimir
        </button>}
      </div>
    </div>
  </div>
);
}


/* ══════════════════════════════════════════
   DELIVERY TAB — Zonas de entrega con TomTom
══════════════════════════════════════════ */
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY;

function DeliveryTab({ local, setLocal, toast }) {
  const [cfg, setCfg] = React.useState(() => {
    const stored = local.delivery_config;
    if (stored && typeof stored === "object") return stored;
    return {
      enabled: false,
      lat: null,
      lng: null,
      zonas: [
        { id: 1, nombre: "Zona 1", radio_km: 2,  precio: 500,  minutos: 20 },
        { id: 2, nombre: "Zona 2", radio_km: 5,  precio: 800,  minutos: 35 },
        { id: 3, nombre: "Zona 3", radio_km: 10, precio: 1200, minutos: 50 },
      ],
    };
  });
  const [saving, setSaving]   = React.useState(false);
  const [geocoding, setGeocoding] = React.useState(false);
  const [localAddr, setLocalAddr] = React.useState(local.direccion || "");
  const mapRef   = React.useRef(null);
  const mapObj   = React.useRef(null);
  const circles  = React.useRef([]);

  /* ── Geocode restaurant address → lat/lng */
  async function geocodeRestaurante(addrParam) {
    if (!TOMTOM_KEY) { toast && toast("⚠️ Falta la TomTom API Key en .env"); return; }
    const addr = addrParam || local.direccion || "";
    if (!addr.trim()) { toast && toast("Escribí la dirección del local"); return; }
    setGeocoding(true);
    try {
      const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(addr)}.json?key=${TOMTOM_KEY}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const pos = data?.results?.[0]?.position;
      if (!pos) { toast && toast("No se encontró la dirección"); return; }
      const newCfg = { ...cfg, lat: pos.lat, lng: pos.lon };
      setCfg(newCfg);
      toast && toast("✓ Ubicación del local encontrada");
      if (mapObj.current) {
        mapObj.current.setCenter([pos.lon, pos.lat]);
        mapObj.current.setZoom(12);
        drawCircles(newCfg);
      }
    } catch(e) { toast && toast("Error al geocodificar: " + e.message); }
    finally { setGeocoding(false); }
  }

  /* ── Draw circles on map */
  function drawCircles(c) {
    if (!mapObj.current) return;
    const map = mapObj.current;
    // Remove old layers/sources
    circles.current.forEach(id => {
      try { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); } catch(_){}
    });
    circles.current = [];
    if (!c.lat || !c.lng) return;
    const ZONE_COLORS = ["#00FF88","#F5A623","#FF4444"];
    c.zonas.forEach((z, i) => {
      const id = "zone-" + z.id;
      const radiusMeters = z.radio_km * 1000;
      // Generate circle polygon (64 points)
      const points = 64;
      const coords = [];
      for (let j = 0; j <= points; j++) {
        const angle = (j / points) * 2 * Math.PI;
        const dx = (radiusMeters / 111320) * Math.cos(angle) / Math.cos(c.lat * Math.PI / 180);
        const dy = (radiusMeters / 111320) * Math.sin(angle);
        coords.push([c.lng + dx, c.lat + dy]);
      }
      map.addSource(id, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } }
      });
      map.addLayer({ id: id + "-fill", type: "fill", source: id, paint: { "fill-color": ZONE_COLORS[i], "fill-opacity": 0.08 } });
      map.addLayer({ id: id + "-line", type: "line", source: id, paint: { "line-color": ZONE_COLORS[i], "line-width": 2, "line-dasharray": [4, 2] } });
      circles.current.push(id + "-fill", id + "-line", id);
    });
    // Marker for restaurant
    // Marker via vanilla DOM (no tt import needed)
    if (!mapObj.current._restauranteMarker) {
      const el = document.createElement("div");
      el.style.cssText = "width:18px;height:18px;background:#C9A84C;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.5);border-radius:50%";
      // Use maplibre-style marker if available, else skip
      const ttLib = mapObj.current._ttLib;
      if (ttLib) {
        const marker = new ttLib.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
        mapObj.current._restauranteMarker = marker;
      }
    } else {
      mapObj.current._restauranteMarker.setLngLat([c.lng, c.lat]);
    }
  }

  /* ── Init TomTom map */
  React.useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    if (!TOMTOM_KEY) return;
    (async () => {
      try {
        const [{ default: tt }, css] = await Promise.all([
          import("@tomtom-international/web-sdk-maps"),
          import("@tomtom-international/web-sdk-maps/dist/maps.css"),
        ]);
        const map = tt.map({
          key: TOMTOM_KEY,
          container: mapRef.current,
          style: "tomtom://vector/1/basic-night",
          center: cfg.lng && cfg.lat ? [cfg.lng, cfg.lat] : [-58.38, -34.60],
          zoom: cfg.lat ? 12 : 10,
          cooperativeGestures: false,
        });
        mapObj.current = map;
        mapObj.current._ttLib = tt;
        // Suppress TomTom copyright/legal popup
        map.on("load", () => {
          // Hide any popup that appeared during initialization
          setTimeout(() => {
            const popups = document.querySelectorAll(".tt-popup, .mapboxgl-popup, [class*='copyright'], [class*='legal']");
            popups.forEach(el => { if(el.style) el.style.display = "none"; });
          }, 500);
          if (cfg.lat) drawCircles(cfg);
        });
      } catch(e) { console.error("TomTom map error:", e); }
    })();
    return () => { if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; } };
  }, [cfg.lat]);

  /* ── Redraw circles when zones change */
  React.useEffect(() => {
    if (mapObj.current && cfg.lat) {
      const map = mapObj.current;
      if (map.isStyleLoaded()) drawCircles(cfg);
      else map.once("load", () => drawCircles(cfg));
    }
  }, [cfg.zonas, cfg.lat, cfg.lng]);

  /* ── Save config to Supabase */
  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("restaurantes").update({ delivery_config: cfg }).eq("id", local.restauranteId);
      if (error) throw error;
      setLocal(l => ({ ...l, delivery_config: cfg }));
      toast && toast("✓ Configuración de delivery guardada");
    } catch(e) { toast && toast("Error al guardar: " + e.message); }
    finally { setSaving(false); }
  }

  const ZONE_COLORS = ["#00FF88", "#F5A623", "#FF4444"];
  const S = {
    card: { background:"var(--as)", border:"1px solid var(--abr)", borderRadius:14, padding:"16px 18px", marginBottom:12 },
    label: { fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"var(--am)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 },
    input: { width:"100%", background:"var(--a)", border:"1px solid var(--abr)", borderRadius:8, padding:"9px 12px", color:"var(--abri)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" },
    row: { display:"flex", gap:8, alignItems:"center" },
  };

  return (
    <div style={{ padding:"18px 16px 0" }}>
      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"var(--am)", letterSpacing:2, marginBottom:4 }}>MÓDULO</p>
        <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800, color:"var(--abri)", margin:0 }}>🛵 Delivery</h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"var(--ad)", marginTop:4 }}>Configurá tus zonas de entrega, precios y tiempos estimados.</p>
      </div>

      {/* Toggle ON/OFF */}
      <div style={{ ...S.card, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <p style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:"var(--abri)", margin:0 }}>Delivery activo</p>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"var(--am)", marginTop:2 }}>Los clientes verán la opción de delivery al pedir</p>
        </div>
        <button onClick={() => setCfg(c => ({ ...c, enabled: !c.enabled }))} style={{
          width:52, height:28, borderRadius:14, border:"none", cursor:"pointer",
          background: cfg.enabled ? "var(--ag)" : "var(--abr)",
          position:"relative", transition:".2s",
        }}>
          <span style={{
            position:"absolute", top:3, left: cfg.enabled ? 27 : 3,
            width:22, height:22, borderRadius:"50%", background:"#fff",
            transition:".2s", display:"block",
          }}/>
        </button>
      </div>

      {/* TomTom key warning */}
      {!TOMTOM_KEY && (
        <div style={{ background:"rgba(245,166,35,.08)", border:"1px solid rgba(245,166,35,.3)", borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
          <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#F5A623", margin:0 }}>
            ⚠️ Para ver el mapa agregá <strong>VITE_TOMTOM_KEY</strong> en tu archivo .env y en Vercel.<br/>
            Obtenés la key gratis en <strong>developer.tomtom.com</strong> → Create App
          </p>
        </div>
      )}

      {/* Geocode restaurant */}
      <div style={S.card}>
        <p style={S.label}>Dirección del local</p>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"var(--ad)", marginBottom:8 }}>
          Ingresá la dirección exacta para calcular las zonas en el mapa.
        </p>
        <input
          type="text"
          value={localAddr}
          onChange={e=>setLocalAddr(e.target.value)}
          placeholder="Ej: Av. Corrientes 1234, CABA"
          style={{ ...S.input, marginBottom:10 }}
        />
        <button onClick={()=>geocodeRestaurante(localAddr)} disabled={geocoding||!TOMTOM_KEY||!localAddr.trim()} className="pr" style={{
          background:"var(--ag)", color:"#000", border:"none", borderRadius:8,
          padding:"9px 16px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11,
          fontWeight:800, cursor:"pointer", opacity: (geocoding||!TOMTOM_KEY||!localAddr.trim()) ? 0.5 : 1,
        }}>
          {geocoding ? "Buscando..." : cfg.lat ? "✓ Actualizar ubicación" : "📍 Geocodificar dirección"}
        </button>
        {cfg.lat && <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"var(--ag)", marginTop:6 }}>✓ {cfg.lat.toFixed(4)}, {cfg.lng.toFixed(4)}</p>}
      </div>

      {/* Map — solo se muestra después de geocodificar */}
      {TOMTOM_KEY && cfg.lat && (
        <div style={{ ...S.card, padding:0, overflow:"hidden", marginBottom:12 }}>
          <div ref={mapRef} style={{ width:"100%", height:220, borderRadius:14 }} />
        </div>
      )}
      {TOMTOM_KEY && !cfg.lat && (
        <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid var(--abr)", borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
          <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"var(--am)", margin:0 }}>
            🗺️ El mapa aparece después de geocodificar la dirección del local
          </p>
        </div>
      )}

      {/* Zone config */}
      <div style={S.card}>
        <p style={S.label}>Zonas de entrega</p>
        {cfg.zonas.map((z, i) => (
          <div key={z.id} style={{ borderLeft:`3px solid ${ZONE_COLORS[i]}`, paddingLeft:12, marginBottom:14 }}>
            <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:ZONE_COLORS[i], fontWeight:700, marginBottom:8, letterSpacing:1 }}>
              {z.nombre}
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div>
                <p style={S.label}>Radio (km)</p>
                <input type="number" value={z.radio_km} min="0.5" step="0.5" style={S.input}
                  onChange={e => setCfg(c => ({ ...c, zonas: c.zonas.map((zz,ii) => ii===i ? {...zz, radio_km: parseFloat(e.target.value)||1} : zz) }))}
                />
              </div>
              <div>
                <p style={S.label}>Precio ($)</p>
                <input type="number" value={z.precio} min="0" step="50" style={S.input}
                  onChange={e => setCfg(c => ({ ...c, zonas: c.zonas.map((zz,ii) => ii===i ? {...zz, precio: parseInt(e.target.value)||0} : zz) }))}
                />
              </div>
              <div>
                <p style={S.label}>Minutos est.</p>
                <input type="number" value={z.minutos} min="5" step="5" style={S.input}
                  onChange={e => setCfg(c => ({ ...c, zonas: c.zonas.map((zz,ii) => ii===i ? {...zz, minutos: parseInt(e.target.value)||10} : zz) }))}
                />
              </div>
            </div>
          </div>
        ))}
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"var(--am)", marginTop:4 }}>
          Las zonas son concéntricas — Zona 1 es la más cercana, Zona 3 la más lejana.
        </p>
      </div>

      {/* Summary */}
      <div style={S.card}>
        <p style={S.label}>Resumen de zonas</p>
        {cfg.zonas.map((z, i) => (
          <div key={z.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i < cfg.zonas.length-1 ? "1px solid var(--abr)" : "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:ZONE_COLORS[i], display:"block" }}/>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"var(--abri)" }}>{z.nombre}</span>
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"var(--am)" }}>hasta {z.radio_km} km</span>
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:700, color:"var(--ag)" }}>${z.precio}</span>
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"var(--am)", marginLeft:6 }}>~{z.minutos} min</span>
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving} className="pr" style={{
        width:"100%", background:"var(--ag)", color:"#000", border:"none",
        borderRadius:12, padding:"13px", fontFamily:"'IBM Plex Mono',monospace",
        fontSize:12, fontWeight:800, cursor:"pointer", letterSpacing:.5,
        boxShadow:"0 0 18px rgba(0,255,136,.28)", opacity: saving ? 0.6 : 1,
        marginBottom:8,
      }}>
        {saving ? "Guardando..." : "💾 GUARDAR CONFIGURACIÓN"}
      </button>

      <div style={{ height:100 }} />
    </div>
  );
}

/* ══════════════════════════════════════════
   HELPERS — Delivery check para el cliente
   Usada en ClientApp al elegir delivery
══════════════════════════════════════════ */
export async function checkDeliveryZone(customerAddress, local, knownPos=null) {
  const cfg = local.delivery_config;
  if (!cfg || !cfg.enabled || !cfg.lat || !cfg.lng) return null;
  if (!TOMTOM_KEY) return null;
  try {
    let pos = knownPos ? {lat: knownPos.lat, lon: knownPos.lon} : null;
    if (!pos) {
      const geocodeUrl = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(customerAddress)}.json?key=${TOMTOM_KEY}&limit=1&countrySet=AR&lat=${cfg.lat}&lon=${cfg.lng}`;
      const res = await fetch(geocodeUrl);
      const data = await res.json();
      pos = data?.results?.[0]?.position;
    }
    if (!pos) return null;
    // Use TomTom routing API for actual road distance (not straight line)
    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${cfg.lat},${cfg.lng}:${pos.lat},${pos.lon}/json?key=${TOMTOM_KEY}&routeType=fastest&traffic=false`;
    const routeRes = await fetch(routeUrl);
    const routeData = await routeRes.json();
    const lengthInMeters = routeData?.routes?.[0]?.summary?.lengthInMeters;
    if (lengthInMeters == null) return null;
    const distKm = lengthInMeters / 1000;
    const zonasOrdenadas = cfg.zonas.slice().sort((a, b) => a.radio_km - b.radio_km);
    const zona = zonasOrdenadas.find(z => distKm <= z.radio_km);
    if (!zona) return { fuera: true, distKm: Math.round(distKm * 10) / 10 };
    return { zona, distKm: Math.round(distKm * 10) / 10 };
  } catch(e) { return null; }
}

function AdminApp({onBack, local, setLocal, cats, setCats, prods, setProds}) {

  /* ── State del admin */
  const [tab,setTab]         = useState("home");
  const [adminPinUnlocked, setAdminPinUnlocked] = useState(false);
  const [showPinModal, setShowPinModal]         = useState(null); // "gestion"|"config"
  const [pinInput, setPinInput]                 = useState("");
  const [editOrderModal, setEditOrderModal]     = useState(null); // pedido to edit
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
  const [vrActiveCat, setVrActiveCat]         = useState("");
  const [histDate, setHistDate]               = useState("");
  const [histOrders, setHistOrders]           = useState([]);
  const [histLoading, setHistLoading]         = useState(false);
  const [vrMesa, setVrMesa]                   = useState("mostrador");
  const [vrMesaNum, setVrMesaNum]             = useState(1);
  const [vrPay, setVrPay]                     = useState(null);
  const [vrPay2, setVrPay2]                   = useState(null);
  const [vrSplitAmt, setVrSplitAmt]           = useState("");
  const [vrSplitAmt2, setVrSplitAmt2]         = useState("");
  const [vrNota, setVrNota]                     = useState("");
  const [ticketPreview, setTicketPreview]       = useState(null);
  const [solicitudes, setSolicitudes]         = useState([]);
  const [vrLoading, setVrLoading]             = useState(false);

  /* ── Onboarding para nuevos usuarios */
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState(0);

  /* ── State de POS embebido en Caja */
  const [cajaCart, setCajaCart]         = useState({});
  const [cajaPay, setCajaPay]           = useState(null);
  const [cajaPay2, setCajaPay2]         = useState(null);
  const [cajaSplitAmt, setCajaSplitAmt] = useState("");
  const [cajaSplitAmt2, setCajaSplitAmt2] = useState("");
  const [cajaMesaTipo, setCajaMesaTipo] = useState("mostrador");
  const [cajaMesaNum, setCajaMesaNum]   = useState(1);
  const [cajaOpenCat, setCajaOpenCat]   = useState(null);
  const [cajaLoading, setCajaLoading]   = useState(false);
  const [editPayModal, setEditPayModal] = useState(null); // {id, pay} pedido cerrado a editar
  const [cajaMov, setCajaMov]           = useState([]);    // movimientos manuales de caja
  const [cajaDescPct, setCajaDescPct]   = useState(0);     // % descuento aplicado en caja
  const [showDescModal, setShowDescModal] = useState(false);
  const [showPrecioModal, setShowPrecioModal] = useState(false);
  const [precioName, setPrecioName]     = useState("");
  const [precioAmt, setPrecioAmt]       = useState("");
  const [showMovModal, setShowMovModal] = useState(false);
  const [movTipo, setMovTipo]           = useState("egreso");
  const [movMonto, setMovMonto]         = useState("");
  const [movDesc, setMovDesc]           = useState("");

  const vrTotal    = useMemo(()=>Object.values(vrCart).reduce((s,i)=>s+i.price*i.qty,0),[vrCart]);
  const cajaRawTotal = useMemo(()=>Object.values(cajaCart).reduce((s,i)=>s+i.price*i.qty,0),[cajaCart]);
  const cajaTotal  = useMemo(()=>cajaDescPct>0?Math.round(cajaRawTotal*(1-cajaDescPct/100)):cajaRawTotal,[cajaRawTotal,cajaDescPct]);

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

  /* ── Mostrar bienvenida si viene de registro (?nuevo=1) */
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    if(params.get('nuevo')==='1'){
      setShowWelcome(true);
      // Limpiar el param de la URL sin recargar
      const url = new URL(window.location.href);
      url.searchParams.delete('nuevo');
      window.history.replaceState({}, '', url.toString());
    }
  },[]);

  /* ── Print ticket (recibo para el cliente) */
  const PAY_LBL={cash:"Efectivo",mp:"Mercado Pago",card:"Tarjeta Débito",trans:"Transferencia"};
  const fmtPay=(raw)=>{
    if(!raw) return "—";
    // Handle "cash($500)+mp($300)" style
    return raw.replace(/([a-z]+)(\([^)]*\))?/g,(m,key,amt)=>(PAY_LBL[key]||key)+(amt||""));
  };
    const printTicket = (o) => { setTicketPreview(o); };

  const doPrint = (o) => {
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
      .obs{font-size:10px;color:#444;font-style:italic;padding:4px 0;border-bottom:1px dotted #ccc}
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
      ${o.nota&&o.nota!=="Venta en mostrador"?`<div class="obs">📝 ${o.nota}</div>`:""}
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
    if(!items.length || !vrPay || (vrPay2==="pending")) return;
    setVrLoading(true);
    try {
      const mesaNum = vrMesa==="mostrador" ? 0 : vrMesaNum;
      const {data:pedido,error} = await supabase.from("pedidos").insert({
        restaurante_id: local.restauranteId,
        mesa_numero:    mesaNum,
        status:         "nuevo",
        metodo_pago:    vrPay2&&vrPay2!=="pending"?`${vrPay}+${vrPay2}`:vrPay,
        propina:        0,
        total:          vrTotal,
        nota:           [vrMesa==="mostrador"?"Venta en mostrador":null, vrNota||null].filter(Boolean).join(" | ")||null,
              }).select().single();
      if(!error && pedido){
        await supabase.from("pedido_items").insert(
          items.map(i=>({pedido_id:pedido.id,producto_id:i.id,nombre:i.name,precio:i.price,cantidad:i.qty}))
        );
        const _split=vrPay2&&vrPay2!=="pending"?Number(vrSplitAmt)||Math.ceil(vrTotal/2):0;const _split2=Number(vrSplitAmt2)||vrTotal-_split;printTicket({id:pedido.id,table:mesaNum,items,total:vrTotal,pay:vrPay2&&vrPay2!=="pending"?`${vrPay}($${fmt(_split)})+${vrPay2}($${fmt(_split2)})`:vrPay,tip:0,nota:vrNota||null});
      }
      setVrCart({}); setVrPay(null); setVrPay2(null); setVrSplitAmt(""); setVrSplitAmt2(""); setVrNota(""); setShowVentaRapida(false);
      toast("✓ Venta registrada");
    } catch(e){ toast("Error al guardar","err"); }
    finally { setVrLoading(false); }
  };

  const cajaConfirm = async(shouldPrint=false)=>{
    const items = Object.values(cajaCart).filter(i=>i.qty>0);
    if(!items.length || !cajaPay || (cajaPay2==="pending")) return;
    setCajaLoading(true);
    try {
      const mesaNum = cajaMesaTipo==="mostrador" ? 0 : cajaMesaNum;
      const {data:pedido,error} = await supabase.from("pedidos").insert({
        restaurante_id: local.restauranteId,
        mesa_numero:    mesaNum,
        status:         "nuevo",
        metodo_pago:    cajaPay2&&cajaPay2!=="pending"?`${cajaPay}+${cajaPay2}`:cajaPay,
        propina:        0,
        total:          cajaTotal,
        nota:           cajaMesaTipo==="mostrador"?"Venta en mostrador":null,
              }).select().single();
      if(!error && pedido){
        await supabase.from("pedido_items").insert(
          items.map(i=>({pedido_id:pedido.id,producto_id:i.id,nombre:i.name,precio:i.price,cantidad:i.qty}))
        );
        const _cs2=cajaSplitAmt2||fmt(cajaTotal-Number(cajaSplitAmt||0));printTicket({id:pedido.id,table:mesaNum,items,total:cajaTotal,pay:cajaPay2&&cajaPay2!=="pending"?`${cajaPay}($${cajaSplitAmt})+${cajaPay2}($${_cs2})`:cajaPay,tip:0});
      }
      setCajaCart({}); setCajaPay(null); setCajaPay2(null); setCajaSplitAmt(""); setCajaDescPct(0);
      toast("✓ Venta registrada");
    } catch(e){ toast("Error al guardar","err"); }
    finally { setCajaLoading(false); }
  };

  useEffect(()=>{
    // Actualizar reloj cada minuto (no cada segundo para evitar re-renders)
    const t=setInterval(()=>setClock(new Date()),60000);
    return()=>clearInterval(t);
  },[]);

  const toast = useCallback((msg,type="ok") => {
    setToastM({msg,type});
    setTimeout(()=>setToastM(null),2400);
  },[]);

  /* ── Cargar turnos de caja desde Supabase */
  useEffect(()=>{
    if(!supabase || !local.restauranteId) return;
    getTurnos(local.restauranteId).then(turnos=>{
      if(!turnos?.length) return;
      const open = turnos.find(t=>t.estado==="abierto");
      // Load closed turnos into histTurnos
      const closed = turnos.filter(t=>t.estado==="cerrado").map(t=>({
        id: t.id, supabaseId: t.id,
        cajero: t.cajero||"Cajero",
        horaApertura: new Date(t.hora_apertura).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}),
        fecha: new Date(t.hora_apertura).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"}),
        fondoApertura: t.fondo_apertura||0,
        arqueoAp: t.arqueo_apertura||{},
        arqueoFinal: t.arqueo_cierre||{},
        horaCierre: t.hora_cierre ? new Date(t.hora_cierre).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}) : null,
        ventas: t.ventas||{efectivo:0,mercadopago:0,debito:0,credito:0,transferencia:0},
        estado: "cerrado",
      }));
      if(closed.length) setHist(closed);
      // Restore open turno
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
      status:p.status, items:(p.pedido_items||[]).map(i=>({name:i.nombre,qty:i.cantidad,price:i.precio||0})),
      total:p.total, pay:p.metodo_pago||"", tip:p.propina||0, nota:p.nota||null,
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
        async payload=>{
          const p=payload.new;
          if(knownIds.has(p.id)) return;
          knownIds.add(p.id);
          // Agregar inmediatamente con items vacíos para notificar rápido
          setOrders(os=>[mapPedido({...p,pedido_items:[]}), ...os]);
          toast(`🔔 Nuevo pedido · Mesa ${p.mesa_numero}`);
          playSound('nuevo');
          pushNotify("🔔 Nuevo pedido", `Mesa ${p.mesa_numero} · $${p.total?.toLocaleString('es-AR')||''}`);
          // Buscar los items del pedido y actualizar en 800ms
          setTimeout(async()=>{
            const {data:items} = await supabase.from("pedido_items")
              .select("*").eq("pedido_id", p.id);
            if(items?.length){
              setOrders(os=>os.map(o=>o.id===p.id
                ? {...o, items:items.map(i=>({name:i.nombre,qty:i.cantidad,price:i.precio||0}))}
                : o));
            }
          }, 800);
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
        // Actualizar estado e items sin perder datos locales
        return mapped.map(newP => {
          const old = prev.find(o=>o.id===newP.id);
          if(!old) return newP;
          return {
            ...old,
            status: newP.status,
            // Actualizar items si el nuevo tiene más info que el viejo
            items: newP.items.length > 0 ? newP.items : old.items,
          };
        });
      });
    }, 5000);

    // ── Solicitudes de mesa (realtime)
    let chSolic = null;
    const loadSolicitudes = async () => {
      const {data} = await supabase.from("solicitudes")
        .select("*")
        .eq("restaurante_id", local.restauranteId)
        .eq("estado","pendiente")
        .order("created_at",{ascending:false});
      if(data) setSolicitudes(data);
    };
    loadSolicitudes();
    chSolic = supabase.channel("solicitudes-admin-"+local.restauranteId)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"solicitudes",
          filter:`restaurante_id=eq.${local.restauranteId}`},
        payload => {
          const s = payload.new;
          setSolicitudes(prev=>[s,...prev]);
          const labels = {mozo:"🙋 Llamado al mozo",cuenta:"💳 Piden la cuenta",
            cubiertos:"🍴 Cubiertos",hielo:"🧊 Hielo",pan:"🍞 Pan",servilletas:"🧻 Servilletas"};
          toast(`${labels[s.tipo]||s.tipo} · Mesa ${s.mesa}`);
          playSound('solicitud');
          pushNotify("🛎️ Solicitud de mesa", `Mesa ${s.mesa} — ${labels[s.tipo]||s.tipo}`);
        })
      .subscribe();

    return ()=>{
      supabase.removeChannel(ch);
      if(chSolic) supabase.removeChannel(chSolic);
      clearInterval(poll);
    };
  },[local.restauranteId]);

  const markSolicitudAtendida = async (id) => {
    setSolicitudes(prev=>prev.filter(s=>s.id!==id));
    if(supabase) await supabase.from("solicitudes").update({estado:"atendido"}).eq("id",id);
    toast("Solicitud atendida ✓");
  };

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
    // Mostrar ticket cuando el pedido pasa a entregado
    if(next==="entregado"){
      printTicket({
        id:  o.id,
        table: o.table,
        items: o.items||[],
        total: o.total,
        pay:   o.pay||"",
        tip:   o.tip||0,
        nota:  o.nota||null,
      });
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
      await supabase.from("turnos_caja").update({
        arqueo_cierre: arqVals,
        hora_cierre: new Date().toISOString(),
        estado: "cerrado",
        ventas: makeVentas(),
      }).eq("id", turno.supabaseId);
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
    const totalIngresos = cajaMov.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.monto,0);
    const totalEgresos  = cajaMov.filter(m=>m.tipo==="egreso").reduce((s,m)=>s+m.monto,0);
    const efectivoEsperado = (vt.efectivo||0) + t.fondoApertura + totalIngresos - totalEgresos;
    const diff = ta!==null ? ta-efectivoEsperado : null;
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
              fontWeight:700,color:"var(--abri)"}}>{(local.nombre||"Tu Restaurante").toUpperCase()}</p>
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
          {/* Movimientos de caja */}
          {cajaMov.length>0 && (<>
            <div style={{height:1,background:"repeating-linear-gradient(90deg,var(--abr),var(--abr) 4px,transparent 4px,transparent 8px)",margin:"6px 0"}}/>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",letterSpacing:1.5,marginBottom:4}}>MOVIMIENTOS DE CAJA</p>
            {cajaMov.map(m=>(
              <div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px dashed var(--abr)"}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--ad)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:170}}>
                  {m.tipo==="ingreso"?"↑":"↓"} {m.desc}
                </span>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:600,flexShrink:0,color:m.tipo==="ingreso"?"var(--ag)":"var(--ar)"}}>
                  {m.tipo==="ingreso"?"+":"-"}${fmt(m.monto)}
                </span>
              </div>
            ))}
            {totalIngresos>0 && <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--ag)"}}>Subtotal ingresos</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--ag)"}}>+${fmt(totalIngresos)}</span></div>}
            {totalEgresos>0 && <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--ar)"}}>Subtotal egresos</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--ar)"}}>-${fmt(totalEgresos)}</span></div>}
          </>)}
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
              <QRImage data={data} size={160}/>
            </div>
            <div style={{background:"#0D6B5E",borderRadius:30,padding:"6px 24px",
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
          <button onClick={async()=>{
            const qrUrl = await QRCodeLib.toDataURL(data,{width:280,margin:2,color:{dark:"#0A0806",light:"#FFFFFF"}});
            const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Mesa ${tableNum}</title>
<style>
  @page{size:A4;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}
  .card{text-align:center;padding:48px 60px;border:3px solid #C9A84C;border-radius:28px;background:#fff}
  .name{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:18px;font-family:monospace}
  .qr{background:#fff;border:3px solid #C9A84C;border-radius:14px;padding:12px;display:inline-block;margin-bottom:18px}
  .label{background:#C9A84C;color:#0A0806;border-radius:30px;padding:9px 32px;display:inline-block;font-size:17px;font-weight:700;margin-bottom:12px;font-family:sans-serif}
  .url{font-size:9px;color:#999;word-break:break-all;max-width:260px;margin:0 auto;font-family:monospace}
</style></head><body>
<div class="card">
  <div class="name">${local.nombre||"MenuQR"}</div>
  <div class="qr"><img src="${qrUrl}" width="240" height="240"/></div><br>
  <div class="label">Mesa ${tableNum}</div>
  <div class="url">${data}</div>
</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},1500)}</script>
</body></html>`;
            const w=window.open("","_blank","width=520,height=640,toolbar=0,menubar=0");
            if(w){w.document.write(html);w.document.close();}
          }} className="pr" style={{width:"100%",
            background:"var(--ag)",color:"#FFFFFF",border:"none",borderRadius:14,
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
    {id:"home",      icon:"◈", label:"Inicio",    color:"#FFFFFF"},
    {id:"orders",    icon:"⊞", label:"Pedidos",   color:"#FFFFFF", badge:newCount+solicitudes.length},
    {id:"carta",     icon:"≡", label:"Carta",     color:"#FFFFFF"},
    {id:"qr",        icon:"⬛", label:"QRs",       color:"#FFFFFF"},
    {id:"caja",      icon:"◉", label:"Caja",      color:"#FFFFFF"},
    {id:"delivery",  icon:"🛵", label:"Delivery",  color:"#FFFFFF"},
    {id:"mostrador", icon:"🏪", label:"Mostrador", color:"#FFFFFF"},
    {id:"cocina",    icon:"👨‍🍳", label:"Cocina",   color:"#FFFFFF"},
    {id:"reportes",  icon:"📊", label:"Reportes",  color:"#FFFFFF"},
    {id:"gestion",   icon:"✏", label:"Gestión",   color:"#FFFFFF"},
    {id:"config",    icon:"⚙", label:"Config",    color:"#FFFFFF"},
    {id:"whatsapp",  icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.996 0C5.374 0 0 5.373 0 11.996c0 2.133.56 4.133 1.54 5.867L.047 23.53a.5.5 0 00.612.632l5.828-1.528A11.935 11.935 0 0011.996 24C18.619 24 24 18.619 24 11.996 24 5.373 18.619 0 11.996 0zm0 21.818a9.794 9.794 0 01-4.992-1.367l-.358-.212-3.718.975 1.002-3.618-.234-.372a9.794 9.794 0 01-1.518-5.228c0-5.419 4.409-9.818 9.818-9.818s9.818 4.399 9.818 9.818-4.399 9.822-9.818 9.822z"/></svg>, label:"WhatsApp"},
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
          background:"var(--ag)",color:"#FFFFFF",border:"none",borderRadius:12,
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

      {/* ── Solicitudes de mesa */}
      {solicitudes.length>0 && (
        <div style={{background:"var(--ac)",border:"1px solid rgba(201,168,76,.3)",
          borderRadius:16,overflow:"hidden",marginBottom:8,marginTop:4,
          marginLeft:16,marginRight:16}}>
          <div style={{padding:"10px 14px 7px",borderBottom:"1px solid rgba(201,168,76,.15)",
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <ALbl>Solicitudes de mesa</ALbl>
            <span style={{background:"rgba(255,176,32,.15)",
              border:"1px solid rgba(255,176,32,.3)",borderRadius:20,
              padding:"2px 8px",fontFamily:"'IBM Plex Mono',monospace",
              fontSize:9,color:"#FFB020"}}>{solicitudes.length}</span>
          </div>
          {solicitudes.map((s,i)=>{
            const icons = {mozo:"🙋",cuenta:"💳",cubiertos:"🍴",hielo:"🧊",pan:"🍞",servilletas:"🧻"};
            const labels = {mozo:"Llamado al mozo",cuenta:"Piden la cuenta",
              cubiertos:"Cubiertos",hielo:"Hielo",pan:"Pan",servilletas:"Servilletas"};
            return (
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 14px",
                borderBottom:i<solicitudes.length-1?"1px solid var(--abr)":"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:10,
                    background:"rgba(255,176,32,.1)",border:"1px solid rgba(255,176,32,.2)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                    {icons[s.tipo]||"🛎️"}
                  </div>
                  <div>
                    <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,
                      fontSize:13,color:"var(--abri)"}}>{labels[s.tipo]||s.tipo}</p>
                    <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                      color:"var(--ad)"}}>Mesa {s.mesa} · {new Date(s.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</p>
                  </div>
                </div>
                <button onClick={()=>markSolicitudAtendida(s.id)} className="pr" style={{
                  background:"rgba(0,255,136,.1)",border:"1px solid rgba(0,255,136,.25)",
                  borderRadius:8,padding:"6px 12px",cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                  color:"#00FF88",letterSpacing:.5}}>✓ LISTO</button>
              </div>
            );
          })}
        </div>
      )}

    </div>
    );
  };

  /* ══════════════════════════════════════════
     VENTA RÁPIDA MODAL
  ══════════════════════════════════════════ */
  const VentaRapidaModal = () => {
    const catIds = [...new Set(prods.filter(p=>p.active).map(p=>p.cat))];
    // vrActiveCat lives in parent so it survives re-renders of VentaRapidaModal
    const effectiveVrCat = vrActiveCat && catIds.includes(vrActiveCat) ? vrActiveCat : (catIds[0]||"");
    const visProd = prods.filter(p=>p.active && p.cat===effectiveVrCat);
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
            <button onClick={()=>{setShowVentaRapida(false);setVrCart({});setVrPay(null);setVrPay2(null);setVrSplitAmt("");setVrSplitAmt2("");setVrNota("");}}
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
                    background:effectiveVrCat===cid?"var(--abl)":"var(--ac)",
                    color:effectiveVrCat===cid?"#fff":"var(--ad)",
                    border:`1px solid ${effectiveVrCat===cid?"var(--abl)":"var(--abr)"}`}}>
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
            {/* Observaciones del cliente */}
            <div style={{marginBottom:10}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",letterSpacing:1,marginBottom:6}}>OBSERVACIONES</p>
              <textarea
                value={vrNota}
                onChange={e=>setVrNota(e.target.value)}
                placeholder="Ej: cocido, sin sal, extra salsa..."
                rows={2}
                style={{width:"100%",background:"var(--ac)",border:"1px solid var(--abr)",
                  borderRadius:10,padding:"10px 12px",color:"var(--abri)",
                  fontFamily:"'DM Sans',sans-serif",fontSize:13,resize:"none",
                  outline:"none",lineHeight:1.4}}/>
            </div>
            {/* Método de pago — siempre visible, vertical */}
            <div style={{marginTop:8,marginBottom:4}}>
              {(()=>{
                const splitMode = !!vrPay2;
                const splitResto = vrTotal - Number(vrSplitAmt||0);
                return (<>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",letterSpacing:1,margin:0}}>MÉTODO DE PAGO</p>
                    <button onClick={()=>{if(splitMode){setVrPay2(null);setVrSplitAmt("");setVrSplitAmt2("");}else{setVrPay2("pending");}}} style={{background:"none",border:"none",color:splitMode?"var(--ar)":"var(--abl)",fontSize:10,cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:.5}}>
                      {splitMode?"✕ cancelar mixto":"÷ pago mixto"}
                    </button>
                  </div>
                  {!splitMode ? (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {VR_PAYS.map(p=>(
                        <button key={p.id} onClick={()=>setVrPay(p.id)} style={{width:"100%",padding:"12px 16px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left",fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,background:vrPay===p.id?"var(--abl)":"var(--ac)",color:vrPay===p.id?"#fff":"var(--abri)",border:`1px solid ${vrPay===p.id?"var(--abl)":"var(--abr)"}`,transition:"all .15s"}}>
                          <span style={{fontSize:20}}>{p.icon}</span>{p.label}
                          {vrPay===p.id && <span style={{marginLeft:"auto",fontSize:12}}>✓</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{background:"var(--ac)",borderRadius:12,padding:"12px 14px"}}>
                        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",letterSpacing:1,marginBottom:8}}>MÉTODO 1</p>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                          {VR_PAYS.map(p=>(
                            <button key={p.id} onClick={()=>setVrPay(p.id)} style={{padding:"8px 8px",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,background:vrPay===p.id?"var(--abl)":"var(--as)",color:vrPay===p.id?"#fff":"var(--abri)",border:`1px solid ${vrPay===p.id?"var(--abl)":"var(--abr)"}`}}>
                              <span style={{fontSize:14}}>{p.icon}</span><span>{p.label}</span>
                            </button>
                          ))}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:"var(--am)"}}>$</span>
                          <input type="number" value={vrSplitAmt} onChange={e=>{setVrSplitAmt(e.target.value);const r=vrTotal-Number(e.target.value||0);if(r>=0)setVrSplitAmt2(String(r));}}
                            placeholder={String(Math.ceil(vrTotal/2))}
                            style={{flex:1,background:"var(--as)",border:"1px solid var(--abr)",borderRadius:8,padding:"8px 10px",color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",fontSize:15,fontWeight:700,outline:"none"}}/>
                          <button onClick={()=>{const h=Math.ceil(vrTotal/2);setVrSplitAmt(String(h));setVrSplitAmt2(String(vrTotal-h));}} style={{background:"var(--abl)",border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>50/50</button>
                        </div>
                      </div>
                      <div style={{background:"var(--ac)",borderRadius:12,padding:"12px 14px"}}>
                        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",letterSpacing:1,marginBottom:8}}>MÉTODO 2</p>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                          {VR_PAYS.map(p=>(
                            <button key={p.id} onClick={()=>setVrPay2(p.id)} style={{padding:"8px 8px",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,background:vrPay2===p.id?"var(--abl)":"var(--as)",color:vrPay2===p.id?"#fff":"var(--abri)",border:`1px solid ${vrPay2===p.id?"var(--abl)":"var(--abr)"}`}}>
                              <span style={{fontSize:14}}>{p.icon}</span><span>{p.label}</span>
                            </button>
                          ))}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:"var(--am)"}}>$</span>
                          <input type="number" value={vrSplitAmt2} onChange={e=>setVrSplitAmt2(e.target.value)}
                            placeholder={String(Math.max(0,vrTotal-Number(vrSplitAmt||0)))}
                            style={{flex:1,background:"var(--as)",border:"1px solid var(--abr)",borderRadius:8,padding:"8px 10px",color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",fontSize:15,fontWeight:700,outline:"none"}}/>
                        </div>
                      </div>
                      {(vrSplitAmt||vrSplitAmt2)&&(()=>{const a1=Number(vrSplitAmt||0),a2=Number(vrSplitAmt2||0),diff=vrTotal-(a1+a2);return(<div style={{background:diff===0?"rgba(0,255,136,.08)":"rgba(255,176,32,.08)",border:`1px solid ${diff===0?"rgba(0,255,136,.3)":"rgba(255,176,32,.3)"}`,borderRadius:8,padding:"8px 10px",display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:diff===0?"var(--ag)":"#FFB020"}}>{diff===0?"✓ Balanceado":diff>0?`Falta: $${fmt(diff)}`:`Excede: $${fmt(Math.abs(diff))}`}</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,color:diff===0?"var(--ag)":"#FFB020"}}>Total: ${fmt(vrTotal)}</span></div>);})()}
                    </div>
                  )}
                </>);
              })()}
            </div>
          </div>
          {/* Footer sticky */}
          {vrTotal>0 && (
            <div style={{padding:"14px 16px",borderTop:"1px solid var(--abr)",
              background:"var(--as)",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:6}}>
                <button onClick={()=>{setVrCart({});setVrPay(null);setVrPay2(null);setVrSplitAmt("");setVrSplitAmt2("");setVrNota("");}} style={{background:"rgba(255,59,92,.1)",border:"none",color:"var(--ar)",borderRadius:8,padding:"5px 12px",fontSize:11,fontFamily:"'IBM Plex Mono',monospace",cursor:"pointer",letterSpacing:.5}}>🗑 Vaciar pedido</button>
              </div>
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
              {(vrPay && vrPay2!=="pending") ? (
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
        ${o.nota?`<div style="padding:4px 0;font-size:10px"><b>NOTA:</b> ${o.nota}</div><div class="line"></div>`:''}
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

    /* ── Card de pedido — siempre 100% visible, sin toggle ── */
    const OCard = ({o}) => {
      const s = STATUS_CFG[o.status];
      const isWADelivery = o.pay==="whatsapp" && o.nota && o.nota.includes("DELIVERY");
      const isWARetiro   = o.pay==="whatsapp" && o.nota && o.nota.includes("RETIRO");
      const mesaLabel = isWADelivery ? "🛵 DELIVERY WA" : isWARetiro ? "🏪 RETIRO WA" : (o.table===0||o.table==="0"||o.table===null) ? "MOSTRADOR" : "MESA "+o.table;
      const PAY_LABEL = {cash:"Efectivo",mp:"Mercado Pago",card:"Débito/Créd.",trans:"Transferencia",whatsapp:"WhatsApp"};
      const isClosed  = o.status === "entregado";
      return (
        <div className="ar" style={{
          background:"var(--as)",
          border:`2px solid ${isClosed ? "#2a3441" : s.color+"66"}`,
          borderTop:`3px solid ${s.color}`,
          borderRadius:12,marginBottom:8,overflow:"hidden",
          boxShadow: isClosed ? "none" : `0 0 18px ${s.color}18, 0 3px 10px rgba(0,0,0,.3)`,
        }}>
          {/* ── Cabecera */}
          <div style={{padding:"10px 14px 8px",display:"flex",
            justifyContent:"space-between",alignItems:"flex-start",
            background:`${s.color}${isClosed?"04":"09"}`}}>
            <div>
              <span className="admin-ocard-mesa" style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                fontSize:isClosed?15:20,color:s.color,display:"block",lineHeight:1}}>
                {mesaLabel}
              </span>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                color:"var(--am)",marginTop:3}}>
                #{String(o.id).slice(-4)} · {o.time}
              </p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{textAlign:"right"}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                  fontSize:isClosed?13:16,color:isClosed?"var(--ag)":s.color}}>
                  ${fmt(o.total+(o.tip||0))}
                </p>
                {o.tip>0 && (
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                    color:"rgba(0,255,136,.55)"}}>incl. propina</p>
                )}
              </div>
              <button onClick={()=>printComanda(o)} title="Imprimir comanda" style={{
                background:"none",border:"1px solid var(--abr)",borderRadius:6,
                padding:"4px 7px",color:"var(--ad)",fontSize:12,cursor:"pointer",lineHeight:1}}>
                🖨️
              </button>
              {isClosed && (
                <button onClick={()=>setEditPayModal({id:o.id, pay:o.pay||""})} title="Editar método de pago" style={{
                  background:"none",border:"1px solid var(--abr)",borderRadius:6,
                  padding:"4px 7px",color:"var(--ad)",fontSize:12,cursor:"pointer",lineHeight:1}}>
                  ✏️
                </button>
              )}
            </div>
          </div>

          {/* ── Items — siempre visibles */}
          <div style={{padding:"9px 14px 10px",borderTop:`1px solid ${s.color}22`}}>
            {o.items.length===0 ? (
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                color:"var(--am)",fontStyle:"italic"}}>cargando items...</p>
            ) : (
              o.items.map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"baseline",paddingBottom:2}}>
                  <p className="admin-ocard-item" style={{fontFamily:"'IBM Plex Mono',monospace",
                    fontSize:isClosed?11:13,color:"var(--at)",lineHeight:1.9}}>
                    <span style={{color:s.color,fontWeight:700,marginRight:5}}>{it.qty}×</span>
                    {it.name}
                  </p>
                  {it.price>0 && (
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                      color:"var(--am)",marginLeft:8,flexShrink:0}}>
                      ${fmt(it.qty*(it.price||0))}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ── Nota / Observación */}
          {o.nota && (
            <div className="admin-nota" style={{padding:"6px 14px 8px",borderTop:`1px solid ${s.color}15`,background:`${s.color}08`}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:s.color,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>📝 Observación</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--at)",lineHeight:1.5}}>{o.nota}</p>
            </div>
          )}

          {/* ── Pago */}
          {(o.pay||o.tip>0) && (
            <div style={{padding:"5px 14px 8px",borderTop:`1px solid ${s.color}15`,
              display:"flex",gap:12,flexWrap:"wrap"}}>
              {o.pay && (
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                  color:"var(--ad)"}}>💳 {PAY_LABEL[o.pay]||o.pay}</p>
              )}
              {o.tip>0 && (
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                  color:"rgba(0,255,136,.6)"}}>💝 propina ${fmt(o.tip)}</p>
              )}
            </div>
          )}

          {/* ── Botón de avance (solo pedidos activos) */}
          {s.next && (
            <button onClick={()=>advance(o.id)} className="pr" style={{
              width:"100%",background:`${s.color}1A`,border:"none",
              borderTop:`1px solid ${s.color}33`,padding:"12px",
              fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,
              color:s.color,cursor:"pointer",letterSpacing:1.5,
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}}>
              {s.action}
            </button>
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

    /* ── Grid de mesas en vivo ── */
    const mesasTotal = local.mesas || 12;
    const getMesaStatus = (num) => {
      const mesaOrders = active.filter(o=>String(o.table)===String(num));
      if(!mesaOrders.length) return null;
      if(mesaOrders.some(o=>o.status==="nuevo"))       return {color:"#FFB020",label:"NUEVO"};
      if(mesaOrders.some(o=>o.status==="preparando"))  return {color:"#3D8EFF",label:"COCINA"};
      if(mesaOrders.some(o=>o.status==="listo"))       return {color:"#00FF88",label:"LISTO"};
      return null;
    };

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

        {/* ── Solicitudes de mesa (visible siempre en Pedidos) */}
        {solicitudes.length>0 && (
          <div style={{background:"var(--ac)",border:"1px solid rgba(255,176,32,.4)",
            borderRadius:14,overflow:"hidden",marginBottom:14,
            boxShadow:"0 0 16px rgba(255,176,32,.12)"}}>
            <div style={{padding:"10px 14px 8px",borderBottom:"1px solid rgba(255,176,32,.15)",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              background:"rgba(255,176,32,.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>🛎️</span>
                <ALbl>Solicitudes de mesa</ALbl>
              </div>
              <span style={{background:"rgba(255,176,32,.15)",
                border:"1px solid rgba(255,176,32,.4)",borderRadius:20,
                padding:"2px 8px",fontFamily:"'IBM Plex Mono',monospace",
                fontSize:9,fontWeight:700,color:"#FFB020"}}>{solicitudes.length}</span>
            </div>
            {solicitudes.map((s,i)=>{
              const icons  = {mozo:"🙋",cuenta:"💳",cubiertos:"🍴",hielo:"🧊",pan:"🍞",servilletas:"🧻"};
              const labels = {mozo:"Llamado al mozo",cuenta:"Piden la cuenta",
                cubiertos:"Cubiertos",hielo:"Hielo",pan:"Pan",servilletas:"Servilletas"};
              return (
                <div key={s.id} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"10px 14px",
                  borderBottom:i<solicitudes.length-1?"1px solid var(--abr)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:36,height:36,borderRadius:10,
                      background:"rgba(255,176,32,.1)",border:"1px solid rgba(255,176,32,.2)",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                      {icons[s.tipo]||"🛎️"}
                    </div>
                    <div>
                      <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,
                        fontSize:13,color:"var(--abri)"}}>{labels[s.tipo]||s.tipo}</p>
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                        color:"var(--ad)"}}>Mesa {s.mesa} · {new Date(s.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</p>
                    </div>
                  </div>
                  <button onClick={()=>markSolicitudAtendida(s.id)} className="pr" style={{
                    background:"rgba(0,255,136,.1)",border:"1px solid rgba(0,255,136,.25)",
                    borderRadius:8,padding:"6px 12px",cursor:"pointer",
                    fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                    color:"#00FF88",letterSpacing:.5}}>✓ LISTO</button>
                </div>
              );
            })}
          </div>
        )}

        {f==="activos" && (
          <>
            {/* ── Mesas en vivo */}
            <div style={{background:"var(--ac)",border:"1px solid var(--abr)",
              borderRadius:14,padding:"12px 14px",marginBottom:14}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                color:"var(--am)",letterSpacing:2,marginBottom:10}}>MESAS EN VIVO</p>
              <div style={{
                display:"grid",
                gridTemplateColumns:`repeat(auto-fill,minmax(52px,1fr))`,
                gap:7}}>
                {Array.from({length:mesasTotal},(_,i)=>{
                  const num = i+1;
                  const st  = getMesaStatus(num);
                  return (
                    <div key={num} style={{
                      background: st ? `${st.color}18` : "var(--as)",
                      border:`1.5px solid ${st ? st.color+"77" : "var(--abr)"}`,
                      borderRadius:10,padding:"8px 4px",
                      textAlign:"center",
                      boxShadow: st ? `0 0 10px ${st.color}22` : "none",
                      transition:"all .3s",
                    }}>
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",
                        fontSize:16,fontWeight:700,
                        color:st?st.color:"var(--am)",lineHeight:1}}>{num}</p>
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",
                        fontSize:7,color:st?st.color:"var(--abr)",
                        letterSpacing:.5,marginTop:3}}>
                        {st ? st.label : "LIBRE"}
                      </p>
                    </div>
                  );
                })}
                {/* Mostrador */}
                {(()=>{
                  const stMC = active.some(o=>String(o.table)==="0"||o.table===null);
                  const stColor = stMC
                    ? (active.find(o=>(String(o.table)==="0"||o.table===null)&&o.status==="nuevo")
                        ? "#FFB020"
                        : active.find(o=>(String(o.table)==="0"||o.table===null)&&o.status==="preparando")
                          ? "#3D8EFF" : "#00FF88")
                    : null;
                  return (
                    <div style={{
                      background: stColor ? `${stColor}18` : "var(--as)",
                      border:`1.5px solid ${stColor ? stColor+"77" : "var(--abr)"}`,
                      borderRadius:10,padding:"8px 4px",
                      textAlign:"center",
                      boxShadow: stColor ? `0 0 10px ${stColor}22` : "none",
                      transition:"all .3s",
                    }}>
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",
                        fontSize:11,fontWeight:700,
                        color:stColor||"var(--am)",lineHeight:1}}>MC</p>
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",
                        fontSize:7,color:stColor||"var(--abr)",
                        letterSpacing:.5,marginTop:3}}>
                        {stColor ? "ACTIVO" : "LIBRE"}
                      </p>
                    </div>
                  );
                })()}
              </div>
              {/* Leyenda */}
              <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
                {[
                  {color:"#FFB020",label:"Nuevo"},
                  {color:"#3D8EFF",label:"En cocina"},
                  {color:"#00FF88",label:"Listo"},
                  {color:"var(--abr)",label:"Libre"},
                ].map(l=>(
                  <div key={l.label} style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:7,height:7,borderRadius:"50%",
                      background:l.color,flexShrink:0,
                      boxShadow:l.label!=="Libre"?`0 0 5px ${l.color}`:"none"}}/>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                      color:"var(--am)"}}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Kanban de pedidos */}
            <div style={{display:"flex",gap:10}}>
              <KCol title="NUEVOS"    color="#FFB020" colOrders={nuevos}/>
              <KCol title="EN COCINA" color="#3D8EFF" colOrders={enCocina}/>
              <KCol title="LISTOS"    color="#00FF88" colOrders={listos}/>
            </div>
          </>
        )}

        {f==="cerrados" && (
          <div>
            {cerrados.length===0 && (
              <div style={{textAlign:"center",padding:"50px 0",color:"var(--am)"}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13}}>// sin pedidos cerrados</p>
              </div>
            )}
            {cerrados.map(o=><OCard key={o.id} o={o}/>)}
          </div>
        )}

      {/* ── Modal editar método de pago ── */}
      {editPayModal && <EditPayModal editPayModal={editPayModal} setEditPayModal={setEditPayModal} setOrders={setOrders} toast={toast}/>}
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

    /* Card expandible por producto */
    const ProdCard = ({p, i, total}) => {
      const [open, setOpen] = useState(false);
      const activeColor = p.active ? (p.sin_stock ? "var(--aam)" : "var(--ag)") : "var(--am)";
      const glowColor   = p.active ? (p.sin_stock ? "#FFB020" : "#00FF88") : "#4A5A6A";
      return (
        <div className="admin-carta-item" style={{
          borderBottom: i < total-1 ? "1px solid var(--abr)" : "none",
          background: open ? `${glowColor}07` : "transparent",
          transition:"background .2s",
          boxShadow: open ? `inset 3px 0 0 ${glowColor}` : "none",
        }}>
          {/* Fila principal — click para expandir */}
          <div className="admin-carta-row" onClick={()=>setOpen(v=>!v)} style={{
            display:"flex",alignItems:"center",gap:12,
            padding:"13px 16px",cursor:"pointer",userSelect:"none",
            opacity:p.active?1:.5,transition:"opacity .3s",
          }}>
            {p.foto_url ? (
              <img className="admin-carta-img" src={p.foto_url} alt={p.name}
                style={{width:40,height:40,borderRadius:8,objectFit:"cover",flexShrink:0}}
                onError={e=>{e.target.style.display="none";}}/>
            ) : (
              <span style={{fontSize:22,flexShrink:0}}>{p.emoji}</span>
            )}
            <Dot color={activeColor} pulse={p.active&&!p.sin_stock}/>
            <div style={{flex:1,minWidth:0}}>
              <p className="admin-carta-name" style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,
                fontSize:14,color:"var(--abri)",lineHeight:1.2}}>{p.name}
                {p.sin_stock && (
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                    color:"var(--aam)",background:"rgba(255,176,32,.1)",
                    border:"1px solid rgba(255,176,32,.3)",borderRadius:4,
                    padding:"1px 5px",marginLeft:6,verticalAlign:"middle"}}>
                    SIN STOCK
                  </span>
                )}
              </p>
              <p className="admin-carta-price" style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                color:"var(--ag)",marginTop:2}}>$ {fmt(p.price)}</p>
            </div>
            <span style={{
              color:"var(--am)",fontSize:10,lineHeight:1,
              display:"inline-block",
              transition:"transform .25s",
              transform:open?"rotate(180deg)":"rotate(0deg)",
            }}>▼</span>
          </div>
          {/* Panel expandido */}
          {open && (
            <div style={{padding:"0 16px 14px",display:"flex",gap:10,flexWrap:"wrap",
              borderTop:`1px solid ${glowColor}22`}}>
              {p.desc && (
                <p style={{width:"100%",fontFamily:"'DM Sans',sans-serif",fontSize:12,
                  color:"var(--at)",lineHeight:1.5,marginBottom:6,marginTop:8}}>
                  {p.desc}
                </p>
              )}
              {/* Sin stock toggle */}
              <button onClick={async e=>{
                e.stopPropagation();
                const next = !p.sin_stock;
                setProds(ps=>ps.map(x=>x.id===p.id?{...x,sin_stock:next}:x));
                if(supabase) await supabase.from("productos").update({sin_stock:next}).eq("id",p.id);
                toast(next?`"${p.name}" marcado sin stock`:`"${p.name}" con stock`);
              }} style={{
                background:p.sin_stock?"rgba(255,176,32,.15)":"var(--as)",
                border:`1px solid ${p.sin_stock?"rgba(255,176,32,.4)":"var(--abr)"}`,
                borderRadius:8,padding:"7px 12px",cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
                color:p.sin_stock?"var(--aam)":"var(--am)",letterSpacing:.5,
                flexShrink:0}}>
                {p.sin_stock?"✓ SIN STOCK":"● STOCK OK"}
              </button>
              {/* Visibilidad toggle */}
              <div style={{display:"flex",alignItems:"center",gap:8,
                background:"var(--as)",border:"1px solid var(--abr)",
                borderRadius:8,padding:"7px 12px"}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                  color:"var(--am)",letterSpacing:.5}}>
                  {p.active?"VISIBLE":"OCULTO"}
                </span>
                <ToggleA on={p.active} onChange={()=>{
                  setProds(ps=>ps.map(x=>x.id===p.id?{...x,active:!x.active}:x));
                  toast(p.active?`"${p.name}" ocultado`:`"${p.name}" visible`);
                }}/>
              </div>
            </div>
          )}
        </div>
      );
    };

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
          Tocá un producto para ver opciones. Para editar usá <b style={{color:"var(--abri)"}}>Gestión</b>.
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
        <div className="admin-carta-list" style={{background:"var(--ac)",border:"1px solid var(--abr)",
          borderRadius:16,overflow:"hidden"}}>
          {visProds.length===0 && (
            <div style={{padding:"30px",textAlign:"center",color:"var(--am)"}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>
                Sin productos — agregá desde Gestión
              </p>
            </div>
          )}
          {visProds.map((p,i)=>(
            <ProdCard key={p.id} p={p} i={i} total={visProds.length}/>
          ))}
        </div>
      </div>
    );
  };

  /* QRTab movido a nivel de módulo como QRTabComp — ver arriba de AdminApp */

  /* ══════════════════════════════════════════
     CAJA TAB
  ══════════════════════════════════════════ */
  /* ── Modal movimientos de caja ── */
  const MovModal = () => (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"var(--as)",border:"1px solid var(--abr)",
        borderRadius:18,padding:24,width:"100%",maxWidth:340}}>
        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,
          color:"var(--abri)",letterSpacing:1.5,marginBottom:16,textAlign:"center"}}>
          MOVIMIENTO DE CAJA
        </p>
        {/* Tipo ingreso/egreso */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["ingreso","egreso"].map(t=>(
            <button key={t} onClick={()=>setMovTipo(t)} style={{
              flex:1,padding:"10px",borderRadius:10,cursor:"pointer",
              fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,
              letterSpacing:1,textTransform:"uppercase",
              background:movTipo===t
                ?(t==="ingreso"?"rgba(0,255,136,.15)":"rgba(255,59,92,.15)")
                :"var(--ac)",
              color:movTipo===t
                ?(t==="ingreso"?"var(--ag)":"var(--ar)")
                :"var(--am)",
              border:`1px solid ${movTipo===t
                ?(t==="ingreso"?"rgba(0,255,136,.4)":"rgba(255,59,92,.4)")
                :"var(--abr)"}`}}>
              {t==="ingreso"?"↑ Ingreso":"↓ Egreso / Gasto"}
            </button>
          ))}
        </div>
        {/* Monto */}
        <ALbl>Monto ($)</ALbl>
        <input type="number" value={movMonto} onChange={e=>setMovMonto(e.target.value)}
          placeholder="0" autoFocus
          style={{width:"100%",background:"var(--ab)",border:"1px solid var(--abr)",
            borderRadius:9,padding:"12px 14px",color:"var(--abri)",
            fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:700,
            marginBottom:12,boxSizing:"border-box"}}/>
        {/* Descripción */}
        <ALbl>Descripción</ALbl>
        <input value={movDesc} onChange={e=>setMovDesc(e.target.value)}
          placeholder="Ej: Pago proveedor, retiro efectivo, fondo..."
          style={{width:"100%",background:"var(--ab)",border:"1px solid var(--abr)",
            borderRadius:9,padding:"12px 14px",color:"var(--abri)",
            fontFamily:"'DM Sans',sans-serif",fontSize:13,
            marginBottom:20,boxSizing:"border-box"}}/>
        {/* Botones */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>{setShowMovModal(false);setMovMonto("");setMovDesc("");}}
            style={{flex:1,padding:12,borderRadius:10,background:"var(--ac)",
              border:"1px solid var(--abr)",color:"var(--am)",cursor:"pointer",
              fontFamily:"'IBM Plex Mono',monospace",fontSize:10}}>CANCELAR</button>
          <button onClick={()=>{
            const m=Number(movMonto);
            if(!m||m<=0){toast("Ingresá un monto válido");return;}
            const mv={id:Date.now(),tipo:movTipo,monto:m,
              desc:movDesc.trim()||(movTipo==="ingreso"?"Ingreso manual":"Egreso/Gasto"),
              hora:nowStr()};
            setCajaMov(prev=>[...prev,mv]);
            setShowMovModal(false);setMovMonto("");setMovDesc("");
            toast(`${movTipo==="ingreso"?"Ingreso":"Egreso"} de $${fmt(m)} registrado ✓`);
          }} style={{flex:1,padding:12,borderRadius:10,border:"none",cursor:"pointer",
            fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:1,
            background:movTipo==="ingreso"?"var(--ag)":"var(--ar)",
            color:movTipo==="ingreso"?"#000":"#fff"}}>
            ✓ GUARDAR
          </button>
        </div>
      </div>
    </div>
  );

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
      <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 56px)",overflow:"hidden"}}>

        {/* ══ HEADER BAR ══ */}
        <div style={{
          display:"flex",alignItems:"center",gap:10,padding:"8px 14px",
          background:"var(--ab)",borderBottom:"1px solid var(--abr)",flexShrink:0}}>
          {/* Turno status */}
          <div style={{
            display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
            <div style={{
              width:8,height:8,borderRadius:"50%",flexShrink:0,
              background:turno?"#00FF88":"#ff3b5c",
              boxShadow:turno?"0 0 6px #00FF88":"0 0 6px #ff3b5c"}}>
            </div>
            {turno ? (
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                color:"var(--am)",letterSpacing:.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {turno.cajero} · desde {turno.horaApertura}
              </span>
            ) : (
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--ar)"}}>
                Caja cerrada
              </span>
            )}
          </div>
          {/* X / Z buttons */}
          {turno && (
            <div style={{display:"flex",gap:5,flexShrink:0}}>
              <button onClick={()=>setShowMovModal(true)} className="pr"
                style={{background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.35)",
                  borderRadius:7,padding:"5px 10px",cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:800,
                  color:"rgba(139,92,246,1)"}}>± MOV</button>
              <button onClick={()=>setTkt({tipo:"X",turno:{...turno}})} className="pr"
                style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",
                  borderRadius:7,padding:"5px 10px",cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:800,
                  color:"var(--aam)"}}>Reporte X</button>
              <button onClick={()=>{setArqV(emptyArq());setArqCi(true);}} className="pr"
                style={{background:"rgba(255,59,92,.07)",border:"1px solid rgba(255,59,92,.3)",
                  borderRadius:7,padding:"5px 10px",cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:800,
                  color:"var(--ar)"}}>Cierre Z</button>
            </div>
          )}
          <button onClick={()=>setShowVentaRapida(true)} className="pr" style={{
            background:"var(--ag)",color:"#FFFFFF",border:"none",borderRadius:8,
            padding:"7px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
            fontWeight:800,cursor:"pointer",flexShrink:0,
            display:"flex",alignItems:"center",gap:5}}>
            ⚡ NUEVA VENTA
          </button>
        </div>

        {/* ══ MAIN: abrir turno si no hay ══ */}
        {!turno ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <div style={{width:"100%",maxWidth:360,background:"var(--ac)",
              border:"1px solid var(--abr)",borderRadius:18,padding:24}}>
              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,
                color:"var(--am)",letterSpacing:2,marginBottom:16,textAlign:"center"}}>
                ABRIR TURNO
              </p>
              <ALbl>Cajero responsable</ALbl>
              <input value={cajero} onChange={e=>setCajero(e.target.value)}
                placeholder="Nombre del cajero..."
                style={{width:"100%",background:"var(--ab)",border:"1px solid var(--abr)",
                  borderRadius:9,padding:"12px 14px",color:"var(--abri)",
                  fontFamily:"'Outfit',sans-serif",fontSize:14,marginBottom:14}}/>
              <button onClick={()=>{setArqV(emptyArq());setArqAp(true);}} className="pr"
                style={{width:"100%",background:"var(--ag)",color:"#FFFFFF",border:"none",
                  borderRadius:12,padding:15,fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
                ▶ ABRIR TURNO
              </button>
            </div>
          </div>
        ) : (
          /* ══ POS: 2-column layout ══ */
          <div style={{flex:1,display:"flex",overflow:"hidden",gap:0}}>

            {/* ── LEFT: products ── */}
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",
              borderRight:"1px solid var(--abr)"}}>

              {/* Category tabs */}
              <div style={{
                display:"flex",gap:6,padding:"10px 12px",
                overflowX:"auto",flexShrink:0,
                borderBottom:"1px solid var(--abr)",
                background:"var(--ab)"}}>
                {/* Tipo: mostrador / mesa */}
                <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,
                  marginRight:8,paddingRight:8,borderRight:"1px solid var(--abr)"}}>
                  {["mostrador","mesa"].map(t=>(
                    <button key={t} onClick={()=>setCajaMesaTipo(t)} style={{
                      padding:"6px 12px",borderRadius:7,cursor:"pointer",
                      fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
                      letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap",
                      background:cajaMesaTipo===t?"var(--abl)":"var(--as)",
                      color:cajaMesaTipo===t?"#fff":"var(--ad)",
                      border:`1px solid ${cajaMesaTipo===t?"var(--abl)":"var(--abr)"}`}}>{t}</button>
                  ))}
                  {cajaMesaTipo==="mesa" && (
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <button onClick={()=>setCajaMesaNum(n=>Math.max(1,n-1))}
                        style={{width:24,height:24,borderRadius:6,border:"1px solid var(--abr)",
                          background:"var(--as)",color:"var(--abri)",fontSize:13,cursor:"pointer"}}>−</button>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,
                        color:"var(--abri)",minWidth:20,textAlign:"center"}}>{cajaMesaNum}</span>
                      <button onClick={()=>setCajaMesaNum(n=>n+1)}
                        style={{width:24,height:24,borderRadius:6,border:"1px solid var(--abr)",
                          background:"var(--as)",color:"var(--abri)",fontSize:13,cursor:"pointer"}}>+</button>
                    </div>
                  )}
                </div>
                {/* Category buttons */}
                {catList.map(cat=>{
                  const isSel = (cajaOpenCat||catList[0]?.id)===cat.id;
                  const catQty = prods.filter(p=>p.active&&p.cat===cat.id)
                    .reduce((s,p)=>s+(cajaCart[p.id]?.qty||0),0);
                  return (
                    <button key={cat.id} onClick={()=>setCajaOpenCat(cat.id)}
                      style={{
                        display:"flex",alignItems:"center",gap:6,
                        padding:"7px 14px",borderRadius:9,cursor:"pointer",flexShrink:0,
                        background:isSel?"var(--abl)":"var(--as)",
                        border:`1px solid ${isSel?"var(--abl)":"var(--abr)"}`,
                        color:isSel?"#fff":"var(--at)",
                        fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,
                        transition:"all .15s",position:"relative"}}>
                      <span style={{fontSize:16}}>{cat.icon||"🍽️"}</span>
                      <span>{cat.label}</span>
                      {catQty>0 && (
                        <span style={{background:"#fff",color:"var(--abl)",borderRadius:6,
                          padding:"1px 6px",fontFamily:"'IBM Plex Mono',monospace",
                          fontSize:10,fontWeight:800,marginLeft:2}}>{catQty}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Product grid */}
              <div style={{flex:1,overflowY:"auto",padding:12,
                display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
                gap:10,alignContent:"start"}}>
                {(()=>{
                  const activeCat = cajaOpenCat || catList[0]?.id;
                  const catProds = prods.filter(p=>p.active && p.cat===activeCat);
                  if(catProds.length===0) return (
                    <div style={{gridColumn:"1/-1",padding:40,textAlign:"center"}}>
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--am)"}}>
                        Sin productos en esta categoría
                      </p>
                    </div>
                  );
                  return catProds.map(p=>{
                    const qty = cajaCart[p.id]?.qty||0;
                    return (
                      <div key={p.id} onClick={()=>cajaAdd(p)}
                        style={{
                          background:"var(--ac)",
                          border:`2px solid ${qty>0?"var(--abl)":"var(--abr)"}`,
                          borderRadius:14,padding:"16px 14px",cursor:"pointer",
                          display:"flex",flexDirection:"column",gap:6,
                          transition:"all .15s",position:"relative",
                          boxShadow:qty>0?"0 0 12px rgba(59,130,246,.2)":"none"}}>
                        {/* Foto o emoji */}
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.name}
                            style={{width:"100%",height:90,objectFit:"cover",
                              borderRadius:8,marginBottom:4}}/>
                        ) : (
                          <div style={{width:"100%",height:64,display:"flex",
                            alignItems:"center",justifyContent:"center",fontSize:36}}>
                            {p.emoji||"🍽️"}
                          </div>
                        )}
                        <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,
                          color:"var(--abri)",lineHeight:1.2,margin:0}}>{p.name}</p>
                        <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,
                          fontWeight:700,color:"var(--ag)",margin:0}}>${fmt(p.price)}</p>
                        {/* Qty controls */}
                        {qty>0 && (
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}
                            onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>cajaSub(p)}
                              style={{width:30,height:30,borderRadius:8,
                                border:"1px solid var(--abr)",background:"var(--as)",
                                color:"var(--abri)",fontSize:18,cursor:"pointer",
                                display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,
                              fontWeight:700,color:"var(--abri)",minWidth:22,textAlign:"center"}}>
                              {qty}
                            </span>
                            <button onClick={()=>cajaAdd(p)}
                              style={{width:30,height:30,borderRadius:8,
                                border:"1px solid var(--abl)",background:"var(--abl)",
                                color:"#fff",fontSize:18,cursor:"pointer",
                                display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* ── RIGHT: ticket panel ── */}
            <div style={{width:300,flexShrink:0,display:"flex",flexDirection:"column",
              background:"var(--ab)",overflow:"hidden"}}>

              {/* Ticket items */}
              <div style={{flex:1,overflowY:"auto",padding:"12px 12px 0"}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                  color:"var(--am)",letterSpacing:2,marginBottom:10}}>TICKET</p>
                {Object.values(cajaCart).filter(i=>i.qty>0).length===0 ? (
                  <div style={{textAlign:"center",padding:"40px 0",color:"var(--am)"}}>
                    <p style={{fontSize:32,marginBottom:8}}>🧾</p>
                    <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10}}>
                      Seleccioná productos
                    </p>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {Object.values(cajaCart).filter(i=>i.qty>0).map(i=>(
                      <div key={i.id} style={{
                        display:"flex",alignItems:"center",gap:8,
                        background:"var(--ac)",borderRadius:10,padding:"8px 10px"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,
                            color:"var(--abri)",margin:0,overflow:"hidden",
                            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.name}</p>
                          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                            color:"var(--am)",margin:0}}>{i.qty} × ${fmt(i.price)}</p>
                        </div>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,
                          fontWeight:700,color:"var(--abri)",flexShrink:0}}>${fmt(i.price*i.qty)}</span>
                        <button onClick={()=>cajaSub(i)}
                          style={{width:22,height:22,borderRadius:6,
                            background:"var(--as)",color:"var(--abri)",
                            border:"1px solid var(--abr)",
                            fontSize:16,cursor:"pointer",flexShrink:0,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                        <button onClick={()=>setCajaCart(c=>{const n={...c};delete n[i.id];return n;})}
                          style={{width:22,height:22,borderRadius:6,border:"none",
                            background:"rgba(255,59,92,.12)",color:"var(--ar)",
                            fontSize:14,cursor:"pointer",flexShrink:0,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumen turno (compacto) */}
              {Object.values(cajaCart).filter(i=>i.qty>0).length===0 && (
                <div style={{padding:"10px 12px",borderTop:"1px solid var(--abr)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                      color:"var(--am)",letterSpacing:1}}>TOTAL TURNO</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,
                      fontWeight:700,color:"var(--ag)"}}>${fmt(Object.values(makeVentas()).reduce((s,v)=>s+v,0))}</span>
                  </div>
                  {[["Efectivo",makeVentas().efectivo],["Mercado Pago",makeVentas().mercadopago],
                    ["Débito",makeVentas().debito],["Transf.",makeVentas().transferencia]].map(([l,v])=>
                    v>0 ? (
                      <div key={l} style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--at)"}}>{l}</span>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--abri)"}}>${fmt(v)}</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* Total + pago + cobrar */}
              {Object.values(cajaCart).filter(i=>i.qty>0).length>0 && (
                <div style={{borderTop:"1px solid var(--abr)",flexShrink:0}}>
                  {/* Total */}
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",padding:"12px 14px",
                    borderBottom:"1px solid var(--abr)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                        fontWeight:700,color:"var(--am)",letterSpacing:1}}>TOTAL</span>
                      {cajaTotal>0 && (
                        <button onClick={()=>{setCajaCart({});setCajaPay(null);setCajaPay2(null);setCajaSplitAmt("");setCajaSplitAmt2("");setCajaDescPct(0);}}
                          style={{background:"none",border:"none",color:"var(--ar)",
                            fontSize:10,cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",
                            letterSpacing:.5}}>limpiar ×</button>
                      )}
                    </div>
                    <div style={{textAlign:"right"}}>
                      {cajaDescPct>0 && (
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                          color:"var(--ar)",textDecoration:"line-through",marginBottom:2}}>
                          ${fmt(cajaRawTotal)}
                        </div>
                      )}
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:26,
                        fontWeight:700,color:"var(--ag)"}}>${fmt(cajaTotal)}</span>
                      {cajaDescPct>0 && (
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                          color:"rgba(0,255,136,.7)",marginTop:1}}>-{cajaDescPct}% aplicado</div>
                      )}
                    </div>
                  </div>
                  {/* Precio especial + Descuento */}
                  <div style={{padding:"8px 12px",display:"flex",gap:7,borderBottom:"1px solid var(--abr)"}}>
                    <button onClick={()=>{setPrecioName("");setPrecioAmt("");setShowPrecioModal(true);}} style={{
                      flex:1,padding:"9px 6px",borderRadius:9,border:"1px solid var(--abl)",
                      background:"rgba(61,142,255,.08)",color:"var(--abl)",cursor:"pointer",
                      fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:.3}}>
                      💲 Precio especial
                    </button>
                    <button onClick={()=>setShowDescModal(true)} style={{
                      flex:1,padding:"9px 6px",borderRadius:9,
                      border:`1px solid ${cajaDescPct>0?"var(--ag)":"var(--abr)"}`,
                      background:cajaDescPct>0?"rgba(0,255,136,.08)":"var(--as)",
                      color:cajaDescPct>0?"var(--ag)":"var(--abri)",cursor:"pointer",
                      fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:.3}}>
                      {cajaDescPct>0?`🏷 -${cajaDescPct}% desc.`:"🏷 Descuento"}
                    </button>
                  </div>
                  {/* Método de pago */}
                  <div style={{padding:"10px 12px",borderBottom:"1px solid var(--abr)"}}>
                    {(()=>{
                      const CPAYS=[{id:"cash",label:"Efectivo",icon:"💵"},{id:"mp",label:"Mercado Pago",icon:"📲"},{id:"card",label:"Débito",icon:"💳"},{id:"trans",label:"Transf.",icon:"🏦"}];
                      const splitMode = !!cajaPay2;
                      const splitResto = cajaTotal - Number(cajaSplitAmt||0);
                      return (<>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",letterSpacing:1.5,margin:0}}>MÉTODO DE PAGO</p>
                          <button onClick={()=>{if(splitMode){setCajaPay2(null);setCajaSplitAmt("");setCajaSplitAmt2("");}else{setCajaPay2("pending");}}} style={{background:"none",border:"none",color:splitMode?"var(--ar)":"var(--abl)",fontSize:10,cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:.5}}>
                            {splitMode?"✕ cancelar mixto":"÷ pago mixto"}
                          </button>
                        </div>
                        {!splitMode ? (
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                            {CPAYS.map(p=>(
                              <button key={p.id} onClick={()=>setCajaPay(p.id)} className="pr" style={{padding:"9px 8px",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,background:cajaPay===p.id?"var(--abl)":"var(--as)",color:cajaPay===p.id?"#fff":"var(--abri)",border:`1px solid ${cajaPay===p.id?"var(--abl)":"var(--abr)"}`,transition:"all .15s"}}>
                                <span style={{fontSize:15}}>{p.icon}</span><span>{p.label}</span>
                                {cajaPay===p.id && <span style={{marginLeft:"auto",fontSize:11}}>✓</span>}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            <div style={{background:"var(--ac)",borderRadius:10,padding:"10px 12px"}}>
                              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",letterSpacing:1,marginBottom:6}}>MÉTODO 1</p>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
                                {CPAYS.map(p=>(
                                  <button key={p.id} onClick={()=>setCajaPay(p.id)} style={{padding:"7px 6px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:600,background:cajaPay===p.id?"var(--abl)":"var(--as)",color:cajaPay===p.id?"#fff":"var(--abri)",border:`1px solid ${cajaPay===p.id?"var(--abl)":"var(--abr)"}`}}>
                                    <span style={{fontSize:13}}>{p.icon}</span><span>{p.label}</span>
                                  </button>
                                ))}
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:"var(--am)"}}>$</span>
                                <input type="number" value={cajaSplitAmt} onChange={e=>{setCajaSplitAmt(e.target.value);const r=cajaTotal-Number(e.target.value||0);if(r>=0)setCajaSplitAmt2(String(r));}}
                                  placeholder={String(Math.ceil(cajaTotal/2))}
                                  style={{flex:1,background:"var(--as)",border:"1px solid var(--abr)",borderRadius:8,padding:"7px 10px",color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,outline:"none"}}/>
                                <button onClick={()=>{const h=Math.ceil(cajaTotal/2);setCajaSplitAmt(String(h));setCajaSplitAmt2(String(cajaTotal-h));}} style={{background:"var(--abl)",border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>50/50</button>
                              </div>
                            </div>
                            <div style={{background:"var(--ac)",borderRadius:10,padding:"10px 12px"}}>
                              <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",letterSpacing:1,marginBottom:6}}>MÉTODO 2</p>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
                                {CPAYS.map(p=>(
                                  <button key={p.id} onClick={()=>setCajaPay2(p.id)} style={{padding:"7px 6px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:600,background:cajaPay2===p.id?"var(--abl)":"var(--as)",color:cajaPay2===p.id?"#fff":"var(--abri)",border:`1px solid ${cajaPay2===p.id?"var(--abl)":"var(--abr)"}`}}>
                                    <span style={{fontSize:13}}>{p.icon}</span><span>{p.label}</span>
                                  </button>
                                ))}
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:"var(--am)"}}>$</span>
                                <input type="number" value={cajaSplitAmt2} onChange={e=>setCajaSplitAmt2(e.target.value)}
                                  placeholder={String(Math.max(0,cajaTotal-Number(cajaSplitAmt||0)))}
                                  style={{flex:1,background:"var(--as)",border:"1px solid var(--abr)",borderRadius:8,padding:"7px 10px",color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,outline:"none"}}/>
                              </div>
                            </div>
                            {(cajaSplitAmt||cajaSplitAmt2)&&(()=>{const a1=Number(cajaSplitAmt||0),a2=Number(cajaSplitAmt2||0),diff=cajaTotal-(a1+a2);return(<div style={{background:diff===0?"rgba(0,255,136,.08)":"rgba(255,176,32,.08)",border:`1px solid ${diff===0?"rgba(0,255,136,.3)":"rgba(255,176,32,.3)"}`,borderRadius:8,padding:"8px 10px",display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:diff===0?"var(--ag)":"#FFB020"}}>{diff===0?"✓ Balanceado":diff>0?`Falta: $${fmt(diff)}`:`Excede: $${fmt(Math.abs(diff))}`}</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,color:diff===0?"var(--ag)":"#FFB020"}}>Total: ${fmt(cajaTotal)}</span></div>);})()}
                          </div>
                        )}
                      </>);
                    })()}
                  </div>
                  {/* Cobrar buttons */}
                  <div style={{padding:"10px 12px",display:"flex",gap:7}}>
                    {(()=>{const cajaReady=cajaPay&&cajaPay2!=="pending";return(<>
                    <button onClick={()=>cajaConfirm(true)} disabled={!cajaReady||cajaLoading}
                      className="pr"
                      style={{flex:1,padding:"11px 6px",borderRadius:10,
                        cursor:cajaReady?"pointer":"not-allowed",
                        background:"var(--as)",color:cajaReady?"var(--abri)":"var(--am)",
                        border:"1px solid var(--abr)",fontFamily:"'Outfit',sans-serif",
                        fontSize:11,fontWeight:700,display:"flex",alignItems:"center",
                        justifyContent:"center",gap:4,opacity:cajaLoading?.7:1}}>
                      🖨️ + imprimir
                    </button>
                    <button onClick={()=>cajaConfirm(false)} disabled={!cajaReady||cajaLoading}
                      className="pr"
                      style={{flex:1.4,padding:"11px 6px",borderRadius:10,
                        cursor:cajaReady?"pointer":"not-allowed",
                        background:cajaReady?"linear-gradient(135deg,#00FF88,#00C870)":"var(--ac)",
                        color:cajaReady?"#060810":"var(--am)",border:"none",
                        fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:800,
                        opacity:cajaLoading?.7:1}}>
                      {cajaLoading?"Guardando...":"✓ Cobrar"}
                    </button></>);})()}
                  </div>
                </div>
              )}

              {/* Historial de turnos (compacto) */}
              {histTurnos.length>0 && Object.values(cajaCart).filter(i=>i.qty>0).length===0 && (
                <div style={{borderTop:"1px solid var(--abr)",padding:"10px 12px",overflowY:"auto"}}>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                    color:"var(--am)",letterSpacing:1.5,marginBottom:8}}>ÚLTIMOS TURNOS</p>
                  {histTurnos.slice(0,3).map((t,i)=>{
                    const htv=Object.values(t.ventas).reduce((s,v)=>s+v,0);
                    return (
                      <div key={t.id} onClick={()=>setTkt({tipo:"Z",turno:t})}
                        style={{display:"flex",justifyContent:"space-between",
                          alignItems:"center",padding:"6px 0",cursor:"pointer",
                          borderBottom:i<2?"1px solid var(--abr)":"none"}}>
                        <div>
                          <p style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,
                            fontSize:12,color:"var(--abri)",margin:0}}>
                            {t.cajero}
                          </p>
                          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                            color:"var(--ad)",margin:0}}>{t.horaApertura}</p>
                        </div>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,
                          fontSize:12,color:"var(--ag)"}}>${fmt(htv)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Movimientos de caja del turno actual */}
              {cajaMov.length>0 && Object.values(cajaCart).filter(i=>i.qty>0).length===0 && (
                <div style={{borderTop:"1px solid var(--abr)",padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                      color:"var(--am)",letterSpacing:1.5,margin:0}}>MOVIMIENTOS</p>
                    <div style={{display:"flex",gap:10}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--ag)"}}>
                        +${fmt(cajaMov.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.monto,0))}
                      </span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--ar)",marginLeft:8}}>
                        -${fmt(cajaMov.filter(m=>m.tipo==="egreso").reduce((s,m)=>s+m.monto,0))}
                      </span>
                    </div>
                  </div>
                  {cajaMov.map((m,i)=>(
                    <div key={m.id} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",padding:"5px 0",
                      borderBottom:i<cajaMov.length-1?"1px solid var(--abr)":"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                        <span style={{fontSize:12,flexShrink:0}}>{m.tipo==="ingreso"?"↑":"↓"}</span>
                        <div style={{minWidth:0}}>
                          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,
                            color:"var(--abri)",margin:0,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                            maxWidth:120}}>{m.desc}</p>
                          <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                            color:"var(--am)",margin:0}}>{m.hora}</p>
                        </div>
                      </div>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                        fontWeight:700,flexShrink:0,
                        color:m.tipo==="ingreso"?"var(--ag)":"var(--ar)"}}>
                        {m.tipo==="ingreso"?"+":"-"}${fmt(m.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Exportar CSV */}
              {orders.filter(o=>o.status==="entregado").length>0 && Object.values(cajaCart).filter(i=>i.qty>0).length===0 && (
                <div style={{padding:"8px 12px",borderTop:"1px solid var(--abr)",flexShrink:0}}>
                  <button onClick={()=>{
                    const hoy = new Date().toLocaleDateString("es-AR");
                    const rows = [["Hora","Mesa","Items","Total","Método","Propina"]];
                    orders.filter(o=>o.status==="entregado").forEach(o=>{
                      rows.push([o.time,o.table||"Mostrador",(o.items||[]).map(i=>`${i.qty}x ${i.name}`).join(" | "),o.total,o.pay||"",o.tip||0]);
                    });
                    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
                    const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
                    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                    a.download = `ventas_${hoy.replace(/\//g,"-")}.csv`; a.click();
                  }} style={{
                    width:"100%",background:"var(--as)",border:"1px solid var(--abr)",
                    borderRadius:9,padding:"8px",cursor:"pointer",
                    fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
                    color:"var(--at)",letterSpacing:.5}}>
                    ⬇ EXPORTAR CSV HOY
                  </button>
                </div>
              )}

              {/* Historial días anteriores */}
              <div style={{padding:"8px 12px",borderTop:"1px solid var(--abr)",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:histDate?8:0}}>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,
                    color:"var(--am)",letterSpacing:1.5,margin:0}}>HISTORIAL</p>
                  <input type="date"
                    value={histDate}
                    max={new Date(Date.now()-86400000).toISOString().slice(0,10)}
                    onChange={async e=>{
                      const d = e.target.value; setHistDate(d);
                      if(!d||!supabase||!local.restauranteId) return;
                      setHistLoading(true);
                      const {data} = await supabase.from("pedidos")
                        .select("*, pedido_items(*)")
                        .eq("restaurante_id", local.restauranteId)
                        .gte("created_at", d+"T00:00:00.000Z")
                        .lt("created_at",  d+"T23:59:59.999Z")
                        .order("created_at",{ascending:false});
                      setHistLoading(false);
                      setHistOrders((data||[]).map(p=>({
                        id:p.id, table:p.mesa_numero,
                        time:new Date(p.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}),
                        status:p.status,
                        items:(p.pedido_items||[]).map(i=>({name:i.nombre,qty:i.cantidad})),
                        total:p.total, pay:p.metodo_pago||"", tip:p.propina||0,
                      })));
                    }}
                    style={{background:"var(--as)",border:"1px solid var(--abr)",
                      borderRadius:6,padding:"4px 7px",color:"var(--abri)",
                      fontSize:10,fontFamily:"'IBM Plex Mono',monospace",cursor:"pointer"}}/>
                </div>
                {histDate && (
                  <div style={{maxHeight:160,overflowY:"auto"}}>
                    {histLoading ? (
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",textAlign:"center",padding:12}}>Cargando...</p>
                    ) : histOrders.length===0 ? (
                      <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",textAlign:"center",padding:12}}>Sin pedidos</p>
                    ) : (
                      <>
                        <div style={{display:"flex",gap:16,padding:"6px 0 8px",borderBottom:"1px solid var(--abr)"}}>
                          <div>
                            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,fontWeight:700,color:"var(--ag)",margin:0}}>
                              ${fmt(histOrders.filter(o=>o.status==="entregado").reduce((s,o)=>s+(o.total||0),0))}
                            </p>
                            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",margin:0}}>TOTAL</p>
                          </div>
                          <div>
                            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,fontWeight:700,color:"var(--abri)",margin:0}}>
                              {histOrders.filter(o=>o.status==="entregado").length}
                            </p>
                            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",margin:0}}>PEDIDOS</p>
                          </div>
                          <button onClick={()=>{
                            const rows=[["Hora","Mesa","Items","Total","Método","Propina"]];
                            histOrders.filter(o=>o.status==="entregado").forEach(o=>{rows.push([o.time,o.table||"Mostrador",(o.items||[]).map(i=>`${i.qty}x ${i.name}`).join(" | "),o.total,o.pay||"",o.tip||0]);});
                            const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
                            const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
                            const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ventas_${histDate}.csv`;a.click();
                          }} style={{marginLeft:"auto",background:"var(--as)",border:"1px solid var(--abr)",
                            borderRadius:6,padding:"4px 8px",cursor:"pointer",
                            fontFamily:"'IBM Plex Mono',monospace",fontSize:8,fontWeight:700,
                            color:"var(--at)"}}>⬇ CSV</button>
                        </div>
                        {histOrders.slice(0,8).map((o,i)=>(
                          <div key={o.id} style={{display:"flex",justifyContent:"space-between",
                            padding:"5px 0",borderBottom:i<Math.min(histOrders.length,8)-1?"1px solid var(--abr)":"none"}}>
                            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--at)"}}>
                              {o.time} · {o.table===0||o.table==="0"?"Mostr.":"Mesa "+o.table}
                            </span>
                            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                              fontWeight:600,color:o.status==="entregado"?"var(--abri)":"var(--am)"}}>
                              ${fmt(o.total||0)}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
          foto_url: form.foto_url||null,
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

          <GLbl>Foto del producto <span style={{color:"var(--gd)",fontWeight:400}}>(opcional)</span></GLbl>
          {/* Upload desde celular — dos botones separados para forzar elección en Android */}
          {(()=>{
            const uploadHandler = async (e) => {
              const file = e.target.files?.[0];
              if(!file || !supabase) return;
              e.target.value = "";
              toast("Subiendo...");
              const ext = file.name.split(".").pop();
              const path = `productos/${local.restauranteId}/${Date.now()}.${ext}`;
              const {error:upErr} = await supabase.storage.from("fotos").upload(path, file, {upsert:true});
              if(upErr){ toast("Error al subir: "+upErr.message,"err"); return; }
              const {data:{publicUrl}} = supabase.storage.from("fotos").getPublicUrl(path);
              setForm("foto_url", publicUrl);
              toast("Foto subida ✓");
            };
            return (
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  background:"rgba(99,102,241,.08)",border:"1px dashed rgba(99,102,241,.4)",
                  borderRadius:10,padding:"12px 10px",cursor:"pointer"}}>
                  <span style={{fontSize:18}}>📷</span>
                  <div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:700,color:"var(--gi2)"}}>Cámara</div>
                  </div>
                  <input type="file" accept="image/*" capture="environment"
                    style={{display:"none"}} onChange={uploadHandler}/>
                </label>
                <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  background:"rgba(99,102,241,.08)",border:"1px dashed rgba(99,102,241,.4)",
                  borderRadius:10,padding:"12px 10px",cursor:"pointer"}}>
                  <span style={{fontSize:18}}>🖼️</span>
                  <div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:700,color:"var(--gi2)"}}>Galería</div>
                  </div>
                  <input type="file" accept="image/*"
                    style={{display:"none"}} onChange={uploadHandler}/>
                </label>
              </div>
            );
          })()}
          {/* O pegar URL */}
          <div style={{display:"flex",alignItems:"center",background:"var(--gb)",
            border:"1px solid var(--gbr)",borderRadius:10,overflow:"hidden",
            marginBottom:form.foto_url?8:14}}>
            <span style={{padding:"0 10px",fontFamily:"'IBM Plex Mono',monospace",
              fontSize:11,color:"var(--gd)",borderRight:"1px solid var(--gbr)",
              height:42,display:"flex",alignItems:"center",flexShrink:0}}>🔗</span>
            <input value={form.foto_url||""} onChange={e=>setForm("foto_url",e.target.value)}
              placeholder="O pegar URL de imagen..."
              style={{flex:1,background:"none",border:"none",padding:"11px 12px",
                color:"var(--gbri)",fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}/>
            {form.foto_url && (
              <button onClick={()=>setForm("foto_url","")} style={{background:"none",border:"none",
                color:"var(--ar)",padding:"0 10px",cursor:"pointer",fontSize:14}}>✕</button>
            )}
          </div>
          {form.foto_url && (
            <div style={{marginBottom:14,borderRadius:10,overflow:"hidden",
              border:"1px solid var(--gbr)",maxHeight:100}}>
              <img src={form.foto_url} alt="preview"
                style={{width:"100%",height:100,objectFit:"cover",display:"block"}}
                onError={e=>{e.target.style.display="none";}}/>
            </div>
          )}

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
      return <CatModal local={local} cats={cats} setCats={setCats} setGModal={setGModal} toast={toast} onCreated={id=>setGActiveCat(id)} editData={gModal.editData}/>;
    }
        return null;
  };


  /* QR helper for WhatsApp tab — canvas directo, sin flicker */
  function QRImg({data, size=160, dark="#000", light="#fff"}) {
    const canvasRef = React.useRef(null);
    React.useEffect(()=>{
      if(!data||!QRCodeLib||!canvasRef.current) return;
      QRCodeLib.toCanvas(canvasRef.current,data,{width:size,margin:1,color:{dark,light}}).catch(()=>{});
    },[data,size,dark,light]);
    return <canvas ref={canvasRef} style={{width:size,height:size,borderRadius:8,background:light,display:'block'}}/>;
  }

  /* ── WhatsApp Tab ── */
  function WhatsAppTab() {
    const waNum = local.whatsapp_vitrina_numero || "";
    const active = !!local.feat_whatsapp_vitrina;
    const deliveryLink = `https://wa.me/${waNum}?text=${encodeURIComponent("Hola! Quiero hacer un pedido para DELIVERY 🛵")}`;
    const retiroLink   = `https://wa.me/${waNum}?text=${encodeURIComponent("Hola! Quiero hacer un pedido para RETIRAR en el local 🏪")}`;

    const save = async () => {
      if(local.restauranteId && supabase){
        const {error} = await supabase.from("restaurantes").update({
          config: {
            propina:                 local.propina,
            feat_solicitudes:        local.feat_solicitudes !== undefined ? local.feat_solicitudes : true,
            feat_promo10:            !!local.feat_promo10,
            happyHour:               local.happyHour,
            happyDesde:              local.happyDesde,
            happyHasta:              local.happyHasta,
            wifi_nombre:             local.wifi_nombre,
            wifi_pass:               local.wifi_pass,
            whatsapp:                local.whatsapp,
            whatsapp_msg:            local.whatsapp_msg,
            horarios:                local.horarios || {},
            feat_whatsapp_vitrina:   !!local.feat_whatsapp_vitrina,
            whatsapp_vitrina_numero: waNum,
            whatsapp_delivery:       !!local.whatsapp_delivery,
            whatsapp_retiro:         !!local.whatsapp_retiro,
          }
        }).eq("id", local.restauranteId);
        if(error) toast("Error: "+error.message,"err");
        else toast("✓ Cambios guardados");
      }
    };

    return (
      <div style={{padding:"18px 16px 80px"}}>
        <div style={{marginBottom:18}}>
          <ALbl>Pedidos externos</ALbl>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:"var(--abri)",display:"flex",alignItems:"center",gap:8}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.996 0C5.374 0 0 5.373 0 11.996c0 2.133.56 4.133 1.54 5.867L.047 23.53a.5.5 0 00.612.632l5.828-1.528A11.935 11.935 0 0011.996 24C18.619 24 24 18.619 24 11.996 24 5.373 18.619 0 11.996 0zm0 21.818a9.794 9.794 0 01-4.992-1.367l-.358-.212-3.718.975 1.002-3.618-.234-.372a9.794 9.794 0 01-1.518-5.228c0-5.419 4.409-9.818 9.818-9.818s9.818 4.399 9.818 9.818-4.399 9.822-9.818 9.822z"/></svg>
            WhatsApp
          </h2>
        </div>

        {/* Toggle + config */}
        <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,overflow:"hidden",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px"}}>
            <div>
              <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:"var(--abri)",marginBottom:3}}>📲 Recibir pedidos por WhatsApp</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)"}}>Delivery y retiro desde la vitrina del local</p>
            </div>
            <ToggleA on={active} onChange={()=>setLocal(l=>({...l,feat_whatsapp_vitrina:!l.feat_whatsapp_vitrina}))}/>
          </div>
          {active && (
            <div style={{padding:"0 18px 16px",borderTop:"1px solid var(--abr)"}}>
              <div style={{marginTop:12}}>
                <GInput label="Número de WhatsApp (con código de país, sin +)"
                  value={waNum} onChange={v=>setLocal(l=>({...l,whatsapp_vitrina_numero:v}))}
                  placeholder="5491112345678" prefix="+"/>
              </div>
              <div style={{marginTop:12}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ad)",marginBottom:10}}>Tipos de pedido</p>
                {[
                  {k:"whatsapp_delivery",icon:"🛵",label:"Delivery",sub:"Envío a domicilio"},
                  {k:"whatsapp_retiro",  icon:"🏪",label:"Retiro en local",sub:"El cliente pasa a buscar"},
                ].map(op=>(
                  <div key={op.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"12px 0",borderBottom:"1px solid var(--abr)"}}>
                    <div>
                      <p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,color:"var(--abri)",marginBottom:2}}>{op.icon} {op.label}</p>
                      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)"}}>{op.sub}</p>
                    </div>
                    <ToggleA on={local[op.k]} onChange={()=>setLocal(l=>({...l,[op.k]:!l[op.k]}))}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        {active && waNum && (local.whatsapp_delivery||local.whatsapp_retiro) && (
          <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:18,marginBottom:12}}>
            <ALbl>Preview — así lo ve el cliente en la vitrina</ALbl>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
              {local.whatsapp_delivery && (
                <div style={{display:"flex",alignItems:"center",gap:12,background:"#25D366",
                  borderRadius:12,padding:"14px 16px"}}>
                  <span style={{fontSize:20}}>🛵</span>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,color:"#fff"}}>Pedir con delivery</span>
                </div>
              )}
              {local.whatsapp_retiro && (
                <div style={{display:"flex",alignItems:"center",gap:12,
                  background:"rgba(37,211,102,.12)",border:"1px solid rgba(37,211,102,.35)",
                  borderRadius:12,padding:"14px 16px"}}>
                  <span style={{fontSize:20}}>🏪</span>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,color:"#25D366"}}>Retirar en el local</span>
                </div>
              )}
            </div>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"var(--ad)",marginTop:10}}>
              Al tocar, se abre WhatsApp con el mensaje listo para enviar
            </p>
          </div>
        )}

        {/* QRs para compartir */}
        {active && waNum && (local.whatsapp_delivery||local.whatsapp_retiro) && (
          <div style={{background:"var(--ac)",border:"1px solid var(--abr)",borderRadius:16,padding:18,marginBottom:12}}>
            <ALbl>QRs para flyers y puerta del local</ALbl>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)",marginBottom:14,marginTop:4}}>
              El cliente escanea y le llega el WhatsApp listo para pedir
            </p>
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              {local.whatsapp_delivery && (
                <div style={{textAlign:"center"}}>
                  <QRImg data={deliveryLink} size={130} dark="#25D366" light="#0D1117"/>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#25D366",letterSpacing:1,marginTop:8}}>DELIVERY 🛵</p>
                </div>
              )}
              {local.whatsapp_retiro && (
                <div style={{textAlign:"center"}}>
                  <QRImg data={retiroLink} size={130} dark="#25D366" light="#0D1117"/>
                  <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#25D366",letterSpacing:1,marginTop:8}}>RETIRO 🏪</p>
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={save} style={{width:"100%",background:"#25D366",color:"#fff",
          border:"none",borderRadius:12,padding:14,
          fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8}}>
          Guardar cambios
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     RENDER PRINCIPAL DEL ADMIN
  ══════════════════════════════════════════ */
  return (
    <div className="admin-wrap" style={{maxWidth:700,margin:"0 auto",minHeight:"100vh",
      background:"var(--ab)",position:"relative",paddingTop:"env(safe-area-inset-top,0px)"}}>
      <GS/>
      {/* ── Descuento modal ───────────────────────────────────── */}
      {showDescModal && (
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.8)",
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowDescModal(false);}}>
          <div style={{background:"var(--ab)",borderRadius:"20px 20px 0 0",
            padding:"24px 20px 40px",width:"100%",maxWidth:480}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
              color:"var(--am)",letterSpacing:1.5,marginBottom:6}}>DESCUENTO</p>
            <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,
              color:"var(--abri)",marginBottom:16}}>¿Cuánto de descuento?</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[5,10,15,20,25,30].map(pct=>(
                <button key={pct} onClick={()=>{setCajaDescPct(pct);setShowDescModal(false);}} style={{
                  padding:"14px 0",borderRadius:12,cursor:"pointer",
                  fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:800,
                  background:cajaDescPct===pct?"var(--abl)":"var(--ac)",
                  color:cajaDescPct===pct?"#fff":"var(--abri)",
                  border:`1.5px solid ${cajaDescPct===pct?"var(--abl)":"var(--abr)"}`}}>
                  {pct}%
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input type="number" min="1" max="99"
                placeholder="% personalizado"
                onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){setCajaDescPct(Math.min(99,Math.max(1,Number(e.target.value))));setShowDescModal(false);}}}
                style={{flex:1,padding:"11px 12px",borderRadius:10,border:"1px solid var(--abr)",
                  background:"var(--ac)",color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:15,outline:"none"}}/>
              <button onClick={e=>{const inp=e.target.previousSibling?.value||e.target.parentNode?.querySelector("input")?.value;if(inp){setCajaDescPct(Math.min(99,Math.max(1,Number(inp))));setShowDescModal(false);}}} style={{
                padding:"11px 18px",borderRadius:10,background:"var(--abl)",
                border:"none",color:"#fff",fontFamily:"'Outfit',sans-serif",
                fontSize:14,fontWeight:700,cursor:"pointer"}}>OK</button>
            </div>
            {cajaDescPct>0 && (
              <button onClick={()=>{setCajaDescPct(0);setShowDescModal(false);}} style={{
                width:"100%",padding:"11px",borderRadius:10,
                border:"1px solid rgba(255,59,92,.4)",background:"rgba(255,59,92,.08)",
                color:"var(--ar)",fontFamily:"'Outfit',sans-serif",
                fontSize:14,fontWeight:700,cursor:"pointer"}}>
                Quitar descuento
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Precio especial modal ───────────────────────────────── */}
      {showPrecioModal && (
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.8)",
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowPrecioModal(false);}}>
          <div style={{background:"var(--ab)",borderRadius:"20px 20px 0 0",
            padding:"24px 20px 40px",width:"100%",maxWidth:480}}>
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
              color:"var(--am)",letterSpacing:1.5,marginBottom:6}}>PRECIO ESPECIAL</p>
            <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,
              color:"var(--abri)",marginBottom:16}}>Agregar item manual</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
              <input value={precioName} onChange={e=>setPrecioName(e.target.value)}
                placeholder="Descripción (ej: Café con leche)"
                style={{padding:"11px 12px",borderRadius:10,border:"1px solid var(--abr)",
                  background:"var(--ac)",color:"var(--abri)",fontFamily:"'DM Sans',sans-serif",
                  fontSize:14,outline:"none"}}/>
              <input type="number" value={precioAmt} onChange={e=>setPrecioAmt(e.target.value)}
                placeholder="Precio $"
                style={{padding:"11px 12px",borderRadius:10,border:"1px solid var(--abr)",
                  background:"var(--ac)",color:"var(--abri)",fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:16,outline:"none"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowPrecioModal(false)} style={{
                flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--abr)",
                background:"var(--ac)",color:"var(--ad)",
                fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={()=>{
                const name=precioName.trim()||"Precio especial";
                const price=Math.max(0,Number(precioAmt)||0);
                const id="custom_"+Date.now();
                setCajaCart(c=>({...c,[id]:{id,name,price,qty:1}}));
                setShowPrecioModal(false);
              }} style={{
                flex:1.5,padding:"12px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,var(--abl),#5B8DEF)",
                color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:800,cursor:"pointer"}}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {ticketPreview && (
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.9)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}>
          <div style={{background:"#fff",borderRadius:12,padding:"20px 18px",
            width:"100%",maxWidth:320,maxHeight:"85vh",overflowY:"auto",
            fontFamily:"'Courier New',monospace",color:"#000",fontSize:12}}>
            {/* Ticket content */}
            <div style={{textAlign:"center",marginBottom:10}}>
              <div style={{fontSize:17,fontWeight:"bold",textTransform:"uppercase",letterSpacing:2}}>{local.nombre||"Restaurante"}</div>
              {local.direccion&&<div style={{fontSize:9,color:"#555",marginTop:2}}>{local.direccion}</div>}
              {local.telefono&&<div style={{fontSize:9,color:"#555"}}>Tel: {local.telefono}</div>}
            </div>
            <div style={{borderTop:"1px dashed #000",margin:"8px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}>
              <span>{new Date().toLocaleDateString("es-AR")}</span>
              <span>{new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}>
              <span>Pedido #{String(ticketPreview.id).slice(-4)}</span>
              <span>{ticketPreview.table===0||ticketPreview.table==="0"?"Mostrador":"Mesa "+ticketPreview.table}</span>
            </div>
            <div style={{borderTop:"1px dashed #000",margin:"8px 0"}}/>
            {ticketPreview.items.map((it,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px dotted #ccc"}}>
                <span style={{flex:1}}>{it.qty}× {it.name}</span>
                <span style={{minWidth:56,textAlign:"right",fontWeight:"bold"}}>{it.price?"$"+fmt(it.qty*(it.price||0)):""}</span>
              </div>
            ))}
            {ticketPreview.nota&&ticketPreview.nota!=="Venta en mostrador"&&(
              <div style={{fontSize:10,color:"var(--ad)",fontStyle:"italic",padding:"6px 0",borderBottom:"1px dotted #ccc"}}>
                📝 {ticketPreview.nota}
              </div>
            )}
            <div style={{borderTop:"1px dashed #000",margin:"8px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:"bold",padding:"4px 0"}}>
              <span>TOTAL</span><span>${fmt(ticketPreview.total)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}>
              <span>Pago</span>
              <span><b>{fmtPay(ticketPreview.pay)}</b></span>
            </div>
            <div style={{borderTop:"1px dashed #000",margin:"8px 0"}}/>
            <div style={{fontSize:13,fontWeight:"bold",textAlign:"center",margin:"8px 0 4px"}}>¡Gracias!</div>
            {local.email&&<div style={{fontSize:9,color:"var(--am)",textAlign:"center"}}>{local.email}</div>}
            <div style={{fontSize:9,color:"var(--am)",textAlign:"center"}}>Emitido por MenuQR</div>
            {/* Buttons */}
            <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
              <button onClick={()=>setTicketPreview(null)} style={{flex:"1 1 auto",padding:"10px",borderRadius:8,background:"var(--ac)",border:"1px solid #ddd",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",color:"var(--at)"}}>
                Cerrar
              </button>
              {(()=>{
                const lines=[
                  `🧾 *Ticket — ${local.nombre||"Restaurante"}*`,
                  `📍 ${ticketPreview.table===0||ticketPreview.table==="0"?"Mostrador":"Mesa "+ticketPreview.table}  |  Pedido #${String(ticketPreview.id).slice(-4)}`,
                  `━━━━━━━━━━━━━━━━`,
                  ...(ticketPreview.items||[]).map(it=>`${it.qty}× ${it.name}${it.price?" — $"+fmt(it.qty*(it.price||0)):""}`),
                  `━━━━━━━━━━━━━━━━`,
                  `💰 *TOTAL: $${fmt(ticketPreview.total)}*`,
                  `💳 ${fmtPay(ticketPreview.pay)}`,
                  ticketPreview.nota&&ticketPreview.nota!=="Venta en mostrador"?`📝 ${ticketPreview.nota}`:"",
                  ``,`_Emitido por MenuQR_`,
                ].filter(Boolean).join("\n");
                return (<>
                  <button onClick={()=>{navigator.clipboard?.writeText(lines);toast&&toast("Ticket copiado");}}
                    style={{flex:"1 1 auto",padding:"10px",borderRadius:8,background:"var(--ac)",border:"1px solid #E5E7EB",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",color:"var(--at)"}}>
                    📋 Copiar
                  </button>
                  <button onClick={()=>window.open("https://wa.me/?text="+encodeURIComponent(lines),"_blank")}
                    style={{flex:"1 1 auto",padding:"10px",borderRadius:8,background:"#25D366",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff"}}>
                    📱 WhatsApp
                  </button>
                </>);
              })()}
              <button onClick={()=>{doPrint(ticketPreview);}} style={{flex:"1 1 auto",padding:"10px",borderRadius:8,background:"#C9A84C",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff"}}>
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
      {showVentaRapida && VentaRapidaModal()}
      {showMovModal && MovModal()}

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
            const tc = t.color||"var(--ag)";
            return (
              <button key={t.id} onClick={()=>{
                const locked=(t.id==="gestion"||t.id==="config")&&local.admin_pin&&!adminPinUnlocked;
                if(locked){setShowPinModal(t.id);setPinInput("");}else setTab(t.id);
              }} className="pr" style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",
                background:a?tc+"18":"transparent",
                color:a?tc:"#888888",
                fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,
                letterSpacing:.5,textAlign:"left",position:"relative",transition:".15s"}}>
                <span style={{fontSize:15,minWidth:20,textAlign:"center"}}>{t.icon}</span>
                <span style={{flex:1}}>{t.label}</span>
                {t.badge>0 && <span style={{background:"#EF4444",color:"#fff",
                  borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700}}>{t.badge}</span>}
                {a && <div style={{position:"absolute",left:0,top:"20%",height:"60%",
                  width:3,borderRadius:2,background:tc}}/>}
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
        padding:"calc(env(safe-area-inset-top,0px) + 10px) 18px 10px",position:"sticky",top:"env(safe-area-inset-top,0px)",zIndex:40,
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
      {tab==="home"    && HomeTab()}
      {tab==="orders"  && OrdersTab()}
      {tab==="carta"   && CartaTab()}
      {tab==="qr"      && <QRTabComp mesaNum={mesaNumAdmin} setMesaNum={setMesaNumAdmin} qrType={qrType} setQrType={setQrType} promoUrl={promoUrl} setPromoUrl={setPromoUrl} local={local}/>}
      {tab==="caja"    && CajaTab()}
      {tab==="mostrador" && (()=>{
        // Ventas de mostrador: pedidos con mesa_numero=0 o nota que contenga "mostrador"
        const mostradorOrders = orders.filter(o=>
          o.table===0||o.table==="0"||o.table===null||
          (o.nota||"").toLowerCase().includes("mostrador")
        );
        const cerrados = mostradorOrders.filter(o=>o.status==="entregado");
        const activos  = mostradorOrders.filter(o=>o.status!=="entregado");
        const totalDia = cerrados.reduce((s,o)=>s+(o.total||0),0);
        const PAY_LBL4={cash:"Efectivo",mp:"Mercado Pago",card:"Tarjeta",trans:"Transferencia"};
        return (
          <div style={{padding:"18px 16px 0"}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",letterSpacing:1.5,marginBottom:2}}>MOSTRADOR</p>
                <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:"var(--abri)"}}>Ventas en mostrador</h2>
              </div>
              <button onClick={()=>{setVrMesa("mostrador");setShowVentaRapida(true);}} className="pr" style={{
                background:"var(--ag)",color:"#FFFFFF",border:"none",borderRadius:12,
                padding:"10px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                fontWeight:800,cursor:"pointer",letterSpacing:.5,
                boxShadow:"0 0 14px rgba(0,255,136,.25)"}}>
                ⚡ NUEVA VENTA
              </button>
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div style={{background:"linear-gradient(135deg,#040D0A,#081812)",
                border:"1px solid rgba(0,255,136,.18)",borderRadius:14,padding:"14px 16px"}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(0,255,136,.6)",letterSpacing:1,marginBottom:4}}>VENTAS HOY</p>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:700,color:"var(--ag)"}}>${fmt(totalDia)}</p>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",marginTop:2}}>{cerrados.length} transacciones</p>
              </div>
              <div style={{background:"var(--as)",border:"1px solid var(--abr)",borderRadius:14,padding:"14px 16px"}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",letterSpacing:1,marginBottom:4}}>EN CURSO</p>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:700,color:"var(--abri)"}}>{activos.length}</p>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",marginTop:2}}>pedidos activos</p>
              </div>
            </div>

            {/* Pedidos activos */}
            {activos.length>0 && (
              <div style={{marginBottom:16}}>
                <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",letterSpacing:1.5,marginBottom:8}}>EN CURSO</p>
                {activos.map(o=>{
                  const s=STATUS_CFG[o.status];
                  return (
                    <div key={o.id} style={{background:"var(--as)",border:`1px solid ${s.color}44`,
                      borderLeft:`3px solid ${s.color}`,borderRadius:10,padding:"10px 14px",marginBottom:7}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
                          color:s.color,fontWeight:700,letterSpacing:1}}>{s.label}</span>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,
                          fontWeight:700,color:"var(--ag)"}}>${fmt(o.total)}</span>
                      </div>
                      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--ad)",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {(o.items||[]).map(i=>`${i.qty}× ${i.name}`).join(", ")}
                      </div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",marginTop:4}}>
                        #{String(o.id).slice(-4)} · {o.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Últimas ventas cerradas */}
            <p style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"var(--am)",letterSpacing:1.5,marginBottom:8}}>ÚLTIMAS VENTAS</p>
            {cerrados.length===0 && (
              <div style={{textAlign:"center",padding:"30px 20px",
                fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--am)"}}>
                Sin ventas cerradas hoy
              </div>
            )}
            {cerrados.slice(0,20).map(o=>(
              <div key={o.id} style={{background:"var(--as)",border:"1px solid var(--abr)",
                borderRadius:10,padding:"10px 14px",marginBottom:7,
                display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--abri)",
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {(o.items||[]).map(i=>`${i.qty}× ${i.name}`).join(", ")}
                  </div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"var(--am)",marginTop:3}}>
                    #{String(o.id).slice(-4)} · {o.time} · {PAY_LBL4[o.pay]||o.pay||"—"}
                  </div>
                </div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,
                  fontWeight:700,color:"var(--abri)",flexShrink:0}}>${fmt(o.total)}</div>
              </div>
            ))}
            <div style={{height:100}}/>
          </div>
        );
      })()}
      {tab==="cocina" && <CocinaTab local={local} QRCodeLib={QRCodeLib} toast={toast}/>}
      {tab==="reportes" && <ReportesTab local={local}/>}
      {tab==="delivery" && <DeliveryTab local={local} setLocal={setLocal} toast={toast}/> }
      {tab==="gestion" && <GestionTab local={local} setLocal={setLocal} cats={cats} setCats={setCats} prods={prods} setProds={setProds} gSubTab={gSubTab} setGSubTab={setGSubTab} gActiveCat={gActiveCat} setGActiveCat={setGActiveCat} gModal={gModal} setGModal={setGModal} toast={toast} orders={orders} setOrders={setOrders} onEditOrder={o=>setEditOrderModal(o)}/>}
      {tab==="config"   && <ConfigTab local={local} setLocal={setLocal} toast={toast} adminPinUnlocked={adminPinUnlocked}/>}
      {tab==="whatsapp" && WhatsAppTab()}

      </div>{/* end admin-content-scroll */}
      </div>{/* end admin-main */}

      {/* BOTTOM NAV */}
      <nav className="admin-bottomnav" style={{position:"fixed",bottom:0,left:"50%",
        transform:"translateX(-50%)",width:"100%",maxWidth:700,
        background:"var(--as)",borderTop:"1px solid var(--abr)",
        display:"flex",padding:"6px 0 16px",zIndex:50,
        boxShadow:"0 -2px 16px rgba(0,0,0,.08)"}}>
        {TABS.map(t=>{
          const a = tab===t.id;
          const tc = t.color||"var(--ag)";
          return (
            <button key={t.id} onClick={()=>{
              const locked = (t.id==="gestion"||t.id==="config") && local.admin_pin && !adminPinUnlocked;
              if(locked){ setShowPinModal(t.id); setPinInput(""); }
              else setTab(t.id);
            }} className="pr" style={{
              flex:1,border:"none",
              display:"flex",flexDirection:"column",
              alignItems:"center",gap:3,cursor:"pointer",position:"relative",
              padding:"6px 2px 4px",
              background:a?tc+"18":"transparent",
              borderTop:a?`2px solid ${tc}`:"2px solid transparent",
              transition:"all .2s"}}>
              <span style={{fontSize:20,color:a?tc:"#AAAAAA",transition:"all .2s"}}>{t.icon}</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:.3,
                color:a?tc:"#AAAAAA",transition:"color .2s"}}>{t.label}</span>
              {(t.badge||0)>0 && (
                <span style={{position:"absolute",top:2,right:"6%",
                  background:"#EF4444",color:"#fff",borderRadius:"50%",
                  width:14,height:14,fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:8,fontWeight:800,display:"flex",
                  alignItems:"center",justifyContent:"center"}}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ADMIN MODALS */}

      {/* ── PIN Modal ─────────────────────────────────────────────── */}
      {showPinModal && (
        <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,.85)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"var(--ab)",borderRadius:20,padding:"28px 24px",
            width:"100%",maxWidth:320,textAlign:"center"}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,
              color:"var(--am)",letterSpacing:2,marginBottom:8}}>CLAVE DE ACCESO</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,
              color:"var(--abri)",marginBottom:20}}>
              {showPinModal==="gestion"?"Gestión":"Configuración"}
            </div>
            {/* 4 dot indicators */}
            <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:24}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{width:14,height:14,borderRadius:"50%",
                  background:pinInput.length>i?"var(--abl)":"var(--abr)",
                  transition:"background .15s"}}/>
              ))}
            </div>
            {/* Numpad */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[1,2,3,4,5,6,7,8,9,"","0","⌫"].map((k,i)=>(
                <button key={i} onClick={()=>{
                  if(k==="⌫"){ setPinInput(p=>p.slice(0,-1)); return; }
                  if(k===""){ return; }
                  if(pinInput.length>=4) return;
                  const next = pinInput + String(k);
                  setPinInput(next);
                  if(next.length===4){
                    if(next===String(local.admin_pin)){
                      setAdminPinUnlocked(true);
                      setTab(showPinModal);
                      setShowPinModal(null);
                      setPinInput("");
                    } else {
                      setTimeout(()=>setPinInput(""),400);
                    }
                  }
                }} style={{
                  padding:"16px 0",borderRadius:12,border:"1px solid var(--abr)",
                  background:k==="⌫"?"var(--ac)":"var(--as)",
                  fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:700,
                  color:"var(--abri)",cursor:k===""?"default":"pointer",
                  opacity:k===""?0:1}}>
                  {k}
                </button>
              ))}
            </div>
            <button onClick={()=>{setShowPinModal(null);setPinInput("");}} style={{
              width:"100%",padding:"12px",borderRadius:12,border:"1px solid var(--abr)",
              background:"transparent",color:"var(--am)",fontFamily:"'Outfit',sans-serif",
              fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Edit Order Modal ──────────────────────────────────────── */}
      {editOrderModal && <EditOrderModal editOrderModal={editOrderModal} setEditOrderModal={setEditOrderModal} setOrders={setOrders} toast={toast} doPrint={doPrint}/>}

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

      {/* ONBOARDING WELCOME MODAL */}
      {showWelcome && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",
          zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",
          padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:"#0F1320",border:"1px solid #2A3A54",
            borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:420,
            fontFamily:"'Outfit',sans-serif",position:"relative"}}>
            {/* Cerrar */}
            <button onClick={()=>setShowWelcome(false)}
              style={{position:"absolute",top:14,right:16,background:"none",
                border:"none",color:"#4A6080",fontSize:20,cursor:"pointer",lineHeight:1}}>✕</button>

            {/* Header */}
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:40,marginBottom:8}}>🎉</div>
              <h2 style={{margin:0,fontSize:"1.35rem",fontWeight:800,
                background:"linear-gradient(135deg,#6366F1,#C9A84C)",
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                ¡Bienvenido a MenuQR!
              </h2>
              <p style={{margin:"6px 0 0",color:"#4A6080",fontSize:".9rem"}}>
                Seguí estos 3 pasos para arrancar
              </p>
            </div>

            {/* Steps */}
            {[
              {icon:"⚙️", title:"Configurá tu local", desc:"Subí tu logo, nombre y colores de marca.", tab:"gestion", sub:"local"},
              {icon:"🍽️", title:"Cargá tu carta",     desc:"Creá categorías y agregá tus productos con fotos.", tab:"carta"},
              {icon:"📲", title:"Descargá tu QR",     desc:"Generá el QR para tus mesas y comenzá a recibir pedidos.", tab:"qr"},
            ].map((step,i) => (
              <div key={i} onClick={()=>{
                  setTab(step.tab);
                  if(step.sub) setGSubTab(step.sub);
                  setShowWelcome(false);
                }}
                style={{display:"flex",alignItems:"center",gap:14,
                  background: welcomeStep===i ? "rgba(99,102,241,.12)" : "#060810",
                  border:`1px solid ${welcomeStep===i ? "#6366F1" : "#1E2A3A"}`,
                  borderRadius:12,padding:"13px 14px",marginBottom:10,cursor:"pointer",
                  transition:"all .2s"}}
                onMouseEnter={()=>setWelcomeStep(i)}
                onMouseLeave={()=>setWelcomeStep(-1)}>
                <div style={{width:40,height:40,borderRadius:10,
                  background: welcomeStep===i ? "rgba(99,102,241,.2)" : "#0F1320",
                  border:`1px solid ${welcomeStep===i ? "#6366F1" : "#1E2A3A"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:20,flexShrink:0}}>{step.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".95rem",color:"#B8D0E8",
                    marginBottom:2}}>{step.title}</div>
                  <div style={{fontSize:".78rem",color:"#4A6080",lineHeight:1.4}}>
                    {step.desc}</div>
                </div>
                <span style={{color: welcomeStep===i ? "#6366F1" : "#1E2A3A",
                  fontSize:18,flexShrink:0}}>›</span>
              </div>
            ))}

            <button onClick={()=>setShowWelcome(false)}
              style={{width:"100%",padding:"11px",marginTop:6,
                background:"linear-gradient(135deg,#6366F1,#818CF8)",
                border:"none",borderRadius:10,color:"#fff",
                fontFamily:"'Outfit',sans-serif",fontSize:"1rem",
                fontWeight:700,cursor:"pointer"}}>
              Empezar ahora →
            </button>
          </div>
        </div>
      )}

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
          if (!forceMode) loadRestaurantData(session.user.id);
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
      if (session?.user) { setAuthUser(session.user); if (!forceMode) loadRestaurantData(session.user.id); }
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
        logo_url: rest.logo_url || "",
        delivery_config: rest.delivery_config || null,
        alias_pago:    rest.alias_pago    || "",   // columna directa
        alias_titular: rest.alias_titular || "",   // columna directa
        mp_alias:      rest.alias_pago    || "",   // alias para cart view
        config: rest.config || {},
        ...(rest.config || {}),
      });
      const [categorias, productos] = await Promise.all([
        getCategorias(rest.id),
        getProductos(rest.id),
      ]);
      if (categorias.length) setCats(categorias.map(c => ({ id:c.id, label:c.label, icon:c.icon, activa:c.activa })));
      if (productos.length)  setProds(productos.map(p => ({ id:p.id, cat:p.categoria_id, name:p.nombre||p.name||'', desc:p.descripcion||p.desc||'', price:p.precio??p.price??0, orig:p.precio_original??p.orig??null, emoji:p.emoji, tag:p.tag, active:p.activo??p.active??true, pais:p.pais||null, sin_stock:p.sin_stock||false, foto_url:p.foto_url||null, imagen:p.imagen||null })));
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
        <ClientApp onBack={()=>setMode("landing")} local={local} cats={cats} prods={prods} sinPedidos={!!local.feat_sin_pedidos}/>
      )}
      {mode==="vitrina" && (
        <ClientApp local={local} cats={cats} prods={prods} vitrina={true}/>
      )}
      {mode==="admin" && authUser && (
        <AdminErrorBoundary>
          <AdminPanel
            onBack={()=>setMode("landing")}
            local={local}    setLocal={setLocal}
            cats={cats}      setCats={setCats}
            prods={prods}    setProds={setProds}
            authUser={authUser} onLogout={handleLogout}
          />
        </AdminErrorBoundary>
      )}
      {mode==="admin" && !authUser && null}
    </>
  );
}

/* ── Landing con Auth ─────────────────────────────────────── */
function LandingAuth({ setMode, goAdmin, authUser, onLogout }) {
  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#011A16",
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
          padding:"8px 20px",color:"var(--ad)",cursor:"pointer",
          fontSize:12,fontFamily:"'DM Sans',sans-serif",transition:"color .2s"}}
          onMouseEnter={e=>e.currentTarget.style.color="#888"}
          onMouseLeave={e=>e.currentTarget.style.color="#444"}>
          Cerrar sesión
        </button>
      )}
      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:"var(--at)",
        marginTop:28,letterSpacing:2}}>MENUQR · v1.0</p>
    </div>
  );
}
