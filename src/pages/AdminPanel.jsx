import React, { useState, useEffect, useRef, useCallback } from "react";
import ScreenCajaPOS from "./ScreenCajaPOS.jsx";
import { supabase, getPedidos, updatePedidoStatus, subscribePedidos,
         toggleProducto, upsertCategoria } from "../lib/supabase.js";

/* Supabase storage (anon key, bucket product-images debe tener RLS off o policy permisiva) */
const supabaseAdmin = supabase;

/* ══════════════════════════════════════════════════════════════
   STYLES — dark+gold, scoped under #ap2-root
══════════════════════════════════════════════════════════════ */
const AP_STYLES = `
  #ap2-root {
    --gold:#e8a020; --gold2:#f5b830; --gold-dim:rgba(232,160,32,.12);
    --bg:#0d0d0d; --bg2:#161616; --bg3:#1e1e1e; --bg4:#262626; --bg5:#2e2e2e;
    --text:#ffffff; --text2:rgba(255,255,255,.65); --text3:rgba(255,255,255,.35);
    --border:rgba(255,255,255,.08); --border2:rgba(255,255,255,.14);
    --green:#3ecf6e; --red:#e84040; --blue:#4090e8;
    --sidebar:280px; --header:60px; --radius:12px;
    display:flex; height:100vh; overflow:hidden;
    background:var(--bg); color:var(--text);
    font-family:'Segoe UI',system-ui,sans-serif; font-size:14px;
  }
  #ap2-root * { box-sizing:border-box; margin:0; padding:0 }
  #ap2-root ::-webkit-scrollbar { width:5px; height:5px }
  #ap2-root ::-webkit-scrollbar-track { background:transparent }
  #ap2-root ::-webkit-scrollbar-thumb { background:var(--bg5); border-radius:3px }

  /* SIDEBAR */
  #ap2-root .ap-sidebar {
    width:var(--sidebar); background:var(--bg2);
    border-left:1px solid var(--border);
    display:flex; flex-direction:column; flex-shrink:0; height:100vh;
  }
  #ap2-root .ap-logo { padding:20px 18px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px }
  #ap2-root .ap-logo-icon { width:36px; height:36px; border-radius:10px; background:var(--gold); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0 }
  #ap2-root .ap-logo-name { font-size:18px; font-weight:800 }
  #ap2-root .ap-logo-tag { font-size:10px; color:var(--text3); letter-spacing:1px }
  #ap2-root .ap-nav { flex:1; padding:12px 8px; overflow-y:auto }
  #ap2-root .ap-nav-group { margin-bottom:20px }
  #ap2-root .ap-nav-label { font-size:9px; font-weight:700; color:var(--text3); letter-spacing:2px; padding:0 10px; margin-bottom:6px }
  #ap2-root .ap-nav-item {
    display:flex; align-items:center; gap:10px; padding:10px 12px;
    border-radius:10px; cursor:pointer; transition:all .15s;
    color:var(--text2); font-size:13px; font-weight:500; position:relative;
  }
  #ap2-root .ap-nav-item:hover { background:var(--bg4); color:var(--text) }
  #ap2-root .ap-nav-item.active { background:var(--gold-dim); color:var(--gold); font-weight:700 }
  #ap2-root .ap-nav-item.active::before {
    content:''; position:absolute; right:0; top:50%; transform:translateY(-50%);
    width:3px; height:20px; background:var(--gold); border-radius:0 3px 3px 0;
  }
  #ap2-root .ap-nav-icon { font-size:18px; width:22px; text-align:center; flex-shrink:0 }
  #ap2-root .ap-badge {
    margin-left:auto; padding:2px 7px; border-radius:10px;
    background:var(--red); color:#fff; font-size:10px; font-weight:800;
  }
  #ap2-root .ap-sidebar-bottom { padding:14px; border-top:1px solid var(--border) }
  #ap2-root .ap-user-row {
    display:flex; align-items:center; gap:10px; padding:8px;
    border-radius:10px; background:var(--bg3); cursor:pointer;
  }
  #ap2-root .ap-user-avatar {
    width:32px; height:32px; border-radius:50%; background:var(--gold);
    display:flex; align-items:center; justify-content:center;
    font-size:14px; font-weight:800; color:#000; flex-shrink:0;
  }
  #ap2-root .ap-user-name { font-size:13px; font-weight:600 }
  #ap2-root .ap-user-role { font-size:10px; color:var(--text3) }

  /* MAIN */
  #ap2-root .ap-main { flex:1; display:flex; flex-direction:column; overflow:hidden }
  #ap2-root .ap-topbar {
    height:var(--header); background:var(--bg2);
    border-bottom:1px solid var(--border);
    display:flex; align-items:center; padding:0 24px; gap:16px; flex-shrink:0;
  }
  #ap2-root .ap-topbar-title { font-size:18px; font-weight:800; flex:1 }
  #ap2-root .ap-topbar-time { font-size:13px; color:var(--text3) }
  #ap2-root .ap-live { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--green); font-weight:700 }
  #ap2-root .ap-live-dot { width:7px; height:7px; border-radius:50%; background:var(--green); animation:ap-livepulse 1.5s infinite }
  @keyframes ap-livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
  #ap2-root .ap-content { flex:1; overflow-y:auto; padding:24px }

  /* BUTTONS */
  #ap2-root .ap-btn { padding:10px 18px; border-radius:8px; border:none; font-size:13px; font-weight:700; cursor:pointer; transition:all .15s; font-family:inherit }
  #ap2-root .ap-btn-gold { background:var(--gold); color:#000 }
  #ap2-root .ap-btn-gold:hover { background:var(--gold2) }
  #ap2-root .ap-btn-ghost { background:transparent; border:1px solid var(--border2); color:var(--text2) }
  #ap2-root .ap-btn-ghost:hover { background:var(--bg4); color:var(--text) }
  #ap2-root .ap-btn-danger { background:rgba(232,64,64,.15); color:var(--red); border:1px solid rgba(232,64,64,.2) }
  #ap2-root .ap-btn-sm { padding:6px 12px; font-size:11px }

  /* CARDS */
  #ap2-root .ap-card { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:20px }
  #ap2-root .ap-card-sm { padding:14px 16px }
  #ap2-root .ap-card-title { font-size:11px; font-weight:700; color:var(--text3); letter-spacing:1.5px; margin-bottom:12px }
  #ap2-root .ap-card-num { font-size:32px; font-weight:900; line-height:1 }
  #ap2-root .ap-card-sub { font-size:12px; color:var(--text3); margin-top:6px }
  #ap2-root .ap-trend-up { font-size:12px; font-weight:700; color:var(--green); margin-top:4px }
  #ap2-root .ap-trend-dn { font-size:12px; font-weight:700; color:var(--red); margin-top:4px }

  /* KPI icons */
  #ap2-root .ap-kpi-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:12px }
  #ap2-root .kpi-gold { background:rgba(232,160,32,.15) }
  #ap2-root .kpi-green { background:rgba(62,207,110,.12) }
  #ap2-root .kpi-blue { background:rgba(64,144,232,.12) }
  #ap2-root .kpi-red { background:rgba(232,64,64,.12) }

  /* GRIDS */
  #ap2-root .ap-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px }
  #ap2-root .ap-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px }
  #ap2-root .ap-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px }
  #ap2-root .ap-flex { display:flex; gap:16px }
  #ap2-root .ap-flex-1 { flex:1; min-width:0 }

  /* TABLES */
  #ap2-root table { width:100%; border-collapse:collapse }
  #ap2-root th { text-align:left; font-size:11px; font-weight:700; color:var(--text3); letter-spacing:1px; padding:10px 14px; border-bottom:1px solid var(--border) }
  #ap2-root td { padding:12px 14px; border-bottom:1px solid var(--border); color:var(--text2); font-size:13px; vertical-align:middle }
  #ap2-root tr:hover td { background:var(--bg3) }
  #ap2-root tr:last-child td { border-bottom:none }

  /* STATUS PILLS */
  #ap2-root .ap-pill { display:inline-flex; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700 }
  #ap2-root .pill-nuevo { background:rgba(64,144,232,.15); color:#60a8f0 }
  #ap2-root .pill-prep { background:rgba(232,160,32,.15); color:var(--gold) }
  #ap2-root .pill-listo { background:rgba(62,207,110,.15); color:var(--green) }
  #ap2-root .pill-entregado { background:rgba(255,255,255,.07); color:var(--text3) }
  #ap2-root .pill-libre { background:rgba(62,207,110,.15); color:var(--green) }
  #ap2-root .pill-ocupado { background:rgba(232,160,32,.15); color:var(--gold) }

  /* SECTION HEADER */
  #ap2-root .ap-sec-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px }
  #ap2-root .ap-sec-hdr h2 { font-size:16px; font-weight:800 }
  #ap2-root .ap-sec-hdr-r { display:flex; gap:8px; align-items:center }

  /* TABS */
  #ap2-root .ap-tab-bar { display:flex; gap:4px; margin-bottom:16px; background:var(--bg3); padding:4px; border-radius:10px; width:fit-content }
  #ap2-root .ap-tab { padding:7px 16px; border-radius:7px; cursor:pointer; font-size:12px; font-weight:600; color:var(--text3); transition:all .15s }
  #ap2-root .ap-tab.active { background:var(--bg2); color:var(--text); box-shadow:0 1px 4px rgba(0,0,0,.4) }

  /* ORDER CARDS */
  #ap2-root .ap-order-feed { display:flex; flex-direction:column; gap:8px }
  #ap2-root .ap-order-card {
    background:var(--bg3); border:1px solid var(--border); border-radius:10px;
    padding:12px 14px; display:flex; align-items:center; gap:14px; transition:border-color .15s;
  }
  #ap2-root .ap-order-card:hover { border-color:var(--border2) }
  #ap2-root .ap-order-card.new-order { border-color:rgba(64,144,232,.4); animation:ap-pulse 2s infinite }
  @keyframes ap-pulse { 0%,100%{border-color:rgba(64,144,232,.4)} 50%{border-color:rgba(64,144,232,.8)} }
  #ap2-root .ap-order-num { font-size:18px; font-weight:900; color:var(--gold); min-width:40px }
  #ap2-root .ap-order-info { flex:1 }
  #ap2-root .ap-order-title { font-size:13px; font-weight:700; margin-bottom:3px }
  #ap2-root .ap-order-detail { font-size:11px; color:var(--text3) }
  #ap2-root .ap-adv-btn { padding:6px 12px; border-radius:6px; border:none; font-size:11px; font-weight:700; cursor:pointer; margin-left:8px; font-family:inherit }
  #ap2-root .adv-prep { background:rgba(232,160,32,.2); color:var(--gold) }
  #ap2-root .adv-listo { background:rgba(62,207,110,.2); color:var(--green) }

  /* BAR CHART */
  #ap2-root .ap-bar-chart { display:flex; align-items:flex-end; gap:8px; height:120px; padding-top:8px }
  #ap2-root .ap-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px }
  #ap2-root .ap-bar { width:100%; background:var(--gold-dim); border-radius:4px 4px 0 0; border:1px solid rgba(232,160,32,.2); min-height:4px; transition:background .3s }
  #ap2-root .ap-bar:hover { background:rgba(232,160,32,.3) }
  #ap2-root .ap-bar-label { font-size:9px; color:var(--text3) }
  #ap2-root .ap-bar-val { font-size:9px; color:var(--gold); font-weight:700 }

  /* KITCHEN */
  #ap2-root .ap-kitchen-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px }
  #ap2-root .ap-kitchen-card { background:var(--bg3); border-radius:12px; border:2px solid var(--border); padding:14px; transition:all .2s }
  #ap2-root .ap-kitchen-card.urgent { border-color:var(--red); animation:ap-pulse-red 1.5s infinite }
  @keyframes ap-pulse-red { 0%,100%{border-color:rgba(232,64,64,.5)} 50%{border-color:var(--red)} }
  #ap2-root .ap-kitchen-card.ready { border-color:var(--green) }
  #ap2-root .ap-kitchen-num { font-size:22px; font-weight:900; color:var(--gold); margin-bottom:8px }
  #ap2-root .ap-kitchen-mesa { font-size:12px; color:var(--text3); margin-bottom:10px }
  #ap2-root .ap-kitchen-items { display:flex; flex-direction:column; gap:6px; margin-bottom:12px }
  #ap2-root .ap-kitchen-item { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text2) }
  #ap2-root .ap-kitchen-qty { width:22px; height:22px; border-radius:6px; background:var(--gold-dim); color:var(--gold); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0 }
  #ap2-root .ap-timer-ok { font-size:13px; font-weight:700; color:var(--green); margin-bottom:10px }
  #ap2-root .ap-timer-warn { font-size:13px; font-weight:700; color:var(--gold); margin-bottom:10px }
  #ap2-root .ap-timer-urgent { font-size:13px; font-weight:700; color:var(--red); margin-bottom:10px }

  /* PRODUCT GRID */
  #ap2-root .ap-prod-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px }
  #ap2-root .ap-prod-card { background:var(--bg3); border:1px solid var(--border); border-radius:12px; overflow:hidden; transition:border-color .15s }
  #ap2-root .ap-prod-card:hover { border-color:var(--border2) }
  #ap2-root .ap-prod-thumb { height:120px; background:var(--bg4); overflow:hidden }
  #ap2-root .ap-prod-thumb img { width:100%; height:100%; object-fit:cover; transition:transform .3s }
  #ap2-root .ap-prod-card:hover .ap-prod-thumb img { transform:scale(1.05) }
  #ap2-root .ap-prod-body { padding:12px }
  #ap2-root .ap-prod-name { font-size:13px; font-weight:700; margin-bottom:4px }
  #ap2-root .ap-prod-cat { font-size:10px; color:var(--text3); margin-bottom:8px }
  #ap2-root .ap-prod-footer { display:flex; align-items:center; justify-content:space-between }
  #ap2-root .ap-prod-price { font-size:16px; font-weight:900; color:var(--gold) }
  #ap2-root .ap-toggle { width:36px; height:20px; border-radius:10px; position:relative; cursor:pointer; flex-shrink:0; transition:background .2s }
  #ap2-root .ap-toggle.on { background:var(--green) }
  #ap2-root .ap-toggle.off { background:var(--bg5) }
  #ap2-root .ap-toggle::after { content:''; position:absolute; width:16px; height:16px; border-radius:50%; background:#fff; top:2px; transition:left .2s }
  #ap2-root .ap-toggle.on::after { left:calc(100% - 18px) }
  #ap2-root .ap-toggle.off::after { left:2px }

  /* MESAS */
  #ap2-root .ap-mesas-grid { display:grid; grid-template-columns:repeat(8,1fr); gap:10px; padding:8px 0 }
  #ap2-root .ap-mesa { aspect-ratio:1; border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; border:2px solid transparent; transition:all .15s; font-size:12px; font-weight:700 }
  #ap2-root .ap-mesa:hover { transform:scale(1.05) }
  #ap2-root .ap-mesa-num { font-size:16px; font-weight:900 }
  #ap2-root .ap-mesa-status { font-size:9px; font-weight:600; opacity:.7; margin-top:2px }
  #ap2-root .ap-mesa.libre { background:rgba(62,207,110,.12); border-color:rgba(62,207,110,.3); color:var(--green) }
  #ap2-root .ap-mesa.ocupada { background:rgba(232,160,32,.15); border-color:rgba(232,160,32,.35); color:var(--gold) }
  #ap2-root .ap-mesa.reservada { background:rgba(64,144,232,.12); border-color:rgba(64,144,232,.3); color:#60a8f0 }
  #ap2-root .ap-mesa.limpieza { background:rgba(255,255,255,.05); border-color:var(--border); color:var(--text3) }

  /* PROGRESS */
  #ap2-root .ap-progress { height:4px; background:var(--bg5); border-radius:2px; overflow:hidden; margin-top:4px }
  #ap2-root .ap-progress-fill { height:100%; border-radius:2px; background:var(--gold); transition:width .3s }

  /* SPARKLINE */
  #ap2-root .ap-sparkline { display:flex; align-items:flex-end; gap:2px; height:32px; margin-top:8px }
  #ap2-root .ap-spark-bar { background:rgba(232,160,32,.3); border-radius:2px 2px 0 0; flex:1 }

  /* INPUTS */
  #ap2-root input[type=text],#ap2-root input[type=number],#ap2-root select,#ap2-root textarea {
    background:var(--bg3); border:1px solid var(--border2); border-radius:8px;
    color:var(--text); padding:9px 12px; font-size:13px; outline:none; width:100%;
    transition:border-color .15s; font-family:inherit;
  }
  #ap2-root input:focus,#ap2-root select:focus,#ap2-root textarea:focus { border-color:var(--gold) }
  #ap2-root label { font-size:12px; color:var(--text3); display:block; margin-bottom:5px; font-weight:600 }
  #ap2-root .ap-form-group { margin-bottom:14px }

  /* MAP BOX */
  #ap2-root .ap-map-box { background:var(--bg3); border:1px solid var(--border); border-radius:12px; height:260px; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:8px; color:var(--text3) }

  /* RING CHART */
  #ap2-root .ap-ring-wrap { display:flex; align-items:center; gap:20px }
  #ap2-root .ap-ring-legend { display:flex; flex-direction:column; gap:6px }
  #ap2-root .ap-leg-row { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text2) }
  #ap2-root .ap-leg-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0 }

  /* TOGGLE SWITCH (config) */
  #ap2-root .ap-switch { width:44px; height:24px; border-radius:12px; cursor:pointer; position:relative; flex-shrink:0; transition:background .2s }
  #ap2-root .ap-switch.on { background:var(--green) }
  #ap2-root .ap-switch.off { background:var(--bg5) }
  #ap2-root .ap-switch::after { content:''; position:absolute; width:20px; height:20px; border-radius:50%; background:#fff; top:2px; transition:left .2s }
  #ap2-root .ap-switch.on::after { left:calc(100% - 22px) }
  #ap2-root .ap-switch.off::after { left:2px }
`;

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
const ARS = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n || 0);

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 60000;
  if (diff < 1) return "ahora";
  if (diff < 60) return `hace ${Math.floor(diff)} min`;
  return `hace ${Math.floor(diff / 60)}h`;
}

