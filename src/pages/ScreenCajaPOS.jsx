import React from 'react';
import { supabase } from '../lib/supabase.js';

const ARS = (n) => '$ ' + Number(n||0).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
const METODOS = ['efectivo','tarjeta','mercadopago','transferencia'];
const TIPOS_MOV = ['ingreso','egreso','gasto'];

export default function ScreenCajaPOS({ prods=[], cats=[], local={} }) {
  const ridl = local?.restauranteId;

  // Self-load products if not passed via props
  const [prodsLocal, setProdsLocal] = React.useState([]);
  React.useEffect(() => {
    if (!ridl) return;
    supabase?.from('productos').select('*')
      .eq('restaurante_id', ridl)
      .then(({ data }) => { if (data?.length) setProdsLocal(data); });
  }, [ridl]);
  // Prefer real Supabase data over cached prop (which may have demo data)
  const prodsAll = prodsLocal.length > 0 ? prodsLocal : prods;

  // Normalizar campos — el panel usa name/price/active, el POS espera nombre/precio/activo
  const prodsNorm = React.useMemo(() => prodsAll.map(p => ({
    ...p,
    nombre:       p.nombre      || p.name       || "",
    precio:       p.precio      ?? p.price       ?? 0,
    activo:       p.activo      ?? p.active      ?? true,
    categoria_id: p.categoria_id || p.cat        || null,
    foto_url:     p.foto_url    || p.imagen      || null,
  })), [prodsAll]);
  const catsNorm = React.useMemo(() => cats.map(c => ({
    ...c,
    nombre: c.nombre || c.label || "",
  })), [cats]);

  const [tab, setTab] = React.useState('mostrador');
  const [mobileView, setMobileView] = React.useState('prods'); // 'prods' | 'ticket'
  const [ticket, setTicket] = React.useState([]);
  const [selIdx, setSelIdx] = React.useState(null);
  const [metodoPago, setMetodoPago] = React.useState('efectivo');
  const [metodoPago2, setMetodoPago2] = React.useState(null);  // null = sin pago mixto
  const [splitAmt, setSplitAmt] = React.useState('');
  const [splitAmt2, setSplitAmt2] = React.useState('');
  const [descGlobal, setDescGlobal] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [catF, setCatF] = React.useState(null);

  // Cobrar modal
  const [showCobrar, setShowCobrar] = React.useState(false);
  const [montoRec, setMontoRec] = React.useState('');
  const [lastTicket, setLastTicket] = React.useState(null);

  // Special price modal
  const [showPrecio, setShowPrecio] = React.useState(false);
  const [precioIdx, setPrecioIdx] = React.useState(null);
  const [precioEsp, setPrecioEsp] = React.useState('');
  const [descPct, setDescPct] = React.useState(0);

  // Tickets tab
  const [tickets, setTickets] = React.useState([]);
  const [ticketOpen, setTicketOpen] = React.useState(null);
  const [showModPago, setShowModPago] = React.useState(false);
  const [modPagoTicket, setModPagoTicket] = React.useState(null);
  const [modPagoMetodo, setModPagoMetodo] = React.useState('efectivo');

  // Movimientos tab
  const [movs, setMovs] = React.useState([]);
  const [showMovModal, setShowMovModal] = React.useState(false);
  const [movForm, setMovForm] = React.useState({tipo:'ingreso', monto:'', detalle:'', metodo:'efectivo'});

  // Cierre tab
  const [showCierreZ, setShowCierreZ] = React.useState(false);

  const hoy = () => new Date().toISOString().slice(0,10);

  const loadTickets = React.useCallback(async () => {
    if (!supabase || !ridl) return;
    const { data } = await supabase.from('caja_tickets')
      .select('*').eq('restaurante_id', ridl)
      .gte('created_at', hoy() + 'T00:00:00')
      .order('created_at', { ascending: false });
    setTickets(data || []);
  }, [ridl]);

  const loadMovs = React.useCallback(async () => {
    if (!supabase || !ridl) return;
    const { data } = await supabase.from('caja_movimientos')
      .select('*').eq('restaurante_id', ridl)
      .gte('created_at', hoy() + 'T00:00:00')
      .order('created_at', { ascending: false });
    setMovs(data || []);
  }, [ridl]);

  React.useEffect(() => {
    if (!ridl) return;
    loadTickets();
    loadMovs();
  }, [ridl, loadTickets, loadMovs]);

  React.useEffect(() => {
    if (tab === 'tickets') loadTickets();
    if (tab === 'movimientos') loadMovs();
    if (tab === 'cierre') { loadTickets(); loadMovs(); }
  }, [tab, loadTickets, loadMovs]);

  // Calculations
  const calcLine = (it) => {
    const base = it.precio_especial > 0 ? it.precio_especial : it.precio_base;
    return base * (1 - (it.desc_pct||0)/100) * it.qty;
  };
  const subtotal = ticket.reduce((s, it) => s + calcLine(it), 0);
  const descGlobalAmt = subtotal * (descGlobal/100);
  const total = subtotal - descGlobalAmt;
  const vuelto = montoRec ? Math.max(0, parseFloat(montoRec||0) - total) : 0;

  // Mostrador actions
  const addProd = (prod) => {
    setMobileView('ticket');
    setTicket(prev => {
      const idx = prev.findIndex(it => it.id === prod.id && it.precio_especial === 0 && (it.desc_pct||0) === 0);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {...next[idx], qty: next[idx].qty + 1};
        return next;
      }
      return [...prev, {id:prod.id, nombre:prod.nombre, precio_base:prod.precio, precio_especial:0, desc_pct:0, qty:1, img:prod.foto_url}];
    });
  };

  const changeQty = (idx, delta) => {
    setTicket(prev => {
      const next = [...prev];
      const nq = next[idx].qty + delta;
      if (nq <= 0) {
        if (selIdx === idx) setSelIdx(null);
        else if (selIdx > idx) setSelIdx(selIdx - 1);
        return next.filter((_,i) => i !== idx);
      }
      next[idx] = {...next[idx], qty: nq};
      return next;
    });
  };

  const borrarSeleccionado = () => {
    if (selIdx === null) return;
    setTicket(prev => prev.filter((_,i) => i !== selIdx));
    setSelIdx(null);
  };

  const vaciarTicket = () => { setTicket([]); setSelIdx(null); setDescGlobal(0); setMetodoPago('efectivo'); setMetodoPago2(null); setSplitAmt(''); setSplitAmt2(''); };

  const cobrar = async () => {
    if (!supabase || !ridl || ticket.length === 0) return;
    const { data: last } = await supabase.from('caja_tickets')
      .select('numero').eq('restaurante_id', ridl).order('numero', {ascending:false}).limit(1);
    const numero = (last?.[0]?.numero || 0) + 1;
    const { error } = await supabase.from('caja_tickets').insert({
      restaurante_id: ridl, numero, items: ticket,
      subtotal, descuento: descGlobalAmt, desc_global_pct: descGlobal,
      total, metodo_pago: metodoPago2 ? `${metodoPago}+${metodoPago2}` : metodoPago, estado: 'cerrado'
    });
    if (!error) {
      setLastTicket({ numero, items: [...ticket], total, metodo_pago: metodoPago2 ? `${metodoPago}+${metodoPago2}` : metodoPago });
      setShowCobrar(false);
      setMontoRec('');
      loadTickets();
    }
  };

  const compartirTicket = (t) => {
    if (!t) return;
    const items = (t.items||[]).map(it => {
      const p = it.precio_especial > 0 ? it.precio_especial : it.precio_base;
      const lin = p * (1-(it.desc_pct||0)/100) * it.qty;
      return `${it.qty}x ${it.nombre}: ${ARS(lin)}`;
    }).join('%0A');
    const txt = encodeURIComponent(`🧾 Ticket #${t.numero} — ${local?.nombre||'MenuQR'}%0A${items}%0ATOTAL: ${ARS(t.total)}%0APago: ${t.metodo_pago}`);
    const waNum = (local?.whatsapp||local?.telefono||'').replace(/\D/g,'');
    const url = waNum ? `https://wa.me/${waNum}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(url, '_blank');
  };

  const openPrecio = (idx) => {
    setPrecioIdx(idx);
    setPrecioEsp(ticket[idx].precio_especial > 0 ? String(ticket[idx].precio_especial) : '');
    setDescPct(ticket[idx].desc_pct || 0);
    setShowPrecio(true);
  };

  const savePrecio = () => {
    setTicket(prev => {
      const next = [...prev];
      next[precioIdx] = {...next[precioIdx], precio_especial: parseFloat(precioEsp)||0, desc_pct: descPct};
      return next;
    });
    setShowPrecio(false);
  };

  // Tickets actions
  const modificarPago = async () => {
    if (!modPagoTicket || !supabase) return;
    await supabase.from('caja_tickets').update({metodo_pago: modPagoMetodo}).eq('id', modPagoTicket.id);
    setShowModPago(false);
    loadTickets();
  };

  const quitarProdTicket = async (t, itemIdx) => {
    const newItems = t.items.filter((_,i) => i !== itemIdx);
    const newSubtotal = newItems.reduce((s,it) => {
      const b = it.precio_especial > 0 ? it.precio_especial : it.precio_base;
      return s + b * (1-(it.desc_pct||0)/100) * it.qty;
    }, 0);
    const newDescAmt = newSubtotal * ((t.desc_global_pct||0)/100);
    const newTotal = newSubtotal - newDescAmt;
    await supabase.from('caja_tickets').update({items: newItems, subtotal: newSubtotal, descuento: newDescAmt, total: newTotal}).eq('id', t.id);
    loadTickets();
  };

  const imprimir = (t) => {
    const win = window.open('','_blank','width=420,height=650');
    const rows = (t.items||[]).map(it => {
      const p = it.precio_especial > 0 ? it.precio_especial : it.precio_base;
      const linea = p * (1-(it.desc_pct||0)/100) * it.qty;
      return `<tr><td>${it.nombre}${it.desc_pct>0?` (-${it.desc_pct}%)`:''}${it.precio_especial>0?' [esp.]':''}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">${ARS(linea)}</td></tr>`;
    }).join('');
    win.document.write(`<html><head><title>Ticket #${t.numero}</title>
      <style>body{font-family:monospace;padding:20px;max-width:300px;margin:0 auto}table{width:100%;border-collapse:collapse}td{padding:4px 2px;font-size:13px}hr{border:1px dashed #555}.tot{font-size:16px;font-weight:bold}</style>
      </head><body>
      <h2 style="text-align:center;margin-bottom:4px">${local?.nombre||'MenuQR'}</h2>
      <p style="text-align:center;margin-top:0;font-size:12px">Ticket #${t.numero} — ${new Date(t.created_at).toLocaleString('es-AR')}</p>
      <hr>
      <table><tr><th style="text-align:left">Producto</th><th>Cant</th><th style="text-align:right">Total</th></tr>${rows}</table>
      <hr>
      ${t.descuento > 0 ? `<p style="margin:4px 0">Subtotal: ${ARS(t.subtotal)}<br>Desc. ${t.desc_global_pct}%: -${ARS(t.descuento)}</p>` : ''}
      <p class="tot" style="text-align:right">TOTAL: ${ARS(t.total)}</p>
      <p style="font-size:12px">Pago: ${t.metodo_pago}</p>
      <hr><p style="text-align:center;font-size:13px">¡Gracias por su visita!</p>
      </body></html>`);
    win.print();
  };

  // Imprimir movimientos del día
  const imprimirMovimientos = () => {
    const win = window.open('','_blank','width=460,height=700');
    const cols = {ingreso:'#22c55e', egreso:'#ef4444', gasto:'#f59e0b'};
    const icons = {ingreso:'↑', egreso:'↓', gasto:'$'};
    const totales = {};
    TIPOS_MOV.forEach(tp => { totales[tp] = movs.filter(m=>m.tipo===tp).reduce((s,m)=>s+Number(m.monto),0); });
    const totalNeto = totales.ingreso - totales.egreso - totales.gasto;
    const rows = movs.map(m => `
      <tr>
        <td style="color:${cols[m.tipo]}">${icons[m.tipo]} ${m.tipo}</td>
        <td>${new Date(m.created_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</td>
        <td>${m.detalle||'—'}</td>
        <td>${m.metodo}</td>
        <td style="text-align:right;font-weight:600;color:${cols[m.tipo]}">${ARS(m.monto)}</td>
      </tr>`).join('');
    win.document.write(`<html><head><title>Movimientos del día</title>
      <style>body{font-family:monospace;padding:20px;max-width:460px;margin:0 auto}
      table{width:100%;border-collapse:collapse}th{text-align:left;padding:6px 4px;border-bottom:2px solid #333;font-size:12px}
      td{padding:5px 4px;border-bottom:1px solid #222;font-size:12px}hr{border:1px dashed #555}
      .tot{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}</style>
      </head><body>
      <h2 style="text-align:center;margin-bottom:4px">Movimientos de caja</h2>
      <p style="text-align:center;margin-top:0;font-size:12px">${new Date().toLocaleDateString('es-AR')} — ${local?.nombre||'MenuQR'}</p>
      <hr>
      <table>
        <thead><tr><th>Tipo</th><th>Hora</th><th>Detalle</th><th>Método</th><th style="text-align:right">Monto</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <hr>
      <div class="tot"><span>↑ Ingresos</span><span style="color:#22c55e;font-weight:700">${ARS(totales.ingreso)}</span></div>
      <div class="tot"><span>↓ Egresos</span><span style="color:#ef4444;font-weight:700">${ARS(totales.egreso)}</span></div>
      <div class="tot"><span>$ Gastos</span><span style="color:#f59e0b;font-weight:700">${ARS(totales.gasto)}</span></div>
      <hr>
      <div class="tot" style="font-size:16px;font-weight:bold"><span>NETO</span><span style="color:${totalNeto>=0?'#22c55e':'#ef4444'}">${ARS(totalNeto)}</span></div>
      <p style="text-align:center;font-size:11px;margin-top:16px">Total movimientos: ${movs.length}</p>
      </body></html>`);
    win.print();
  };

  // Movimientos actions
  const addMov = async () => {
    if (!supabase || !ridl || !movForm.monto) return;
    await supabase.from('caja_movimientos').insert({
      restaurante_id: ridl, tipo: movForm.tipo,
      monto: parseFloat(movForm.monto), detalle: movForm.detalle, metodo: movForm.metodo
    });
    setShowMovModal(false);
    setMovForm({tipo:'ingreso', monto:'', detalle:'', metodo:'efectivo'});
    loadMovs();
  };

  // Cierre X/Z
  const calcResumen = () => {
    const ventas = {};
    METODOS.forEach(m => { ventas[m] = 0; });
    tickets.forEach(t => { ventas[t.metodo_pago] = (ventas[t.metodo_pago]||0) + Number(t.total); });
    const totalVentas = tickets.reduce((s,t) => s + Number(t.total), 0);
    const movResumen = {};
    TIPOS_MOV.forEach(tp => { movResumen[tp] = movs.filter(m=>m.tipo===tp).reduce((s,m)=>s+Number(m.monto),0); });
    return { ventas, totalVentas, movResumen, cantTickets: tickets.length };
  };

  const cierreZ = async () => {
    if (!supabase || !ridl) return;
    const resumen = calcResumen();
    await supabase.from('caja_cierres').insert({ restaurante_id: ridl, tipo: 'z', resumen });
    setShowCierreZ(false);
    alert('✓ Cierre Z registrado');
  };

  const prodsFiltrados = prodsNorm.filter(p =>
    (!search || p.nombre?.toLowerCase().includes(search.toLowerCase())) &&
    (!catF || p.categoria_id === catF) &&
    p.activo !== false
  );

  const resumen = (tab === 'cierre') ? calcResumen() : null;

  // Styles
  const S = {
    wrap: {minHeight:'100%', background:'var(--bg)', color:'var(--text)'},
    tabRow: {display:'flex', gap:4, padding:'12px 16px 0', borderBottom:'1px solid var(--border)', flexWrap:'wrap'},
    tab: (a) => ({padding:'8px 18px', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:a?'var(--gold)':'var(--bg3)', color:a?'#000':'var(--text2)'}),
    body: {padding:16},
    inp: {background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', color:'var(--text)', fontSize:13, width:'100%', boxSizing:'border-box', outline:'none'},
    btn: (bg='var(--gold)', col='#000') => ({background:bg, color:col, border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontSize:13, fontWeight:600}),
    btnSm: (bg='var(--bg3)', col='var(--text)') => ({background:bg, color:col, border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12, fontWeight:600}),
    overlay: {position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center'},
    modal: {background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:24, width:360, maxWidth:'92vw'},
  };

  return (
    <div style={S.wrap}>
      {/* Tabs */}
      <div style={S.tabRow}>
        {[['mostrador','🛒 Mostrador'],['tickets','🧾 Tickets'],['movimientos','💸 Movimientos'],['cierre','📊 Cierre X/Z']].map(([k,l])=>(
          <button key={k} style={S.tab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={S.body}>

        {/* ===== MOSTRADOR ===== */}
        {tab === 'mostrador' && (
          <div style={{display:'flex', flexDirection:'column', height:'calc(100vh - 190px)'}}>
            {/* Mobile view switcher */}
            <div style={{display:'flex', gap:0, marginBottom:8, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)'}}>
              <button onClick={()=>setMobileView('prods')}
                style={{flex:1, padding:'8px', fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                  background:mobileView==='prods'?'var(--gold)':'var(--bg3)',
                  color:mobileView==='prods'?'#000':'var(--text2)'}}>
                🛒 Productos
              </button>
              <button onClick={()=>setMobileView('ticket')}
                style={{flex:1, padding:'8px', fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                  background:mobileView==='ticket'?'var(--gold)':'var(--bg3)',
                  color:mobileView==='ticket'?'#000':'var(--text2)'}}>
                🧾 Ticket {ticket.length > 0 ? `(${ticket.length})` : ''}
                {total > 0 ? ` · $${Math.round(total).toLocaleString('es-AR')}` : ''}
              </button>
            </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr', gap:12, flex:1, overflow:'hidden'}}>

            {/* Left: products */}
            <div style={{display: mobileView==='prods' ? 'flex' : 'none', flexDirection:'column', gap:8, minWidth:0}}>
              <input style={S.inp} placeholder="Buscar producto..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                <button style={S.btnSm(catF===null?'var(--gold)':'var(--bg3)', catF===null?'#000':'var(--text)')} onClick={()=>setCatF(null)}>Todos</button>
                {catsNorm.map(c=>(
                  <button key={c.id} style={S.btnSm(catF===c.id?'var(--gold)':'var(--bg3)', catF===c.id?'#000':'var(--text)')} onClick={()=>setCatF(c.id)}>{c.nombre}</button>
                ))}
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, overflowY:'auto', alignContent:'start', flex:1, paddingRight:4}}>
                {prodsFiltrados.map(p=>(
                  <div key={p.id} onClick={()=>addProd(p)}
                    style={{background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, padding:8, cursor:'pointer', textAlign:'center', transition:'border-color .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--gold)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                    {p.foto_url
                      ? <img src={p.foto_url} alt={p.nombre} style={{width:'100%', height:68, objectFit:'cover', borderRadius:6, marginBottom:4}} onError={e=>e.target.style.display='none'}/>
                      : <div style={{width:'100%', height:68, background:'var(--bg4)', borderRadius:6, marginBottom:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24}}>🍽️</div>
                    }
                    <div style={{fontSize:11, fontWeight:600, lineHeight:1.2, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.nombre}</div>
                    <div style={{fontSize:12, color:'var(--gold)', fontWeight:700}}>{ARS(p.precio)}</div>
                  </div>
                ))}
                {prodsFiltrados.length === 0 && <div style={{color:'var(--text3)', fontSize:13, padding:16, gridColumn:'1/-1'}}>Sin resultados</div>}
              </div>
            </div>

            {/* Right: ticket */}
            <div style={{display: mobileView==='ticket' ? 'flex' : 'none', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, flexDirection:'column', overflow:'hidden'}}>
              <div style={{padding:'10px 12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight:700, fontSize:14}}>🧾 Ticket</span>
                <div style={{display:'flex', gap:6}}>
                  {selIdx !== null && <button style={S.btnSm('var(--red)','#fff')} onClick={borrarSeleccionado}>Borrar 1</button>}
                  <button style={S.btnSm('var(--bg4)','var(--text3)')} onClick={vaciarTicket}>Vaciar todo</button>
                </div>
              </div>

              <div style={{flex:1, overflowY:'auto', padding:8}}>
                {ticket.length === 0 && <div style={{color:'var(--text3)', textAlign:'center', padding:32, fontSize:13}}>Tocá un producto para agregar</div>}
                {ticket.map((it, idx) => {
                  const precio = it.precio_especial > 0 ? it.precio_especial : it.precio_base;
                  const lineTotal = precio * (1-(it.desc_pct||0)/100) * it.qty;
                  const isSel = selIdx === idx;
                  return (
                    <div key={idx} onClick={()=>setSelIdx(isSel?null:idx)}
                      style={{display:'flex', alignItems:'center', gap:6, padding:'7px 8px', borderRadius:8, marginBottom:4, cursor:'pointer',
                        background: isSel ? 'rgba(201,168,76,.15)' : 'var(--bg3)',
                        border: `1px solid ${isSel?'var(--gold)':'var(--border)'}`}}>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{it.nombre}</div>
                        <div style={{fontSize:11, color:'var(--text3)', display:'flex', gap:6}}>
                          {it.precio_especial > 0
                            ? <span style={{color:'var(--gold)'}}>Esp: {ARS(it.precio_especial)}</span>
                            : <span>{ARS(it.precio_base)}</span>}
                          {it.desc_pct > 0 && <span style={{color:'var(--green)'}}>-{it.desc_pct}%</span>}
                        </div>
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:4}}>
                        <button style={{...S.btnSm(), padding:'2px 8px', fontSize:15, lineHeight:1}} onClick={e=>{e.stopPropagation();changeQty(idx,-1)}}>−</button>
                        <span style={{fontSize:13, fontWeight:700, minWidth:22, textAlign:'center'}}>{it.qty}</span>
                        <button style={{...S.btnSm(), padding:'2px 8px', fontSize:15, lineHeight:1}} onClick={e=>{e.stopPropagation();changeQty(idx,1)}}>+</button>
                      </div>
                      <div style={{textAlign:'right', minWidth:72}}>
                        <div style={{fontSize:13, fontWeight:700, color:'var(--gold)'}}>{ARS(lineTotal)}</div>
                        <button style={{background:'none', border:'none', color:'var(--text3)', fontSize:10, cursor:'pointer', padding:'1px 2px'}} onClick={e=>{e.stopPropagation();openPrecio(idx)}}>✏️ precio</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{padding:'10px 12px', borderTop:'1px solid var(--border)'}}>
                {/* Global discount */}
                <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:8, flexWrap:'wrap'}}>
                  <span style={{fontSize:11, color:'var(--text2)', marginRight:2}}>Desc:</span>
                  {[0,5,10,15,20].map(d=>(
                    <button key={d} style={S.btnSm(descGlobal===d?'var(--gold)':'var(--bg4)', descGlobal===d?'#000':'var(--text2)')} onClick={()=>setDescGlobal(d)}>{d}%</button>
                  ))}
                </div>
                {/* Payment method */}
                <div style={{marginBottom:10}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                    <span style={{fontSize:11, color:'var(--text2)'}}>Pago:</span>
                    <button
                      style={{background:'none', color: metodoPago2 !== null ? 'var(--red)' : 'var(--gold)', fontSize:10, cursor:'pointer', fontWeight:700, padding:'2px 6px', borderRadius:6, border:`1px solid ${metodoPago2 !== null ? 'var(--red)' : 'var(--gold)'}` }}
                      onClick={()=>{ if(metodoPago2!==null){setMetodoPago2(null);setSplitAmt('');setSplitAmt2('');}else{setMetodoPago2('tarjeta');} }}>
                      {metodoPago2 !== null ? '✕ cancelar mixto' : '÷ Pago Mixto'}
                    </button>
                  </div>
                  {metodoPago2 === null ? (
                    <div style={{display:'flex', gap:5, flexWrap:'wrap'}}>
                      {METODOS.map(m=>(
                        <button key={m} style={S.btnSm(metodoPago===m?'var(--gold)':'var(--bg4)', metodoPago===m?'#000':'var(--text2)')} onClick={()=>setMetodoPago(m)}>{m}</button>
                      ))}
                    </div>
                  ) : (
                    <div style={{display:'flex', flexDirection:'column', gap:6}}>
                      <div style={{background:'var(--bg3)', borderRadius:8, padding:'8px 10px'}}>
                        <div style={{fontSize:9, color:'var(--text3)', letterSpacing:1, marginBottom:5, textTransform:'uppercase'}}>Método 1</div>
                        <div style={{display:'flex', gap:4, flexWrap:'wrap', marginBottom:6}}>
                          {METODOS.map(m=>(
                            <button key={m} style={S.btnSm(metodoPago===m?'var(--gold)':'var(--bg4)', metodoPago===m?'#000':'var(--text2)')} onClick={()=>setMetodoPago(m)}>{m}</button>
                          ))}
                        </div>
                        <div style={{display:'flex', gap:6, alignItems:'center'}}>
                          <span style={{fontSize:12, color:'var(--text2)'}}>$</span>
                          <input type="number" value={splitAmt}
                            onChange={e=>{setSplitAmt(e.target.value);const r=total-Number(e.target.value||0);if(r>=0)setSplitAmt2(String(r));}}
                            placeholder={String(Math.ceil(total/2))}
                            style={{flex:1, background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:6, padding:'5px 8px', color:'var(--text)', fontSize:13, fontWeight:700, outline:'none'}}/>
                          <button
                            onClick={()=>{const h=Math.ceil(total/2);setSplitAmt(String(h));setSplitAmt2(String(total-h));}}
                            style={{background:'var(--gold)', border:'none', borderRadius:6, padding:'5px 10px', color:'#000', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'}}>50/50</button>
                        </div>
                      </div>
                      <div style={{background:'var(--bg3)', borderRadius:8, padding:'8px 10px'}}>
                        <div style={{fontSize:9, color:'var(--text3)', letterSpacing:1, marginBottom:5, textTransform:'uppercase'}}>Método 2</div>
                        <div style={{display:'flex', gap:4, flexWrap:'wrap', marginBottom:6}}>
                          {METODOS.map(m=>(
                            <button key={m} style={S.btnSm(metodoPago2===m?'var(--gold)':'var(--bg4)', metodoPago2===m?'#000':'var(--text2)')} onClick={()=>setMetodoPago2(m)}>{m}</button>
                          ))}
                        </div>
                        <div style={{display:'flex', gap:6, alignItems:'center'}}>
                          <span style={{fontSize:12, color:'var(--text2)'}}>$</span>
                          <input type="number" value={splitAmt2}
                            onChange={e=>setSplitAmt2(e.target.value)}
                            placeholder={String(Math.max(0,total-Number(splitAmt||0)))}
                            style={{flex:1, background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:6, padding:'5px 8px', color:'var(--text)', fontSize:13, fontWeight:700, outline:'none'}}/>
                        </div>
                      </div>
                      {(splitAmt||splitAmt2)&&(()=>{
                        const a1=Number(splitAmt||0),a2=Number(splitAmt2||0),diff=total-(a1+a2);
                        return(<div style={{background:diff===0?'rgba(62,207,110,.1)':'rgba(255,176,32,.1)',border:`1px solid ${diff===0?'var(--green)':'#FFB020'}`,borderRadius:6,padding:'5px 10px',display:'flex',justifyContent:'space-between'}}>
                          <span style={{fontSize:10,color:diff===0?'var(--green)':'#FFB020'}}>{diff===0?'✓ Balanceado':diff>0?`Falta: ${ARS(diff)}`:`Excede: ${ARS(Math.abs(diff))}`}</span>
                          <span style={{fontSize:11,fontWeight:700,color:diff===0?'var(--green)':'#FFB020'}}>Total: {ARS(total)}</span>
                        </div>);
                      })()}
                    </div>
                  )}
                </div>
                {/* Totals */}
                <div style={{borderTop:'1px solid var(--border)', paddingTop:8}}>
                  {descGlobal > 0 && <>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)', marginBottom:3}}><span>Subtotal</span><span>{ARS(subtotal)}</span></div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--green)', marginBottom:6}}><span>Desc {descGlobal}%</span><span>-{ARS(descGlobalAmt)}</span></div>
                  </>}
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:17, fontWeight:700, color:'var(--gold)', marginBottom:10}}>
                    <span>TOTAL</span><span>{ARS(total)}</span>
                  </div>
                  <button style={{...S.btn(), width:'100%', padding:12, fontSize:15, opacity:ticket.length===0?0.4:1}} disabled={ticket.length===0} onClick={()=>setShowCobrar(true)}>
                    COBRAR ›
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ===== TICKETS ===== */}
        {tab === 'tickets' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
              <span style={{fontWeight:700, fontSize:15}}>Tickets de hoy <span style={{color:'var(--text3)', fontWeight:400}}>({tickets.length})</span></span>
              <button style={S.btnSm()} onClick={loadTickets}>↻ Actualizar</button>
            </div>
            {tickets.length === 0 && <div style={{color:'var(--text3)', textAlign:'center', padding:40}}>Sin tickets registrados hoy</div>}
            {tickets.map(t=>(
              <div key={t.id} style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, marginBottom:8}}>
                <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer'}} onClick={()=>setTicketOpen(ticketOpen===t.id?null:t.id)}>
                  <span style={{fontWeight:700, color:'var(--gold)', minWidth:36}}>#{t.numero}</span>
                  <span style={{fontSize:12, color:'var(--text3)'}}>{new Date(t.created_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</span>
                  <span style={{flex:1, fontSize:12, color:'var(--text2)', textTransform:'capitalize'}}>{t.metodo_pago}</span>
                  <span style={{fontWeight:700, color:'var(--gold)'}}>{ARS(t.total)}</span>
                  <span style={{color:'var(--text3)', fontSize:11}}>{ticketOpen===t.id?'▲':'▼'}</span>
                </div>
                {ticketOpen===t.id && (
                  <div style={{padding:'0 14px 14px', borderTop:'1px solid var(--border)'}}>
                    <table style={{width:'100%', fontSize:12, borderCollapse:'collapse', marginTop:10}}>
                      <thead><tr style={{color:'var(--text3)'}}>
                        <th style={{textAlign:'left', paddingBottom:6, fontWeight:600}}>Producto</th>
                        <th style={{textAlign:'center', paddingBottom:6, fontWeight:600}}>Cant</th>
                        <th style={{textAlign:'right', paddingBottom:6, fontWeight:600}}>Total</th>
                        <th></th>
                      </tr></thead>
                      <tbody>
                        {(t.items||[]).map((it,ii)=>{
                          const p = it.precio_especial > 0 ? it.precio_especial : it.precio_base;
                          const linea = p * (1-(it.desc_pct||0)/100) * it.qty;
                          return (
                            <tr key={ii} style={{borderTop:'1px solid var(--border)'}}>
                              <td style={{padding:'5px 0'}}>
                                {it.nombre}
                                {it.precio_especial>0 && <span style={{color:'var(--gold)', marginLeft:4, fontSize:11}}>[esp.]</span>}
                                {it.desc_pct>0 && <span style={{color:'var(--green)', marginLeft:4}}>-{it.desc_pct}%</span>}
                              </td>
                              <td style={{textAlign:'center'}}>{it.qty}</td>
                              <td style={{textAlign:'right', color:'var(--gold)', fontWeight:600}}>{ARS(linea)}</td>
                              <td style={{textAlign:'right', paddingLeft:6}}>
                                <button style={S.btnSm('var(--red)','#fff')} onClick={()=>quitarProdTicket(t,ii)}>✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {(t.descuento||0) > 0 && (
                      <div style={{fontSize:12, color:'var(--green)', marginTop:6}}>
                        Subtotal: {ARS(t.subtotal)} — Desc. {t.desc_global_pct}%: -{ARS(t.descuento)}
                      </div>
                    )}
                    <div style={{fontWeight:700, fontSize:14, color:'var(--gold)', marginTop:6}}>Total: {ARS(t.total)}</div>
                    <div style={{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}}>
                      <button style={S.btnSm()} onClick={()=>{setModPagoTicket(t);setModPagoMetodo(t.metodo_pago);setShowModPago(true);}}>✏️ Forma de pago</button>
                      <button style={S.btnSm()} onClick={()=>imprimir(t)}>🖨️ Imprimir</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===== MOVIMIENTOS ===== */}
        {tab === 'movimientos' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
              <span style={{fontWeight:700, fontSize:15}}>Movimientos de hoy</span>
              <div style={{display:'flex', gap:8}}>
                <button style={S.btnSm()} onClick={imprimirMovimientos}>🖨️ Imprimir</button>
                <button style={S.btn()} onClick={()=>setShowMovModal(true)}>+ Agregar</button>
              </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16}}>
              {TIPOS_MOV.map(tp=>{
                const sum = movs.filter(m=>m.tipo===tp).reduce((s,m)=>s+Number(m.monto),0);
                const cols = {ingreso:'var(--green)', egreso:'var(--red)', gasto:'#f59e0b'};
                const icons = {ingreso:'↑', egreso:'↓', gasto:'💸'};
                return (
                  <div key={tp} style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px'}}>
                    <div style={{fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:4}}>{icons[tp]} {tp}</div>
                    <div style={{fontSize:17, fontWeight:700, color:cols[tp]}}>{ARS(sum)}</div>
                  </div>
                );
              })}
            </div>
            {movs.length === 0 && <div style={{color:'var(--text3)', textAlign:'center', padding:32}}>Sin movimientos registrados hoy</div>}
            {movs.map(m=>{
              const cols = {ingreso:'var(--green)', egreso:'var(--red)', gasto:'#f59e0b'};
              const icons = {ingreso:'↑', egreso:'↓', gasto:'💸'};
              return (
                <div key={m.id} style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', marginBottom:6, display:'flex', alignItems:'center', gap:10}}>
                  <span style={{fontSize:18, minWidth:24, textAlign:'center'}}>{icons[m.tipo]}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13, fontWeight:600, textTransform:'capitalize'}}>{m.tipo}{m.detalle && ` — ${m.detalle}`}</div>
                    <div style={{fontSize:11, color:'var(--text3)'}}>{new Date(m.created_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})} · {m.metodo}</div>
                  </div>
                  <div style={{fontWeight:700, color:cols[m.tipo]}}>{ARS(m.monto)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== CIERRE X/Z ===== */}
        {tab === 'cierre' && resumen && (
          <div style={{maxWidth:520}}>
            <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:20, marginBottom:16}}>
              <div style={{fontWeight:700, fontSize:16, marginBottom:14}}>📊 Reporte X — Período actual</div>
              <div style={{fontSize:12, color:'var(--text3)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5}}>Ventas por método de pago</div>
              {METODOS.map(m=>(
                <div key={m} style={{display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:13}}>
                  <span style={{textTransform:'capitalize', color:'var(--text2)'}}>{m}</span>
                  <span style={{fontWeight:600, color:(resumen.ventas[m]||0)>0?'var(--gold)':'var(--text3)'}}>{ARS(resumen.ventas[m]||0)}</span>
                </div>
              ))}
              <div style={{display:'flex', justifyContent:'space-between', padding:'12px 0 4px', fontWeight:700, fontSize:15, color:'var(--gold)'}}>
                <span>TOTAL VENTAS ({resumen.cantTickets} tickets)</span>
                <span>{ARS(resumen.totalVentas)}</span>
              </div>

              <div style={{borderTop:'1px solid var(--border)', paddingTop:12, marginTop:8}}>
                <div style={{fontSize:12, color:'var(--text3)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5}}>Movimientos de caja</div>
                {TIPOS_MOV.map(tp=>{
                  const cols = {ingreso:'var(--green)', egreso:'var(--red)', gasto:'#f59e0b'};
                  return (
                    <div key={tp} style={{display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:13}}>
                      <span style={{textTransform:'capitalize', color:'var(--text2)'}}>{tp}</span>
                      <span style={{fontWeight:600, color:cols[tp]}}>{ARS(resumen.movResumen[tp]||0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button style={{...S.btn('var(--red)','#fff'), width:'100%', padding:14, fontSize:15}} onClick={()=>setShowCierreZ(true)}>
              🔒 Realizar Cierre Z (definitivo)
            </button>
            <div style={{fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:8}}>El cierre Z registra el resumen y cierra el período. No se puede deshacer.</div>
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}

      {/* Cobrar */}
      {showCobrar && (
        <div style={S.overlay} onClick={()=>setShowCobrar(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700, fontSize:16, marginBottom:16}}>💵 Cobrar</div>
            <div style={{marginBottom:14}}>
              {descGlobal > 0 && <>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4}}><span>Subtotal</span><span>{ARS(subtotal)}</span></div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--green)', marginBottom:4}}><span>Desc {descGlobal}%</span><span>-{ARS(descGlobalAmt)}</span></div>
              </>}
              <div style={{display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:20, color:'var(--gold)', marginTop:8}}><span>TOTAL</span><span>{ARS(total)}</span></div>
              <div style={{fontSize:12, color:'var(--text3)', marginTop:4, textTransform:'capitalize'}}>Pago: {metodoPago}</div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12, color:'var(--text2)', display:'block', marginBottom:4}}>Monto recibido (opcional)</label>
              <input style={S.inp} type="number" placeholder="0.00" value={montoRec} onChange={e=>setMontoRec(e.target.value)} autoFocus/>
            </div>
            {montoRec && parseFloat(montoRec) >= total && (
              <div style={{background:'rgba(34,197,94,.12)', border:'1px solid var(--green)', borderRadius:8, padding:'10px 14px', fontSize:15, fontWeight:700, color:'var(--green)', marginBottom:12}}>
                Vuelto: {ARS(vuelto)}
              </div>
            )}
            {(metodoPago==='mercadopago'||metodoPago==='transferencia'||metodoPago2==='mercadopago'||metodoPago2==='transferencia')&&(
              <div style={{margin:'10px 0',padding:'10px 12px',background:'rgba(201,168,76,.08)',
                border:'1px solid rgba(201,168,76,.3)',borderRadius:8,fontSize:12,
                color:'#D4A843',lineHeight:1.5,textAlign:'center'}}>
                💬 Una vez hecho el pago, compartí el comprobante a este número:<br/>
                <span style={{fontWeight:800,fontSize:14}}>
                  {local?.whatsapp||local?.telefono||'—'}
                </span>
              </div>
            )}
            <div style={{display:'flex', gap:8, marginTop:16}}>
              <button style={{...S.btn('var(--bg3)','var(--text)'), flex:1}} onClick={()=>setShowCobrar(false)}>Cancelar</button>
              <button style={{...S.btn(), flex:2}} onClick={cobrar}>✓ Confirmar cobro</button>
            </div>
          </div>
        </div>
      )}

      {/* Post-cobro: éxito con opciones de imprimir / compartir */}
      {lastTicket && (
        <div style={S.overlay}>
          <div style={{...S.modal, textAlign:'center', maxWidth:360}}>
            <div style={{fontSize:28, marginBottom:8}}>✅</div>
            <div style={{fontWeight:700, fontSize:17, color:'var(--gold)', marginBottom:4}}>
              Ticket #{lastTicket.numero} cobrado
            </div>
            <div style={{fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:4}}>
              {ARS(lastTicket.total)}
            </div>
            <div style={{fontSize:12, color:'var(--text3)', marginBottom:16, textTransform:'capitalize'}}>
              Pago: {lastTicket.metodo_pago}
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              <button style={{...S.btn('var(--bg3)','var(--text)'), padding:'12px', fontSize:14}}
                onClick={()=>imprimir({...lastTicket, items: lastTicket.items.map(it=>({...it, nombre:it.nombre, precio_base:it.precio_base, precio_especial:it.precio_especial, desc_pct:it.desc_pct, qty:it.qty}))})}>
                🖨️ Imprimir ticket
              </button>
              <button style={{...S.btn('rgba(37,211,102,.12)','#25D366'), border:'1px solid rgba(37,211,102,.3)', padding:'12px', fontSize:14}}
                onClick={()=>compartirTicket(lastTicket)}>
                📲 Compartir por WhatsApp
              </button>
              <button style={{...S.btn(), padding:'12px', fontSize:14}}
                onClick={()=>{ vaciarTicket(); setLastTicket(null); }}>
                ✓ Nuevo pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Precio especial */}
      {showPrecio && precioIdx !== null && ticket[precioIdx] && (
        <div style={S.overlay} onClick={()=>setShowPrecio(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700, fontSize:16, marginBottom:4}}>✏️ Precio especial</div>
            <div style={{fontSize:12, color:'var(--text3)', marginBottom:16}}>{ticket[precioIdx].nombre} — base: {ARS(ticket[precioIdx].precio_base)}</div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12, color:'var(--text2)', display:'block', marginBottom:4}}>Precio especial (deja vacío para usar el base)</label>
              <input style={S.inp} type="number" placeholder={String(ticket[precioIdx].precio_base)} value={precioEsp} onChange={e=>setPrecioEsp(e.target.value)}/>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:12, color:'var(--text2)', display:'block', marginBottom:6}}>Descuento %</label>
              <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                {[0,5,10,15,20,25,30,50].map(d=>(
                  <button key={d} style={S.btnSm(descPct===d?'var(--gold)':'var(--bg3)', descPct===d?'#000':'var(--text)')} onClick={()=>setDescPct(d)}>{d}%</button>
                ))}
              </div>
            </div>
            <div style={{display:'flex', gap:8}}>
              <button style={{...S.btn('var(--bg3)','var(--text)'), flex:1}} onClick={()=>setShowPrecio(false)}>Cancelar</button>
              <button style={{...S.btn(), flex:1}} onClick={savePrecio}>Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modificar pago */}
      {showModPago && modPagoTicket && (
        <div style={S.overlay} onClick={()=>setShowModPago(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700, fontSize:16, marginBottom:4}}>✏️ Cambiar forma de pago</div>
            <div style={{fontSize:12, color:'var(--text3)', marginBottom:16}}>Ticket #{modPagoTicket.numero} — {ARS(modPagoTicket.total)}</div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:20}}>
              {METODOS.map(m=>(
                <button key={m} style={S.btnSm(modPagoMetodo===m?'var(--gold)':'var(--bg3)', modPagoMetodo===m?'#000':'var(--text)')} onClick={()=>setModPagoMetodo(m)}>{m}</button>
              ))}
            </div>
            <div style={{display:'flex', gap:8}}>
              <button style={{...S.btn('var(--bg3)','var(--text)'), flex:1}} onClick={()=>setShowModPago(false)}>Cancelar</button>
              <button style={{...S.btn(), flex:1}} onClick={modificarPago}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Agregar movimiento */}
      {showMovModal && (
        <div style={S.overlay} onClick={()=>setShowMovModal(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700, fontSize:16, marginBottom:16}}>+ Movimiento de caja</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12, color:'var(--text2)', display:'block', marginBottom:6}}>Tipo</label>
              <div style={{display:'flex', gap:6}}>
                {TIPOS_MOV.map(t=>(
                  <button key={t} style={S.btnSm(movForm.tipo===t?'var(--gold)':'var(--bg3)', movForm.tipo===t?'#000':'var(--text)')} onClick={()=>setMovForm(f=>({...f,tipo:t}))}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12, color:'var(--text2)', display:'block', marginBottom:4}}>Monto</label>
              <input style={S.inp} type="number" placeholder="0.00" value={movForm.monto} onChange={e=>setMovForm(f=>({...f,monto:e.target.value}))}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12, color:'var(--text2)', display:'block', marginBottom:4}}>Detalle</label>
              <input style={S.inp} placeholder="Descripción..." value={movForm.detalle} onChange={e=>setMovForm(f=>({...f,detalle:e.target.value}))}/>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:12, color:'var(--text2)', display:'block', marginBottom:6}}>Método</label>
              <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                {METODOS.map(m=>(
                  <button key={m} style={S.btnSm(movForm.metodo===m?'var(--gold)':'var(--bg3)', movForm.metodo===m?'#000':'var(--text)')} onClick={()=>setMovForm(f=>({...f,metodo:m}))}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{display:'flex', gap:8}}>
              <button style={{...S.btn('var(--bg3)','var(--text)'), flex:1}} onClick={()=>setShowMovModal(false)}>Cancelar</button>
              <button style={{...S.btn(), flex:1}} onClick={addMov}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Cierre Z confirm */}
      {showCierreZ && (
        <div style={S.overlay} onClick={()=>setShowCierreZ(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700, fontSize:16, marginBottom:10}}>⚠️ Confirmar Cierre Z</div>
            <div style={{fontSize:13, color:'var(--text2)', marginBottom:18}}>
              Esto registra el resumen definitivo del período actual. No se puede deshacer.
            </div>
            {resumen && (
              <div style={{background:'var(--bg3)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:14}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                  <span>Total ventas</span><span style={{fontWeight:700, color:'var(--gold)'}}>{ARS(resumen.totalVentas)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)'}}>
                  <span>Tickets</span><span>{resumen.cantTickets}</span>
                </div>
              </div>
            )}
            <div style={{display:'flex', gap:8}}>
              <button style={{...S.btn('var(--bg3)','var(--text)'), flex:1}} onClick={()=>setShowCierreZ(false)}>Cancelar</button>
              <button style={{...S.btn('var(--red)','#fff'), flex:1}} onClick={cierreZ}>Confirmar Cierre Z</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
