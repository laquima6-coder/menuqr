import React, { useState, useEffect, useRef, useCallback } from "react";
import QRCodeLib from "qrcode";
import ScreenCajaPOS from "./ScreenCajaPOS.jsx";
import { supabase, getPedidos, updatePedidoStatus, subscribePedidos,
         toggleProducto, upsertCategoria, deleteCategoria, upsertProducto, deleteProducto } from "../lib/supabase.js";

/* Supabase storage (anon key, bucket product-images debe tener RLS off o policy permisiva) */
const supabaseAdmin = supabase;

/* ══ AUDIO ALERTS ══════════════════════════════════════════ */
let _alarmCtx = null;
function playAlarm(type = 'nuevo') {
  try {
    if (!_alarmCtx) _alarmCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _alarmCtx;
    const sounds = {
      nuevo:    [[880,.00,.12],[1100,.18,.10],[880,.32,.10],[1100,.48,.12]],
      cocina:   [[660,.00,.10],[880,.15,.10],[660,.30,.08]],
      listo:    [[880,.00,.08],[1100,.12,.08],[1320,.26,.18],[1100,.48,.10]],
      entregado:[[660,.00,.08],[660,.14,.08]],
    };
    const pairs = sounds[type] || sounds.nuevo;
    pairs.forEach(([freq, delay, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + delay + .02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + .05);
    });
  } catch {}
}

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
    --sidebar:320px; --header:60px; --radius:12px;
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
  @keyframes ap-newpop { from { transform:scale(.96); opacity:0 } to { transform:scale(1); opacity:1 } }
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
  #ap2-root .pill-pago { background:rgba(245,158,11,.15); color:#f59e0b; border:1px solid rgba(245,158,11,.3) }
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
  /* MOBILE — sidebar como drawer desde la derecha */
  @media (max-width:768px){
    #ap2-root { flex-direction:column; height:100dvh }
    #ap2-root .ap-sidebar {
      position:fixed; top:0; right:0; height:100dvh; z-index:300;
      transform:translateX(100%); transition:transform .28s cubic-bezier(.4,0,.2,1);
      box-shadow:-8px 0 40px rgba(0,0,0,.6);
      width:min(320px,88vw) !important;
    }
    #ap2-root .ap-sidebar.nav-open { transform:translateX(0) }
    #ap2-root .ap-overlay {
      display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:299;
      backdrop-filter:blur(2px);
    }
    #ap2-root .ap-overlay.nav-open { display:block }
    #ap2-root .ap-menu-btn {
      display:flex; align-items:center; justify-content:center;
      width:38px; height:38px; border-radius:10px; border:1px solid var(--border2);
      background:var(--bg3); cursor:pointer; font-size:18px; flex-shrink:0;
    }
    #ap2-root .ap-sidebar-close {
      display:flex; align-items:center; justify-content:center;
      width:32px; height:32px; border-radius:8px; border:1px solid var(--border);
      background:var(--bg3); cursor:pointer; font-size:16px; color:var(--text2); flex-shrink:0;
    }
    #ap2-root .ap-topbar { padding:0 14px; gap:10px }
    #ap2-root .ap-content { padding:16px }
    #ap2-root .ap-topbar-time { display:none }
    #ap2-root .ap-nav-item { padding:13px 14px; font-size:14px }
  }
  @media (min-width:769px){
    #ap2-root .ap-menu-btn { display:none }
    #ap2-root .ap-sidebar-close { display:none }
    #ap2-root .ap-overlay { display:none !important }
  }
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
  if (s === "pendiente_pago") return "pill-pago";
  if (s === "nuevo") return "pill-nuevo";
  if (s === "preparando") return "pill-prep";
  if (s === "listo") return "pill-listo";
  return "pill-entregado";
}

