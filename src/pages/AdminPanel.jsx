import React, { useState, useEffect, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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

  /* PLUS IA / FIGMA */
  #ap2-root .ap-plus-badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:3px 10px; border-radius:20px; font-size:10px; font-weight:800; letter-spacing:.5px;
  }
  #ap2-root .ap-plus-ia { background:rgba(139,92,246,.15); color:#A78BFA; border:1px solid rgba(139,92,246,.3); }
  #ap2-root .ap-plus-figma { background:rgba(6,182,212,.15); color:#22D3EE; border:1px solid rgba(6,182,212,.3); }
  #ap2-root .ap-chat-bubble { padding:12px 16px; border-radius:14px; max-width:80%; font-size:13px; line-height:1.5; }
  #ap2-root .ap-chat-user { background:var(--gold-dim); color:var(--text); border:1px solid rgba(232,160,32,.2); align-self:flex-end; }
  #ap2-root .ap-chat-ai { background:rgba(139,92,246,.12); color:var(--text); border:1px solid rgba(139,92,246,.2); align-self:flex-start; }
  #ap2-root .ap-figma-canvas { background:var(--bg3); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  #ap2-root .ap-figma-toolbar { background:var(--bg2); border-bottom:1px solid var(--border); padding:10px 14px; display:flex; gap:8px; align-items:center; }
  #ap2-root .ap-figma-tool { padding:6px 12px; border-radius:6px; border:none; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; background:var(--bg4); color:var(--text2); transition:.15s; }
  #ap2-root .ap-figma-tool:hover { background:var(--bg5); color:var(--text); }
  #ap2-root .ap-figma-tool.active { background:rgba(6,182,212,.2); color:#22D3EE; }

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
  plus_ia: "🤖 IA Asistente",
  plus_figma: "🎨 Editor Visual Figma",
};