function statusClass(s) {
  if (s === "nuevo") return "pill-nuevo";
  if (s === "preparando") return "pill-prep";
  if (s === "listo") return "pill-listo";
  return "pill-entregado";
}

function statusLabel(s) {
  if (s === "nuevo") return "NUEVO";
  if (s === "preparando") return "EN PREP.";
  if (s === "listo") return "✓ LISTO";
  return "ENTREGADO";
}

function pedidoTitle(p) {
  return p.mesa_numero ? `Mesa ${p.mesa_numero}` : "Delivery 🛵";
}

function pedidoItems(p) {
  if (!p.pedido_items?.length) return p.nota || "—";
  return p.pedido_items.slice(0, 3).map((i) => i.nombre).join(", ");
}

function minutesSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr)) / 60000);
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT IMAGE PLACEHOLDERS
══════════════════════════════════════════════════════════════ */
const CAT_PLACEHOLDERS = [
  ["carne",      "https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop"],
  ["pizza",      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop"],
  ["hamburgues", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop"],
  ["pasta",      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop"],
  ["postre",     "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop"],
  ["ensalada",   "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop"],
  ["vino",       "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop"],
  ["cerveza",    "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=300&fit=crop"],
];
const DEFAULT_FOTO = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";

function getPlaceholder(catLabel) {
  const label = (catLabel || "").toLowerCase();
  for (const [key, url] of CAT_PLACEHOLDERS) {
    if (label.includes(key)) return url;
  }
  return DEFAULT_FOTO;
}

/* ══════════════════════════════════════════════════════════════
   SCREEN TITLES / TOPBAR ACTIONS
══════════════════════════════════════════════════════════════ */
const SCREEN_TITLES = {
  dashboard: "Dashboard",
  pedidos: "Pedidos",
  cocina: "Cocina — En preparación",
  delivery: "Delivery en tiempo real",
  mesas: "Plano de mesas",
  carta: "Carta digital — Productos",
  categorias: "Categorías",
  stock: "Stock e inventario",
  clientes: "Clientes",
  caja: "Caja del día",
  reportes: "Reportes y estadísticas",
  qr: "QR y links de acceso",
  config: "Configuración",
  gestion: "Gestión rápida",
};

/* ══════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════ */
function Sidebar({ screen, setScreen, pendingCount, kitchenCount, local, onLogout }) {
  const nav = (id, icon, label, badge) => (
    <div
      key={id}
      className={`ap-nav-item${screen === id ? " active" : ""}`}
      onClick={() => setScreen(id)}
    >
      <span className="ap-nav-icon">{icon}</span>
      {label}
      {badge > 0 && <span className="ap-badge">{badge}</span>}
    </div>
  );

  const initial = (local?.nombre || "A").charAt(0).toUpperCase();

  return (
    <div className="ap-sidebar">
      <div className="ap-logo">
        <div className="ap-logo-icon">🍽️</div>
        <div>
          <div className="ap-logo-name">MenuQR</div>
          <div className="ap-logo-tag">SISTEMA DE GESTIÓN</div>
        </div>
      </div>

      <div className="ap-nav">
        <div className="ap-nav-group">
          <div className="ap-nav-label">PRINCIPAL</div>
          {nav("dashboard", "📊", "Dashboard")}
          {nav("pedidos", "🧾", "Pedidos", pendingCount)}
          {nav("cocina", "👨‍🍳", "Cocina", kitchenCount)}
          {nav("delivery", "🛵", "Delivery")}
          {nav("mesas", "🪑", "Mesas")}
        </div>
        <div className="ap-nav-group">
          <div className="ap-nav-label">CARTA</div>
          {nav("carta", "📋", "Productos")}
          {nav("categorias", "🗂️", "Categorías")}
          {nav("stock", "📦", "Stock")}
        </div>
        <div className="ap-nav-group">
          <div className="ap-nav-label">NEGOCIO</div>
          {nav("clientes", "👥", "Clientes")}
          {nav("caja", "💰", "Caja")}
          {nav("reportes", "📈", "Reportes")}
        </div>
        <div className="ap-nav-group">
          <div className="ap-nav-label">SISTEMA</div>
          {nav("qr", "📱", "QR y Links")}
          {nav("gestion", "🔧", "Gestión")}
          {nav("config", "⚙️", "Configuración")}
        </div>
      </div>

      <div className="ap-sidebar-bottom">
        <div className="ap-user-row" onClick={onLogout} title="Cerrar sesión">
          <div className="ap-user-avatar">{initial}</div>
          <div>
            <div className="ap-user-name">Administrador</div>
            <div className="ap-user-role">{local?.nombre || "Mi Restaurante"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TOPBAR
══════════════════════════════════════════════════════════════ */
function Topbar({ screen, clock }) {
  const timeStr = clock.toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  return (
    <div className="ap-topbar">
      <div className="ap-topbar-title">{SCREEN_TITLES[screen] || screen}</div>
      <div className="ap-live"><div className="ap-live-dot" />EN VIVO</div>
      <div className="ap-topbar-time">{timeStr}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: DASHBOARD
══════════════════════════════════════════════════════════════ */
function ScreenDashboard({ pedidos, cats, prods, local }) {
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = pedidos.filter(
    (p) => p.created_at && p.created_at.startsWith(today)
  );
  const delivered = todayOrders.filter((p) => p.status === "entregado");
  const active = pedidos.filter((p) => p.status !== "entregado");
  const ventasHoy = delivered.reduce((s, p) => s + (p.total || 0), 0);
  const ticketProm = delivered.length ? Math.round(ventasHoy / delivered.length) : 0;
  const ocupadas = new Set(
    active.filter((p) => p.mesa_numero).map((p) => p.mesa_numero)
  ).size;
  const totalMesas = local?.mesas || 0;

  // Weekly bar chart — last 7 days
  const weekBars = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const dayOrders = pedidos.filter(
      (p) => p.created_at?.startsWith(key) && p.status === "entregado"
    );
    const total = dayOrders.reduce((s, p) => s + (p.total || 0), 0);
    weekBars.push({
      label: d.toLocaleDateString("es-AR", { weekday: "short" }),
      val: total,
      isToday: i === 0,
    });
  }
  const maxBar = Math.max(...weekBars.map((b) => b.val), 1);

  // Category ring (by count of active products)
  const catTotals = {};
  todayOrders.forEach((p) => {
    (p.pedido_items || []).forEach((item) => {
      const prod = prods.find((pr) => pr.id === item.producto_id);
      const catId = prod?.cat;
      const cat = cats.find((c) => c.id === catId);
      const label = cat?.label || "Otros";
      catTotals[label] = (catTotals[label] || 0) + item.precio * item.cantidad;
    });
  });
  const ringColors = ["#e8a020", "#60a8f0", "#3ecf6e", "#e84040", "#a070e0"];
  const catEntries = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const totalCatVal = catEntries.reduce((s, [, v]) => s + v, 0) || 1;

  // Build conic gradient for ring
  let ringGrad = "";
  let acc = 0;
  catEntries.forEach(([, v], i) => {
    const pct = (v / totalCatVal) * 100;
    ringGrad += `${ringColors[i]} ${acc}% ${acc + pct}%, `;
    acc += pct;
  });
  ringGrad += `rgba(255,255,255,.1) ${acc}%`;

  return (
    <div>
      {/* Hero banner */}
      <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 20, height: 140, position: "relative", background: "#1e1e1e" }}>
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=280&fit=crop&auto=format"
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
          alt=""
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(13,13,13,.9),rgba(13,13,13,.3))", display: "flex", alignItems: "center", padding: "0 28px" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
              Buenas noches, {local?.nombre || "Restaurante"} 🍽️
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4 }}>
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} · Servicio activo
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="ap-grid-4" style={{ marginBottom: 20 }}>
        <div className="ap-card ap-card-sm">
          <div className="ap-kpi-icon kpi-gold">💰</div>
          <div className="ap-card-title">VENTAS DEL DÍA</div>
          <div className="ap-card-num">{ARS(ventasHoy)}</div>
          <div className="ap-trend-up">↑ pedidos entregados</div>
          <div className="ap-sparkline">
            {weekBars.map((b, i) => (
              <div
                key={i}
                className="ap-spark-bar"
                style={{
                  height: `${(b.val / maxBar) * 100}%`,
                  background: b.isToday ? "#e8a020" : "rgba(232,160,32,.3)"
                }}
              />
            ))}
          </div>
        </div>
        <div className="ap-card ap-card-sm">
          <div className="ap-kpi-icon kpi-green">🧾</div>
          <div className="ap-card-title">PEDIDOS HOY</div>
          <div className="ap-card-num">{todayOrders.length}</div>
          <div className="ap-trend-up">↑ {active.length} en curso ahora</div>
          <div className="ap-card-sub" style={{ marginTop: 16 }}>{delivered.length} entregados</div>
        </div>
        <div className="ap-card ap-card-sm">
          <div className="ap-kpi-icon kpi-blue">🎟️</div>
          <div className="ap-card-title">TICKET PROMEDIO</div>
          <div className="ap-card-num">{ARS(ticketProm)}</div>
          <div className="ap-card-sub" style={{ marginTop: 16 }}>
            {delivered.length ? `${delivered.length} tickets` : "Sin datos aún"}
          </div>
        </div>
        <div className="ap-card ap-card-sm">
          <div className="ap-kpi-icon kpi-red">🪑</div>
          <div className="ap-card-title">MESAS OCUPADAS</div>
          <div className="ap-card-num">
            {ocupadas}{totalMesas > 0 ? ` / ${totalMesas}` : ""}
          </div>
          {totalMesas > 0 && (
            <>
              <div className="ap-card-sub">
                {Math.round((ocupadas / totalMesas) * 100)}% de ocupación
              </div>
              <div className="ap-progress" style={{ marginTop: 12 }}>
                <div className="ap-progress-fill" style={{ width: `${(ocupadas / totalMesas) * 100}%` }} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ap-flex" style={{ marginBottom: 20 }}>
        {/* Live orders */}
        <div className="ap-card ap-flex-1">
          <div className="ap-sec-hdr">
            <h2>Pedidos en curso</h2>
            <div className="ap-live"><div className="ap-live-dot" />{active.length} activos</div>
          </div>
          <div className="ap-order-feed">
            {active.length === 0 && (
              <div style={{ textAlign: "center", padding: 24, color: "rgba(255,255,255,.35)", fontSize: 13 }}>
                Sin pedidos activos
              </div>
            )}
            {active.slice(0, 5).map((p) => (
              <div key={p.id} className={`ap-order-card${p.status === "nuevo" ? " new-order" : ""}`}>
                <div className="ap-order-num">#{p.id?.slice(-3) || "—"}</div>
                <div className="ap-order-info">
                  <div className="ap-order-title">{pedidoTitle(p)}</div>
                  <div className="ap-order-detail">{pedidoItems(p)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{timeAgo(p.created_at)}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#e8a020" }}>{ARS(p.total)}</div>
                </div>
                <span className={`ap-pill ${statusClass(p.status)}`}>{statusLabel(p.status)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category ring */}
        <div className="ap-card" style={{ width: 260, flexShrink: 0 }}>
          <div className="ap-card-title">VENTAS POR CATEGORÍA</div>
          <div className="ap-ring-wrap" style={{ marginBottom: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `conic-gradient(${ringGrad})`,
              position: "relative", flexShrink: 0
            }}>
              <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: "#161616" }} />
            </div>
            <div className="ap-ring-legend">
              {catEntries.length > 0 ? catEntries.map(([label, val], i) => (
                <div key={label} className="ap-leg-row">
                  <div className="ap-leg-dot" style={{ background: ringColors[i] }} />
                  {label} {Math.round((val / totalCatVal) * 100)}%
                </div>
              )) : (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Sin datos</div>
              )}
            </div>
          </div>
          {catEntries.slice(0, 3).map(([label, val], i) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,.65)" }}>{label}</span>
                <span style={{ color: ringColors[i], fontWeight: 700 }}>{ARS(val / 100)}</span>
              </div>
              <div style={{ height: 3, background: "#2e2e2e", borderRadius: 2, marginBottom: 8 }}>
                <div style={{ width: `${(val / totalCatVal) * 100}%`, height: "100%", background: ringColors[i], borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="ap-card">
        <div className="ap-sec-hdr"><h2>Ventas — últimos 7 días</h2></div>
        <div className="ap-bar-chart">
          {weekBars.map((b, i) => (
            <div key={i} className="ap-bar-col">
              <div
                className="ap-bar"
                style={{
                  height: `${(b.val / maxBar) * 100}%`,
                  background: b.isToday ? "var(--gold-dim)" : undefined,
                  borderColor: b.isToday ? "var(--gold)" : undefined,
                }}
              />
              <div className="ap-bar-label" style={{ color: b.isToday ? "#e8a020" : undefined }}>
                {b.label}
              </div>
              <div className="ap-bar-val">
                {b.val > 0 ? ARS(b.val) : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: PEDIDOS
══════════════════════════════════════════════════════════════ */
function ScreenPedidos({ pedidos, setPedidos, local }) {
  const [filter, setFilter] = useState("activos");

  const today = new Date().toISOString().split("T")[0];
  const filtered = pedidos.filter((p) => {
    if (filter === "activos") return p.status !== "entregado";
    if (filter === "hoy") return p.created_at?.startsWith(today);
    return true;
  });

  async function advance(p) {
    const nextStatus = p.status === "nuevo" ? "preparando" : p.status === "preparando" ? "listo" : "entregado";
    await updatePedidoStatus(p.id, nextStatus);
    setPedidos((prev) => prev.map((o) => o.id === p.id ? { ...o, status: nextStatus } : o));
  }

  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Todos los pedidos</h2>
        <div className="ap-sec-hdr-r">
          <div className="ap-tab-bar">
            <div className={`ap-tab${filter === "activos" ? " active" : ""}`} onClick={() => setFilter("activos")}>
              Activos ({pedidos.filter((p) => p.status !== "entregado").length})
            </div>
            <div className={`ap-tab${filter === "hoy" ? " active" : ""}`} onClick={() => setFilter("hoy")}>
              Hoy ({pedidos.filter((p) => p.created_at?.startsWith(today)).length})
            </div>
            <div className={`ap-tab${filter === "todos" ? " active" : ""}`} onClick={() => setFilter("todos")}>
              Historial
            </div>
          </div>
        </div>
      </div>
      <div className="ap-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>MESA / ORIGEN</th>
              <th>PRODUCTOS</th>
              <th>TOTAL</th>
              <th>PAGO</th>
              <th>HORA</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,.35)" }}>
                  Sin pedidos
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id}>
                <td><b style={{ color: "#e8a020" }}>#{p.id?.slice(-4)}</b></td>
                <td>{pedidoTitle(p)}</td>
                <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pedidoItems(p)}
                </td>
                <td style={{ color: "#e8a020", fontWeight: 700 }}>{ARS(p.total)}</td>
                <td>{p.metodo_pago || "—"}</td>
                <td>{new Date(p.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                <td><span className={`ap-pill ${statusClass(p.status)}`}>{statusLabel(p.status)}</span></td>
                <td>
                  {p.status !== "entregado" && (
                    <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => advance(p)}>
                      {p.status === "nuevo" ? "▶ Preparar" : p.status === "preparando" ? "✓ Listo" : "📦 Entregar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: COCINA
══════════════════════════════════════════════════════════════ */
function ScreenCocina({ pedidos, setPedidos }) {
  const kitchen = pedidos.filter((p) => p.status === "nuevo" || p.status === "preparando");

  async function markReady(p) {
    const next = p.status === "nuevo" ? "preparando" : "listo";
    await updatePedidoStatus(p.id, next);
    setPedidos((prev) => prev.map((o) => o.id === p.id ? { ...o, status: next } : o));
  }

  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Pantalla de cocina</h2>
        <div className="ap-live"><div className="ap-live-dot" />{kitchen.length} pedidos en preparación</div>
      </div>
      {kitchen.length === 0 && (
        <div className="ap-card" style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,.35)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div>Sin pedidos pendientes en cocina</div>
        </div>
      )}
      <div className="ap-kitchen-grid">
        {kitchen.map((p) => {
          const mins = minutesSince(p.created_at);
          const timerClass = mins > 20 ? "ap-timer-urgent" : mins > 10 ? "ap-timer-warn" : "ap-timer-ok";
          const timerLabel = mins > 20
            ? `⏱ ${mins} min — URGENTE`
            : mins > 10
            ? `⏱ ${mins} min`
            : `✓ ${mins} min — EN TIEMPO`;
          const isUrgent = mins > 20;
          const isReady = p.status === "listo";

          return (
            <div
              key={p.id}
              className={`ap-kitchen-card${isUrgent ? " urgent" : ""}${isReady ? " ready" : ""}`}
            >
              <div className="ap-kitchen-num">#{p.id?.slice(-3)}</div>
              <div className="ap-kitchen-mesa">{pedidoTitle(p)}</div>
              <div className="ap-kitchen-items">
                {(p.pedido_items || []).slice(0, 5).map((item, i) => (
                  <div key={i} className="ap-kitchen-item">
                    <div className="ap-kitchen-qty">x{item.cantidad}</div>
                    {item.nombre}
                  </div>
                ))}
                {!p.pedido_items?.length && p.nota && (
                  <div className="ap-kitchen-item">
                    <div className="ap-kitchen-qty">📝</div>
                    {p.nota}
                  </div>
                )}
              </div>
              <div className={timerClass}>{timerLabel}</div>
              <button
                className="ap-btn ap-btn-gold"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => markReady(p)}
              >
                {p.status === "nuevo" ? "▶ Empezar preparación" : "✓ Marcar como listo"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT EDIT MODAL
══════════════════════════════════════════════════════════════ */
function ProductEditModal({ product, cats, onClose, onSave }) {
  const [nombre,   setNombre]   = useState(product.name  || "");
  const [precio,   setPrecio]   = useState(product.price || 0);
  const [desc,     setDesc]     = useState(product.desc  || "");
  const [activo,   setActivo]   = useState(product.active !== false);
  const [imagen,   setImagen]   = useState(product.imagen || "");
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef(null);

  const catLabel  = cats.find((c) => c.id === product.cat)?.label || "";
  const previewUrl = imagen || getPlaceholder(catLabel);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    try {
      /* Crear bucket si no existe */
      await supabaseAdmin.storage.createBucket("product-images", { public: true });
      /* Upload */
      const ext      = file.name.split(".").pop().toLowerCase();
      const filename = `${product.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("product-images")
        .upload(filename, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      /* URL pública */
      const { data: urlData } = supabaseAdmin.storage
        .from("product-images")
        .getPublicUrl(filename);
      setImagen(urlData.publicUrl);
    } catch (err) {
      setUploadErr("Error al subir: " + (err.message || "intente de nuevo"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("productos")
        .update({
          nombre,
          precio:      Number(precio),
          descripcion: desc,
          activo,
          imagen:      imagen || null,
        })
        .eq("id", product.id);
      if (error) throw error;
      onSave({ ...product, name: nombre, price: Number(precio), desc, active: activo, imagen });
    } catch (err) {
      alert("Error al guardar: " + (err.message || "intente de nuevo"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.72)",
        backdropFilter: "blur(4px)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1e1e1e", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 16, width: "100%", maxWidth: 460,
          maxHeight: "90vh", overflow: "auto", padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>✏️ Editar producto</div>
          <div style={{ cursor: "pointer", color: "rgba(255,255,255,.4)", fontSize: 22, lineHeight: 1 }} onClick={onClose}>✕</div>
        </div>

        {/* Photo preview */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 155, borderRadius: 10, overflow: "hidden", marginBottom: 10, background: "#262626", position: "relative" }}>
            <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {uploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#e8a020", fontSize: 13, fontWeight: 700 }}>
                <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#e8a020", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                Subiendo...
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          <button
            className="ap-btn ap-btn-ghost"
            style={{ width: "100%" }}
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            📷 {imagen ? "Cambiar foto" : "Subir foto"}
          </button>
          {uploadErr && <div style={{ fontSize: 11, color: "#e84040", marginTop: 6 }}>{uploadErr}</div>}
        </div>

        {/* Fields */}
        <div className="ap-form-group">
          <label>Nombre</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" />
        </div>
        <div className="ap-form-group">
          <label>Precio</label>
          <input type="number" value={precio} min={0} onChange={(e) => setPrecio(e.target.value)} />
        </div>
        <div className="ap-form-group">
          <label>Descripción</label>
          <textarea value={desc} rows={3} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción del producto..." style={{ resize: "vertical" }} />
        </div>

        {/* Toggle activo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,.08)", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Estado</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{activo ? "Visible en el menú" : "Oculto del menú"}</div>
          </div>
          <div className={`ap-switch ${activo ? "on" : "off"}`} onClick={() => setActivo((a) => !a)} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ap-btn ap-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button
            className="ap-btn ap-btn-gold"
            style={{ flex: 2 }}
            disabled={saving || uploading}
            onClick={handleSave}
          >
            {saving ? "Guardando..." : "💾 Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: CARTA / PRODUCTOS
══════════════════════════════════════════════════════════════ */
function ScreenCarta({ prods, setProds, cats, local }) {
  const [search,      setSearch]      = useState("");
  const [editProduct, setEditProduct] = useState(null);

  const filtered = prods.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(e, p) {
    e.stopPropagation();
    const newActive = !p.active;
    await toggleProducto(p.id, newActive);
    setProds((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, active: newActive } : pr));
  }

  function getCatLabel(catId) {
    const c = cats.find((c) => c.id === catId);
    return c ? `${c.icon || ""} ${c.label}` : "Sin categoría";
  }

  function getCatName(catId) {
    return cats.find((c) => c.id === catId)?.label || "";
  }

  function handleSaveProduct(updated) {
    setProds((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setEditProduct(null);
  }

  return (
    <div>
      {editProduct && (
        <ProductEditModal
          product={editProduct}
          cats={cats}
          onClose={() => setEditProduct(null)}
          onSave={handleSaveProduct}
        />
      )}

      <div className="ap-sec-hdr">
        <h2>Carta digital — Productos</h2>
        <div className="ap-sec-hdr-r">
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            style={{ width: 220 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="ap-btn ap-btn-gold">+ Nuevo producto</button>
        </div>
      </div>

      <div className="ap-prod-grid">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="ap-prod-card"
            style={{ cursor: "pointer" }}
            onClick={() => setEditProduct(p)}
          >
            <div className="ap-prod-thumb">
              <img
                src={p.imagen || getPlaceholder(getCatName(p.cat))}
                alt={p.name}
                loading="lazy"
              />
            </div>
            <div className="ap-prod-body">
              <div className="ap-prod-name">{p.name}</div>
              <div className="ap-prod-cat">{getCatLabel(p.cat)}</div>
              <div className="ap-prod-footer">
                <div className="ap-prod-price">{ARS(p.price)}</div>
                <div
                  className={`ap-toggle ${p.active ? "on" : "off"}`}
                  onClick={(e) => toggleActive(e, p)}
                  title={p.active ? "Activo — click para desactivar" : "Inactivo — click para activar"}
                />
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "rgba(255,255,255,.35)" }}>
            {search ? "Sin resultados para esa búsqueda" : "No hay productos cargados"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: MESAS
══════════════════════════════════════════════════════════════ */
function ScreenMesas({ local, pedidos }) {
  const totalMesas = local?.mesas || 20;
  const ocupadas = new Set(
    pedidos.filter((p) => p.status !== "entregado" && p.mesa_numero).map((p) => p.mesa_numero)
  );

  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Plano de mesas</h2>
        <div className="ap-sec-hdr-r">
          <div style={{ display: "flex", gap: 12, fontSize: 12, alignItems: "center" }}>
            <span><span style={{ color: "#3ecf6e" }}>●</span> Libre</span>
            <span><span style={{ color: "#e8a020" }}>●</span> Ocupada</span>
          </div>
          <button className="ap-btn ap-btn-gold ap-btn-sm">+ Agregar mesa</button>
        </div>
      </div>
      <div className="ap-card">
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 12, fontWeight: 700, letterSpacing: 1 }}>SALÓN</div>
        <div className="ap-mesas-grid">
          {Array.from({ length: totalMesas }, (_, i) => i + 1).map((num) => {
            const isOcupada = ocupadas.has(num);
            return (
              <div key={num} className={`ap-mesa ${isOcupada ? "ocupada" : "libre"}`}>
                <div className="ap-mesa-num">{num}</div>
                <div className="ap-mesa-status">{isOcupada ? "ocupada" : "libre"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: DELIVERY
══════════════════════════════════════════════════════════════ */
function ScreenDelivery({ pedidos, setPedidos, local }) {
  const deliveryOrders = pedidos.filter(
    (p) => !p.mesa_numero && p.status !== "entregado"
  );

  const delivCfg = local?.delivery_config || {};
  const zonas = delivCfg.zones || [
    { label: "Zona 1 (1km)", precio: 2000 },
    { label: "Zona 2 (2km)", precio: 4000 },
    { label: "Zona 3 (3km)", precio: 5000 },
  ];

  return (
    <div>
      <div className="ap-grid-2">
        <div>
          <div className="ap-sec-hdr" style={{ marginBottom: 14 }}>
            <h2>Pedidos delivery</h2>
            <div className="ap-live"><div className="ap-live-dot" />{deliveryOrders.length} activos</div>
          </div>
          <div className="ap-order-feed">
            {deliveryOrders.length === 0 && (
              <div className="ap-card" style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,.35)" }}>
                Sin pedidos delivery activos
              </div>
            )}
            {deliveryOrders.map((p) => (
              <div key={p.id} className="ap-order-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                  <div className="ap-order-num">#{p.id?.slice(-3)}</div>
                  <div className="ap-order-info">
                    <div className="ap-order-title">Delivery</div>
                    <div className="ap-order-detail">{p.nota || "Sin dirección"}</div>
                  </div>
                  <span className={`ap-pill ${statusClass(p.status)}`}>{statusLabel(p.status)}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", paddingLeft: 52 }}>
                  {pedidoItems(p)}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingLeft: 52 }}>
                  <span style={{ color: "#e8a020", fontWeight: 800 }}>{ARS(p.total)}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>
                    {p.metodo_pago || "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="ap-map-box">
            <div style={{ fontSize: 48 }}>🗺️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.65)" }}>Mapa en tiempo real</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Conectá un proveedor de mapas para ver rutas</div>
          </div>
          <div className="ap-card ap-card-sm" style={{ marginTop: 14 }}>
            <div className="ap-card-title">ZONAS DE DELIVERY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {zonas.map((z, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,.65)" }}>{z.label}</span>
                  <span style={{ color: "#e8a020", fontWeight: 700 }}>{ARS(z.precio)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: CATEGORÍAS
══════════════════════════════════════════════════════════════ */
function ScreenCategorias({ cats, prods }) {
  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Categorías</h2>
        <button className="ap-btn ap-btn-gold">+ Nueva categoría</button>
      </div>
      <div className="ap-card">
        <table>
          <thead>
            <tr>
              <th>ICONO</th><th>NOMBRE</th><th>PRODUCTOS</th><th>VISIBLE</th><th>ORDEN</th><th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => {
              const count = prods.filter((p) => p.cat === c.id).length;
              return (
                <tr key={c.id}>
                  <td style={{ fontSize: 22 }}>{c.icon || "📁"}</td>
                  <td>{c.label}</td>
                  <td>{count} productos</td>
                  <td>
                    <span className={`ap-pill ${c.activa !== false ? "pill-listo" : "pill-entregado"}`}>
                      {c.activa !== false ? "✓ Visible" : "Oculta"}
                    </span>
                  </td>
                  <td>{c.orden ?? "—"}</td>
                  <td><button className="ap-btn ap-btn-ghost ap-btn-sm">✏️ Editar</button></td>
                </tr>
              );
            })}
            {cats.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,.35)" }}>Sin categorías</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: STOCK (placeholder)
══════════════════════════════════════════════════════════════ */
const STOCK_DEMO = [
  { ing: "Carne vacuna", stock: 8.5, min: 5, unit: "kg", status: "ok" },
  { ing: "Harina 000", stock: 3.2, min: 5, unit: "kg", status: "bajo" },
  { ing: "Mozzarella", stock: 6.0, min: 3, unit: "kg", status: "ok" },
  { ing: "Tomate perita", stock: 12, min: 8, unit: "kg", status: "ok" },
  { ing: "Vino Malbec", stock: 2, min: 3, unit: "cajas", status: "bajo" },
  { ing: "Cerveza (barril)", stock: 1, min: 2, unit: "barriles", status: "critico" },
  { ing: "Papas", stock: 18, min: 10, unit: "kg", status: "ok" },
  { ing: "Aceite de oliva", stock: 4, min: 2, unit: "litros", status: "ok" },
];

function ScreenStock() {
  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Stock e inventario</h2>
        <button className="ap-btn ap-btn-gold">+ Agregar ítem</button>
      </div>
      <div className="ap-card">
        <table>
          <thead>
            <tr>
              <th>INGREDIENTE</th><th>STOCK ACTUAL</th><th>MÍNIMO</th><th>UNIDAD</th><th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {STOCK_DEMO.map((s, i) => (
              <tr key={i}>
                <td>{s.ing}</td>
                <td>{s.stock}</td>
                <td>{s.min}</td>
                <td>{s.unit}</td>
                <td>
                  {s.status === "ok" && <span className="ap-pill pill-listo">✓ OK</span>}
                  {s.status === "bajo" && <span className="ap-pill" style={{ background: "rgba(232,64,64,.1)", color: "#e84040" }}>⚠ BAJO</span>}
                  {s.status === "critico" && <span className="ap-pill" style={{ background: "rgba(232,64,64,.15)", color: "#e84040" }}>🔴 CRÍTICO</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: CLIENTES
══════════════════════════════════════════════════════════════ */
function ScreenClientes() {
  const [search, setSearch] = useState("");
  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Clientes</h2>
        <input
          type="text"
          placeholder="🔍 Buscar cliente..."
          style={{ width: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="ap-card" style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,.35)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "rgba(255,255,255,.65)" }}>
          Módulo de clientes
        </div>
        <div style={{ fontSize: 13 }}>
          Los clientes que pidan por delivery con nombre y teléfono aparecerán aquí.
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: CAJA
══════════════════════════════════════════════════════════════ */
function ScreenCaja({ pedidos, local }) {
  const today = new Date().toISOString().split("T")[0];
  const todayDelivered = pedidos.filter(
    (p) => p.status === "entregado" && p.created_at?.startsWith(today)
  );

  const byPago = {};
  todayDelivered.forEach((p) => {
    const m = p.metodo_pago || "otro";
    byPago[m] = (byPago[m] || 0) + (p.total || 0);
  });
  const totalHoy = todayDelivered.reduce((s, p) => s + (p.total || 0), 0);

  const METODOS = [
    { key: "efectivo", label: "EFECTIVO", icon: "💵" },
    { key: "mp", label: "MERCADO PAGO", icon: "📱" },
    { key: "tarjeta", label: "TARJETA", icon: "💳" },
    { key: "transferencia", label: "TRANSFERENCIA", icon: "🏦" },
  ];

  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Caja del día</h2>
        <button className="ap-btn ap-btn-gold">Cerrar caja</button>
      </div>
      <div className="ap-grid-4" style={{ marginBottom: 20 }}>
        {METODOS.map(({ key, label, icon }) => (
          <div key={key} className="ap-card ap-card-sm">
            <div className="ap-card-title">{icon} {label}</div>
            <div className="ap-card-num" style={{ fontSize: 24 }}>{ARS(byPago[key] || 0)}</div>
            <div className="ap-card-sub">
              {todayDelivered.filter((p) => p.metodo_pago === key).length} pedidos
            </div>
          </div>
        ))}
      </div>
      <div className="ap-card ap-card-sm" style={{ marginBottom: 20, borderColor: "rgba(232,160,32,.3)" }}>
        <div className="ap-card-title">💰 TOTAL DEL DÍA</div>
        <div className="ap-card-num" style={{ color: "#e8a020" }}>{ARS(totalHoy)}</div>
        <div className="ap-card-sub">{todayDelivered.length} pedidos entregados</div>
      </div>
      <div className="ap-card">
        <div className="ap-card-title">ÚLTIMAS TRANSACCIONES</div>
        <table>
          <thead>
            <tr><th>#</th><th>HORA</th><th>MESA</th><th>MÉTODO</th><th>TOTAL</th></tr>
          </thead>
          <tbody>
            {todayDelivered.slice(0, 10).map((p) => (
              <tr key={p.id}>
                <td>#{p.id?.slice(-4)}</td>
                <td>{new Date(p.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                <td>{pedidoTitle(p)}</td>
                <td>{p.metodo_pago || "—"}</td>
                <td style={{ color: "#e8a020", fontWeight: 700 }}>{ARS(p.total)}</td>
              </tr>
            ))}
            {todayDelivered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "rgba(255,255,255,.35)" }}>Sin transacciones hoy</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: REPORTES
══════════════════════════════════════════════════════════════ */
function ScreenReportes({ pedidos, prods }) {
  // last 7 days
  const weekOrders = pedidos.filter((p) => {
    const d = new Date(p.created_at);
    const diff = (Date.now() - d) / 86400000;
    return diff <= 7 && p.status === "entregado";
  });

  const ventasSemana = weekOrders.reduce((s, p) => s + (p.total || 0), 0);
  const pedidosSemana = weekOrders.length;
  const ticketProm = pedidosSemana ? Math.round(ventasSemana / pedidosSemana) : 0;

  // Top products
  const prodCounts = {};
  weekOrders.forEach((p) => {
    (p.pedido_items || []).forEach((item) => {
      prodCounts[item.nombre] = (prodCounts[item.nombre] || 0) + item.cantidad;
    });
  });
  const topProds = Object.entries(prodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCount = topProds[0]?.[1] || 1;

  // Hourly distribution
  const hours = {};
  weekOrders.forEach((p) => {
    const h = new Date(p.created_at).getHours();
    hours[h] = (hours[h] || 0) + 1;
  });
  const hourBars = [12, 13, 14, 15, 16, 19, 20, 21, 22].map((h) => ({
    h,
    val: hours[h] || 0,
  }));
  const maxH = Math.max(...hourBars.map((b) => b.val), 1);

  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Reportes y estadísticas</h2>
      </div>
      <div className="ap-grid-3" style={{ marginBottom: 20 }}>
        <div className="ap-card ap-card-sm">
          <div className="ap-card-title">VENTAS SEMANA</div>
          <div className="ap-card-num">{ARS(ventasSemana)}</div>
          <div className="ap-trend-up">↑ últimos 7 días</div>
        </div>
        <div className="ap-card ap-card-sm">
          <div className="ap-card-title">PEDIDOS SEMANA</div>
          <div className="ap-card-num">{pedidosSemana}</div>
          <div className="ap-trend-up">↑ entregados</div>
        </div>
        <div className="ap-card ap-card-sm">
          <div className="ap-card-title">TICKET PROMEDIO</div>
          <div className="ap-card-num">{ARS(ticketProm)}</div>
        </div>
      </div>
      <div className="ap-flex">
        <div className="ap-card ap-flex-1">
          <div className="ap-card-title">TOP PRODUCTOS MÁS VENDIDOS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {topProds.length === 0 && (
              <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13, textAlign: "center", padding: 16 }}>Sin datos</div>
            )}
            {topProds.map(([name, count]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{name}</div>
                  <div className="ap-progress" style={{ marginTop: 4 }}>
                    <div className="ap-progress-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                </div>
                <span style={{ color: "#e8a020", fontWeight: 700, fontSize: 13 }}>{count} und.</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ap-card" style={{ width: 260 }}>
          <div className="ap-card-title">HORARIO PICO</div>
          <div className="ap-bar-chart">
            {hourBars.map((b) => (
              <div key={b.h} className="ap-bar-col">
                <div className="ap-bar" style={{ height: `${(b.val / maxH) * 100}%` }} />
                <div className="ap-bar-label">{b.h}h</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: QR Y LINKS
══════════════════════════════════════════════════════════════ */
function ScreenQR({ local }) {
  const slug = local?.slug || "mi-restaurante";
  const base = `menuqr.app/menu/${slug}`;

  function copyLink(url) {
    navigator.clipboard.writeText(url).catch(() => {});
    alert(`Copiado: ${url}`);
  }

  const QRCard = ({ icon, title, desc, url, extra }) => (
    <div className="ap-card" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 16 }}>{desc}</div>
      <div style={{ background: "#262626", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 10, color: "rgba(255,255,255,.35)", fontFamily: "monospace", wordBreak: "break-all" }}>
        {url}
      </div>
      {extra}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
        <button className="ap-btn ap-btn-ghost ap-btn-sm">⬇ Descargar QR</button>
        <button className="ap-btn ap-btn-gold ap-btn-sm" onClick={() => copyLink(url)}>📋 Copiar link</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="ap-sec-hdr"><h2>QR y links de acceso</h2></div>
      <div className="ap-grid-3" style={{ marginBottom: 16 }}>
        <QRCard icon="📱" title="QR Vitrina" desc="Presentación del local para la entrada" url={`https://${base}/vitrina`} />
        <QRCard
          icon="🪑"
          title="QR por Mesa"
          desc="Cada mesa tiene su propio QR para pedir"
          url={`https://${base}/mesa/1`}
          extra={
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#262626", padding: "6px 12px", borderRadius: 8, fontSize: 12 }}>
                  <span>Mesa {n}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="ap-btn ap-btn-ghost ap-btn-sm">Ver QR</button>
                    <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => copyLink(`https://${base}/mesa/${n}`)}>Copiar</button>
                  </div>
                </div>
              ))}
            </div>
          }
        />
        <QRCard icon="🛵" title="Link Delivery" desc="Para compartir por redes o WhatsApp" url={`https://${base}/delivery`} />
      </div>
      <div className="ap-grid-2">
        {/* WiFi QR */}
        <div className="ap-card" style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ fontSize: 56, flexShrink: 0 }}>📶</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>QR WiFi del local</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 14 }}>
              Los clientes escanean y se conectan automáticamente
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div className="ap-form-group" style={{ flex: 1, margin: 0 }}>
                <label>Red (SSID)</label>
                <input type="text" defaultValue={local?.wifi_ssid || ""} placeholder="Nombre de la red" />
              </div>
              <div className="ap-form-group" style={{ flex: 1, margin: 0 }}>
                <label>Contraseña</label>
                <input type="text" defaultValue={local?.wifi_pass || ""} placeholder="Contraseña" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ap-btn ap-btn-ghost ap-btn-sm">⬇ Descargar QR</button>
              <button className="ap-btn ap-btn-gold ap-btn-sm">🔄 Actualizar</button>
            </div>
          </div>
        </div>
        {/* Promo QR */}
        <div className="ap-card" style={{ borderColor: "rgba(232,160,32,.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 28 }}>🏷️</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>QR Promoción del día</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>El cliente escanea y ve la oferta activa</div>
            </div>
          </div>
          <div className="ap-form-group">
            <label>Descripción de la promoción</label>
            <input type="text" placeholder="Ej: 50% OFF en bifes de chorizo hasta las 23:59" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="ap-btn ap-btn-ghost ap-btn-sm">⬇ Descargar QR</button>
            <button className="ap-btn ap-btn-gold ap-btn-sm">💾 Guardar promo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: CONFIGURACIÓN
══════════════════════════════════════════════════════════════ */
function ScreenConfiguracion({ local, setLocal }) {
  const PAGOS_OPTS = ["efectivo","tarjeta","mercadopago","transferencia"];
  const PAGOS_LABELS = {efectivo:"Efectivo",tarjeta:"Tarjeta (déb/créd)",mercadopago:"Mercado Pago",transferencia:"Transferencia"};

  const [form, setForm] = React.useState({
    nombre:              local?.nombre || "",
    slug:                local?.slug || "",
    telefono:            local?.telefono || "",
    direccion:           local?.direccion || "",
    descripcion:         local?.descripcion || "",
    horario:             local?.horario || "",
    mesas:               local?.mesas || 0,
    wifi_ssid:           local?.wifi_ssid || "",
    wifi_pass:           local?.wifi_pass || "",
    logo_url:            local?.logo_url || "",
    metodos_pago:        local?.metodos_pago || ["efectivo","tarjeta","mercadopago"],
    retiro_habilitado:   local?.retiro_habilitado !== false,
    retiro_horario:      local?.retiro_horario || "Lunes a Domingo 12:00 - 23:00",
    delivery_habilitado: local?.delivery_habilitado !== false,
    delivery_precio:     local?.delivery_precio || 0,
    delivery_horario:    local?.delivery_horario || "",
    delivery_radio:      local?.delivery_radio || "",
  });
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function togglePago(p) {
    setForm(f => ({
      ...f,
      metodos_pago: f.metodos_pago.includes(p)
        ? f.metodos_pago.filter(x => x !== p)
        : [...f.metodos_pago, p],
    }));
  }

  async function handleSave() {
    setSaving(true);
    if (setLocal) setLocal(prev => ({ ...prev, ...form }));
    if (supabase && local?.restauranteId) {
      await supabase.from("restaurantes").update({
        nombre:              form.nombre,
        slug:                form.slug,
        telefono:            form.telefono,
        direccion:           form.direccion,
        descripcion:         form.descripcion,
        horario:             form.horario,
        mesas:               form.mesas,
        wifi_ssid:           form.wifi_ssid,
        wifi_pass:           form.wifi_pass,
        logo_url:            form.logo_url,
        metodos_pago:        form.metodos_pago,
        retiro_habilitado:   form.retiro_habilitado,
        retiro_horario:      form.retiro_horario,
        delivery_habilitado: form.delivery_habilitado,
        delivery_precio:     form.delivery_precio,
        delivery_horario:    form.delivery_horario,
        delivery_radio:      form.delivery_radio,
      }).eq("id", local.restauranteId);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <div className="ap-sec-hdr"><h2>Configuración del local</h2></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ─ Datos básicos ─ */}
        <div className="ap-card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--gold)" }}>📋 Datos del restaurante</div>
          <div className="ap-grid-2">
            <div className="ap-form-group">
              <label>Nombre del local</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Mi Restaurante" />
            </div>
            <div className="ap-form-group">
              <label>Slug (URL pública)</label>
              <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="mi-restaurante" />
            </div>
            <div className="ap-form-group">
              <label>Teléfono / WhatsApp</label>
              <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+54 9 11..." />
            </div>
            <div className="ap-form-group">
              <label>Cantidad de mesas</label>
              <input type="number" value={form.mesas} onChange={e => setForm({ ...form, mesas: Number(e.target.value) })} min={0} />
            </div>
          </div>
          <div className="ap-form-group">
            <label>Dirección</label>
            <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Av. Corrientes 1234" />
          </div>
          <div className="ap-form-group">
            <label>Descripción breve (se muestra en la vitrina)</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="El mejor restaurante de la zona..." rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          <div className="ap-grid-2">
            <div className="ap-form-group">
              <label>Horario de atención</label>
              <input type="text" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} placeholder="Mar–Dom 12:00–23:00" />
            </div>
            <div className="ap-form-group">
              <label>URL del logo (imagen)</label>
              <input type="text" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* ─ Delivery ─ */}
        <div className="ap-card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--gold)" }}>🛵 Delivery</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Delivery habilitado</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Los clientes podrán pedir con envío a domicilio</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: form.delivery_habilitado ? "#00FF88" : "rgba(255,255,255,.35)" }}>
                {form.delivery_habilitado ? "Habilitado" : "Deshabilitado"}
              </span>
              <div onClick={() => setForm(f => ({ ...f, delivery_habilitado: !f.delivery_habilitado }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: form.delivery_habilitado ? "rgba(0,255,136,.3)" : "rgba(255,255,255,.1)", border: `1px solid ${form.delivery_habilitado ? "rgba(0,255,136,.5)" : "rgba(255,255,255,.1)"}`, position: "relative", transition: "all .25s", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: 3, left: form.delivery_habilitado ? 20 : 3, width: 14, height: 14, borderRadius: "50%", background: form.delivery_habilitado ? "#00FF88" : "rgba(255,255,255,.4)", transition: "left .25s" }} />
              </div>
            </div>
          </div>
          {form.delivery_habilitado && (
            <div className="ap-grid-2">
              <div className="ap-form-group">
                <label>Precio de envío (ARS)</label>
                <input type="number" value={form.delivery_precio} onChange={e => setForm({ ...form, delivery_precio: Number(e.target.value) })} placeholder="0" min={0} />
              </div>
              <div className="ap-form-group">
                <label>Radio de entrega</label>
                <input type="text" value={form.delivery_radio} onChange={e => setForm({ ...form, delivery_radio: e.target.value })} placeholder="Ej: 5 km, barrio centro" />
              </div>
              <div className="ap-form-group" style={{ gridColumn: "1/-1" }}>
                <label>Horario de delivery</label>
                <input type="text" value={form.delivery_horario} onChange={e => setForm({ ...form, delivery_horario: e.target.value })} placeholder="Lunes a Domingo 12:00–23:00" />
              </div>
            </div>
          )}
        </div>

        {/* ─ WiFi ─ */}
        <div className="ap-card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--gold)" }}>📶 WiFi del local</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 14 }}>
            Se muestra en el QR vitrina para que los clientes se conecten automáticamente.
          </div>
          <div className="ap-grid-2">
            <div className="ap-form-group">
              <label>Nombre de la red (SSID)</label>
              <input type="text" value={form.wifi_ssid} onChange={e => setForm({ ...form, wifi_ssid: e.target.value })} placeholder="MiRed_WiFi" />
            </div>
            <div className="ap-form-group">
              <label>Contraseña</label>
              <input type="text" value={form.wifi_pass} onChange={e => setForm({ ...form, wifi_pass: e.target.value })} placeholder="contraseña123" />
            </div>
          </div>
        </div>

        {/* ─ Métodos de pago ─ */}
        <div className="ap-card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--gold)" }}>💳 Métodos de pago aceptados</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {PAGOS_OPTS.map(p => (
              <label key={p} style={{ display: "flex", alignItems: "center", gap: 10, background: form.metodos_pago.includes(p) ? "rgba(201,168,76,.1)" : "rgba(255,255,255,.03)", border: `1px solid ${form.metodos_pago.includes(p) ? "rgba(201,168,76,.35)" : "rgba(255,255,255,.07)"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all .2s" }}>
                <input type="checkbox" checked={form.metodos_pago.includes(p)} onChange={() => togglePago(p)} style={{ accentColor: "#c9a84c", width: 16, height: 16 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{PAGOS_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ─ Retiro en local ─ */}
        <div className="ap-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>🏪 Retiro en el local</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: form.retiro_habilitado ? "#00FF88" : "rgba(255,255,255,.35)" }}>
                {form.retiro_habilitado ? "Habilitado" : "Deshabilitado"}
              </span>
              <div onClick={() => setForm(f => ({ ...f, retiro_habilitado: !f.retiro_habilitado }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: form.retiro_habilitado ? "rgba(0,255,136,.3)" : "rgba(255,255,255,.1)", border: `1px solid ${form.retiro_habilitado ? "rgba(0,255,136,.5)" : "rgba(255,255,255,.1)"}`, position: "relative", transition: "all .25s", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: 3, left: form.retiro_habilitado ? 20 : 3, width: 14, height: 14, borderRadius: "50%", background: form.retiro_habilitado ? "#00FF88" : "rgba(255,255,255,.4)", transition: "left .25s" }} />
              </div>
            </div>
          </div>
          {form.retiro_habilitado && (
            <div className="ap-form-group">
              <label>Horario de retiro</label>
              <input type="text" value={form.retiro_horario} onChange={e => setForm({ ...form, retiro_horario: e.target.value })} placeholder="Lunes a Domingo 12:00 - 23:00" />
            </div>
          )}
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 8 }}>
            Se muestra en el QR vitrina como opción de pedido sin costo de envío.
          </div>
        </div>

        {/* ─ Guardar ─ */}
        <button className="ap-btn ap-btn-gold" onClick={handleSave} disabled={saving}
          style={{ padding: "14px", fontSize: 14, opacity: saving ? .7 : 1 }}>
          {saving ? "Guardando..." : saved ? "✅ ¡Guardado!" : "💾 Guardar todos los cambios"}
        </button>

        {/* ─ Info sistema ─ */}
        <div className="ap-card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--gold)" }}>ℹ️ Información del sistema</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[["Versión","MenuQR 2.0"],["Plan","Pro"],["Estado","✅ Activo"]].map(([k,v])=>(
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text2)" }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   SCREEN: GESTIÓN RÁPIDA
══════════════════════════════════════════════════════════════ */
function ScreenGestion({ prods, setProds, cats, local, setLocal }) {
  const ridl = local?.restauranteId;
  const [search, setSearch] = React.useState('');
  const [showPrecioModal, setShowPrecioModal] = React.useState(false);
  const [precioItem, setPrecioItem] = React.useState(null);
  const [nuevoPrecio, setNuevoPrecio] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [savedId, setSavedId] = React.useState(null);
  const [pausaPedidos, setPausaPedidos] = React.useState(local?.pausa_pedidos || false);
  const [pausaDelivery, setPausaDelivery] = React.useState(!(local?.delivery_habilitado !== false));

  const vitranaUrl = local?.slug ? `https://menuqr.vercel.app/v/${local.slug}` : null;

  const prodsFiltrados = prods.filter(p =>
    !search || p.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActivo = async (prod) => {
    const nuevoEstado = !prod.activo;
    if (supabase) {
      await supabase.from('productos').update({ activo: nuevoEstado }).eq('id', prod.id);
    }
    if (setProds) setProds(prev => prev.map(p => p.id === prod.id ? {...p, activo: nuevoEstado} : p));
    setSavedId(prod.id);
    setTimeout(() => setSavedId(null), 1200);
  };

  const openPrecio = (prod) => {
    setPrecioItem(prod);
    setNuevoPrecio(String(prod.precio));
    setShowPrecioModal(true);
  };

  const guardarPrecio = async () => {
    if (!precioItem || !nuevoPrecio) return;
    setSaving(true);
    const p = parseFloat(nuevoPrecio);
    if (supabase) {
      await supabase.from('productos').update({ precio: p }).eq('id', precioItem.id);
    }
    if (setProds) setProds(prev => prev.map(x => x.id === precioItem.id ? {...x, precio: p} : x));
    setSaving(false);
    setShowPrecioModal(false);
  };

  const togglePausa = async (campo, valor, setter) => {
    setter(valor);
    if (supabase && ridl) {
      await supabase.from('restaurantes').update({ [campo]: valor }).eq('id', ridl);
    }
    if (setLocal) setLocal(prev => ({ ...prev, [campo]: valor }));
  };

  const copiarLink = () => {
    if (vitranaUrl) { navigator.clipboard.writeText(vitranaUrl); }
  };

  const ARS = (n) => '$ ' + Number(n||0).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ─ Controles rápidos ─ */}
      <div className="ap-grid-2" style={{ gap: 12 }}>

        {/* Pausa pedidos */}
        <div className="ap-card" style={{ borderColor: pausaPedidos ? 'rgba(239,68,68,.4)' : 'var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>⏸️ Pausar pedidos</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Bloquea nuevos pedidos del sistema</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div onClick={() => togglePausa('pausa_pedidos', !pausaPedidos, setPausaPedidos)}
                style={{ width: 44, height: 24, borderRadius: 12, background: pausaPedidos ? 'rgba(239,68,68,.3)' : 'rgba(0,255,136,.15)', border: `1px solid ${pausaPedidos ? 'rgba(239,68,68,.5)' : 'rgba(0,255,136,.3)'}`, position: 'relative', cursor: 'pointer', transition: 'all .25s' }}>
                <div style={{ position: 'absolute', top: 4, left: pausaPedidos ? 22 : 4, width: 14, height: 14, borderRadius: '50%', background: pausaPedidos ? '#ef4444' : '#00ff88', transition: 'left .25s' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: pausaPedidos ? '#ef4444' : '#00ff88' }}>{pausaPedidos ? 'PAUSADO' : 'ACTIVO'}</span>
            </div>
          </div>
        </div>

        {/* Pausa delivery */}
        <div className="ap-card" style={{ borderColor: pausaDelivery ? 'rgba(239,68,68,.4)' : 'var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>🛵 Pausar delivery</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Desactiva el delivery temporalmente</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div onClick={() => togglePausa('delivery_habilitado', pausaDelivery, v => setPausaDelivery(!v))}
                style={{ width: 44, height: 24, borderRadius: 12, background: pausaDelivery ? 'rgba(239,68,68,.3)' : 'rgba(0,255,136,.15)', border: `1px solid ${pausaDelivery ? 'rgba(239,68,68,.5)' : 'rgba(0,255,136,.3)'}`, position: 'relative', cursor: 'pointer', transition: 'all .25s' }}>
                <div style={{ position: 'absolute', top: 4, left: pausaDelivery ? 22 : 4, width: 14, height: 14, borderRadius: '50%', background: pausaDelivery ? '#ef4444' : '#00ff88', transition: 'left .25s' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: pausaDelivery ? '#ef4444' : '#00ff88' }}>{pausaDelivery ? 'PAUSADO' : 'ACTIVO'}</span>
            </div>
          </div>
        </div>

        {/* Link vitrina */}
        <div className="ap-card">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 8 }}>🔗 Link de la vitrina</div>
          {vitranaUrl
            ? <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vitranaUrl}</div>
                <button className="ap-btn ap-btn-gold" style={{ padding: '6px 12px', fontSize: 12 }} onClick={copiarLink}>Copiar</button>
                <a href={vitranaUrl} target="_blank" rel="noreferrer" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Abrir ↗</a>
              </div>
            : <div style={{ fontSize: 12, color: 'var(--text3)' }}>Configurá el slug en Configuración para ver el link</div>
          }
        </div>

        {/* Ir a configuración */}
        <div className="ap-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 28 }}>⚙️</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>Configuración completa</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Datos, delivery, pagos, WiFi y más</div>
        </div>
      </div>

      {/* ─ Productos: activar/desactivar + precio rápido ─ */}
      <div className="ap-card">
        <div className="ap-sec-hdr" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 14 }}>🍽️ Productos — activar / precio rápido</h2>
        </div>
        <input
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: '100%', boxSizing: 'border-box', marginBottom: 12, outline: 'none' }}
          placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
          {prodsFiltrados.map(p => {
            const cat = cats.find(c => c.id === p.categoria_id);
            const isOn = p.activo !== false;
            const justSaved = savedId === p.id;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isOn ? 'var(--bg3)' : 'rgba(239,68,68,.06)', border: `1px solid ${isOn ? 'var(--border)' : 'rgba(239,68,68,.2)'}`, borderRadius: 10, transition: 'all .2s' }}>
                {p.foto_url
                  ? <img src={p.foto_url} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display='none'}/>
                  : <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--bg4)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isOn ? 'var(--text)' : 'var(--text3)' }}>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{cat?.nombre || '—'}</div>
                </div>
                <button className="ap-btn" style={{ padding: '5px 10px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)' }} onClick={() => openPrecio(p)}>
                  {ARS(p.precio)} ✏️
                </button>
                <div onClick={() => toggleActivo(p)}
                  style={{ width: 44, height: 24, borderRadius: 12, background: isOn ? 'rgba(0,255,136,.15)' : 'rgba(239,68,68,.2)', border: `1px solid ${isOn ? 'rgba(0,255,136,.3)' : 'rgba(239,68,68,.4)'}`, position: 'relative', cursor: 'pointer', transition: 'all .25s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 4, left: isOn ? 22 : 4, width: 14, height: 14, borderRadius: '50%', background: isOn ? '#00ff88' : '#ef4444', transition: 'left .25s' }} />
                </div>
                {justSaved && <span style={{ fontSize: 10, color: '#00ff88', fontWeight: 700, position: 'absolute', marginLeft: 4 }}>✓</span>}
              </div>
            );
          })}
          {prodsFiltrados.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>Sin productos</div>}
        </div>
      </div>

      {/* Modal precio */}
      {showPrecioModal && precioItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: 320 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>✏️ Cambiar precio</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{precioItem.nombre}</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Nuevo precio</label>
              <input type="number" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} autoFocus
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 15, width: '100%', boxSizing: 'border-box', outline: 'none' }}/>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ap-btn" style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={() => setShowPrecioModal(false)}>Cancelar</button>
              <button className="ap-btn ap-btn-gold" style={{ flex: 1 }} disabled={saving} onClick={guardarPrecio}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN ADMIN PANEL
══════════════════════════════════════════════════════════════ */
export default function AdminPanel({ local, setLocal, cats, setCats, prods, setProds, authUser, onLogout }) {
  const [screen, setScreen] = React.useState("dashboard");
  const [pedidos, setPedidos] = React.useState([]);
  const [clock, setClock] = React.useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getPedidos().then((data) => { if (data) setPedidos(data); });
    const unsub = subscribePedidos((payload) => {
      setPedidos((prev) => {
        const { eventType, new: nuevo, old } = payload;
        if (eventType === "INSERT") return [nuevo, ...prev];
        if (eventType === "UPDATE") return prev.map((p) => (p.id === nuevo.id ? nuevo : p));
        if (eventType === "DELETE") return prev.filter((p) => p.id !== old.id);
        return prev;
      });
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const pendingCount = pedidos.filter((p) => p.status === "pendiente").length;
  const kitchenCount = pedidos.filter((p) => p.status === "en_cocina").length;

  const screenMap = {
    dashboard: <ScreenDashboard pedidos={pedidos} cats={cats} prods={prods} local={local} />,
    pedidos:   <ScreenPedidos pedidos={pedidos} setPedidos={setPedidos} local={local} />,
    cocina:    <ScreenCocina pedidos={pedidos} setPedidos={setPedidos} />,
    delivery:  <ScreenDelivery pedidos={pedidos} setPedidos={setPedidos} local={local} />,
    mesas:     <ScreenMesas local={local} pedidos={pedidos} />,
    carta:     <ScreenCarta prods={prods} setProds={setProds} cats={cats} local={local} />,
    categorias:<ScreenCategorias cats={cats} prods={prods} />,
    stock:     <ScreenStock />,
    clientes:  <ScreenClientes />,
    caja:      <ScreenCajaPOS prods={prods} cats={cats} local={local} />,
    reportes:  <ScreenReportes pedidos={pedidos} prods={prods} />,
    qr:        <ScreenQR local={local} />,
    config:    <ScreenConfiguracion local={local} setLocal={setLocal} />,
    gestion:   <ScreenGestion prods={prods} setProds={setProds} cats={cats} local={local} setLocal={setLocal} />,
  };

  return (
    <>
      <style>{AP_STYLES}</style>
      <div id="ap2-root">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Topbar screen={screen} clock={clock} />
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {screenMap[screen] || <ScreenDashboard pedidos={pedidos} cats={cats} prods={prods} local={local} />}
          </div>
        </div>
        <Sidebar
          screen={screen}
          setScreen={setScreen}
          pendingCount={pendingCount}
          kitchenCount={kitchenCount}
          local={local}
          onLogout={onLogout}
        />
      </div>
    </>
  );
}