function statusLabel(s) {
  if (s === "pendiente_pago") return "💳 PAGO PEND.";
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
  carta: "Carta",
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
function Sidebar({ screen, setScreen, pendingCount, kitchenCount, local, onLogout, open, onClose }) {
  const nav = (id, icon, label, badge) => (
    <div
      key={id}
      className={`ap-nav-item${screen === id ? " active" : ""}`}
      onClick={() => { setScreen(id); onClose?.(); }}
    >
      <span className="ap-nav-icon">{icon}</span>
      {label}
      {badge > 0 && <span className="ap-badge">{badge}</span>}
    </div>
  );

  const initial = (local?.nombre || "A").charAt(0).toUpperCase();

  return (
    <div className={`ap-sidebar${open ? " nav-open" : ""}`}>
      <div className="ap-logo">
        <div className="ap-logo-icon">🍽️</div>
        <div style={{flex:1}}>
          <div className="ap-logo-name">MenuQR</div>
          <div className="ap-logo-tag">SISTEMA DE GESTIÓN</div>
        </div>
        <div className="ap-sidebar-close" onClick={onClose}>✕</div>
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
          {nav("carta", "📋", "Carta")}
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
function Topbar({ screen, clock, onMenuOpen }) {
  const timeStr = clock.toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  return (
    <div className="ap-topbar">
      <div className="ap-topbar-title">{SCREEN_TITLES[screen] || screen}</div>
      <div className="ap-live"><div className="ap-live-dot" />EN VIVO</div>
      <div className="ap-topbar-time">{timeStr}</div>
      <div className="ap-menu-btn" onClick={onMenuOpen}>☰</div>
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
   SCREEN: PEDIDOS  (kanban: Nuevo → Cocina → Entregar)
══════════════════════════════════════════════════════════════ */
function ScreenPedidos({ pedidos, setPedidos, local }) {
  const [filter, setFilter] = useState("activos");
  const today = new Date().toISOString().split("T")[0];

  const filtered = pedidos.filter((p) => {
    if (filter === "activos") return p.status !== "entregado" && p.status !== "cancelado";
    if (filter === "hoy") return p.created_at?.startsWith(today);
    return true;
  });

  const nuevos    = filtered.filter(p => p.status === "nuevo" || p.status === "pendiente_pago");
  const enCocina  = filtered.filter(p => p.status === "preparando");
  const listos    = filtered.filter(p => p.status === "listo" || p.status === "en_camino");
  const historial = filter !== "activos" ? filtered.filter(p => p.status === "entregado" || p.status === "cancelado") : [];

  async function toCocinaTx(p) {
    if (p.status === "pendiente_pago") {
      await supabase?.from("pedidos").update({ status: "nuevo" }).eq("id", p.id);
      setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, status: "nuevo" } : o));
      return;
    }
    playAlarm('cocina');
    await updatePedidoStatus(p.id, "preparando");
    setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, status: "preparando" } : o));
  }

  async function entregar(p) {
    await updatePedidoStatus(p.id, "entregado");
    setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, status: "entregado" } : o));
  }

  const colStyle = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 };
  const colHdr = (label, count, color, glow) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }}/>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 700, color, letterSpacing: 1 }}>{label}</span>
      <span style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.35)" }}>{count}</span>
    </div>
  );

  function OrderKanban({ p, actions }) {
    const mins = minutesSince(p.created_at);
    const isUrgent = mins > 20;
    return (
      <div style={{
        background: "#161616", border: `1px solid ${isUrgent ? "rgba(232,64,64,.4)" : "rgba(255,255,255,.08)"}`,
        borderRadius: 12, padding: "13px 14px",
        boxShadow: isUrgent ? "0 0 12px rgba(232,64,64,.15)" : "none",
        animation: p.status === "nuevo" ? "ap-newpop .3s ease" : "none",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 800, color: "#e8a020" }}>#{p.id?.slice(-4)}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {p.mesa_numero > 0 && <span style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, padding: "2px 8px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#A0B8C8" }}>MESA {p.mesa_numero}</span>}
            {p.tipo_pedido === "delivery" && <span style={{ background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.4)", borderRadius: 6, padding: "2px 8px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#C9A84C" }}>🛵 DELIVERY</span>}
            {p.tipo_pedido === "retiro" && <span style={{ background: "rgba(37,211,102,.1)", border: "1px solid rgba(37,211,102,.3)", borderRadius: 6, padding: "2px 8px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#25D366" }}>🏪 RETIRO</span>}
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: isUrgent ? "#e84040" : "rgba(255,255,255,.35)" }}>{minutesSince(p.created_at)}m</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginBottom: 8, lineHeight: 1.5 }}>
          {(p.pedido_items || []).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "#e8a020", fontFamily: "'IBM Plex Mono',monospace", minWidth: 18 }}>x{item.cantidad}</span>
              <span>{item.nombre}</span>
            </div>
          ))}
          {!p.pedido_items?.length && <span style={{ color: "rgba(255,255,255,.35)" }}>{pedidoItems(p)}</span>}
        </div>
        {p.tipo_pedido === "delivery" && p.direccion_cliente && (
          <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.2)", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "#C9A84C", marginBottom: 6 }}>
            📍 {p.direccion_cliente}{p.entrecalles ? ` (entre ${p.entrecalles})` : ""}
            {p.nombre_cliente && <span style={{ color: "rgba(255,255,255,.45)", marginLeft: 8 }}>👤 {p.nombre_cliente}</span>}
          </div>
        )}
        {p.nota && !p.tipo_pedido?.match(/delivery|retiro/) && <div style={{ background: "rgba(255,176,32,.08)", border: "1px solid rgba(255,176,32,.2)", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "#FFB020", marginBottom: 8 }}>📝 {p.nota}</div>}
        {(p.tipo_pedido === "delivery" || p.tipo_pedido === "retiro") && p.nota && <div style={{ background: "rgba(255,176,32,.08)", border: "1px solid rgba(255,176,32,.2)", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "#FFB020", marginBottom: 8 }}>📝 {p.nota?.split("|").filter(s=>s.startsWith("Obs:")).map(s=>s.slice(4)).join("")||p.nota}</div>}
        <div style={{ fontWeight: 700, fontSize: 12, color: "#e8a020", marginBottom: 10 }}>{ARS(p.total)}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {actions}
        </div>
      </div>
    );
  }

  const btnStyle = (bg, color, border) => ({
    flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${border}`,
    background: bg, color, fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
    fontWeight: 700, cursor: "pointer", letterSpacing: .5,
  });

  return (
    <div>
      <div className="ap-sec-hdr" style={{ marginBottom: 16 }}>
        <h2>Pedidos</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["activos","hoy","todos"].map(f => (
            <button key={f} className={`ap-btn ap-btn-sm ${filter===f?"ap-btn-gold":"ap-btn-ghost"}`} onClick={() => setFilter(f)}>
              {f === "activos" ? `Activos (${pedidos.filter(p=>p.status!=="entregado").length})` : f === "hoy" ? `Hoy (${pedidos.filter(p=>p.created_at?.startsWith(today)).length})` : "Historial"}
            </button>
          ))}
        </div>
      </div>

      {filter === "activos" && (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* NUEVOS */}
          <div style={colStyle}>
            {colHdr("NUEVO", nuevos.length, "#FFB020", "#FFB020")}
            {nuevos.length === 0 ? <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "24px 0" }}>Sin pedidos nuevos</div>
              : nuevos.map(p => (
                <OrderKanban key={p.id} p={p} actions={[
                  <button key="c" style={btnStyle("rgba(61,142,255,.15)","#3D8EFF","rgba(61,142,255,.35)")} onClick={() => toCocinaTx(p)}>
                    {p.status === "pendiente_pago" ? "✅ Pago ok" : "👨‍🍳 Cocina"}
                  </button>
                ]}/>
              ))
            }
          </div>
          {/* EN COCINA */}
          <div style={colStyle}>
            {colHdr("EN COCINA", enCocina.length, "#3D8EFF", "#3D8EFF")}
            {enCocina.length === 0 ? <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "24px 0" }}>Nada en cocina</div>
              : enCocina.map(p => (
                <OrderKanban key={p.id} p={p} actions={[
                  <button key="l" style={btnStyle("rgba(0,255,136,.1)","#00FF88","rgba(0,255,136,.3)")} onClick={async () => {
                    playAlarm('listo');
                    await updatePedidoStatus(p.id, "listo");
                    setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, status: "listo" } : o));
                  }}>✓ Listo</button>
                ]}/>
              ))
            }
          </div>
          {/* LISTO — ENTREGAR */}
          <div style={colStyle}>
            {colHdr("ENTREGAR", listos.length, "#00FF88", "#00FF88")}
            {listos.length === 0 ? <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12, padding: "24px 0" }}>Sin pedidos listos</div>
              : listos.map(p => (
                <OrderKanban key={p.id} p={p} actions={
                  p.tipo_pedido === "delivery" ? (
                    p.status === "en_camino" ? [
                      <button key="ed" style={btnStyle("rgba(37,211,102,.15)","#25D366","rgba(37,211,102,.4)")} onClick={() => entregar(p)}>✅ Entregado</button>
                    ] : [
                      <button key="dp" style={btnStyle("rgba(201,168,76,.12)","#C9A84C","rgba(201,168,76,.4)")} onClick={async () => {
                        await updatePedidoStatus(p.id, "en_camino");
                        setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, status: "en_camino" } : o));
                        if (p.telefono_cliente) window.open("https://wa.me/"+(p.telefono_cliente||"").replace(/\D/g,"")+"?text="+encodeURIComponent("Hola "+p.nombre_cliente+"! Tu pedido ya está en camino 🛵🔥"),"_blank");
                      }}>🛵 Despachar</button>
                    ]
                  ) : [
                    <button key="e" style={btnStyle("rgba(201,168,76,.12)","#C9A84C","rgba(201,168,76,.4)")} onClick={() => entregar(p)}>📦 Entregado</button>
                  ]
                }/>
              ))
            }
          </div>
        </div>
      )}

      {filter !== "activos" && (
        <div className="ap-card">
          <table>
            <thead>
              <tr><th>#</th><th>MESA</th><th>PRODUCTOS</th><th>TOTAL</th><th>HORA</th><th>ESTADO</th><th>ACCIÓN</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,.35)" }}>Sin pedidos</td></tr>}
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><b style={{ color: "#e8a020" }}>#{p.id?.slice(-4)}</b></td>
                  <td>{pedidoTitle(p)}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pedidoItems(p)}</td>
                  <td style={{ color: "#e8a020", fontWeight: 700 }}>{ARS(p.total)}</td>
                  <td>{new Date(p.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td><span className={`ap-pill ${statusClass(p.status)}`}>{statusLabel(p.status)}</span></td>
                  <td>
                    {p.status !== "entregado" && p.status !== "cancelado" && (
                      <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={async () => {
                        const next = p.status === "nuevo" || p.status === "pendiente_pago" ? "preparando" : p.status === "preparando" ? "listo" : "entregado";
                        if (next === "preparando") playAlarm('cocina');
                        if (next === "listo") playAlarm('listo');
                        await updatePedidoStatus(p.id, next);
                        setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, status: next } : o));
                      }}>
                        {p.status === "nuevo" || p.status === "pendiente_pago" ? "▶ Cocina" : p.status === "preparando" ? "✓ Listo" : "📦 Entregar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: COCINA
══════════════════════════════════════════════════════════════ */
function ScreenCocina({ pedidos, setPedidos, local }) {
  const kitchen = pedidos.filter((p) => p.status === "nuevo" || p.status === "preparando");
  const [qrUrl, setQrUrl] = React.useState(null);

  React.useEffect(() => {
    const origin = window.location.hostname === 'localhost' ? window.location.origin : 'https://menuqr-ten.vercel.app';
    const slug = local?.slug || "mi-restaurante";
    const url = `${origin}/${slug}/cocina`;
    QRCodeLib.toDataURL(url, { width: 200, margin: 1, color: { dark: '#111', light: '#FFF' } })
      .then(setQrUrl).catch(() => {});
  }, [local?.slug]);

  async function markReady(p) {
    const next = p.status === "nuevo" ? "preparando" : "listo";
    playAlarm(next === "preparando" ? "cocina" : "listo");
    await updatePedidoStatus(p.id, next);
    setPedidos((prev) => prev.map((o) => o.id === p.id ? { ...o, status: next } : o));
  }

  const cocinaUrl = local?.slug
    ? (window.location.hostname === 'localhost' ? window.location.origin : 'https://menuqr-ten.vercel.app') + `/${local.slug}/cocina`
    : null;

  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Pantalla de cocina</h2>
        <div className="ap-live"><div className="ap-live-dot" />{kitchen.length} pedidos en preparación</div>
      </div>
      {/* Kitchen QR */}
      {cocinaUrl && (
        <div className="ap-card" style={{ marginBottom: 20, display: "flex", gap: 24, alignItems: "center" }}>
          <div>
            <div className="ap-card-title" style={{ marginBottom: 6 }}>QR PANTALLA COCINA</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginBottom: 10 }}>
              Escaneá con la tablet de cocina para abrir la pantalla dedicada.
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#e8a020", marginBottom: 10 }}>{cocinaUrl}</div>
            <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => { navigator.clipboard?.writeText(cocinaUrl); }}>📋 Copiar link</button>
          </div>
          {qrUrl && <img src={qrUrl} alt="QR cocina" style={{ width: 100, height: 100, borderRadius: 10, flexShrink: 0 }} />}
        </div>
      )}
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
   PRODUCT MODAL (create + edit)
══════════════════════════════════════════════════════════════ */
function ProductModal({ product, cats, restauranteId, onClose, onSave }) {
  const isNew = !product?.id;
  const [nombre,    setNombre]    = useState(product?.name    || product?.nombre    || "");
  const [precio,    setPrecio]    = useState(product?.price   ?? product?.precio    ?? 0);
  const [desc,      setDesc]      = useState(product?.desc    || product?.descripcion || "");
  const [catId,     setCatId]     = useState(product?.cat     || product?.categoria_id || "");
  const [activo,    setActivo]    = useState(product?.active  !== false && product?.activo !== false);
  const [imagen,    setImagen]    = useState(product?.imagen  || "");
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef(null);

  const catLabel   = cats.find((c) => c.id === catId)?.label || "";
  const previewUrl = imagen || getPlaceholder(catLabel);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    try {
      await supabase.storage.createBucket("product-images", { public: true });
      const ext      = file.name.split(".").pop().toLowerCase();
      const refId    = product?.id || `new-${Date.now()}`;
      const filename = `${refId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(filename, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
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
    if (!nombre.trim()) { alert("El nombre es obligatorio"); return; }
    if (!restauranteId)  { alert("Error: sin restaurante configurado. Recargá la página."); return; }
    setSaving(true);
    try {
      const payload = {
        nombre:         nombre.trim(),
        name:           nombre.trim(),   // columna legacy NOT NULL
        precio:         Number(precio),
        price:          Number(precio),  // columna legacy
        descripcion:    desc,
        activo,
        active:         activo,          // columna legacy
        imagen:         imagen || null,
        categoria_id:   catId  || null,
        restaurante_id: restauranteId,
      };
      let saved;
      if (isNew) {
        const { data, error } = await supabase.from("productos").insert(payload).select().single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase.from("productos")
          .update({ nombre: payload.nombre, precio: payload.precio, descripcion: payload.descripcion,
                    activo: payload.activo, imagen: payload.imagen, categoria_id: payload.categoria_id })
          .eq("id", product.id).select().single();
        if (error) throw error;
        saved = data;
      }
      onSave({
        id:     saved.id,
        cat:    saved.categoria_id,
        name:   saved.nombre      || "",
        desc:   saved.descripcion || "",
        price:  saved.precio      ?? 0,
        active: saved.activo      ?? true,
        imagen: saved.imagen      || null,
      });
    } catch (err) {
      alert("Error al guardar: " + (err.message || JSON.stringify(err)));
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
          <div style={{ fontSize: 16, fontWeight: 800 }}>{isNew ? "➕ Nuevo producto" : "✏️ Editar producto"}</div>
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
          <label>Nombre *</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" />
        </div>
        <div className="ap-form-group">
          <label>Precio</label>
          <input type="number" value={precio} min={0} onChange={(e) => setPrecio(e.target.value)} />
        </div>
        <div className="ap-form-group">
          <label>Categoría</label>
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            style={{ background: "#2a2a2a", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", width: "100%", fontSize: 13, outline: "none" }}
          >
            <option value="">Sin categoría</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.label}</option>
            ))}
          </select>
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
            {saving ? "Guardando..." : isNew ? "✅ Crear producto" : "💾 Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: CARTA / PRODUCTOS
══════════════════════════════════════════════════════════════ */
const CARTA_TEMPLATES = [
  { id:"clasico",   nombre:"Clásico",      emoji:"🖤", fondo:"#18181b", acento:"#C9A84C" },
  { id:"rojo",      nombre:"Rojo fuego",   emoji:"🔴", fondo:"#1a0808", acento:"#e84040" },
  { id:"verde",     nombre:"Verde natural",emoji:"🌿", fondo:"#081a0e", acento:"#3ecf6e" },
  { id:"azul",      nombre:"Azul noche",   emoji:"🔵", fondo:"#08101a", acento:"#3e8cff" },
  { id:"morado",    nombre:"Morado",       emoji:"🟣", fondo:"#100818", acento:"#a855f7" },
  { id:"dorado",    nombre:"Dorado VIP",   emoji:"✨", fondo:"#0f0c02", acento:"#f5c518" },
  { id:"rosado",    nombre:"Rosa premium", emoji:"🌸", fondo:"#1a080f", acento:"#ec4899" },
  { id:"blanco",    nombre:"Claro",        emoji:"☀️", fondo:"#f0f0f0", acento:"#1a1a1a" },
];

function ScreenCarta({ prods, setProds, cats, local, setLocal }) {
  const [search,    setSearch]    = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [modal,     setModal]     = useState(null); // null=closed | "new" | product obj = edit
  const [dragOver,  setDragOver]  = useState(null);
  const dragSrc = useRef(null);

  const filtered = prods.filter((p) => {
    const matchSearch = !search || (p.name || p.nombre || "").toLowerCase().includes(search.toLowerCase());
    const matchCat    = filterCat === "all" || p.cat === filterCat;
    return matchSearch && matchCat;
  });

  async function toggleActive(e, p) {
    e.stopPropagation();
    const nv = !p.active;
    await toggleProducto(p.id, nv);
    setProds((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, active: nv } : pr));
  }

  function getCatLabel(catId) {
    const c = cats.find((c) => c.id === catId);
    return c ? `${c.icon || ""} ${c.label}` : "Sin categoría";
  }

  function getCatName(catId) {
    return cats.find((c) => c.id === catId)?.label || "";
  }

  function handleSaveProduct(updated) {
    setProds((prev) => {
      const exists = prev.find(p => p.id === updated.id);
      if (exists) return prev.map((p) => p.id === updated.id ? updated : p);
      return [...prev, updated];
    });
    setModal(null);
  }

  async function handleDelete(e, p) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${p.name || p.nombre}"? No se puede deshacer.`)) return;
    const ok = await deleteProducto(p.id);
    if (ok) setProds((prev) => prev.filter((pr) => pr.id !== p.id));
  }

  // ── Drag to reorder ──
  function onDragStart(e, p) {
    dragSrc.current = p;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOverItem(e, p) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (p.id !== dragSrc.current?.id) setDragOver(p.id);
  }

  async function onDrop(e, target) {
    e.preventDefault();
    setDragOver(null);
    const src = dragSrc.current;
    if (!src || src.id === target.id) return;
    dragSrc.current = null;
    const newProds = [...prods];
    const si = newProds.findIndex(p => p.id === src.id);
    const ti = newProds.findIndex(p => p.id === target.id);
    newProds.splice(si, 1);
    newProds.splice(ti, 0, src);
    setProds(newProds);
    // Persist order
    await Promise.all(newProds.map((p, i) =>
      supabase.from("productos").update({ orden: i }).eq("id", p.id)
    ));
  }

  // ── Background color for menu ──
  const colorFondo = local?.color_fondo_carta || "#18181b";

  async function saveColorFondo(color) {
    if (!local?.restauranteId) return;
    if (setLocal) setLocal(prev => ({ ...prev, color_fondo_carta: color }));
    const cfg = local?.config || {};
    await supabase.from("restaurantes")
      .update({ config: { ...cfg, color_fondo_carta: color } })
      .eq("id", local.restauranteId);
  }

  return (
    <div>
      {modal !== null && (
        <ProductModal
          product={modal === "new" ? null : modal}
          cats={cats}
          restauranteId={local?.restauranteId}
          onClose={() => setModal(null)}
          onSave={handleSaveProduct}
        />
      )}

      <div className="ap-sec-hdr">
        <h2>Carta</h2>
        <div className="ap-sec-hdr-r" style={{ flexWrap: "wrap", gap: 8 }}>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"rgba(255,255,255,.5)", cursor:"pointer", whiteSpace:"nowrap" }}>
            🎨 Color menú
            <input
              type="color"
              value={colorFondo}
              onChange={(e) => saveColorFondo(e.target.value)}
              title="Color de fondo del menú"
              style={{ width:28, height:28, border:"1px solid rgba(255,255,255,.2)", background:"none", cursor:"pointer", borderRadius:6, padding:1 }}
            />
          </label>
          <input
            type="text"
            placeholder="🔍 Buscar..."
            style={{ width: 150 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="ap-btn ap-btn-gold" onClick={() => setModal("new")}>+ Nuevo producto</button>
        </div>
      </div>

      {/* ── Templates de diseño ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: 1, marginBottom: 8 }}>PLANTILLAS DE DISEÑO</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {CARTA_TEMPLATES.map((t) => {
            const isActive = (local?.color_fondo_carta || "#18181b") === t.fondo && (local?.color || "#C9A84C") === t.acento;
            return (
              <button
                key={t.id}
                onClick={() => {
                  saveColorFondo(t.fondo);
                  if (local?.restauranteId && setLocal) {
                    setLocal(prev => ({ ...prev, color: t.acento }));
                    supabase.from("restaurantes")
                      .update({ color: t.acento })
                      .eq("id", local.restauranteId);
                  }
                }}
                title={t.nombre}
                style={{
                  background: t.fondo,
                  border: isActive ? `2px solid ${t.acento}` : "2px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "8px 14px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  minWidth: 70,
                  transition: "border 0.15s",
                }}
              >
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:t.fondo, border:"1px solid rgba(255,255,255,.3)" }} />
                  <div style={{ width:12, height:12, borderRadius:"50%", background:t.acento }} />
                </div>
                <span style={{ fontSize:10, color:t.fondo === "#f0f0f0" ? "#333" : "rgba(255,255,255,.7)", fontWeight:600 }}>{t.nombre}</span>
                {isActive && <span style={{ fontSize:9, color:t.acento, fontWeight:800 }}>✓ Activa</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category filter tabs */}
      {cats.length > 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
          <button
            className={`ap-btn ap-btn-sm ${filterCat === "all" ? "ap-btn-gold" : "ap-btn-ghost"}`}
            onClick={() => setFilterCat("all")}
          >
            Todos ({prods.length})
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              className={`ap-btn ap-btn-sm ${filterCat === c.id ? "ap-btn-gold" : "ap-btn-ghost"}`}
              onClick={() => setFilterCat(c.id)}
            >
              {c.icon ? `${c.icon} ` : ""}{c.label} ({prods.filter(p => p.cat === c.id).length})
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 10 }}>
        ☰ Arrastrá las tarjetas para ordenar los platos
      </div>

      <div className="ap-prod-grid">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="ap-prod-card"
            draggable
            onDragStart={(e) => onDragStart(e, p)}
            onDragOver={(e) => onDragOverItem(e, p)}
            onDrop={(e) => onDrop(e, p)}
            onDragLeave={() => setDragOver(null)}
            style={{
              cursor: "grab",
              outline: dragOver === p.id ? "2px solid #e8a020" : "none",
              outlineOffset: 2,
              transition: "outline 0.1s",
              opacity: dragSrc.current?.id === p.id ? 0.5 : 1,
            }}
            onClick={() => setModal(p)}
          >
            <div className="ap-prod-thumb">
              <img
                src={p.imagen || getPlaceholder(getCatName(p.cat))}
                alt={p.name || p.nombre}
                loading="lazy"
              />
            </div>
            <div className="ap-prod-body">
              <div className="ap-prod-name">{p.name || p.nombre}</div>
              <div className="ap-prod-cat">{getCatLabel(p.cat)}</div>
              <div className="ap-prod-footer">
                <div className="ap-prod-price">{ARS(p.price ?? p.precio)}</div>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <div
                    className={`ap-toggle ${p.active ? "on" : "off"}`}
                    onClick={(e) => toggleActive(e, p)}
                    title={p.active ? "Activo — click para desactivar" : "Inactivo — click para activar"}
                  />
                  <div
                    onClick={(e) => handleDelete(e, p)}
                    title="Eliminar producto"
                    style={{ cursor:"pointer", color:"rgba(255,80,80,.55)", fontSize:13, lineHeight:1, padding:"3px 5px", borderRadius:4 }}
                  >
                    🗑
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "rgba(255,255,255,.35)" }}>
            {search
              ? "Sin resultados para esa búsqueda"
              : "No hay productos. Hacé clic en + Nuevo producto para agregar el primero"}
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
    (p) => (p.tipo_pedido === "delivery" || (p.mesa_numero === 0 && !p.tipo_pedido && p.nota?.includes("DELIVERY"))) && p.status !== "entregado"
  );
  const [notaDelivery, setNotaDelivery] = React.useState({});

  const confirmarPago = async (p) => {
    if (!supabase) return;
    await supabase.from("pedidos").update({ status: "nuevo" }).eq("id", p.id);
    setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, status: "nuevo" } : o));
  };

  const avanzarEstado = async (p) => {
    const NEXT = { nuevo: "preparando", preparando: "listo", listo: "en_camino", en_camino: "entregado" };
    const next = NEXT[p.status];
    if (!next) return;
    if (supabase) await supabase.from("pedidos").update({ status: next }).eq("id", p.id);
    setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, status: next } : o));
  };

  const guardarNotaDelivery = async (p) => {
    const obs = notaDelivery[p.id] ?? (p.observaciones_delivery || "");
    if (supabase) await supabase.from("pedidos").update({ observaciones_delivery: obs }).eq("id", p.id);
    setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, observaciones_delivery: obs } : o));
  };

  const BTN_LABELS = { nuevo:"▶ En preparación", preparando:"✓ Listo", listo:"🛵 En camino", en_camino:"✅ Entregado" };

  return (
    <div>
      <div className="ap-sec-hdr" style={{ marginBottom: 14 }}>
        <h2>Delivery activo</h2>
        <div className="ap-live"><div className="ap-live-dot" />{deliveryOrders.length} pedidos</div>
      </div>
      {deliveryOrders.length === 0 && (
        <div className="ap-card" style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.35)" }}>
          Sin pedidos delivery activos
        </div>
      )}
      <div className="ap-order-feed">
        {deliveryOrders.map((p) => (
          <div key={p.id} className="ap-order-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
              <div className="ap-order-num">#{p.id?.slice(-3)}</div>
              <div className="ap-order-info" style={{ flex: 1 }}>
                <div className="ap-order-title">🛵 Delivery</div>
                <div className="ap-order-detail" style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>
                  {new Date(p.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}{p.metodo_pago || "—"}
                </div>
              </div>
              <span className={`ap-pill ${statusClass(p.status)}`}>{statusLabel(p.status)}</span>
              <span style={{ color: "#e8a020", fontWeight: 800, fontSize: 15 }}>{ARS(p.total)}</span>
            </div>
            {/* Cliente + dirección */}
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: "10px 12px", width: "100%", boxSizing: "border-box" }}>
              {p.nombre_cliente && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>👤 {p.nombre_cliente}{p.telefono_cliente ? ` · ${p.telefono_cliente}` : ""}</div>}
              {p.direccion_cliente ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#C9A84C", marginBottom: 2 }}>📍 {p.direccion_cliente}</div>
                  {p.entrecalles && <div style={{ fontSize: 12, color: "var(--text2)" }}>Entre: {p.entrecalles}</div>}
                </>
              ) : p.nota ? (
                <div style={{ fontSize: 12, color: "var(--text2)" }}>📝 {p.nota}</div>
              ) : null}
            </div>
            {/* Productos */}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", width: "100%", lineHeight: 1.6 }}>
              {(p.pedido_items||[]).map((it,i) => <span key={i}>{it.cantidad}× {it.nombre}{"  "}</span>)}
              {!p.pedido_items?.length && pedidoItems(p)}
            </div>
            {/* Nota del delivery */}
            <div style={{ width: "100%", display: "flex", gap: 8 }}>
              <input
                style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text)", fontSize: 12, outline: "none" }}
                placeholder="Nota para el repartidor (piso, timbre, referencia...)"
                value={notaDelivery[p.id] ?? (p.observaciones_delivery || "")}
                onChange={e => setNotaDelivery(prev => ({ ...prev, [p.id]: e.target.value }))}
              />
              <button className="ap-btn ap-btn-gold" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => guardarNotaDelivery(p)}>💾</button>
            </div>
            {/* Acciones */}
            <div style={{ display: "flex", gap: 8, width: "100%", flexWrap: "wrap" }}>
              {p.status === "pendiente_pago" && (
                <button className="ap-btn ap-btn-gold" style={{ flex: 1, minWidth: 160 }} onClick={() => confirmarPago(p)}>
                  ✅ Confirmar pago
                </button>
              )}
              {p.status !== "pendiente_pago" && p.status !== "entregado" && (
                <button className="ap-btn ap-btn-gold" style={{ flex: 1 }} onClick={() => avanzarEstado(p)}>
                  {BTN_LABELS[p.status] || "Avanzar"}
                </button>
              )}
              {(p.telefono_cliente || local?.telefono) && (
                <a href={"https://wa.me/"+((p.telefono_cliente||local?.telefono||"").replace(/\D/g,""))+"?text="+encodeURIComponent("Hola "+(p.nombre_cliente||"!")+"! Tu pedido #"+p.id?.slice(-3)+" está: "+statusLabel(p.status)+" 🛵")}
                  target="_blank" rel="noreferrer"
                  style={{ background: "#25D366", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  📲 Avisar al cliente
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: CATEGORÍAS
══════════════════════════════════════════════════════════════ */
function ScreenCategorias({ cats, setCats, prods, local }) {
  const [editCat,  setEditCat]  = React.useState(null); // null=closed | {}=new | cat=edit
  const [label,    setLabel]    = React.useState("");
  const [icon,     setIcon]     = React.useState("");
  const [saving,   setSaving]   = React.useState(false);

  function openNew() { setLabel(""); setIcon(""); setEditCat({}); }
  function openEdit(c) { setLabel(c.label); setIcon(c.icon || ""); setEditCat(c); }

  async function saveCat() {
    if (!label.trim()) { alert("El nombre es obligatorio"); return; }
    if (!local?.restauranteId) { alert("Sin restaurante. Recargá la página."); return; }
    setSaving(true);
    try {
      const isNew = !editCat?.id;
      const payload = { label: label.trim(), icon: icon.trim() || null, restaurante_id: local.restauranteId, activa: true };
      if (!isNew) payload.id = editCat.id;
      const saved = await upsertCategoria(payload);
      if (!saved) throw new Error("Sin respuesta");
      if (isNew) {
        setCats(prev => [...prev, { id: saved.id, label: saved.label, icon: saved.icon, activa: true }]);
      } else {
        setCats(prev => prev.map(c => c.id === saved.id ? { ...c, label: saved.label, icon: saved.icon } : c));
      }
      setEditCat(null);
    } catch (err) {
      alert("Error: " + (err.message || JSON.stringify(err)));
    } finally { setSaving(false); }
  }

  async function deleteCat(c) {
    const count = prods.filter(p => p.cat === c.id).length;
    const msg = count > 0
      ? `"${c.label}" tiene ${count} producto(s). Si la eliminás, esos productos quedan sin categoría. ¿Confirmás?`
      : `¿Eliminar la categoría "${c.label}"?`;
    if (!confirm(msg)) return;
    const ok = await deleteCategoria(c.id);
    if (ok) setCats(prev => prev.filter(x => x.id !== c.id));
  }

  async function toggleCatVisible(c) {
    const nv = c.activa === false ? true : false;
    await supabase.from("categorias").update({ activa: nv }).eq("id", c.id);
    setCats(prev => prev.map(x => x.id === c.id ? { ...x, activa: nv } : x));
  }

  return (
    <div>
      {/* Modal crear/editar */}
      {editCat !== null && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.72)",backdropFilter:"blur(4px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
          onClick={() => setEditCat(null)}>
          <div style={{ background:"#1e1e1e",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,width:"100%",maxWidth:400,padding:24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
              <div style={{ fontSize:16,fontWeight:800 }}>{!editCat?.id ? "➕ Nueva categoría" : "✏️ Editar categoría"}</div>
              <div style={{ cursor:"pointer",color:"rgba(255,255,255,.4)",fontSize:22 }} onClick={() => setEditCat(null)}>✕</div>
            </div>
            <div className="ap-form-group">
              <label>Ícono (emoji)</label>
              <input type="text" value={icon} maxLength={4} onChange={e => setIcon(e.target.value)} placeholder="🍕" style={{ width:80 }} />
            </div>
            <div className="ap-form-group">
              <label>Nombre *</label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: Pizzas, Bebidas, Postres" />
            </div>
            <div style={{ display:"flex",gap:10,marginTop:8 }}>
              <button className="ap-btn ap-btn-ghost" style={{ flex:1 }} onClick={() => setEditCat(null)}>Cancelar</button>
              <button className="ap-btn ap-btn-gold" style={{ flex:2 }} disabled={saving} onClick={saveCat}>
                {saving ? "Guardando..." : !editCat?.id ? "✅ Crear" : "💾 Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ap-sec-hdr">
        <h2>Categorías</h2>
        <button className="ap-btn ap-btn-gold" onClick={openNew}>+ Nueva categoría</button>
      </div>

      <div className="ap-card">
        {cats.length === 0 ? (
          <div style={{ textAlign:"center",padding:40,color:"rgba(255,255,255,.35)" }}>
            Sin categorías. Creá la primera para organizar tu carta.
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>ÍCONO</th><th>NOMBRE</th><th>PRODUCTOS</th><th>VISIBLE</th><th>ACCIONES</th></tr>
            </thead>
            <tbody>
              {cats.map((c) => {
                const count = prods.filter(p => p.cat === c.id).length;
                return (
                  <tr key={c.id}>
                    <td style={{ fontSize:22 }}>{c.icon || "📁"}</td>
                    <td style={{ fontWeight:600 }}>{c.label}</td>
                    <td style={{ color:"rgba(255,255,255,.5)" }}>{count} producto{count!==1?"s":""}</td>
                    <td>
                      <div className={`ap-toggle ${c.activa !== false ? "on" : "off"}`}
                        onClick={() => toggleCatVisible(c)}
                        title={c.activa !== false ? "Visible — click para ocultar" : "Oculta — click para mostrar"} />
                    </td>
                    <td>
                      <div style={{ display:"flex",gap:6 }}>
                        <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => openEdit(c)}>✏️ Editar</button>
                        <button
                          className="ap-btn ap-btn-sm"
                          style={{ background:"rgba(232,64,64,.12)",color:"#e84040",border:"1px solid rgba(232,64,64,.25)" }}
                          onClick={() => deleteCat(c)}>
                          🗑 Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
// QR generation — canvas directo, sin estado, sin flicker
function QRImg({ data, size = 200, style = {} }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    if (!data || !canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, data, {
      width: size, margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" }
    }).catch(console.error);
  }, [data, size]);
  return <canvas ref={canvasRef} style={{ display: 'block', background: '#fff', ...style }} />;
}

function ActionRow({ id, url, title, isCopied, onDownloadPNG, onDownloadPDF, onCopyImage, onCopyLink, onShareWA, onShareMail }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginTop:10 }}>
      {url.startsWith("http") && (
        <button className="ap-btn ap-btn-sm" style={{background:"rgba(201,168,76,.2)",color:"#e8a020",border:"1px solid rgba(201,168,76,.35)",fontWeight:800}} onClick={() => window.open(url, "_blank")}>🔗 Abrir</button>
      )}
      <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => onDownloadPNG(url, id)}>⬇ PNG</button>
      <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => onDownloadPDF(url, title)}>🖨️ PDF</button>
      <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => onCopyImage(url)}>🖼️ Copiar img</button>
      <button className="ap-btn ap-btn-gold ap-btn-sm" onClick={() => onCopyLink(id, url)}>
        {isCopied ? "✓ Copiado" : "📋 Copiar link"}
      </button>
      <button className="ap-btn ap-btn-ghost ap-btn-sm" style={{background:"rgba(37,211,102,.15)",color:"#25D366",border:"1px solid rgba(37,211,102,.3)"}} onClick={() => onShareWA(url, title)}>📲 WA</button>
      <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => onShareMail(url, title)}>✉️ Mail</button>
    </div>
  );
}

function QRCard({ id, icon, title, desc, url, isCopied, onExpand, onDownloadPNG, onDownloadPDF, onCopyImage, onCopyLink, onShareWA, onShareMail }) {
  return (
    <div className="ap-card" style={{ textAlign:"center" }}>
      <div style={{ fontSize:32, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:800, marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:12 }}>{desc}</div>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:10, cursor:"pointer" }} onClick={() => onExpand(title, url)}>
        <QRImg data={url} size={200} style={{ width:150, height:150, borderRadius:8, background:"#fff", padding:4 }} />
      </div>
      <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", fontFamily:"monospace", wordBreak:"break-all", marginBottom:8 }}>{url}</div>
      <ActionRow id={id} url={url} title={title} isCopied={isCopied} onDownloadPNG={onDownloadPNG} onDownloadPDF={onDownloadPDF} onCopyImage={onCopyImage} onCopyLink={onCopyLink} onShareWA={onShareWA} onShareMail={onShareMail} />
    </div>
  );
}

function ScreenQR({ local }) {
  const slug = local?.slug || "mi-restaurante";
  // Si el panel se abre en localhost (dev), los QR deben apuntar al dominio de produccion
  const prodOrigin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'https://menuqr-ten.vercel.app'
    : window.location.origin;
  const base = `${prodOrigin}/menu/${slug}`;
  const totalMesas = local?.mesas || 3;
  const tel = (local?.telefono || "").replace(/\D/g, "");
  const [modal, setModal] = React.useState(null);
  const [copied, setCopied] = React.useState({});


  function copyLink(key, url) {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 1800);
  }

  async function copyImage(url) {
    try {
      const dataUrl = await QRCodeLib.toDataURL(url, { width: 600, margin: 2, color: { dark: "#000000", light: "#FFFFFF" } });
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch (e) { alert("No se pudo copiar la imagen. Usá Descargar PNG."); }
  }

  function downloadPNG(url, filename) {
    QRCodeLib.toDataURL(url, { width: 800, margin: 2, color: { dark: "#000000", light: "#FFFFFF" } }).then(dataUrl => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  async function downloadPDF(url, title) {
    const imgSrc = await QRCodeLib.toDataURL(url, { width: 800, margin: 2, color: { dark: "#000000", light: "#FFFFFF" } });
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#fff;padding:40px}
      img{width:280px;height:280px;display:block}
      h2{font-size:22px;margin-bottom:8px;text-align:center}
      p{font-size:13px;color:#555;text-align:center;margin-top:10px;word-break:break-all;max-width:300px}
      @media print{body{padding:20px}}
    </style></head><body>
      <h2>${title}</h2>
      <img src="${imgSrc}" onload="window.print()" />
      <p>${url}</p>
    </body></html>`);
    w.document.close();
  }

  function shareWA(url, title) {
    window.open(`https://wa.me/?text=${encodeURIComponent(title + "\n" + url)}`, "_blank");
  }

  function shareMail(url, title) {
    window.open(`mailto:?subject=${encodeURIComponent("QR " + title)}&body=${encodeURIComponent("QR de acceso: " + url)}`, "_blank");
  }


  const qrCards = [
    { id:"vitrina", icon:"📱", title:"Vitrina", desc:"Carta + opciones de pedido", url:`${base}/vitrina` },
    { id:"delivery", icon:"🛵", title:"Delivery", desc:"Para compartir por redes o WhatsApp", url:`${base}/delivery` },
    { id:"cocina", icon:"👨‍🍳", title:"Pantalla Cocina", desc:"QR para acceso al panel de cocina", url:`${base}/cocina` },
    ...(tel ? [{ id:"telefono", icon:"📞", title:"Teléfono", desc:"Escanear para llamar al local", url:`tel:+${tel}` }] : []),
  ];

  return (
    <div>
      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:16,padding:28,textAlign:"center",maxWidth:400,width:"90%" }}>
            <div style={{ fontSize:18,fontWeight:800,marginBottom:16 }}>{modal.title}</div>
            <QRImg data={modal.url} size={280} style={{ width:250,height:250,background:"#fff",borderRadius:10,padding:8,marginBottom:16 }} />
            <div style={{ fontSize:10,color:"rgba(255,255,255,.35)",fontFamily:"monospace",wordBreak:"break-all",marginBottom:16 }}>{modal.url}</div>
            <ActionRow id={"modal-"+modal.title} url={modal.url} title={modal.title} isCopied={!!copied["modal-"+modal.title]} onDownloadPNG={downloadPNG} onDownloadPDF={downloadPDF} onCopyImage={copyImage} onCopyLink={copyLink} onShareWA={shareWA} onShareMail={shareMail} />
            <button className="ap-btn ap-btn-ghost ap-btn-sm" style={{ marginTop:12 }} onClick={() => setModal(null)}>✕ Cerrar</button>
          </div>
        </div>
      )}

      <div className="ap-sec-hdr" style={{ marginBottom:16 }}><h2>QR y links de acceso</h2></div>

      {/* Generales */}
      <div className="ap-card-title" style={{ marginBottom:10 }}>QR GENERALES</div>
      <div className="ap-grid-3" style={{ marginBottom:24 }}>
        {qrCards.map(q => <QRCard key={q.id} {...q} isCopied={!!copied[q.id]} onExpand={(t,u) => setModal({title:t,url:u})} onDownloadPNG={downloadPNG} onDownloadPDF={downloadPDF} onCopyImage={copyImage} onCopyLink={copyLink} onShareWA={shareWA} onShareMail={shareMail} />)}
      </div>

      {/* Por mesa */}
      <div className="ap-card-title" style={{ marginBottom:10 }}>QR POR MESA ({totalMesas} mesas)</div>
      <div className="ap-card" style={{ marginBottom:24 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {Array.from({ length: totalMesas }, (_, i) => i + 1).map((n) => (
            <div key={n} style={{ background:"var(--bg3)",borderRadius:10,padding:"10px 14px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
                <div style={{ width:60,height:60,background:"#fff",borderRadius:6,padding:2,flexShrink:0,cursor:"pointer" }} onClick={() => setModal({ title:`Mesa ${n}`, url:`${base}/mesa/${n}` })}>
                  <QRImg data={`${base}/mesa/${n}`} size={120} style={{ width:"100%",height:"100%" }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800,fontSize:14,marginBottom:6 }}>Mesa {n}</div>
                  <ActionRow id={`mesa-${n}`} url={`${base}/mesa/${n}`} title={`Mesa ${n}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="ap-btn ap-btn-gold" style={{ marginTop:14,width:"100%" }} onClick={() => {
          Array.from({ length: totalMesas }, (_, i) => i + 1).forEach((n, idx) => {
            setTimeout(() => downloadPDF(`${base}/mesa/${n}`, `Mesa ${n}`), idx * 1200);
          });
        }}>🖨️ Imprimir / PDF todos los QR de mesas</button>
      </div>

      {/* WiFi y Promo */}
      <div className="ap-card-title" style={{ marginBottom:10 }}>QR ESPECIALES</div>
      <div className="ap-grid-2">
        <div className="ap-card">
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
            <span style={{ fontSize:32 }}>📶</span>
            <div>
              <div style={{ fontSize:14,fontWeight:800 }}>QR WiFi del local</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>Los clientes escanean y se conectan</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:10,marginBottom:12 }}>
            <div className="ap-form-group" style={{ flex:1,margin:0 }}>
              <label>Red (SSID)</label>
              <input type="text" id="wifi-ssid" defaultValue={local?.wifi_ssid||""} placeholder="Nombre de la red" />
            </div>
            <div className="ap-form-group" style={{ flex:1,margin:0 }}>
              <label>Contraseña</label>
              <input type="text" id="wifi-pass" defaultValue={local?.wifi_pass||""} placeholder="Contraseña" />
            </div>
          </div>
          {local?.wifi_ssid && (
            <>
              <div style={{ display:"flex",justifyContent:"center",marginBottom:10,cursor:"pointer" }}
                onClick={() => setModal({ title:"WiFi "+local.wifi_ssid, url:`WIFI:T:WPA;S:${local.wifi_ssid};P:${local.wifi_pass||""};H:;;` })}>
                <QRImg data={`WIFI:T:WPA;S:${local.wifi_ssid};P:${local.wifi_pass||""};H:;;`} size={160} style={{ width:130,height:130,background:"#fff",borderRadius:8,padding:4 }} alt="QR WiFi" />
              </div>
              <ActionRow id="wifi" url={`WIFI:T:WPA;S:${local.wifi_ssid};P:${local.wifi_pass||""};H:;;`} title={`WiFi ${local.wifi_ssid}`} />
            </>
          )}
        </div>
        <div className="ap-card" style={{ borderColor:"rgba(232,160,32,.3)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
            <span style={{ fontSize:32 }}>🏷️</span>
            <div>
              <div style={{ fontSize:14,fontWeight:800 }}>QR Promoción / Happy Hour</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)" }}>Se muestra en la carta del cliente y acá para compartir</div>
            </div>
          </div>
          {local?.promo_desc ? (
            <>
              <div style={{ background:"rgba(201,168,76,.08)",border:"1px solid rgba(201,168,76,.2)",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:"var(--gold)",fontWeight:600 }}>
                {local.promo_desc}
              </div>
              <div style={{ display:"flex",justifyContent:"center",marginBottom:10,cursor:"pointer" }}
                onClick={() => setModal({ title:"Promo: "+local.promo_desc, url:`${base}/promo?desc=${encodeURIComponent(local.promo_desc)}` })}>
                <QRImg data={`${base}/promo?desc=${encodeURIComponent(local.promo_desc)}`} size={180} style={{ width:150,height:150,background:"#fff",borderRadius:8,padding:4 }} alt="QR Promo" />
              </div>
              <ActionRow id="promo" url={`${base}/promo?desc=${encodeURIComponent(local.promo_desc)}`} title={"Promo: "+local.promo_desc} />
              <div style={{ fontSize:11,color:"rgba(255,255,255,.35)",marginTop:10,textAlign:"center" }}>
                Para cambiarla: Configuración → Promoción fija
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center",padding:"20px 0",color:"rgba(255,255,255,.35)",fontSize:13 }}>
              <div style={{ fontSize:28,marginBottom:8 }}>🏷️</div>
              Configurá la promo en <strong>Configuración → Promoción / Happy Hour</strong>
            </div>
          )}
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
    alias_pago:          local?.alias_pago || "",
    alias_titular:       local?.alias_titular || "",
    promo_desc:          local?.promo_desc || "",
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
        alias_pago:          form.alias_pago,
        alias_titular:       form.alias_titular,
        promo_desc:          form.promo_desc,
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

        {/* ─ Alias de pago ─ */}
        <div className="ap-card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--gold)" }}>💳 Alias de pago (Transferencia / Mercado Pago)</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 14 }}>
            Se muestra al cliente en el paso de pago del delivery para que pueda transferir.
          </div>
          <div className="ap-grid-2">
            <div className="ap-form-group">
              <label>Alias (CVU / Mercado Pago)</label>
              <input type="text" value={form.alias_pago} onChange={e => setForm({ ...form, alias_pago: e.target.value })} placeholder="Ej: dinero.en.mi.cuenta" />
            </div>
            <div className="ap-form-group">
              <label>Titular de la cuenta</label>
              <input type="text" value={form.alias_titular} onChange={e => setForm({ ...form, alias_titular: e.target.value })} placeholder="Juan García" />
            </div>
          </div>
        </div>

        {/* ─ Promoción fija ─ */}
        <div className="ap-card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--gold)" }}>🏷️ Promoción / Happy Hour (fija)</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 14 }}>
            Se muestra como QR en la carta del cliente. Usala para Happy Hour, promos del día, descuentos fijos, etc.
          </div>
          <div className="ap-form-group">
            <label>Descripción de la promoción</label>
            <input type="text" value={form.promo_desc} onChange={e => setForm({ ...form, promo_desc: e.target.value })} placeholder="Ej: Happy Hour 🍺 50% OFF de 18 a 21hs" />
          </div>
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

  const _origin2 = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'https://menuqr-ten.vercel.app'
    : window.location.origin;
  const vitranaUrl = local?.slug ? `${_origin2}/menu/${local.slug}/vitrina` : null;

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
    if (!local?.restauranteId) return;
    const today = new Date().toISOString().slice(0, 10);
    getPedidos(local.restauranteId, today).then((data) => { if (data) setPedidos(data); });
    const unsub = subscribePedidos(
      local.restauranteId,
      (newP) => { playAlarm('nuevo'); setPedidos((prev) => [newP, ...prev]); },
      (upd)  => {
        if (upd.status === 'listo') playAlarm('listo');
        setPedidos((prev) => prev.map((p) => (p.id === upd.id ? upd : p)));
      }
    );
    return () => { if (unsub) unsub(); };
  }, [local?.restauranteId]);

  const pendingCount = pedidos.filter((p) => p.status === "pendiente").length;
  const kitchenCount = pedidos.filter((p) => p.status === "en_cocina").length;

  const screenMap = {
    dashboard: <ScreenDashboard pedidos={pedidos} cats={cats} prods={prods} local={local} />,
    pedidos:   <ScreenPedidos pedidos={pedidos} setPedidos={setPedidos} local={local} />,
    cocina:    <ScreenCocina pedidos={pedidos} setPedidos={setPedidos} local={local} />,
    delivery:  <ScreenDelivery pedidos={pedidos} setPedidos={setPedidos} local={local} />,
    mesas:     <ScreenMesas local={local} pedidos={pedidos} />,
    carta:     <ScreenCarta prods={prods} setProds={setProds} cats={cats} local={local} setLocal={setLocal} />,
    categorias:<ScreenCategorias cats={cats} setCats={setCats} prods={prods} local={local} />,
    stock:     <ScreenStock />,
    clientes:  <ScreenClientes />,
    caja:      <ScreenCajaPOS prods={prods} cats={cats} local={local} />,
    reportes:  <ScreenReportes pedidos={pedidos} prods={prods} />,
    qr:        <ScreenQR local={local} />,
    config:    <ScreenConfiguracion local={local} setLocal={setLocal} />,
    gestion:   <ScreenGestion prods={prods} setProds={setProds} cats={cats} local={local} setLocal={setLocal} />,
  };

  const [navOpen, setNavOpen] = React.useState(false);

  return (
    <>
      <style>{AP_STYLES}</style>
      <div id="ap2-root">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Topbar screen={screen} clock={clock} onMenuOpen={() => setNavOpen(true)} />
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {screenMap[screen] || <ScreenDashboard pedidos={pedidos} cats={cats} prods={prods} local={local} />}
          </div>
        </div>
        <div className={`ap-overlay${navOpen ? " nav-open" : ""}`} onClick={() => setNavOpen(false)} />
        <Sidebar
          screen={screen}
          setScreen={setScreen}
          pendingCount={pendingCount}
          kitchenCount={kitchenCount}
          local={local}
          onLogout={onLogout}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />
      </div>
    </>
  );
}