/* ══════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════ */
function Sidebar({ screen, setScreen, pendingCount, kitchenCount, deliveryCount, local, onLogout, open, onClose }) {
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
          <div className="ap-logo-name">PedidosQR</div>
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
          {nav("delivery", "🛵", "Delivery", deliveryCount)}
          {nav("mesas", "🪑", "Mesas")}
        </div>
        <div className="ap-nav-group">
          <div className="ap-nav-label">CARTA</div>
          {nav("carta", "🎨", "Carta")}
          {nav("productos", "📦", "Productos")}
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

        {(local?.plus_ia || local?.plus_figma) && (
          <div className="ap-nav-group">
            <div className="ap-nav-label">✦ PLUS</div>
            {local?.plus_ia    && nav("plus_ia",    "🤖", <><span>IA Asistente</span><span className="ap-plus-badge ap-plus-ia">IA</span></>)}
            {local?.plus_figma && nav("plus_figma", "🎨", <><span>Editor Figma</span><span className="ap-plus-badge ap-plus-figma">FIGMA</span></>)}
          </div>
        )}
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
  const [ticketP, setTicketP] = useState(null);
  const [editP,   setEditP]   = useState(null);

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
    flex: 1, padding: "10px 8px", borderRadius: 10, border: `1px solid ${border}`,
    background: bg, color, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
    fontWeight: 700, cursor: "pointer", letterSpacing: .5,
  });

  const METODOS = { efectivo:"Efectivo", tarjeta:"Tarjeta", mp:"Mercado Pago", transferencia:"Transferencia", qr:"QR" };

  function printTicket(p) {
    const items = p.pedido_items || [];
    const w = window.open('','_blank','width=400,height=600');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Courier New',monospace;font-size:13px;padding:20px;background:#fff;color:#000;}
      h2{text-align:center;font-size:16px;margin-bottom:4px;}
      .sub{text-align:center;font-size:11px;color:#666;margin-bottom:10px;}
      .sep{border:none;border-top:1px dashed #000;margin:8px 0;}
      .row{display:flex;justify-content:space-between;margin:3px 0;}
      .total{font-size:15px;font-weight:bold;}
      .foot{text-align:center;font-size:11px;margin-top:10px;color:#555;}
      @media print{body{padding:4px;}}
    </style></head><body>
      <h2>${local?.nombre || 'PedidosQR'}</h2>
      <div class="sub">${new Date(p.created_at).toLocaleString('es-AR')}</div>
      <hr class="sep"/>
      ${p.mesa_numero > 0 ? `<div class="row"><span>Mesa</span><span>${p.mesa_numero}</span></div>` : ''}
      ${p.tipo_pedido === 'delivery' ? `<div class="row"><span>Delivery</span><span>${p.nombre_cliente || ''}</span></div>` : ''}
      <hr class="sep"/>
      ${items.map(i => `<div class="row"><span>x${i.cantidad} ${i.nombre}</span><span>$${((i.precio||0)*(i.cantidad||1)).toLocaleString('es-AR')}</span></div>`).join('')}
      <hr class="sep"/>
      <div class="row total"><span>TOTAL</span><span>$${(p.total||0).toLocaleString('es-AR')}</span></div>
      ${p.metodo_pago ? `<div class="row"><span>Pago</span><span>${METODOS[p.metodo_pago]||p.metodo_pago}</span></div>` : ''}
      <div class="foot">¡Gracias por su visita! — PedidosQR</div>
    </body></html>`);
    w.document.close(); w.focus();
    setTimeout(()=>{ w.print(); }, 300);
  }

  function shareTicketWA(p) {
    const NL = "\n";
    const items = (p.pedido_items||[]).map(i=>`x${i.cantidad} ${i.nombre}  $${((i.precio||0)*(i.cantidad||1)).toLocaleString("es-AR")}`).join(NL);
    const txt = [
      `*${local?.nombre||"PedidosQR"}*`,
      new Date(p.created_at).toLocaleString("es-AR"),
      p.mesa_numero>0 ? "Mesa "+p.mesa_numero : null,
      p.tipo_pedido==="delivery" ? "Delivery: "+(p.nombre_cliente||"") : null,
      "",
      items,
      "",
      "Total: $"+(p.total||0).toLocaleString("es-AR"),
      p.metodo_pago ? "Pago: "+(METODOS[p.metodo_pago]||p.metodo_pago) : null,
    ].filter(x=>x!=null).join(NL);
    window.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank");
  }

  /* ── EDIT PEDIDO MODAL ── */
  function EditPedidoModal({ p, onClose }) {
    const [items,   setItems]   = React.useState((p.pedido_items||[]).map(i=>({...i})));
    const [metodo,  setMetodo]  = React.useState(p.metodo_pago||'');
    const [saving,  setSaving]  = React.useState(false);
    const newTotal = items.reduce((s,i)=>s+((i.precio||0)*(i.cantidad||1)),0);

    async function save() {
      setSaving(true);
      try {
        const removed = (p.pedido_items||[]).filter(orig => !items.find(i=>i.id===orig.id));
        for (const r of removed) {
          await supabase.from('pedido_items').delete().eq('id', r.id);
        }
        await supabase.from('pedidos').update({ metodo_pago: metodo||null, total: newTotal }).eq('id', p.id);
        const updatedP = { ...p, pedido_items: items, metodo_pago: metodo||null, total: newTotal };
        setPedidos(prev => prev.map(o => o.id === p.id ? updatedP : o));
        onClose(updatedP);
      } catch(e) { alert('Error: '+e.message); }
      finally { setSaving(false); }
    }

    return (
      <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
        onClick={onClose}>
        <div style={{ background:"#1e1e1e",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,width:"100%",maxWidth:420,maxHeight:"90vh",overflow:"auto",padding:24 }}
          onClick={e=>e.stopPropagation()}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
            <div style={{ fontSize:16,fontWeight:800 }}>✏️ Editar pedido #{p.id?.slice(-4)}</div>
            <div style={{ cursor:"pointer",color:"rgba(255,255,255,.4)",fontSize:22 }} onClick={onClose}>✕</div>
          </div>

          <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:1,marginBottom:8 }}>PRODUCTOS</div>
          {items.map((item,idx) => (
            <div key={item.id||idx} style={{ display:"flex",alignItems:"center",gap:10,background:"#161616",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,padding:"10px 12px",marginBottom:8 }}>
              <span style={{ flex:1,fontSize:13,color:"#fff" }}>x{item.cantidad} {item.nombre}</span>
              <span style={{ fontSize:13,color:"#e8a020",fontWeight:700,minWidth:60,textAlign:"right" }}>${((item.precio||0)*(item.cantidad||1)).toLocaleString('es-AR')}</span>
              <button onClick={() => setItems(prev=>prev.filter((_,i)=>i!==idx))}
                style={{ width:28,height:28,border:"1px solid rgba(232,64,64,.4)",borderRadius:7,background:"rgba(232,64,64,.12)",color:"#e84040",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            </div>
          ))}
          {items.length===0 && <div style={{ fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:12,textAlign:"center" }}>Sin productos</div>}

          <div style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"1px solid rgba(255,255,255,.08)",marginBottom:16 }}>
            <span style={{ fontSize:14,fontWeight:700,color:"rgba(255,255,255,.6)" }}>Total</span>
            <span style={{ fontSize:16,fontWeight:900,color:"#e8a020" }}>${newTotal.toLocaleString('es-AR')}</span>
          </div>

          <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:1,marginBottom:8 }}>FORMA DE PAGO</div>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:20 }}>
            {Object.entries(METODOS).map(([k,v]) => (
              <button key={k} onClick={() => setMetodo(k)}
                style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${metodo===k?"#C9A84C":"rgba(255,255,255,.12)"}`,background:metodo===k?"rgba(201,168,76,.15)":"transparent",color:metodo===k?"#C9A84C":"rgba(255,255,255,.5)",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                {v}
              </button>
            ))}
          </div>

          <div style={{ display:"flex",gap:8 }}>
            <button className="ap-btn ap-btn-ghost" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" style={{ flex:2 }} onClick={save} disabled={saving}>
              {saving ? "Guardando..." : "✓ Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendientesMesa     = pedidos.filter(p=>["nuevo","pendiente_pago"].includes(p.status) && !p.tipo_pedido?.match(/delivery|retiro/)).length;
  const pendientesDelivery = pedidos.filter(p=>["nuevo","pendiente_pago"].includes(p.status) && p.tipo_pedido?.match(/delivery|retiro/)).length;
  const enCocinaCount      = pedidos.filter(p=>p.status==="preparando").length;

  return (
    <div>
      {/* Stats rápidos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Pedidos Mesa",    val:pendientesMesa,     color:"#FFB020", icon:"🆕", sub:"pendientes"},
          {label:"Delivery",        val:pendientesDelivery, color:"#C9A84C", icon:"🛵", sub:"pendientes"},
          {label:"En Cocina",       val:enCocinaCount,      color:"#60a8f0", icon:"👨‍🍳", sub:"preparando"},
          {label:"Total hoy",       val:pedidos.filter(p=>p.created_at?.startsWith(today)).length, color:"#3ecf6e", icon:"📊", sub:"pedidos"},
        ].map(s=>(
          <div key={s.label} className="ap-card" style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"default"}}>
            <div style={{fontSize:26}}>{s.icon}</div>
            <div>
              <div style={{fontSize:24,fontWeight:900,color:s.color,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:10,color:"var(--text3)",letterSpacing:.5,marginTop:2}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
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
                    {p.status === "pendiente_pago" ? "✅ Pago ok" : "✅ Aceptar"}
                  </button>,
                  <button key="x" style={btnStyle("rgba(232,64,64,.12)","#e84040","rgba(232,64,64,.35)")} onClick={async()=>{
                    await updatePedidoStatus(p.id,"cancelado");
                    setPedidos(prev=>prev.map(o=>o.id===p.id?{...o,status:"cancelado"}:o));
                  }}>✕ Rechazar</button>
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
                    <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
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
                      <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => setTicketP(p)} title="Imprimir / Compartir">🖨️</button>
                      <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => setEditP(p)} title="Editar pedido">✏️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ticketP && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
          onClick={() => setTicketP(null)}>
          <div style={{ background:"#1e1e1e",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,width:"100%",maxWidth:400,padding:24 }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontSize:16,fontWeight:800 }}>🧾 Ticket #{ticketP.id?.slice(-4)}</div>
              <div style={{ cursor:"pointer",color:"rgba(255,255,255,.4)",fontSize:22 }} onClick={() => setTicketP(null)}>✕</div>
            </div>
            <div style={{ background:"#111",borderRadius:10,padding:16,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,marginBottom:16 }}>
              <div style={{ textAlign:"center",fontWeight:700,marginBottom:8 }}>{local?.nombre||'PedidosQR'}</div>
              <div style={{ textAlign:"center",fontSize:10,color:"rgba(255,255,255,.4)",marginBottom:10 }}>{new Date(ticketP.created_at).toLocaleString('es-AR')}</div>
              {ticketP.mesa_numero>0 && <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span>Mesa</span><span>{ticketP.mesa_numero}</span></div>}
              <hr style={{ border:"none",borderTop:"1px dashed rgba(255,255,255,.2)",margin:"8px 0" }}/>
              {(ticketP.pedido_items||[]).map((i,idx) => (
                <div key={idx} style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                  <span>x{i.cantidad} {i.nombre}</span>
                  <span>${((i.precio||0)*(i.cantidad||1)).toLocaleString('es-AR')}</span>
                </div>
              ))}
              <hr style={{ border:"none",borderTop:"1px dashed rgba(255,255,255,.2)",margin:"8px 0" }}/>
              <div style={{ display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:14 }}>
                <span>TOTAL</span><span style={{ color:"#e8a020" }}>${(ticketP.total||0).toLocaleString('es-AR')}</span>
              </div>
              {ticketP.metodo_pago && <div style={{ display:"flex",justifyContent:"space-between",marginTop:4,color:"rgba(255,255,255,.5)" }}><span>Pago</span><span>{METODOS[ticketP.metodo_pago]||ticketP.metodo_pago}</span></div>}
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button className="ap-btn ap-btn-ghost" style={{ flex:1 }} onClick={() => shareTicketWA(ticketP)}>📲 WhatsApp</button>
              <button className="ap-btn ap-btn-gold" style={{ flex:1 }} onClick={() => printTicket(ticketP)}>🖨️ Imprimir</button>
            </div>
            <button className="ap-btn ap-btn-ghost" style={{ width:"100%",marginTop:8 }} onClick={() => { setTicketP(null); setEditP(ticketP); }}>✏️ Editar este pedido</button>
          </div>
        </div>
      )}
      {editP && <EditPedidoModal p={editP} onClose={(updated) => { setEditP(null); if(updated) setTicketP(updated); }} />}
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
    const origin = window.location.hostname === 'localhost' ? window.location.origin : 'https://pedidosqr-ten.vercel.app';
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
    ? (window.location.hostname === 'localhost' ? window.location.origin : 'https://pedidosqr-ten.vercel.app') + `/${local.slug}/cocina`
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
  const [showGallery, setShowGallery] = useState(false);
  const [galleryCat, setGalleryCat] = useState("Carnes");
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
          <div style={{ display: "flex", gap: 8, marginBottom: uploadErr ? 6 : 0 }}>
            <button
              className="ap-btn ap-btn-ghost"
              style={{ flex: 1 }}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              📷 {uploading ? "Subiendo..." : imagen ? "Cambiar foto" : "Subir foto"}
            </button>
            <button
              className="ap-btn ap-btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setShowGallery(true)}
            >
              🖼️ Galería
            </button>
          </div>
          {uploadErr && <div style={{ fontSize: 11, color: "#e84040", marginTop: 6 }}>{uploadErr}</div>}
          {/* Inline photo gallery */}
          {showGallery && (() => {
            const FPHOTOS = [
              {cat:'Carnes', p:[
                /* Bife de chorizo, tira, vacío, asado */
                'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1546964124-0cce460ebe24?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1558030006-b6298e1d1b05?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=400&fit=crop',
                /* Parrilla argentina */
                'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1607116667981-ff148a154524?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1544487660-b86880a72e5c?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1615361200141-f45040f367be?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1611599537845-1c7aca0091c0?w=400&h=400&fit=crop',
                /* Asado / vacío / tiras al fuego */
                'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1626082927389-6cd097cee6d7?w=400&h=400&fit=crop',
                /* Choripán */
                'https://images.unsplash.com/photo-1585947406187-6d5b44f10af5?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=400&fit=crop',
              ]},
              {cat:'Hamburguesas', p:[
                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1553979459-d1029eb29088?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1611483796693-5b048abae463?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1609796741996-05ef11d3fa87?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=400&h=400&fit=crop',
                /* Completa con huevo, doble, artesanal */
                'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1577906096429-f73c2c312435?w=400&h=400&fit=crop',
              ]},
              {cat:'Pizzas', p:[
                /* Muzzarella, napolitana, fugazzeta, jamón y morrón */
                'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1555072956-7758afb20e8f?w=400&h=400&fit=crop',
                /* Napolitana (tomate + mozzarella) */
                'https://images.unsplash.com/photo-1620374645310-f2e0a70e4ca1?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1548369937-47519962c11a?w=400&h=400&fit=crop',
                /* Fugazzeta / cebolla */
                'https://images.unsplash.com/photo-1604917877934-07d8d248d396?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1548940740-204726a19be3?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=400&fit=crop',
                /* Jamón y morrón / pepperoni / colores */
                'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1458642849426-cfb724f15ef7?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400&h=400&fit=crop',
              ]},
              {cat:'Pastas', p:[
                /* Ñoquis / gnocchi */
                'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1567608346706-68c6e5e1b0e6?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1572030610501-53035bd27a7b?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&h=400&fit=crop',
                /* Lasaña */
                'https://images.unsplash.com/photo-1598514983318-2f5da945b4d9?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1637361922964-2b63ee3c9e35?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1551183053-bf91798d792e?w=400&h=400&fit=crop',
                /* Pastas caseras, tallarines, ravioles */
                'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1548940740-204726a19be3?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1611270629569-8b357cb88da9?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=400&fit=crop',
                /* Canelones, sorrentinos */
                'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=400&h=400&fit=crop',
              ]},
              {cat:'Sushi', p:['https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1617196034082-138e60fc86a3?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1581784368651-8916092072cf?w=400&h=400&fit=crop']},
              {cat:'Postres', p:['https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1488477304112-4944851de03d?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&h=400&fit=crop']},
              {cat:'Bebidas', p:['https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1493657240510-f2bf81efbb3b?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1437418747212-4d7d9996d040?w=400&h=400&fit=crop']},
              {cat:'Café', p:['https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?w=400&h=400&fit=crop']},
              {cat:'Ensaladas', p:['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400&h=400&fit=crop']},
              {cat:'Empanadas', p:[
                /* Empanadas fritas y al horno */
                'https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1607450936127-34f18c05a0d1?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1572441713132-c542fc4fe282?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1568051243858-533a607809a5?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1464219551459-ac14ae01fbe0?w=400&h=400&fit=crop',
              ]},
              {cat:'Pollo', p:['https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop']},
              {cat:'Milanesas', p:[
                /* Milanesa clásica */
                'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400&h=400&fit=crop',
                /* Napolitana (con salsa y queso) */
                'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=400&h=400&fit=crop',
                /* Sándwich de milanesa */
                'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1596956470007-2bf6095e7e16?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=400&h=400&fit=crop',
              ]},
              {cat:'Mariscos', p:['https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1611599537845-1c7aca0091c0?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1560717845-968823efbee1?w=400&h=400&fit=crop']},
              {cat:'Sándwiches', p:[
                /* Clásicos */
                'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1596956470007-2bf6095e7e16?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=400&h=400&fit=crop',
                /* Lomito / steak sandwich */
                'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1620088455215-27c44baf44fe?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1572441713132-c542fc4fe282?w=400&h=400&fit=crop',
              ]},
              {cat:'Desayuno', p:['https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1481070555726-e2fe8357725c?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=400&fit=crop']},
            ];
            const photos = FPHOTOS.find(g=>g.cat===galleryCat)?.p || [];
            return (
              <div style={{ marginTop: 10, background: "#111", borderRadius: 10, padding: 10, border: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ position:"relative", marginBottom:10 }}>
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch", scrollbarWidth:"none", msOverflowStyle:"none" }}>
                    {FPHOTOS.map(g => (
                      <button key={g.cat} onClick={() => setGalleryCat(g.cat)}
                        className={`ap-btn ap-btn-sm ${galleryCat===g.cat ? "ap-btn-gold" : "ap-btn-ghost"}`}
                        style={{ flexShrink: 0, fontSize: 11, padding:"7px 12px", minHeight:34 }}>{g.cat}</button>
                    ))}
                  </div>
                  <div style={{ position:"absolute",left:0,top:0,bottom:4,width:16,background:"linear-gradient(to right,#111 50%,transparent)",pointerEvents:"none" }}/>
                  <div style={{ position:"absolute",right:0,top:0,bottom:4,width:32,background:"linear-gradient(to left,#111 50%,transparent)",pointerEvents:"none" }}/>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                  {photos.map((url, i) => (
                    <div key={i} onClick={() => { setImagen(url); setShowGallery(false); }}
                      style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: imagen===url ? "2px solid #C9A84C" : "2px solid transparent" }}>
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  ))}
                </div>
                <button className="ap-btn ap-btn-ghost" style={{ width: "100%", marginTop: 8, fontSize: 11 }} onClick={() => setShowGallery(false)}>Cerrar galería</button>
              </div>
            );
          })()}
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
   SCREEN: CARTA DESIGNER v3 — Template Gallery + Block Builder
══════════════════════════════════════════════════════════════ */

const CDV3_FONTS = [
  { label:'Sistema',   value:'system-ui, sans-serif' },
  { label:'Clásica',   value:"'Georgia', 'Times New Roman', serif" },
  { label:'Moderna',   value:"'Helvetica Neue', Arial, sans-serif" },
  { label:'Bold',      value:"'Arial Black', 'Impact', sans-serif" },
  { label:'Mono',      value:"'Courier New', Courier, monospace" },
];

/* prodS: 'horizontal' | 'vertical' | 'compact-list' | 'full-photo'
   catH:  'banner' | 'divider' | 'bold-label' | 'pill' | 'text-only'  */
const CDV3_TEMPLATES = [
  {id:'nobu',       nombre:'Nobu Tokyo',          cat:'Japonés',     emoji:'🍣', mood:'Minimalista premium',
   dark:true,  bg:'#0a0a0a', ac:'#C41E3A', font:"'Helvetica Neue',Arial,sans-serif",
   catH:'divider',    prodS:'horizontal',    headerAlign:'center'},

  {id:'bistro',     nombre:'Bistro Parisino',      cat:'Cafetería',   emoji:'🥐', mood:'Clásico francés',
   dark:false, bg:'#f8f4e8', ac:'#1a3a5c', ac2:'#C9A84C', font:"'Georgia',serif",
   catH:'divider',    prodS:'compact-list',  headerAlign:'center'},

  {id:'parrilla',   nombre:'Parrilla Don José',    cat:'Parrilla',    emoji:'🥩', mood:'Rústico premium',
   dark:true,  bg:'#120a04', ac:'#C9A84C', font:"'Georgia',serif",
   catH:'banner',     prodS:'horizontal',    headerAlign:'left'},

  {id:'omakase',    nombre:'Omakase',              cat:'Japonés',     emoji:'🎌', mood:'Zen minimalista',
   dark:true,  bg:'#0d0d0d', ac:'#ffffff', ac2:'#C41E3A', font:"'Helvetica Neue',Arial,sans-serif",
   catH:'bold-label', prodS:'compact-list',  headerAlign:'center'},

  {id:'heladeria',  nombre:'Heladería Fresca',     cat:'Heladería',   emoji:'🍦', mood:'Fresco y alegre',
   dark:false, bg:'#f0faf5', ac:'#7C3AED', font:"system-ui,sans-serif",
   catH:'pill',       prodS:'vertical',      headerAlign:'center'},

  {id:'moderna',    nombre:'La Brigada',           cat:'Hamburguesas',emoji:'🍔', mood:'Urbano moderno',
   dark:true,  bg:'#111111', ac:'#FF5500', font:"'Arial Black',sans-serif",
   catH:'bold-label', prodS:'full-photo',    headerAlign:'left'},

  {id:'speakeasy',  nombre:'Speakeasy 1920',       cat:'Bar',         emoji:'🍸', mood:'Art Deco elegante',
   dark:true,  bg:'#07040f', ac:'#B8963E', font:"'Georgia',serif",
   catH:'divider',    prodS:'horizontal',    headerAlign:'center'},

  {id:'vegano',     nombre:'Raíces',               cat:'Vegano',      emoji:'🌿', mood:'Orgánico natural',
   dark:true,  bg:'#0b1a0d', ac:'#6DBE45', font:"system-ui,sans-serif",
   catH:'banner',     prodS:'horizontal',    headerAlign:'left'},

  {id:'lamaison',   nombre:'La Maison',           cat:'Alta cocina', emoji:'✨', mood:'Cocina de autor',
   dark:true,  bg:'#0d0d08', ac:'#C9A84C', font:"'Raleway','Helvetica Neue',sans-serif",
   catH:'text-only',  prodS:'horizontal',    headerAlign:'center'},

  {id:'grand',      nombre:'Grand Hotel',          cat:'Alta cocina', emoji:'🍽️', mood:'Fine dining formal',
   dark:false, bg:'#faf8f2', ac:'#2D5016', ac2:'#C9A84C', font:"'Georgia',serif",
   catH:'divider',    prodS:'compact-list',  headerAlign:'center'},

  {id:'maremoto',   nombre:'Maremoto',             cat:'Mariscos',    emoji:'🦐', mood:'Mar profundo',
   dark:true,  bg:'#001428', ac:'#00B4D8', font:"system-ui,sans-serif",
   catH:'banner',     prodS:'full-photo',    headerAlign:'center'},

  {id:'arabian',    nombre:'Al Arabiya',           cat:'Árabe',       emoji:'🥙', mood:'Oriental de lujo',
   dark:true,  bg:'#120c02', ac:'#D4A84B', font:"'Georgia',serif",
   catH:'banner',     prodS:'horizontal',    headerAlign:'center'},

  {id:'pasteleria', nombre:'Pastelería Luna',      cat:'Pastelería',  emoji:'🎂', mood:'Delicado y dulce',
   dark:false, bg:'#fef0f5', ac:'#D63384', font:"system-ui,sans-serif",
   catH:'pill',       prodS:'vertical',      headerAlign:'center'},

  {id:'dragon',     nombre:'Wok Dragon',           cat:'Asiático',    emoji:'🍜', mood:'Alta energía',
   dark:true,  bg:'#0f0000', ac:'#FF2020', ac2:'#FFD700', font:"'Arial Black',sans-serif",
   catH:'bold-label', prodS:'full-photo',    headerAlign:'left'},

  {id:'brewery',    nombre:'Brew & Grub',          cat:'Cervecería',  emoji:'🍺', mood:'Craft artesanal',
   dark:true,  bg:'#0e0800', ac:'#E8911A', font:"'Arial Black',sans-serif",
   catH:'banner',     prodS:'horizontal',    headerAlign:'left'},

  {id:'fogon',      nombre:'El Fogón',             cat:'Mexicano',    emoji:'🌮', mood:'Mexicano premium',
   dark:true,  bg:'#160800', ac:'#E05C1A', ac2:'#FFD700', font:"'Georgia',serif",
   catH:'divider',    prodS:'horizontal',    headerAlign:'center'},

  {id:'nordic',     nombre:'Nordic Table',         cat:'Desayunos',   emoji:'🥞', mood:'Escandinavo limpio',
   dark:false, bg:'#f7f7f5', ac:'#2C3E50', font:"'Helvetica Neue',Arial,sans-serif",
   catH:'divider',    prodS:'compact-list',  headerAlign:'left'},
];

function cdv3MakeDefaultBlocks(local) {
  return [
    {id:'hero',     type:'hero',       on:true,  data:{titulo:local?.nombre||'',sub:'',logo:''}},
    {id:'cats',     type:'categorias', on:true,  data:{}},
    {id:'contacto', type:'contacto',   on:false, data:{tel:local?.config?.telefono||'',dir:'',hs:''}},
    {id:'pago',     type:'pago',       on:false, data:{alias:local?.config?.alias_mp||'',titular:'',lbl:'Transferencias / MP'}},
    {id:'qr',       type:'qr',         on:false, data:{url:'',lbl:'Escanear para más info'}},
  ];
}

/* ── helpers ── */
function cdv2CardStyle(formato, imagen, accentColor, catColor) {
  const effectiveColor = catColor || accentColor;
  const imgBg = imagen
    ? `linear-gradient(rgba(0,0,0,.42),rgba(0,0,0,.62)), url(${imagen}) center/cover no-repeat`
    : catColor ? `linear-gradient(135deg,${catColor}ee,${catColor}99)`
               : `linear-gradient(135deg,${accentColor}28,${accentColor}08)`;
  const base = { background:imgBg, border:`1px solid ${effectiveColor}55`, cursor:'pointer', transition:'opacity .12s', userSelect:'none' };
  if (formato==='rectangle') return { ...base, borderRadius:10, minHeight:72, display:'flex', alignItems:'center', padding:'0 16px' };
  if (formato==='square')    return { ...base, borderRadius:10, aspectRatio:'1/1', maxWidth:160, margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:12 };
  return { ...base, borderRadius:'50%', width:110, height:110, margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:8 };
}
function cdv2CatContent(formato, cat, isExp) {
  if (formato==='rectangle') return (
    <div style={{ display:'flex',alignItems:'center',gap:12,width:'100%' }}>
      <span style={{ fontSize:24 }}>{cat.emoji}</span>
      <span style={{ fontSize:16,fontWeight:700,color:'#fff',flex:1,textShadow:'0 1px 6px rgba(0,0,0,.8)' }}>{cat.label}</span>
      <span style={{ fontSize:13,color:'rgba(255,255,255,.45)',display:'inline-block',transform:isExp?'rotate(180deg)':'none',transition:'transform .15s' }}>▼</span>
    </div>
  );
  return (<>
    <span style={{ fontSize:formato==='round'?30:26, marginBottom:4 }}>{cat.emoji}</span>
    <span style={{ fontSize:formato==='round'?11:13,fontWeight:700,color:'#fff',textAlign:'center',textShadow:'0 1px 5px rgba(0,0,0,.8)',lineHeight:1.2 }}>{cat.label}</span>
    {formato==='square'&&<span style={{ fontSize:10,color:'rgba(255,255,255,.35)',marginTop:4 }}>{isExp?'▲':'▼'}</span>}
  </>);
}

/* ── category header renderer ── */
function cdv3CatHeader(cat, cfg, tpl, isExp, onToggle) {
  const ac = cfg.color || tpl.ac;
  const tc = tpl.dark===false ? '#1a1a1a' : '#ffffff';
  if (tpl.catH==='divider') return (
    <div onClick={onToggle} style={{ display:'flex',alignItems:'center',gap:10,padding:'14px 4px 10px',cursor:'pointer' }}>
      <div style={{ flex:1,height:1,background:`${ac}35` }} />
      <span style={{ fontSize:12,fontWeight:700,color:ac,letterSpacing:2,textTransform:'uppercase',fontFamily:tpl.font,whiteSpace:'nowrap' }}>{cat.emoji} {cat.label}</span>
      <div style={{ flex:1,height:1,background:`${ac}35` }} />
      <span style={{ fontSize:10,color:`${ac}70`,marginLeft:2 }}>{isExp?'▲':'▼'}</span>
    </div>
  );
  if (tpl.catH==='bold-label') return (
    <div onClick={onToggle} style={{ display:'flex',alignItems:'center',padding:'14px 0 8px',cursor:'pointer',borderBottom:`2px solid ${ac}` }}>
      <span style={{ fontSize:18,marginRight:8 }}>{cat.emoji}</span>
      <span style={{ fontSize:14,fontWeight:900,color:ac,letterSpacing:1,textTransform:'uppercase',fontFamily:tpl.font,flex:1 }}>{cat.label}</span>
      <span style={{ fontSize:13,color:`${ac}80` }}>{isExp?'−':'+'}</span>
    </div>
  );
  if (tpl.catH==='pill') return (
    <div onClick={onToggle} style={{ display:'flex',justifyContent:'center',padding:'10px 0 6px',cursor:'pointer' }}>
      <div style={{ background:ac,borderRadius:20,padding:'7px 20px',display:'flex',alignItems:'center',gap:8 }}>
        <span style={{ fontSize:16 }}>{cat.emoji}</span>
        <span style={{ fontSize:13,fontWeight:700,color:'#fff',letterSpacing:.5 }}>{cat.label}</span>
        <span style={{ fontSize:10,color:'rgba(255,255,255,.65)' }}>{isExp?'▲':'▼'}</span>
      </div>
    </div>
  );
  if (tpl.catH==='text-only') return (
    <div onClick={onToggle} style={{ display:'flex',alignItems:'baseline',padding:'20px 0 10px',cursor:'pointer' }}>
      <span style={{ fontSize:13,fontWeight:700,color:ac,letterSpacing:2,textTransform:'uppercase',fontFamily:tpl.font,flex:1 }}>{cat.label}</span>
      <span style={{ fontSize:11,color:`${ac}50`,flexShrink:0 }}>{isExp?'−':'+'}</span>
    </div>
  );
  /* banner */
  return (
    <div onClick={onToggle} style={cdv2CardStyle(cfg.formato,cfg.imagen,tpl.ac,cfg.color)}>
      {cdv2CatContent(cfg.formato,cat,isExp)}
    </div>
  );
}

/* ── product card renderer ── */
function cdv3ProdCard(p, cat, prodS, tpl, catColor) {
  const ac  = catColor || tpl.ac;
  const tc  = tpl.dark===false ? '#1a1a1a' : '#ffffff';
  const imgSrc = p.imagen || getPlaceholder(cat.label);
  const name   = p.name || p.nombre;
  const price  = ARS(p.price ?? p.precio);
  const desc   = (p.desc || p.descripcion || '').slice(0, 58);

  if (prodS==='horizontal') return (
    <div key={p.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${ac}12`,marginBottom:0 }}>
      <img src={imgSrc} alt="" style={{ width:62,height:62,borderRadius:8,objectFit:'cover',flexShrink:0 }} />
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:700,color:tc,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{name}</div>
        {desc&&<div style={{ fontSize:10,color:`${tc}55`,lineHeight:1.4,marginTop:2,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>{desc}</div>}
      </div>
      <div style={{ fontSize:14,fontWeight:800,color:ac,flexShrink:0,minWidth:52,textAlign:'right' }}>{price}</div>
    </div>
  );

  if (prodS==='compact-list') return (
    <div key={p.id} style={{ display:'flex',alignItems:'center',padding:'11px 0',borderBottom:`1px solid ${ac}18` }}>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:600,color:tc,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{name}</div>
        {desc&&<div style={{ fontSize:10,color:`${tc}55`,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{desc}</div>}
      </div>
      <div style={{ fontFamily:"'Courier New',monospace",fontSize:14,fontWeight:700,color:ac,flexShrink:0,marginLeft:14 }}>{price}</div>
    </div>
  );

  if (prodS==='full-photo') return (
    <div key={p.id} style={{ borderRadius:10,overflow:'hidden',marginBottom:8,position:'relative' }}>
      <img src={imgSrc} alt="" style={{ width:'100%',height:140,objectFit:'cover',display:'block' }} />
      <div style={{ position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,.88))',padding:'20px 12px 10px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end' }}>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:14,fontWeight:700,color:'#fff',lineHeight:1.3 }}>{name}</div>
            {desc&&<div style={{ fontSize:10,color:'rgba(255,255,255,.65)',marginTop:2 }}>{desc}</div>}
          </div>
          <div style={{ fontSize:15,fontWeight:800,color:ac,flexShrink:0,marginLeft:10 }}>{price}</div>
        </div>
      </div>
    </div>
  );

  /* vertical (default) */
  return (
    <div key={p.id} style={{ background:'rgba(255,255,255,.05)',borderRadius:10,overflow:'hidden',border:`1px solid ${ac}22` }}>
      <img src={imgSrc} alt="" style={{ width:'100%',height:105,objectFit:'cover',display:'block' }} />
      <div style={{ padding:'7px 9px' }}>
        <div style={{ fontSize:12,fontWeight:700,color:tc,lineHeight:1.3 }}>{name}</div>
        <div style={{ fontSize:13,fontWeight:800,color:ac,margin:'3px 0 2px' }}>{price}</div>
        {desc&&<div style={{ fontSize:10,color:`${tc}55`,lineHeight:1.4 }}>{desc}</div>}
      </div>
    </div>
  );
}

function ScreenCartaDesigner({ prods, cats, local, setLocal, setProds, goBack }) {
  const savedV3  = local?.config?.carta_v3 || {};
  const savedV2  = local?.config?.carta_v2 || {};
  const initView = savedV3.templateId ? 'editor' : (savedV2.bgColor ? 'editor' : 'gallery');
  const previewRef = useRef(null);

  const [view,        setView]        = useState(initView);
  const [tab,         setTab]         = useState('design');
  const [saving,      setSaving]      = useState(false);
  const [showPub,     setShowPub]     = useState(false);
  const [filterCat,   setFilterCat]   = useState('Todos');
  const [pubCfg,      setPubCfg]      = useState(() => { const ex=local?.config?.carta_publicada_en||{}; return Object.keys(ex).length?ex:{mesa:true}; });
  const [templateId,  setTemplateId]  = useState(savedV3.templateId  || null);
  const [bgColor,     setBgColor]     = useState(savedV3.bgColor     || savedV2.bgColor     || '#18181b');
  const [accentColor, setAccentColor] = useState(savedV3.accentColor || savedV2.accentColor || '#C9A84C');
  const [fontFamily,  setFontFamily]  = useState(savedV3.fontFamily  || savedV2.fontFamily  || 'system-ui, sans-serif');
  const [titulo,      setTitulo]      = useState(savedV3.titulo      || savedV2.titulo      || (local?.nombre || ''));
  const [fontSize,    setFontSize]    = useState(savedV3.fontSize    || 'normal'); // 'small'|'normal'|'large'
  const [showPhotoPicker, setShowPhotoPicker] = useState(null); // null | { target: 'prod'|'cat', id, field }
  const [showQuickAdd,    setShowQuickAdd]    = useState(null); // null | catId
  const [quickForm,       setQuickForm]       = useState({ nombre:'', precio:'', desc:'', imagen:'' });
  const [savingProd,      setSavingProd]      = useState(false);
  const [exporting,       setExporting]       = useState(false);
  const [catConfigs,  setCatConfigs]  = useState(savedV3.catConfigs  || savedV2.catConfigs  || {});
  const [blocks,      setBlocks]      = useState(() => savedV3.blocks || cdv3MakeDefaultBlocks(local));
  const [selCatId,    setSelCatId]    = useState(null);
  const [selBlockId,  setSelBlockId]  = useState(null);
  const [expandedPrev,setExpandedPrev]= useState({});

  const curTpl    = CDV3_TEMPLATES.find(t => t.id === templateId) || null;
  const textColor = curTpl?.dark === false ? '#1a1a1a' : '#ffffff';
  const activeCats= (cats||[]).filter(c => c.activa !== false);

  function getCatCfg(id) { return catConfigs[id] || { formato: curTpl?.catH==='banner'?'rectangle':'rectangle', imagen:null, color:null }; }
  function updCatCfg(id, upd) { setCatConfigs(p => ({ ...p, [id]: { ...getCatCfg(id), ...upd } })); }
  function updBlock(id, upd)  { setBlocks(p => p.map(b => b.id===id ? {...b,...upd} : b)); }
  function updBlockData(id, upd) { setBlocks(p => p.map(b => b.id===id ? {...b,data:{...b.data,...upd}} : b)); }

  function applyTemplate(t) {
    setTemplateId(t.id);
    setBgColor(t.bg);
    setAccentColor(t.ac);
    setFontFamily(t.font);
    setCatConfigs({});
    setView('editor');
    setTab('preview');
  }

  async function doSave(extraPub) {
    if (!local?.restauranteId) { alert('Sin restaurante'); return false; }
    setSaving(true);
    try {
      const carta_v3 = { templateId, bgColor, accentColor, fontFamily, fontSize, titulo, catConfigs, blocks };
      const cfg = { ...(local?.config||{}), carta_v3, carta_publicada_en: extraPub !== undefined ? extraPub : pubCfg };
      const { error } = await supabase.from('restaurantes').update({ config: cfg }).eq('id', local.restauranteId);
      if (error) throw error;
      if (setLocal) setLocal(p => ({ ...p, config: cfg }));
      return true;
    } catch(e) { alert('Error al guardar: ' + e.message); return false; }
    finally { setSaving(false); }
  }

  const CTX_LIST = [
    {key:'mesa',    label:'🪑 Mesa (QR)',       desc:'El cliente escanea el QR de la mesa'},
    {key:'vitrina', label:'📺 Vitrina',          desc:'Pantalla en el local'},
    {key:'caja',    label:'💰 Caja',             desc:'Visible en el mostrador'},
    {key:'delivery',label:'🛵 Delivery/Retiro',  desc:'Pedidos desde el celular'},
  ];

  /* font scale helper */
  const FS = { small: .85, normal: 1, large: 1.18 }[fontSize] || 1;

  /* ─────────────────── PHOTO GALLERY ─────────────────── */
  const FOOD_PHOTOS = [
    /* Carnes */
    {cat:'Carnes', photos:[
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1558030006-b6298e1d1b05?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1546964124-0cce460ebe24?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop',
    ]},
    /* Hamburguesas */
    {cat:'Hamburguesas', photos:[
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1553979459-d1029eb29088?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1611483796693-5b048abae463?w=400&h=400&fit=crop',
    ]},
    /* Pizzas */
    {cat:'Pizzas', photos:[
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=400&fit=crop',
    ]},
    /* Pastas */
    {cat:'Pastas', photos:[
      'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1598514983318-2f5da945b4d9?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=400&fit=crop',
    ]},
    /* Sushi */
    {cat:'Sushi', photos:[
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1617196034183-4d6bbd26c11e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&h=400&fit=crop',
    ]},
    /* Ensaladas */
    {cat:'Ensaladas', photos:[
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1540420773420-3ccf2e43b32f?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400&h=400&fit=crop',
    ]},
    /* Postres */
    {cat:'Postres', photos:[
      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1488477181228-c84fceae48b8?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
    ]},
    /* Bebidas */
    {cat:'Bebidas', photos:[
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&h=400&fit=crop',
    ]},
    /* Desayunos */
    {cat:'Desayunos', photos:[
      'https://images.unsplash.com/photo-1484723091739-30acbef02cde?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=400&h=400&fit=crop',
    ]},
    /* Mariscos */
    {cat:'Mariscos', photos:[
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1612544448445-b8232cff3b6c?w=400&h=400&fit=crop',
    ]},
  ];

  /* Photo Picker Modal */
  function PhotoPickerModal() {
    const [selCat, setSelCat] = useState(FOOD_PHOTOS[0].cat);
    const photos = FOOD_PHOTOS.find(g=>g.cat===selCat)?.photos || [];
    function pick(url) {
      if (!showPhotoPicker) return;
      const { target, id, field } = showPhotoPicker;
      if (target==='prod') {
        // update product in supabase
        supabase.from('productos').update({ imagen: url }).eq('id', id)
          .then(() => { if (setProds) setProds(p => p.map(x => x.id===id ? {...x, imagen:url} : x)); });
      } else if (target==='cat') {
        updCatCfg(id, { imagen: url });
      } else if (target==='block') {
        updBlockData(id, { [field]: url });
      }
      setShowPhotoPicker(null);
    }
    return (
      <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:9998,display:'flex',alignItems:'flex-end' }}
        onClick={()=>setShowPhotoPicker(null)}>
        <div onClick={e=>e.stopPropagation()}
          style={{ width:'100%',maxWidth:430,margin:'0 auto',background:'#1a1a1a',borderRadius:'18px 18px 0 0',padding:'16px 14px 32px',maxHeight:'75vh',display:'flex',flexDirection:'column' }}>
          <div style={{ width:36,height:4,borderRadius:2,background:'rgba(255,255,255,.2)',margin:'0 auto 14px' }} />
          <div style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>📸 Galería de fotos</div>
          <div style={{ display:'flex',gap:6,overflowX:'auto',marginBottom:12,paddingBottom:4,WebkitOverflowScrolling:'touch' }}>
            {FOOD_PHOTOS.map(g=>(
              <button key={g.cat} onClick={()=>setSelCat(g.cat)}
                className={`ap-btn ap-btn-sm ${selCat===g.cat?'ap-btn-gold':'ap-btn-ghost'}`}
                style={{ flexShrink:0,fontSize:10 }}>{g.cat}</button>
            ))}
          </div>
          <div style={{ flex:1,overflowY:'auto',overscrollBehavior:'contain' }}>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
              {photos.map((url,i)=>(
                <div key={i} onClick={()=>pick(url)}
                  style={{ aspectRatio:'1/1',borderRadius:10,overflow:'hidden',cursor:'pointer',border:'2px solid transparent',transition:'border .1s' }}
                  onMouseEnter={e=>e.currentTarget.style.border='2px solid #C9A84C'}
                  onMouseLeave={e=>e.currentTarget.style.border='2px solid transparent'}>
                  <img src={url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Quick Add Product Modal */
  function QuickAddModal() {
    const catId = showQuickAdd;
    const cat   = (cats||[]).find(c=>c.id===catId) || {};
    async function submit(e) {
      e.preventDefault();
      if (!quickForm.nombre || !quickForm.precio) return;
      setSavingProd(true);
      try {
        const newProd = {
          restaurante_id: local.restauranteId,
          nombre: quickForm.nombre,
          precio: parseFloat(quickForm.precio) || 0,
          descripcion: quickForm.desc || '',
          imagen: quickForm.imagen || '',
          categoria_id: catId,
          activo: true,
        };
        const { data, error } = await supabase.from('productos').insert(newProd).select().single();
        if (error) throw error;
        if (setProds) setProds(p => [...p, { ...data, cat: catId, name: data.nombre, price: data.precio, desc: data.descripcion, active: true }]);
        setQuickForm({ nombre:'', precio:'', desc:'', imagen:'' });
        setShowQuickAdd(null);
      } catch(e) { alert('Error: ' + e.message); }
      finally { setSavingProd(false); }
    }
    return (
      <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:9997,display:'flex',alignItems:'flex-end' }}
        onClick={()=>setShowQuickAdd(null)}>
        <div onClick={e=>e.stopPropagation()}
          style={{ width:'100%',maxWidth:430,margin:'0 auto',background:'#1c1c1c',borderRadius:'18px 18px 0 0',padding:'16px 16px 32px' }}>
          <div style={{ width:36,height:4,borderRadius:2,background:'rgba(255,255,255,.2)',margin:'0 auto 14px' }} />
          <div style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>➕ Nuevo producto — {cat.label||'categoría'}</div>
          <form onSubmit={submit}>
            {[
              {k:'nombre', l:'Nombre *', p:'Ej: Milanesa napolitana', t:'text'},
              {k:'precio', l:'Precio *', p:'Ej: 2500', t:'number'},
              {k:'desc',   l:'Descripción', p:'Opcional...', t:'text'},
            ].map(f=>(
              <div key={f.k} style={{ marginBottom:10 }}>
                <label style={{ fontSize:10,color:'rgba(255,255,255,.4)',display:'block',marginBottom:3 }}>{f.l}</label>
                <input type={f.t} value={quickForm[f.k]} onChange={e=>setQuickForm(q=>({...q,[f.k]:e.target.value}))}
                  placeholder={f.p} required={f.k==='nombre'||f.k==='precio'}
                  style={{ background:'#2a2a2a',color:'#fff',border:'1px solid rgba(255,255,255,.1)',borderRadius:7,padding:'8px 10px',width:'100%',fontSize:12,boxSizing:'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10,color:'rgba(255,255,255,.4)',display:'block',marginBottom:3 }}>Foto</label>
              <div style={{ display:'flex',gap:8 }}>
                <input value={quickForm.imagen} onChange={e=>setQuickForm(q=>({...q,imagen:e.target.value}))}
                  placeholder="URL de la foto..." 
                  style={{ flex:1,background:'#2a2a2a',color:'#fff',border:'1px solid rgba(255,255,255,.1)',borderRadius:7,padding:'8px 10px',fontSize:12 }} />
                <button type="button" className="ap-btn ap-btn-ghost ap-btn-sm"
                  onClick={()=>setShowPhotoPicker({target:'prod',id:'new',field:'imagen',onPick:(url)=>setQuickForm(q=>({...q,imagen:url}))})}>
                  📸
                </button>
              </div>
              {quickForm.imagen&&<img src={quickForm.imagen} alt="" style={{ width:60,height:60,objectFit:'cover',borderRadius:8,marginTop:6 }} />}
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button type="button" className="ap-btn ap-btn-ghost" style={{ flex:1 }} onClick={()=>setShowQuickAdd(null)}>Cancelar</button>
              <button type="submit" className="ap-btn ap-btn-gold" style={{ flex:2 }} disabled={savingProd}>
                {savingProd?'Guardando...':'✓ Agregar producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* Export functions */
  async function exportAsImage() {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, { scale:2, useCORS:true, backgroundColor: bgColor });
      const link = document.createElement('a');
      link.download = `carta-${(titulo||'menu').toLowerCase().replace(/\s+/g,'-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch(e) { alert('Error al exportar: ' + e.message); }
    finally { setExporting(false); }
  }
  async function exportAsPDF() {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, { scale:2, useCORS:true, backgroundColor: bgColor });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation:'portrait', unit:'px', format:[canvas.width/2, canvas.height/2] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width/2, canvas.height/2);
      pdf.save(`carta-${(titulo||'menu').toLowerCase().replace(/\s+/g,'-')}.pdf`);
    } catch(e) { alert('Error al exportar: ' + e.message); }
    finally { setExporting(false); }
  }
  function shareLink() {
    const slug = local?.slug || local?.restauranteId || '';
    const url = `${window.location.origin}/menu/${slug}`;
    navigator.clipboard?.writeText(url).then(()=>alert('✅ Link copiado al portapapeles')).catch(()=>prompt('Copiá este link:', url));
  }

  /* ─────────────────── GALLERY ─────────────────── */
  function GalleryView() {
    const catTabs = ['Todos','Japonés','Cafetería','Parrilla','Bar','Hamburguesas','Vegano','Alta cocina','Heladería','Mariscos','Árabe','Pastelería','Asiático','Cervecería','Mexicano','Desayunos'];
    const filtered = filterCat==='Todos' ? CDV3_TEMPLATES : CDV3_TEMPLATES.filter(t => t.cat===filterCat);

    /* mini-preview renders the template's actual layout character */
    function MiniPreview({ t }) {
      const tc = t.dark===false ? '#1a1a1a' : '#ffffff';
      const SimProd = ({i=0}) => {
        const op = [1,.75,.5][i]||.5;
        if (t.prodS==='horizontal') return (
          <div style={{ display:'flex',height:28,borderRadius:4,overflow:'hidden',marginBottom:3,background:`${tc}07`,border:`1px solid ${t.ac}18`,flexShrink:0 }}>
            <div style={{ width:'36%',background:`${t.ac}${Math.round(op*.55*255).toString(16).padStart(2,'0')}`,flexShrink:0 }} />
            <div style={{ flex:1,padding:'4px 5px' }}>
              <div style={{ height:4,background:`${tc}35`,borderRadius:2,marginBottom:3,width:'70%' }} />
              <div style={{ height:4,background:`${t.ac}90`,borderRadius:2,width:'40%' }} />
            </div>
          </div>
        );
        if (t.prodS==='compact-list') return (
          <div style={{ display:'flex',alignItems:'center',marginBottom:4,paddingBottom:3,borderBottom:`1px solid ${t.ac}18` }}>
            <div style={{ flex:1,height:4,background:`${tc}${Math.round(op*.35*255).toString(16).padStart(2,'0')}`,borderRadius:2,marginRight:6 }} />
            <div style={{ height:5,background:t.ac,borderRadius:2,width:24,flexShrink:0 }} />
          </div>
        );
        if (t.prodS==='full-photo') return (
          <div style={{ borderRadius:4,height:30,marginBottom:3,background:`${t.ac}${Math.round(op*.45*255).toString(16).padStart(2,'0')}`,position:'relative',overflow:'hidden',flexShrink:0 }}>
            <div style={{ position:'absolute',bottom:0,left:0,right:0,height:14,background:'linear-gradient(transparent,rgba(0,0,0,.7))',display:'flex',alignItems:'center',padding:'0 4px' }}>
              <div style={{ height:3,background:'rgba(255,255,255,.7)',borderRadius:2,width:'55%' }} />
            </div>
          </div>
        );
        /* vertical */
        return (
          <div style={{ flex:1,borderRadius:4,overflow:'hidden',background:`${tc}07`,border:`1px solid ${t.ac}18` }}>
            <div style={{ height:22,background:`${t.ac}${Math.round(op*.5*255).toString(16).padStart(2,'0')}` }} />
            <div style={{ padding:'3px 3px' }}>
              <div style={{ height:3,background:`${tc}30`,borderRadius:2,marginBottom:2 }} />
              <div style={{ height:3,background:`${t.ac}90`,borderRadius:2,width:'55%' }} />
            </div>
          </div>
        );
      };
      const SimCatH = () => {
        if (t.catH==='divider') return (
          <div style={{ display:'flex',alignItems:'center',gap:4,margin:'6px 0 4px' }}>
            <div style={{ flex:1,height:1,background:`${t.ac}40` }} />
            <div style={{ height:4,background:t.ac,borderRadius:2,width:36 }} />
            <div style={{ flex:1,height:1,background:`${t.ac}40` }} />
          </div>
        );
        if (t.catH==='bold-label') return (
          <div style={{ borderBottom:`2px solid ${t.ac}`,paddingBottom:3,marginBottom:5 }}>
            <div style={{ height:5,background:t.ac,borderRadius:2,width:44,marginLeft:t.headerAlign==='left'?0:'auto',marginRight:t.headerAlign==='center'?'auto':undefined }} />
          </div>
        );
        if (t.catH==='text-only') return (
          <div style={{ margin:'6px 0 4px',paddingBottom:3 }}>
            <div style={{ height:4,background:t.ac,borderRadius:2,width:42,opacity:.9 }} />
          </div>
        );
        if (t.catH==='pill') return (
          <div style={{ display:'flex',justifyContent:'center',margin:'5px 0' }}>
            <div style={{ height:11,background:t.ac,borderRadius:6,width:46,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div style={{ height:3,background:'rgba(0,0,0,.25)',borderRadius:2,width:28 }} />
            </div>
          </div>
        );
        return <div style={{ height:15,background:`${t.ac}25`,border:`1px solid ${t.ac}44`,borderRadius:3,margin:'5px 0',display:'flex',alignItems:'center',padding:'0 4px' }}><div style={{ height:3,background:t.ac,borderRadius:2,width:38 }} /></div>;
      };
      return (
        <div style={{ background:t.bg,padding:'9px 9px 6px',height:118,overflow:'hidden',borderRadius:'10px 10px 0 0' }}>
          <div style={{ textAlign:t.headerAlign,marginBottom:5 }}>
            <div style={{ height:6,background:t.ac,borderRadius:3,display:'inline-block',width:62,marginBottom:2 }} />
            <div style={{ height:3,background:`${tc}30`,borderRadius:2,width:44,margin:t.headerAlign==='center'?'0 auto':undefined }} />
          </div>
          <SimCatH />
          {t.prodS==='vertical'
            ? <div style={{ display:'flex',gap:3 }}><SimProd i={0}/><SimProd i={1}/><SimProd i={2}/></div>
            : <><SimProd i={0}/><SimProd i={1}/></>
          }
        </div>
      );
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
        <div style={{ flexShrink:0, paddingBottom:10 }}>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:10 }}>
            {CDV3_TEMPLATES.length} diseños premium — {CDV3_TEMPLATES.filter(t=>!t.dark).length} claros · {CDV3_TEMPLATES.filter(t=>t.dark).length} oscuros
          </div>
          <div style={{ display:'flex',gap:5,overflowX:'auto',paddingBottom:4,WebkitOverflowScrolling:'touch' }}>
            {catTabs.map(c=>(
              <button key={c} onClick={()=>setFilterCat(c)}
                className={`ap-btn ap-btn-sm ${filterCat===c?'ap-btn-gold':'ap-btn-ghost'}`}
                style={{ flexShrink:0,fontSize:10,padding:'4px 10px' }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1,overflowY:'auto',overscrollBehavior:'contain',WebkitOverflowScrolling:'touch' }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,paddingBottom:20 }}>
            {filtered.map(t => {
              const isActive = t.id === templateId;
              return (
                <div key={t.id} onClick={()=>applyTemplate(t)}
                  style={{ borderRadius:12,overflow:'hidden',cursor:'pointer',
                    border:isActive?`2px solid ${t.ac}`:'2px solid transparent',
                    boxShadow:isActive?`0 0 0 2px ${t.ac}50`:'0 2px 14px rgba(0,0,0,.45)',
                    position:'relative',transition:'box-shadow .15s' }}>
                  <MiniPreview t={t} />
                  <div style={{ background:t.ac,padding:'5px 8px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:9,fontWeight:800,color:'rgba(0,0,0,.75)' }}>{t.nombre}</div>
                      <div style={{ fontSize:7,color:'rgba(0,0,0,.5)',marginTop:1 }}>{t.mood}</div>
                    </div>
                    <span style={{ fontSize:16 }}>{t.emoji}</span>
                  </div>
                  {isActive&&<div style={{ position:'absolute',top:6,right:6,background:t.ac,borderRadius:'50%',width:18,height:18,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'rgba(0,0,0,.8)',boxShadow:'0 1px 4px rgba(0,0,0,.5)' }}>✓</div>}
                </div>
              );
            })}
          </div>
        </div>
        {templateId && (
          <div style={{ flexShrink:0,paddingTop:10,borderTop:'1px solid rgba(255,255,255,.07)' }}>
            <button className="ap-btn ap-btn-gold" style={{ width:'100%' }} onClick={()=>setView('editor')}>
              ✏️ Continuar con {curTpl?.emoji} {curTpl?.nombre}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ─────────────────── PREVIEW ─────────────────── */
  function Preview() {
    const tpl = curTpl || { dark:true, bg:bgColor, ac:accentColor, font:fontFamily, catH:'banner', prodS:'vertical', headerAlign:'center' };
    const tc  = tpl.dark===false ? '#1a1a1a' : textColor;
    const prodLayout = tpl.prodS==='vertical' ? 'grid' : 'col';

    return (
      <div style={{ overflowY:'auto',flex:1,display:'flex',justifyContent:'center',padding:'4px 0 20px',overscrollBehavior:'contain',WebkitOverflowScrolling:'touch' }}>
        <div ref={previewRef} style={{ width:'100%',maxWidth:430,background:bgColor,borderRadius:14,fontFamily,overflow:'hidden',boxShadow:'0 6px 32px rgba(0,0,0,.55)',minHeight:500 }}>

          {/* HERO */}
          {(() => {
            const b=blocks.find(x=>x.type==='hero'); if(!b||!b.on) return null;
            const align = tpl.headerAlign==='left' ? 'left' : 'center';
            return (
              <div style={{ padding:'22px 18px 14px',textAlign:align,borderBottom:`1px solid ${accentColor}25` }}>
                {b.data.logo&&<img src={b.data.logo} alt="" style={{ width:72,height:72,borderRadius:'50%',objectFit:'cover',margin:`0 ${align==='center'?'auto':0} 12px`,display:'block',border:`2px solid ${accentColor}` }} onError={e=>e.target.style.display='none'} />}
                <div style={{ fontSize:24,fontWeight:800,color:accentColor,letterSpacing:.3,fontFamily }}>{b.data.titulo||titulo||local?.nombre||'Mi Restaurante'}</div>
                {b.data.sub&&<div style={{ fontSize:12,color:`${tc}80`,marginTop:5,lineHeight:1.5 }}>{b.data.sub}</div>}
                {curTpl&&<div style={{ fontSize:9,color:`${accentColor}55`,marginTop:8,letterSpacing:2,textTransform:'uppercase' }}>{curTpl.mood}</div>}
              </div>
            );
          })()}

          {/* CATEGORÍAS */}
          {(() => {
            const b=blocks.find(x=>x.type==='categorias'); if(!b||!b.on) return null;
            return (
              <div style={{ padding:'8px 14px 20px' }}>
                {activeCats.length===0
                  ? <div style={{ textAlign:'center',color:'rgba(255,255,255,.15)',padding:'30px 0',fontSize:11 }}>Sin categorías activas</div>
                  : activeCats.map(cat => {
                      const cfg     = getCatCfg(cat.id);
                      const catProds= (prods||[]).filter(p=>(p.cat||p.categoria_id)===cat.id&&p.active!==false&&p.activo!==false);
                      const isExp   = !!expandedPrev[cat.id];
                      const tplEff  = curTpl || { dark:true, ac:accentColor, font:fontFamily, catH:'banner', prodS:'vertical', headerAlign:'center' };
                      return (
                        <div key={cat.id} style={{ marginBottom:4 }}>
                          {cdv3CatHeader(cat,cfg,tplEff,isExp,()=>setExpandedPrev(p=>({...p,[cat.id]:!p[cat.id]})))}
                          {isExp&&(
                            <div style={{ paddingTop:6 }}>
                              {catProds.length===0
                                ? <div style={{ fontSize:11,color:'rgba(255,255,255,.2)',textAlign:'center',padding:'10px 0' }}>Sin productos</div>
                                : prodLayout==='grid'
                                  ? <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(138px,1fr))',gap:8 }}>
                                      {catProds.map(p=>cdv3ProdCard(p,cat,tplEff.prodS,tplEff,cfg.color))}
                                    </div>
                                  : <div>
                          {catProds.map(p=>(
                            <div key={p.id} style={{ position:'relative' }}>
                              {cdv3ProdCard(p,cat,tplEff.prodS,tplEff,cfg.color)}
                              <div style={{ position:'absolute',top:4,right:4,display:'flex',gap:4 }}>
                                <button onClick={e=>{e.stopPropagation();setShowPhotoPicker({target:'prod',id:p.id,field:'imagen'});}}
                                  style={{ width:22,height:22,borderRadius:6,background:'rgba(0,0,0,.6)',border:'none',color:'#fff',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>📸</button>
                                <button onClick={e=>{e.stopPropagation();if(confirm('¿Quitar '+( p.name||p.nombre)+'?')){supabase.from('productos').update({activo:false}).eq('id',p.id).then(()=>{if(setProds)setProds(pp=>pp.map(x=>x.id===p.id?{...x,active:false,activo:false}:x));});}}}
                                  style={{ width:22,height:22,borderRadius:6,background:'rgba(200,40,40,.7)',border:'none',color:'#fff',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
                              </div>
                            </div>
                          ))}
                          <button onClick={()=>setShowQuickAdd(cat.id)}
                            style={{ width:'100%',marginTop:6,padding:'7px',borderRadius:8,border:`1px dashed ${tplEff.ac}50`,background:'transparent',color:`${tplEff.ac}90`,fontSize:11,cursor:'pointer',fontWeight:600 }}>
                            ＋ Agregar producto
                          </button>
                        </div>
                              }
                            </div>
                          )}
                        </div>
                      );
                    })
                }
              </div>
            );
          })()}

          {/* CONTACTO */}
          {(() => {
            const b=blocks.find(x=>x.type==='contacto'); if(!b||!b.on||(!b.data.tel&&!b.data.dir&&!b.data.hs)) return null;
            return (
              <div style={{ margin:'0 14px 14px',padding:'12px 14px',background:`${accentColor}12`,borderRadius:10,border:`1px solid ${accentColor}30` }}>
                <div style={{ fontSize:9,fontWeight:700,color:accentColor,letterSpacing:1,marginBottom:8 }}>CONTACTO</div>
                {b.data.tel&&<div style={{ fontSize:13,color:textColor,marginBottom:4 }}>📞 {b.data.tel}</div>}
                {b.data.dir&&<div style={{ fontSize:13,color:textColor,marginBottom:4 }}>📍 {b.data.dir}</div>}
                {b.data.hs &&<div style={{ fontSize:13,color:textColor }}>🕐 {b.data.hs}</div>}
              </div>
            );
          })()}

          {/* PAGO */}
          {(() => {
            const b=blocks.find(x=>x.type==='pago'); if(!b||!b.on||!b.data.alias) return null;
            return (
              <div style={{ margin:'0 14px 14px',padding:'14px',background:`${accentColor}10`,borderRadius:10,border:`1px solid ${accentColor}40` }}>
                <div style={{ fontSize:9,fontWeight:700,color:accentColor,letterSpacing:1,marginBottom:8 }}>💳 {(b.data.lbl||'PAGO').toUpperCase()}</div>
                <div style={{ fontFamily:"'Courier New',monospace",fontSize:16,fontWeight:700,color:textColor,letterSpacing:.5 }}>{b.data.alias}</div>
                {b.data.titular&&<div style={{ fontSize:11,color:`${textColor}70`,marginTop:3 }}>Titular: {b.data.titular}</div>}
              </div>
            );
          })()}

          {/* QR */}
          {(() => {
            const b=blocks.find(x=>x.type==='qr'); if(!b||!b.on||!b.data.url) return null;
            const qrBg=bgColor.replace('#',''), qrFg=accentColor.replace('#','');
            return (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',margin:'0 14px 18px',padding:'16px',background:`${accentColor}08`,borderRadius:10,border:`1px solid ${accentColor}25` }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=${qrFg}&bgcolor=${qrBg}&data=${encodeURIComponent(b.data.url)}`}
                  alt="QR" style={{ width:130,height:130,borderRadius:8 }} />
                {b.data.lbl&&<div style={{ fontSize:11,color:`${textColor}70`,marginTop:8,textAlign:'center' }}>{b.data.lbl}</div>}
              </div>
            );
          })()}

        </div>
      </div>
    );
  }

  /* ─────────────────── DESIGN PANEL ─────────────────── */
  const BLOCK_META = {
    hero:      { icon:'🏷️', label:'Encabezado',              desc:'Nombre, logo y eslogan' },
    categorias:{ icon:'📋', label:'Categorías & Productos',   desc:'Tu menú completo' },
    contacto:  { icon:'📞', label:'Contacto',                 desc:'Teléfono, dirección, horarios' },
    pago:      { icon:'💳', label:'Alias / Pago',             desc:'Alias MP, MODO u otro medio' },
    qr:        { icon:'🔳', label:'QR personalizado',         desc:'Cualquier enlace → QR' },
  };

  function DesignPanel() {
    return (
      <div style={{ display:'flex',flexDirection:'column',height:'100%',overflow:'hidden' }}>
        <div style={{ padding:'12px',borderBottom:'1px solid rgba(255,255,255,.07)',flexShrink:0 }}>
          <div style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',letterSpacing:1,marginBottom:10,textTransform:'uppercase' }}>Colores y tipografía</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10 }}>
            <label style={{ fontSize:10,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px',background:'rgba(255,255,255,.04)',borderRadius:7,gap:6 }}>
              🎨 Fondo
              <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
                style={{ width:30,height:22,border:'1px solid rgba(255,255,255,.1)',background:'none',cursor:'pointer',borderRadius:4 }} />
            </label>
            <label style={{ fontSize:10,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px',background:'rgba(255,255,255,.04)',borderRadius:7,gap:6 }}>
              ✨ Acento
              <input type="color" value={accentColor} onChange={e=>setAccentColor(e.target.value)}
                style={{ width:30,height:22,border:'1px solid rgba(255,255,255,.1)',background:'none',cursor:'pointer',borderRadius:4 }} />
            </label>
          </div>
          <div>
            <label style={{ fontSize:10,display:'block',marginBottom:4,color:'rgba(255,255,255,.45)' }}>Tipografía</label>
            <select value={fontFamily} onChange={e=>setFontFamily(e.target.value)}
              style={{ background:'#2a2a2a',color:'var(--text)',border:'1px solid var(--border)',borderRadius:7,padding:'5px 8px',width:'100%',fontSize:11 }}>
              {CDV3_FONTS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ marginTop:10 }}>
            <label style={{ fontSize:10,display:'block',marginBottom:6,color:'rgba(255,255,255,.45)' }}>Tamaño de texto</label>
            <div style={{ display:'flex',gap:6 }}>
              {[{k:'small',l:'S'},{k:'normal',l:'M'},{k:'large',l:'L'}].map(s=>(
                <button key={s.k} onClick={()=>setFontSize(s.k)}
                  className={`ap-btn ap-btn-sm ${fontSize===s.k?'ap-btn-gold':'ap-btn-ghost'}`}
                  style={{ flex:1,fontWeight:s.k==='small'?400:s.k==='large'?800:600 }}>{s.l}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:'12px',overscrollBehavior:'contain',WebkitOverflowScrolling:'touch' }}>
          <div style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',letterSpacing:1,marginBottom:10,textTransform:'uppercase' }}>
            Bloques ({blocks.filter(b=>b.on).length} activos)
          </div>
          {blocks.map(b => {
            const meta=BLOCK_META[b.type]||{icon:'📄',label:b.type,desc:''};
            const isSel=selBlockId===b.id;
            return (
              <div key={b.id} style={{ marginBottom:8,borderRadius:9,overflow:'hidden',border:`1px solid ${b.on?(isSel?'rgba(201,168,76,.4)':'rgba(255,255,255,.1)'):'rgba(255,255,255,.05)'}` }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 11px',background:b.on?'rgba(255,255,255,.03)':'transparent',cursor:'pointer' }}
                  onClick={()=>{ if(b.type!=='categorias'&&b.on) setSelBlockId(isSel?null:b.id); }}>
                  <span style={{ fontSize:16 }}>{meta.icon}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:b.on?'var(--text)':'rgba(255,255,255,.3)' }}>{meta.label}</div>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,.22)',marginTop:1 }}>{meta.desc}</div>
                  </div>
                  {b.type!=='categorias'&&b.on&&<span style={{ fontSize:10,color:'rgba(255,255,255,.28)',flexShrink:0 }}>{isSel?'▲':'✏️'}</span>}
                  <div className={`ap-switch ${b.on?'on':'off'}`} onClick={e=>{ e.stopPropagation(); updBlock(b.id,{on:!b.on}); }} style={{ flexShrink:0 }} />
                </div>
                {isSel&&b.on&&b.type==='hero'&&(
                  <div style={{ padding:'10px 12px',background:'rgba(0,0,0,.25)',borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    {[{k:'titulo',l:'Nombre',p:'La Bella Napoli'},{k:'sub',l:'Descripción / eslogan',p:'Pizzas artesanales...'},{k:'logo',l:'Logo (URL imagen)',p:'https://...'}].map(f=>(
                      <div key={f.k} style={{ marginBottom:10 }}>
                        <label style={{ fontSize:10,color:'rgba(255,255,255,.38)',display:'block',marginBottom:4 }}>{f.l}</label>
                        <input value={b.data[f.k]||''} onChange={e=>updBlockData(b.id,{[f.k]:e.target.value})} placeholder={f.p}
                          style={{ background:'#1a1a1a',color:'var(--text)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',width:'100%',fontSize:11,boxSizing:'border-box' }} />
                      </div>
                    ))}
                  </div>
                )}
                {isSel&&b.on&&b.type==='contacto'&&(
                  <div style={{ padding:'10px 12px',background:'rgba(0,0,0,.25)',borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    {[{k:'tel',l:'Teléfono / WhatsApp',p:'+54 9 11 0000-0000'},{k:'dir',l:'Dirección',p:'Av. Corrientes 1234'},{k:'hs',l:'Horarios',p:'Lun-Vie 12-23 hs'}].map(f=>(
                      <div key={f.k} style={{ marginBottom:10 }}>
                        <label style={{ fontSize:10,color:'rgba(255,255,255,.38)',display:'block',marginBottom:4 }}>{f.l}</label>
                        <input value={b.data[f.k]||''} onChange={e=>updBlockData(b.id,{[f.k]:e.target.value})} placeholder={f.p}
                          style={{ background:'#1a1a1a',color:'var(--text)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',width:'100%',fontSize:11,boxSizing:'border-box' }} />
                      </div>
                    ))}
                  </div>
                )}
                {isSel&&b.on&&b.type==='pago'&&(
                  <div style={{ padding:'10px 12px',background:'rgba(0,0,0,.25)',borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    {[{k:'alias',l:'Alias de transferencia',p:'mirestaurante.mp'},{k:'titular',l:'Nombre del titular',p:'Juan García'},{k:'lbl',l:'Etiqueta',p:'Transferencias / MP'}].map(f=>(
                      <div key={f.k} style={{ marginBottom:10 }}>
                        <label style={{ fontSize:10,color:'rgba(255,255,255,.38)',display:'block',marginBottom:4 }}>{f.l}</label>
                        <input value={b.data[f.k]||''} onChange={e=>updBlockData(b.id,{[f.k]:e.target.value})} placeholder={f.p}
                          style={{ background:'#1a1a1a',color:'var(--text)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',width:'100%',fontSize:11,boxSizing:'border-box' }} />
                      </div>
                    ))}
                  </div>
                )}
                {isSel&&b.on&&b.type==='qr'&&(
                  <div style={{ padding:'10px 12px',background:'rgba(0,0,0,.25)',borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    {[{k:'url',l:'URL del QR',p:'https://instagram.com/mirestaurante'},{k:'lbl',l:'Texto debajo del QR',p:'Seguinos en Instagram'}].map(f=>(
                      <div key={f.k} style={{ marginBottom:10 }}>
                        <label style={{ fontSize:10,color:'rgba(255,255,255,.38)',display:'block',marginBottom:4 }}>{f.l}</label>
                        <input value={b.data[f.k]||''} onChange={e=>updBlockData(b.id,{[f.k]:e.target.value})} placeholder={f.p}
                          style={{ background:'#1a1a1a',color:'var(--text)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',width:'100%',fontSize:11,boxSizing:'border-box' }} />
                      </div>
                    ))}
                    {b.data.url&&<img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(b.data.url)}`} alt="QR" style={{ width:80,height:80,borderRadius:6,marginTop:4 }} />}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',letterSpacing:1,marginBottom:10,marginTop:18,textTransform:'uppercase' }}>Estilo por categoría</div>
          {activeCats.length===0&&<div style={{ fontSize:11,color:'rgba(255,255,255,.18)',textAlign:'center',padding:'14px 0' }}>Sin categorías activas</div>}
          {activeCats.map(cat => {
            const cfg=getCatCfg(cat.id), isSel=selCatId===cat.id;
            const cnt=(prods||[]).filter(p=>(p.cat||p.categoria_id)===cat.id&&p.active!==false).length;
            return (
              <div key={cat.id} style={{ marginBottom:8,borderRadius:9,overflow:'hidden',border:`1px solid ${isSel?'rgba(201,168,76,.35)':'rgba(255,255,255,.07)'}` }}>
                <div onClick={()=>setSelCatId(isSel?null:cat.id)}
                  style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 11px',cursor:'pointer',background:isSel?'rgba(201,168,76,.08)':'rgba(255,255,255,.03)' }}>
                  <span style={{ fontSize:18 }}>{cat.emoji}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{cat.label}</div>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,.28)',marginTop:1 }}>{cnt} prods · {cfg.color?'color personalizado':'color acento'}</div>
                  </div>
                  <span style={{ fontSize:10,color:'rgba(255,255,255,.28)',flexShrink:0 }}>{isSel?'▲':'▼'}</span>
                </div>
                {isSel&&(
                  <div style={{ padding:'12px',background:'rgba(0,0,0,.25)',borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    {curTpl?.catH==='banner'&&(
                      <>
                        <div style={{ fontSize:10,color:'rgba(255,255,255,.4)',marginBottom:8 }}>Formato de la tarjeta</div>
                        <div style={{ display:'flex',gap:6,marginBottom:14 }}>
                          {[{key:'rectangle',icon:'▬',label:'Rectángulo'},{key:'square',icon:'■',label:'Cuadrado'},{key:'round',icon:'●',label:'Círculo'}].map(fmt=>(
                            <button key={fmt.key} onClick={()=>updCatCfg(cat.id,{formato:fmt.key})}
                              className={`ap-btn ap-btn-sm ${cfg.formato===fmt.key?'ap-btn-gold':'ap-btn-ghost'}`}
                              style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'7px 0',fontSize:10 }}>
                              <span style={{ fontSize:17 }}>{fmt.icon}</span>{fmt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:10,color:'rgba(255,255,255,.38)',marginBottom:8 }}>Color de acento</div>
                      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                        {['#C9A84C','#e84040','#3ecf6e','#3e8cff','#a855f7','#f5c518','#ec4899','#ff6b35','#00bcd4','#ffffff'].map(c=>(
                          <div key={c} onClick={()=>updCatCfg(cat.id,{color:cfg.color===c?null:c})}
                            style={{ width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',
                              outline:cfg.color===c?'3px solid #fff':'2px solid transparent',outlineOffset:1,transition:'outline .12s',flexShrink:0 }} />
                        ))}
                        <label style={{ width:26,height:26,borderRadius:'50%',overflow:'hidden',cursor:'pointer',border:'1px solid rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12 }}>
                          🎨<input type="color" value={cfg.color||'#ffffff'} onChange={e=>updCatCfg(cat.id,{color:e.target.value})} style={{ position:'absolute',opacity:0,width:1,height:1 }} />
                        </label>
                        {cfg.color&&<div onClick={()=>updCatCfg(cat.id,{color:null})} style={{ width:26,height:26,borderRadius:'50%',border:'1px dashed rgba(255,255,255,.25)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'rgba(255,255,255,.4)' }}>✕</div>}
                      </div>
                    </div>
                    {curTpl?.catH==='banner'&&(
                      <div>
                        <label style={{ fontSize:10,color:'rgba(255,255,255,.38)',display:'block',marginBottom:5 }}>Foto de portada (URL)</label>
                        <input value={cfg.imagen||''} onChange={e=>updCatCfg(cat.id,{imagen:e.target.value||null})}
                          placeholder="https://imagen.com/portada.jpg"
                          style={{ background:'#1a1a1a',color:'var(--text)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',width:'100%',fontSize:10,boxSizing:'border-box' }} />
                        {cfg.imagen&&<div style={{ marginTop:7,borderRadius:7,overflow:'hidden',height:52 }}><img src={cfg.imagen} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} onError={e=>e.target.style.display='none'} /></div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─────────────────── MAIN RENDER ─────────────────── */
  return (
    <div style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 110px)',minHeight:520,margin:'-4px -4px 0' }}>

      {showPub&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.76)',backdropFilter:'blur(4px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
          onClick={()=>setShowPub(false)}>
          <div style={{ background:'#1c1c1c',border:'1px solid rgba(255,255,255,.12)',borderRadius:16,width:'100%',maxWidth:380,padding:24 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16,fontWeight:800,marginBottom:6 }}>📲 Publicar carta en...</div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,.38)',marginBottom:18 }}>Elegí en qué contextos se muestra este diseño</div>
            {CTX_LIST.map(ctx=>(
              <div key={ctx.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:600 }}>{ctx.label}</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,.3)',marginTop:2 }}>{ctx.desc}</div>
                </div>
                <div className={`ap-switch ${pubCfg[ctx.key]?'on':'off'}`} onClick={()=>setPubCfg(p=>({...p,[ctx.key]:!p[ctx.key]}))} />
              </div>
            ))}
            <div style={{ display:'flex',gap:10,marginTop:20 }}>
              <button className="ap-btn ap-btn-ghost" style={{ flex:1 }} onClick={()=>setShowPub(false)}>Cancelar</button>
              <button className="ap-btn ap-btn-gold" style={{ flex:2 }} disabled={saving}
                onClick={async()=>{ const ok=await doSave(pubCfg); if(ok){setShowPub(false);alert('✅ Guardado y publicado');} }}>
                {saving?'Guardando...':'💾 Guardar y publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ap-sec-hdr" style={{ flexShrink:0,flexWrap:'wrap',gap:8 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,minWidth:0 }}>
          {view==='editor'&&<button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={()=>setView('gallery')}>← Diseños</button>}
          <h2 style={{ margin:0 }}>{view==='gallery'?'🎭 Diseños':'🎨 Carta'}</h2>
          {view==='editor'&&curTpl&&(
            <span style={{ fontSize:10,background:'rgba(201,168,76,.15)',color:'#C9A84C',padding:'2px 8px',borderRadius:10,border:'1px solid rgba(201,168,76,.3)',whiteSpace:'nowrap' }}>
              {curTpl.emoji} {curTpl.nombre}
            </span>
          )}
        </div>
        {view==='editor'&&(
          <div className="ap-sec-hdr-r" style={{ gap:5,flexWrap:'wrap' }}>
            <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={shareLink} title="Compartir link">🔗</button>
            <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={()=>setTab('preview')||setTimeout(exportAsImage,120)} disabled={exporting} title="Descargar imagen">🖼️</button>
            <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={()=>setTab('preview')||setTimeout(exportAsPDF,120)} disabled={exporting} title="Descargar PDF">📄</button>
            <button className="ap-btn ap-btn-sm" style={{background:Object.values(pubCfg).some(Boolean)?'#1a4a1a':'rgba(255,255,255,.07)',border:'1px solid '+( Object.values(pubCfg).some(Boolean)?'#4A9A5A':'rgba(255,255,255,.15)'),color:Object.values(pubCfg).some(Boolean)?'#4A9A5A':'rgba(255,255,255,.4)'}} onClick={()=>setShowPub(true)} title="Publicar carta">{Object.values(pubCfg).some(Boolean)?'✅ Publicada':'📲 Publicar'}</button>
            <button className="ap-btn ap-btn-gold ap-btn-sm" onClick={async()=>{ const ok=await doSave(); if(ok)alert('✅ Guardado'); }} disabled={saving}>{saving?'…':'💾'}</button>
          </div>
        )}
      </div>

      {view==='editor'&&(
        <div style={{ display:'flex',gap:4,marginBottom:10,flexShrink:0 }}>
          {[{key:'design',label:'⚙️ Diseño'},{key:'preview',label:'👁️ Vista previa'}].map(t=>(
            <button key={t.key} className={`ap-btn ap-btn-sm ${tab===t.key?'ap-btn-gold':'ap-btn-ghost'}`}
              style={{ flex:1 }} onClick={()=>setTab(t.key)}>{t.label}</button>
          ))}
        </div>
      )}

      <div style={{ flex:1,overflow:'hidden',minHeight:0,display:'flex',flexDirection:'column' }}>
        {view==='gallery' ? GalleryView() : (tab==='design' ? DesignPanel() : Preview())}
      </div>

      {showPhotoPicker && PhotoPickerModal()}
      {showQuickAdd   && QuickAddModal()}
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
  const [selected, setSelected] = React.useState(null);

  const mesaMap = {};
  pedidos.filter(p => p.status !== "entregado" && p.mesa_numero).forEach(p => {
    mesaMap[p.mesa_numero] = p;
  });

  const libre   = Array.from({length:totalMesas},(_,i)=>i+1).filter(n=>!mesaMap[n]).length;
  const ocupada = Object.keys(mesaMap).length;
  const selectedPedido = selected ? mesaMap[selected] : null;

  return (
    <div style={{display:"flex",gap:20,height:"calc(100vh - 60px - 48px)"}}>
      {/* Mapa de mesas */}
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:16,minWidth:0}}>
        {/* Stats rápidos */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[
            {label:"Total",     val:totalMesas, color:"var(--gold)"},
            {label:"Ocupadas",  val:ocupada,    color:"#e8a020"},
            {label:"Libres",    val:libre,      color:"#3ecf6e"},
          ].map(s=>(
            <div key={s.label} className="ap-card" style={{padding:"14px 18px",textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.val}</div>
              <div style={{fontSize:11,color:"var(--text3)",letterSpacing:1,textTransform:"uppercase",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div style={{display:"flex",gap:16,fontSize:12,color:"var(--text3)"}}>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#3ecf6e",display:"inline-block"}}/> Libre</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#e8a020",display:"inline-block"}}/> Ocupada</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"var(--gold)",border:"1px solid var(--gold)",display:"inline-block"}}/> Seleccionada</span>
        </div>

        {/* Grid */}
        <div className="ap-card" style={{flex:1,overflowY:"auto"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",letterSpacing:2,marginBottom:14}}>SALÓN</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:10}}>
            {Array.from({length:totalMesas},(_,i)=>i+1).map(num=>{
              const pedido = mesaMap[num];
              const isOcupada = !!pedido;
              const isSel = selected === num;
              return (
                <div key={num} onClick={()=>setSelected(isSel?null:num)}
                  style={{
                    borderRadius:12,padding:"14px 8px",textAlign:"center",cursor:"pointer",
                    border:`2px solid ${isSel?"var(--gold)":isOcupada?"rgba(232,160,32,.4)":"rgba(62,207,110,.2)"}`,
                    background:isSel?"rgba(232,160,32,.12)":isOcupada?"rgba(232,160,32,.06)":"rgba(62,207,110,.04)",
                    transition:"all .15s",
                  }}>
                  <div style={{fontSize:24,marginBottom:4}}>🪑</div>
                  <div style={{fontSize:16,fontWeight:900,color:isOcupada?"var(--gold)":"#3ecf6e"}}>{num}</div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:1,color:isOcupada?"rgba(232,160,32,.6)":"rgba(62,207,110,.5)",textTransform:"uppercase",marginTop:2}}>
                    {isOcupada?"OCUPADA":"LIBRE"}
                  </div>
                  {pedido && <div style={{fontSize:9,color:"var(--text3)",marginTop:4}}>#{String(pedido.id||"").slice(0,6)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel detalle */}
      <div style={{width:280,display:"flex",flexDirection:"column",gap:12}}>
        {selectedPedido ? (
          <>
            <div className="ap-card" style={{borderColor:"rgba(232,160,32,.3)"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",letterSpacing:2,marginBottom:12}}>MESA {selected}</div>
              <div style={{fontSize:22,fontWeight:900,marginBottom:4}}>#{String(selectedPedido.id||"").slice(0,8)}</div>
              <div style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>{new Date(selectedPedido.created_at||"").toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                {(selectedPedido.pedido_items||[]).map((item,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                    <span style={{color:"var(--text)"}}>{item.cantidad}× {item.nombre}</span>
                    <span style={{color:"var(--gold)",fontWeight:700}}>${(item.precio*item.cantidad).toLocaleString("es-AR")}</span>
                  </div>
                ))}
              </div>
              <div style={{borderTop:"1px solid var(--border)",paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:"var(--text3)"}}>Total</span>
                <span style={{fontSize:20,fontWeight:900,color:"var(--gold)"}}>${(selectedPedido.total||0).toLocaleString("es-AR")}</span>
              </div>
            </div>
            <div className="ap-card" style={{textAlign:"center"}}>
              <div style={{marginBottom:8}}>
                <span className={`ap-pill ${selectedPedido.status==="listo"?"pill-listo":selectedPedido.status==="preparando"?"pill-preparando":"pill-nuevo"}`} style={{fontSize:13,padding:"6px 14px"}}>
                  {selectedPedido.status?.toUpperCase()}
                </span>
              </div>
              <div style={{fontSize:12,color:"var(--text3)"}}>Estado actual del pedido</div>
            </div>
          </>
        ) : (
          <div className="ap-card" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",color:"var(--text3)"}}>
            <div style={{fontSize:40,marginBottom:12}}>🪑</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text2)",marginBottom:6}}>Seleccioná una mesa</div>
            <div style={{fontSize:12}}>Hacé clic en una mesa ocupada para ver el pedido activo</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: DELIVERY
══════════════════════════════════════════════════════════════ */
function ScreenDelivery({ pedidos, setPedidos, local }) {
  // Delivery: cualquier pedido con mesa_numero===0 (incluye los de DeliveryPage.jsx)
  const deliveryOrders = pedidos.filter(
    (p) => (p.tipo_pedido === "delivery" || p.mesa_numero === 0) && p.status !== "entregado"
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
    // Notificar al cliente que el repartidor salió
    if (next === "en_camino" && supabase && local?.slug) {
      const ch = supabase.channel("tracking:" + local.slug);
      await ch.subscribe();
      await ch.send({ type: "broadcast", event: "location", payload: { lat: null, lon: null, en_camino: true } });
      setTimeout(() => supabase.removeChannel(ch), 3000);
    }
  };

  const guardarNotaDelivery = async (p) => {
    const obs = notaDelivery[p.id] ?? (p.observaciones_delivery || "");
    if (supabase) await supabase.from("pedidos").update({ observaciones_delivery: obs }).eq("id", p.id);
    setPedidos(prev => prev.map(o => o.id === p.id ? { ...o, observaciones_delivery: obs } : o));
  };

  const BTN_LABELS = { nuevo:"▶ En preparación", preparando:"✓ Listo para enviar", listo:"🛵 Salió a entregar", en_camino:"✅ Marcar entregado" };
  const BTN_COLORS = { nuevo:"#3e8cff", preparando:"#3ecf6e", listo:"#C9A84C", en_camino:"#3ecf6e" };

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
  const [items, setItems] = React.useState(STOCK_DEMO.map(s=>({...s})));
  const [editIdx, setEditIdx] = React.useState(null);
  const [editVal, setEditVal] = React.useState("");
  const [showAdd, setShowAdd] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ing:"",stock:0,min:0,unit:"kg"});

  const criticos = items.filter(s=>s.status==="critico").length;
  const bajos    = items.filter(s=>s.status==="bajo").length;
  const ok       = items.filter(s=>s.status==="ok").length;

  function recalcStatus(stock, min) {
    const pct = min > 0 ? stock/min : 1;
    return pct < 0.5 ? "critico" : pct < 1 ? "bajo" : "ok";
  }

  function saveEdit(i) {
    const val = parseFloat(editVal);
    if (isNaN(val) || val < 0) return;
    setItems(prev => prev.map((s,idx)=>idx===i ? {...s, stock:val, status:recalcStatus(val,s.min)} : s));
    setEditIdx(null);
  }

  function addItem() {
    if (!newItem.ing.trim()) return;
    setItems(prev=>[...prev, {...newItem, status:recalcStatus(newItem.stock,newItem.min)}]);
    setNewItem({ing:"",stock:0,min:0,unit:"kg"});
    setShowAdd(false);
  }

  const barColor = (s) => s==="critico" ? "#e84040" : s==="bajo" ? "#FFB020" : "#3ecf6e";
  const barPct   = (stock, min) => min>0 ? Math.min(100, Math.round(stock/min*100)) : 100;

  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Stock e inventario</h2>
        <button className="ap-btn ap-btn-gold" onClick={()=>setShowAdd(s=>!s)}>+ Agregar ítem</button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"En stock",    val:ok,       color:"#3ecf6e", icon:"✅"},
          {label:"Stock bajo",  val:bajos,    color:"#FFB020", icon:"⚠️"},
          {label:"Crítico",     val:criticos, color:"#e84040", icon:"🔴"},
        ].map(s=>(
          <div key={s.label} className="ap-card" style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px"}}>
            <div style={{fontSize:28}}>{s.icon}</div>
            <div>
              <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.val}</div>
              <div style={{fontSize:11,color:"var(--text3)",letterSpacing:.5}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="ap-card" style={{marginBottom:16,borderColor:"rgba(201,168,76,.3)"}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--gold)",letterSpacing:1,marginBottom:12}}>NUEVO INGREDIENTE</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
            {[
              {ph:"Nombre",   key:"ing",   type:"text"},
              {ph:"Stock",    key:"stock", type:"number"},
              {ph:"Mínimo",   key:"min",   type:"number"},
              {ph:"Unidad",   key:"unit",  type:"text"},
            ].map(f=>(
              <input key={f.key} type={f.type} placeholder={f.ph} value={newItem[f.key]}
                onChange={e=>setNewItem(prev=>({...prev,[f.key]:f.type==="number"?parseFloat(e.target.value)||0:e.target.value}))}
                style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",color:"var(--text)",fontSize:13}}/>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="ap-btn ap-btn-ghost" onClick={()=>setShowAdd(false)}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" onClick={addItem}>Agregar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="ap-card" style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:"1px solid var(--border)"}}>
              {["Ingrediente","Stock actual","Nivel","Mínimo","Unidad","Estado","Editar"].map(h=>(
                <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text3)",letterSpacing:1,textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((s,i)=>{
              const pct = barPct(s.stock,s.min);
              const col = barColor(s.status);
              return (
                <tr key={i} style={{borderBottom:"1px solid var(--bg3)"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"14px 16px",fontWeight:700,fontSize:14}}>{s.ing}</td>
                  <td style={{padding:"14px 16px"}}>
                    {editIdx===i ? (
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <input type="number" value={editVal} onChange={e=>setEditVal(e.target.value)}
                          autoFocus
                          style={{width:70,background:"var(--bg3)",border:`1px solid ${col}`,borderRadius:6,padding:"4px 8px",color:col,fontWeight:700,fontSize:14}}/>
                        <button onClick={()=>saveEdit(i)} style={{padding:"4px 8px",borderRadius:6,border:"1px solid #3ecf6e",background:"rgba(62,207,110,.12)",color:"#3ecf6e",cursor:"pointer",fontWeight:700}}>✓</button>
                        <button onClick={()=>setEditIdx(null)} style={{padding:"4px 8px",borderRadius:6,border:"1px solid rgba(255,255,255,.15)",background:"transparent",color:"rgba(255,255,255,.4)",cursor:"pointer"}}>✕</button>
                      </div>
                    ) : (
                      <span style={{fontSize:16,fontWeight:900,color:col}}>{s.stock} <span style={{fontSize:11,color:"var(--text3)"}}>{s.unit}</span></span>
                    )}
                  </td>
                  <td style={{padding:"14px 16px",minWidth:120}}>
                    <div style={{background:"rgba(255,255,255,.06)",borderRadius:999,height:8,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:999,transition:"width .4s"}}/>
                    </div>
                    <div style={{fontSize:10,color:"var(--text3)",marginTop:3}}>{pct}%</div>
                  </td>
                  <td style={{padding:"14px 16px",fontSize:13,color:"var(--text3)"}}>{s.min} {s.unit}</td>
                  <td style={{padding:"14px 16px",fontSize:13,color:"var(--text2)"}}>{s.unit}</td>
                  <td style={{padding:"14px 16px"}}>
                    {s.status==="ok"      && <span className="ap-pill pill-listo"   style={{fontSize:11}}>✓ OK</span>}
                    {s.status==="bajo"    && <span className="ap-pill" style={{background:"rgba(255,176,32,.1)",color:"#FFB020",fontSize:11}}>⚠ BAJO</span>}
                    {s.status==="critico" && <span className="ap-pill" style={{background:"rgba(232,64,64,.12)",color:"#e84040",fontSize:11}}>🔴 CRÍTICO</span>}
                  </td>
                  <td style={{padding:"14px 16px"}}>
                    <button onClick={()=>{setEditIdx(i);setEditVal(String(s.stock));}}
                      style={{padding:"5px 12px",borderRadius:7,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.6)",cursor:"pointer",fontSize:12}}>
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: CLIENTES
══════════════════════════════════════════════════════════════ */
function ScreenClientes({ pedidos }) {
  const [search, setSearch] = React.useState("");

  // Build client list from delivery orders
  const clientMap = {};
  (pedidos||[]).filter(p=>p.cliente_nombre||p.cliente_tel).forEach(p=>{
    const key = p.cliente_tel || p.cliente_nombre || "?";
    if (!clientMap[key]) {
      clientMap[key] = { nombre: p.cliente_nombre||"Sin nombre", tel: p.cliente_tel||"—", pedidos:0, total:0, ultimo:"" };
    }
    clientMap[key].pedidos++;
    clientMap[key].total += p.total||0;
    if (!clientMap[key].ultimo || p.created_at > clientMap[key].ultimo) clientMap[key].ultimo = p.created_at;
  });
  const clientes = Object.values(clientMap).sort((a,b)=>b.total-a.total);
  const filtered = clientes.filter(c=>
    !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.tel.includes(search)
  );

  return (
    <div>
      <div className="ap-sec-hdr">
        <h2>Clientes</h2>
        <div className="ap-sec-hdr-r">
          <input type="text" placeholder="🔍 Buscar..." style={{width:220}} value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Clientes únicos", val:clientes.length, color:"var(--gold)", icon:"👥"},
          {label:"Pedidos delivery", val:clientes.reduce((s,c)=>s+c.pedidos,0), color:"#60a8f0", icon:"🚗"},
          {label:"Gasto promedio",  val:"$"+(clientes.length?Math.round(clientes.reduce((s,c)=>s+c.total,0)/clientes.length).toLocaleString("es-AR"):"0"), color:"#3ecf6e", icon:"💰"},
        ].map(s=>(
          <div key={s.label} className="ap-card" style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px"}}>
            <div style={{fontSize:28}}>{s.icon}</div>
            <div>
              <div style={{fontSize:22,fontWeight:900,color:s.color}}>{s.val}</div>
              <div style={{fontSize:11,color:"var(--text3)",letterSpacing:.5}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="ap-card" style={{textAlign:"center",padding:48,color:"var(--text3)"}}>
          <div style={{fontSize:48,marginBottom:12}}>👥</div>
          <div style={{fontSize:15,fontWeight:700,color:"var(--text2)",marginBottom:8}}>Sin clientes todavía</div>
          <div style={{fontSize:13}}>Los clientes que pidan delivery con nombre y teléfono aparecerán aquí.</div>
        </div>
      ) : (
        <div className="ap-card" style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:"1px solid var(--border)"}}>
                {["Cliente","Teléfono","Pedidos","Gasto total","Último pedido"].map(h=>(
                  <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text3)",letterSpacing:1,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c,i)=>(
                <tr key={i} style={{borderBottom:"1px solid var(--bg3)",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,borderRadius:10,background:"rgba(232,160,32,.15)",border:"1px solid rgba(232,160,32,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>👤</div>
                      <span style={{fontWeight:700,fontSize:14}}>{c.nombre}</span>
                    </div>
                  </td>
                  <td style={{padding:"14px 16px",fontSize:13,color:"var(--text2)"}}>{c.tel}</td>
                  <td style={{padding:"14px 16px"}}>
                    <span style={{background:"rgba(96,168,240,.1)",color:"#60a8f0",border:"1px solid rgba(96,168,240,.2)",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700}}>{c.pedidos}</span>
                  </td>
                  <td style={{padding:"14px 16px",fontSize:15,fontWeight:800,color:"var(--gold)"}}>${c.total.toLocaleString("es-AR")}</td>
                  <td style={{padding:"14px 16px",fontSize:12,color:"var(--text3)"}}>{c.ultimo?new Date(c.ultimo).toLocaleDateString("es-AR"):"—"}</td>
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
    ? 'https://pedidosqr-ten.vercel.app'
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
    try {
      if (!local?.restauranteId) throw new Error("Sin restaurante configurado. Recargá la página.");
      // Save extra fields into config JSON as well (covers columns that may not exist)
      const existingConfig = local?.config || {};
      const configExtra = {
        ...existingConfig,
        delivery_radio:    form.delivery_radio,
        retiro_habilitado: form.retiro_habilitado,
        retiro_horario:    form.retiro_horario,
        delivery_horario:  form.delivery_horario,
      };
      const { error } = await supabase.from("restaurantes").update({
        nombre:              form.nombre,
        slug:                form.slug,
        telefono:            form.telefono,
        direccion:           form.direccion,
        descripcion:         form.descripcion,
        horario:             form.horario,
        mesas:               Number(form.mesas)||0,
        wifi_ssid:           form.wifi_ssid,
        wifi_pass:           form.wifi_pass,
        logo_url:            form.logo_url,
        metodos_pago:        form.metodos_pago,
        retiro_habilitado:   form.retiro_habilitado,
        retiro_horario:      form.retiro_horario,
        delivery_habilitado: form.delivery_habilitado,
        delivery_precio:     Number(form.delivery_precio)||0,
        delivery_horario:    form.delivery_horario,
        delivery_radio:      form.delivery_radio,
        alias_pago:          form.alias_pago,
        alias_titular:       form.alias_titular,
        promo_desc:          form.promo_desc,
        config:              configExtra,
      }).eq("id", local.restauranteId);
      if (error) throw error;
      if (setLocal) setLocal(prev => ({ ...prev, ...form, config: configExtra }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) {
      alert("❌ Error al guardar: " + (e.message || JSON.stringify(e)));
    } finally {
      setSaving(false);
    }
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
            {[["Versión","PedidosQR 2.0"],["Plan","Pro"],["Estado","✅ Activo"]].map(([k,v])=>(
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
    ? 'https://pedidosqr-ten.vercel.app'
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
/* ══════════════════════════════════════════════════════════════
   SCREEN PLUS IA — Chat con IA
══════════════════════════════════════════════════════════════ */
function ScreenPlusIA({ local }) {
  const [msgs, setMsgs] = React.useState([
    { role: "ai", text: "¡Hola! Soy tu asistente IA de PedidosQR. Puedo ayudarte a analizar tus ventas, sugerir cambios en la carta, redactar descripciones de productos y mucho más. ¿En qué te ayudo hoy?" }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      // Llamar al API de IA (Vercel function)
      const res = await fetch("/api/ia-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          context: {
            restaurante: local?.nombre,
            plan: local?.plan,
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMsgs(m => [...m, { role: "ai", text: data.reply || "..." }]);
      } else {
        setMsgs(m => [...m, { role: "ai", text: "⚠️ Error conectando con la IA. Verificá tu configuración." }]);
      }
    } catch {
      setMsgs(m => [...m, { role: "ai", text: "⚠️ No se pudo conectar. Revisá tu conexión a internet." }]);
    }
    setLoading(false);
  }

  const suggestions = [
    "¿Cuáles son mis productos más vendidos?",
    "Sugerí una descripción para mi producto estrella",
    "¿Cómo puedo aumentar el ticket promedio?",
    "Generá ideas para el menú del fin de semana",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px - 48px)", gap: 0 }}>
      {/* Header */}
      <div className="ap-card" style={{ padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(139,92,246,.2)", border: "1px solid rgba(139,92,246,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Asistente IA</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>Powered by Claude · {local?.nombre}</div>
        </div>
        <span className="ap-plus-badge ap-plus-ia" style={{ marginLeft: "auto" }}>PLUS IA ACTIVO</span>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "4px 0", marginBottom: 16 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "ai" && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,92,246,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 8, alignSelf: "flex-end" }}>🤖</div>
            )}
            <div className={`ap-chat-bubble ${m.role === "user" ? "ap-chat-user" : "ap-chat-ai"}`}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,92,246,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <div className="ap-chat-bubble ap-chat-ai" style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A78BFA", animation: "ap-livepulse 1s infinite" }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A78BFA", animation: "ap-livepulse 1s .2s infinite" }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A78BFA", animation: "ap-livepulse 1s .4s infinite" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {msgs.length <= 2 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setInput(s)}
              style={{ padding: "7px 12px", borderRadius: 20, border: "1px solid rgba(139,92,246,.3)", background: "rgba(139,92,246,.08)", color: "#A78BFA", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: ".15s" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Escribí tu consulta..."
          style={{ flex: 1, background: "var(--bg3)", border: "1px solid rgba(139,92,246,.3)", borderRadius: 12, padding: "12px 16px", color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: loading ? "var(--bg4)" : "rgba(139,92,246,.8)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: ".15s" }}>
          {loading ? "..." : "↑ Enviar"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCREEN PLUS FIGMA — Editor visual de menú
══════════════════════════════════════════════════════════════ */
function ScreenPlusFigma({ prods, cats, local }) {
  const [selectedCat, setSelectedCat] = React.useState(null);
  const [selectedProd, setSelectedProd] = React.useState(null);
  const [activeTool, setActiveTool] = React.useState("select");
  const [bgColor, setBgColor] = React.useState(local?.color || "#C9A84C");
  const [showExport, setShowExport] = React.useState(false);

  const cat = selectedCat ? cats.find(c => c.id === selectedCat) : null;
  const catProds = selectedCat ? prods.filter(p => p.cat === selectedCat && p.active !== false) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px - 48px)", gap: 0 }}>
      {/* Header */}
      <div className="ap-card" style={{ padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(6,182,212,.2)", border: "1px solid rgba(6,182,212,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎨</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Editor Visual de Menú</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>Diseñá tu carta visualmente · {local?.nombre}</div>
        </div>
        <span className="ap-plus-badge ap-plus-figma" style={{ marginLeft: "auto" }}>PLUS FIGMA ACTIVO</span>
        <button className="ap-btn ap-btn-gold" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => setShowExport(true)}>↓ Exportar</button>
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Panel izquierdo — categorías y productos */}
        <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: 2, marginBottom: 4 }}>CATEGORÍAS</div>
          {cats.map(c => (
            <div key={c.id} onClick={() => { setSelectedCat(c.id); setSelectedProd(null); }}
              style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${selectedCat === c.id ? "rgba(6,182,212,.4)" : "var(--border)"}`, background: selectedCat === c.id ? "rgba(6,182,212,.1)" : "var(--bg3)", fontSize: 13, color: selectedCat === c.id ? "#22D3EE" : "var(--text2)", display: "flex", gap: 8, alignItems: "center", transition: ".15s" }}>
              <span>{c.icon || "📁"}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label || c.nombre}</span>
              <span style={{ fontSize: 10, color: "var(--text3)" }}>{prods.filter(p => p.cat === c.id).length}</span>
            </div>
          ))}
          {cats.length === 0 && <div style={{ color: "var(--text3)", fontSize: 12, textAlign: "center", padding: 20 }}>Sin categorías</div>}

          {selectedCat && catProds.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: 2, marginTop: 8, marginBottom: 4 }}>PRODUCTOS</div>
              {catProds.map(p => (
                <div key={p.id} onClick={() => setSelectedProd(p.id)}
                  style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${selectedProd === p.id ? "rgba(6,182,212,.4)" : "var(--border)"}`, background: selectedProd === p.id ? "rgba(6,182,212,.08)" : "var(--bg2)", fontSize: 12, color: "var(--text2)", display: "flex", gap: 8, alignItems: "center", transition: ".15s" }}>
                  {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display="none"} /> : <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg4)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🍽️</div>}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Canvas principal */}
        <div className="ap-figma-canvas" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ap-figma-toolbar">
            {["select","text","color","layout"].map(t => (
              <button key={t} className={`ap-figma-tool${activeTool === t ? " active" : ""}`} onClick={() => setActiveTool(t)}>
                {t === "select" ? "↖ Seleccionar" : t === "text" ? "T Texto" : t === "color" ? "🎨 Color" : "⊞ Layout"}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>Color base:</div>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                style={{ width: 30, height: 24, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", background: "transparent", padding: 0 }} />
            </div>
          </div>

          {/* Preview del menú */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--bg4)" }}>
            <div style={{ maxWidth: 400, margin: "0 auto", background: "#0A0806", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
              {/* Header del menú */}
              <div style={{ background: `linear-gradient(135deg, ${bgColor}22, ${bgColor}11)`, padding: "24px 20px", borderBottom: `1px solid ${bgColor}33`, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{local?.nombre || "Mi Restaurante"}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>{local?.descripcion || "Carta digital"}</div>
              </div>

              {/* Contenido */}
              {selectedCat && cat ? (
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: bgColor, letterSpacing: 2, marginBottom: 12 }}>{cat.icon} {(cat.label || cat.nombre || "").toUpperCase()}</div>
                  {catProds.map(p => (
                    <div key={p.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.06)", cursor: "pointer", background: selectedProd === p.id ? "rgba(255,255,255,.04)" : "transparent", borderRadius: 8, paddingLeft: "8px", paddingRight: "8px", paddingTop: "10px", paddingBottom: "8px", marginBottom: 4 }} onClick={() => setSelectedProd(p.id)}>
                      {p.foto_url && <img src={p.foto_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display="none"} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{p.desc}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: bgColor, marginTop: 6 }}>${p.price?.toLocaleString("es-AR")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>
                  Seleccioná una categoría para previsualizar la carta
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal export */}
      {showExport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 360, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎨</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Exportar diseño</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>Descargá tu menú diseñado para imprimirlo o compartirlo</div>
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              <button className="ap-btn ap-btn-gold" style={{ fontSize: 13 }} onClick={() => { window.print(); setShowExport(false); }}>🖨️ Imprimir / PDF</button>
              <button className="ap-btn ap-btn-ghost" onClick={() => setShowExport(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function AdminPanel({ local, setLocal, cats, setCats, prods, setProds, authUser, onLogout }) {
  const [screen, setScreen] = React.useState("dashboard");
  const [screenHistory, setScreenHistory] = React.useState([]);
  function navTo(to) {
    if (to !== screen) setScreenHistory(h => [...h.slice(-9), screen]);
    setScreen(to);
  }
  function goBack() {
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1];
      setScreenHistory(h => h.slice(0, -1));
      setScreen(prev);
    }
  }
  const [pedidos, setPedidos] = React.useState([]);
  const [clock, setClock] = React.useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!local?.restauranteId) return;

    const refetch = () => {
      const d = new Date().toISOString().slice(0, 10);
      getPedidos(local.restauranteId, d).then((data) => { if (data) setPedidos(data); });
    };

    refetch();

    const unsub = subscribePedidos(
      local.restauranteId,
      (newP) => { playAlarm('nuevo'); setPedidos((prev) => { if (prev.some(p=>p.id===newP.id)) return prev; return [newP, ...prev]; }); },
      (upd)  => {
        if (upd.status === 'listo') playAlarm('listo');
        setPedidos((prev) => prev.map((p) => (p.id === upd.id ? upd : p)));
      }
    );

    // Polling fallback cada 20s — por si Realtime pierde conexión en mobile
    const poll = setInterval(refetch, 20000);

    // Al volver a la pestaña: refetch inmediato
    const onVisible = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (unsub) unsub();
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [local?.restauranteId]);

  const pendingCount = pedidos.filter((p) => ["pendiente","pendiente_pago","nuevo"].includes(p.status)).length;
  const kitchenCount = pedidos.filter((p) => p.status === "en_cocina").length;
  const deliveryCount = pedidos.filter((p) => (p.tipo_pedido==="delivery"||p.tipo_pedido==="retiro"||p.mesa_numero===0) && p.status!=="entregado").length;

  const screenMap = {
    dashboard: <ScreenDashboard pedidos={pedidos} cats={cats} prods={prods} local={local} />,
    pedidos:   <ScreenPedidos pedidos={pedidos} setPedidos={setPedidos} local={local} />,
    cocina:    <ScreenCocina pedidos={pedidos} setPedidos={setPedidos} local={local} />,
    delivery:  <ScreenDelivery pedidos={pedidos} setPedidos={setPedidos} local={local} />,
    mesas:     <ScreenMesas local={local} pedidos={pedidos} />,
    carta:     <ScreenCartaDesigner prods={prods} cats={cats} local={local} setLocal={setLocal} setProds={setProds} goBack={goBack} />,
    productos: <ScreenCarta prods={prods} setProds={setProds} cats={cats} local={local} setLocal={setLocal} />,
    categorias:<ScreenCategorias cats={cats} setCats={setCats} prods={prods} local={local} />,
    stock:     <ScreenStock />,
    clientes:  <ScreenClientes />,
    caja:      <ScreenCajaPOS prods={prods} cats={cats} local={local} />,
    reportes:  <ScreenReportes pedidos={pedidos} prods={prods} />,
    qr:        <ScreenQR local={local} />,
    config:    <ScreenConfiguracion local={local} setLocal={setLocal} />,
    gestion:   <ScreenGestion prods={prods} setProds={setProds} cats={cats} local={local} setLocal={setLocal} />,
    plus_ia:   <ScreenPlusIA local={local} />,
    plus_figma:<ScreenPlusFigma prods={prods} cats={cats} local={local} />,
  };

  const [navOpen, setNavOpen] = React.useState(false);

  // Swipe gesture: right-edge → open sidebar; left-swipe when open → close
  const swipeRef = React.useRef({ x0: 0, y0: 0, edgeStart: false });
  const onTouchStart = React.useCallback((e) => {
    const t = e.touches[0];
    swipeRef.current = { x0: t.clientX, y0: t.clientY, edgeStart: t.clientX > window.innerWidth - 44 };
  }, []);
  const onTouchEnd = React.useCallback((e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.x0;
    const dy = Math.abs(t.clientY - swipeRef.current.y0);
    if (dy > 60) return;
    if (!navOpen && swipeRef.current.edgeStart && dx < -50) setNavOpen(true);
    if (navOpen && dx > 60) setNavOpen(false);
  }, [navOpen]);

  return (
    <>
      <style>{AP_STYLES}</style>
      <div id="ap2-root" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Topbar screen={screen} clock={clock} onMenuOpen={() => setNavOpen(true)} />
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {screenHistory.length > 0 && (
              <button onClick={goBack}
                style={{ marginBottom:10, display:'inline-flex', alignItems:'center', gap:6,
                  background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:8, padding:'6px 14px 6px 10px', cursor:'pointer',
                  fontSize:12, color:'rgba(255,255,255,.7)', fontWeight:600 }}>
                ← Volver
              </button>
            )}
            {screenMap[screen] || <ScreenDashboard pedidos={pedidos} cats={cats} prods={prods} local={local} />}
          </div>
        </div>
        <div className={`ap-overlay${navOpen ? " nav-open" : ""}`} onClick={() => setNavOpen(false)} />
        <Sidebar
          screen={screen}
          setScreen={navTo}
          pendingCount={pendingCount}
          kitchenCount={kitchenCount}
          deliveryCount={deliveryCount}
          local={local}
          onLogout={onLogout}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />
      </div>
    </>
  );
}
