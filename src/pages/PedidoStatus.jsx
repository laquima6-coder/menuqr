import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getRestaurante, getPedidoById, subscribePedido } from '../lib/supabase.js'

const STEPS = [
  { key: 'nuevo',     icon: '📋', label: 'Recibido',   sub: 'Tu pedido llegó a la cocina' },
  { key: 'preparando',icon: '🍳', label: 'Preparando', sub: 'Lo están cocinando ahora' },
  { key: 'listo',     icon: '🔔', label: '¡Listo!',    sub: 'Ya puede pasar a buscarlo' },
  { key: 'entregado', icon: '🎉', label: 'Entregado',  sub: '¡Buen provecho!' },
]

export default function PedidoStatus() {
  const { slug, id } = useParams()
  const [rest,    setRest]    = useState(null)
  const [pedido,  setPedido]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [r, p] = await Promise.all([getRestaurante(slug), getPedidoById(id)])
        if (cancelled) return
        if (!r) { setError('Local no encontrado'); setLoading(false); return }
        if (!p) { setError('Pedido no encontrado'); setLoading(false); return }
        setRest(r); setPedido(p); setLoading(false)
      } catch (e) { if (!cancelled) { setError('Error cargando'); setLoading(false) } }
    }
    load()
    return () => { cancelled = true }
  }, [slug, id])

  useEffect(() => {
    if (!id) return
    const unsub = subscribePedido(id, (u) => setPedido(prev => prev ? { ...prev, status: u.status } : prev))
    return unsub
  }, [id])

  const acColor = rest?.config?.color || rest?.color || '#C9A84C'
  const stepIdx = STEPS.findIndex(s => s.key === pedido?.status)
  const curStep = STEPS[Math.max(0, stepIdx)]
  const isDone  = pedido?.status === 'listo' || pedido?.status === 'entregado'
  const items   = pedido?.pedido_items || []
  const mesa    = pedido?.mesa_numero

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0A0806',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:'#4A6080',letterSpacing:2}}>CARGANDO...</div>
    </div>
  )

  if (error) return (
    <div style={{minHeight:'100vh',background:'#0A0806',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>😕</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,color:'#D8ECF8',marginBottom:8}}>{error}</div>
        <a href={`/${slug}`} style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:acColor}}>← Volver a la carta</a>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0A0806',display:'flex',flexDirection:'column',alignItems:'center',padding:'28px 20px 60px',fontFamily:"'DM Sans',sans-serif"}}>
      {/* Header */}
      <div style={{textAlign:'center',marginBottom:24,width:'100%',maxWidth:400}}>
        <div style={{fontSize:36,marginBottom:8}}>{rest?.emoji||'🍽️'}</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:'#F5F0E8',marginBottom:4}}>{rest?.nombre||slug}</div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#4A6080',letterSpacing:1}}>
          {mesa&&mesa!==0?`MESA ${mesa} · `:'MOSTRADOR · '}#{String(id).slice(-4)}
        </div>
      </div>

      {/* Status card */}
      <div style={{width:'100%',maxWidth:400,background:'rgba(255,255,255,.04)',border:`1px solid ${isDone?'rgba(74,154,90,.3)':'rgba(255,255,255,.08)'}`,borderRadius:20,padding:'28px 24px',marginBottom:16,textAlign:'center'}}>
        {!isDone&&(
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(74,154,90,.1)',border:'1px solid rgba(74,154,90,.25)',borderRadius:20,padding:'4px 12px',marginBottom:18}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#4A9A5A',animation:'pulse 1.5s infinite'}}/>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'#4A9A5A',letterSpacing:1.5,fontWeight:700}}>EN VIVO</span>
          </div>
        )}
        <div style={{fontSize:54,marginBottom:12,lineHeight:1}}>{curStep.icon}</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:800,color:isDone?'#4A9A5A':acColor,marginBottom:6}}>{curStep.label}</div>
        <div style={{fontSize:13,color:'#7A8898',lineHeight:1.5}}>{curStep.sub}</div>
      </div>

      {/* Steps */}
      <div style={{width:'100%',maxWidth:400,display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
        {STEPS.map((s,i)=>{
          const done=i<=stepIdx; const active=i===stepIdx
          return(
            <div key={s.key} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:12,border:`1px solid ${active?'rgba(74,154,90,.35)':done?acColor+'25':'rgba(255,255,255,.06)'}`,background:active?'rgba(74,154,90,.07)':done?acColor+'08':'rgba(255,255,255,.02)',transition:'all .4s'}}>
              <span style={{fontSize:20,flexShrink:0,opacity:done?1:0.3}}>{s.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:active?'#4A9A5A':done?'#D8ECF8':'#3A4A5A'}}>{s.label}</div>
                <div style={{fontSize:11,color:active?'#4A7A50':'#3A4A5A',marginTop:1}}>{s.sub}</div>
              </div>
              <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:active?'#4A9A5A':done?acColor:'rgba(255,255,255,.08)',boxShadow:active?'0 0 10px #4A9A5A':'none',transition:'all .4s'}}/>
            </div>
          )
        })}
      </div>

      {/* Items */}
      {items.length>0&&(
        <div style={{width:'100%',maxWidth:400,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:16,padding:'14px 18px',marginBottom:20}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'#4A6080',letterSpacing:2,marginBottom:10}}>TU PEDIDO</div>
          {items.map((it,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<items.length-1?'1px solid rgba(255,255,255,.05)':'none',fontSize:13,color:'#D8ECF8'}}>
              <span>{it.cantidad}× {it.nombre}</span>
              {it.precio>0&&<span style={{color:acColor,fontWeight:700}}>$ {(it.precio*it.cantidad).toFixed(0)}</span>}
            </div>
          ))}
          {pedido?.total>0&&(
            <div style={{display:'flex',justifyContent:'space-between',paddingTop:10,marginTop:4,borderTop:'1px solid rgba(255,255,255,.08)',fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:acColor}}>
              <span>TOTAL</span><span>$ {pedido.total}</span>
            </div>
          )}
        </div>
      )}

      <a href={`/${slug}`} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#3A4A5A',letterSpacing:1,textDecoration:'none'}}>← Volver a la carta</a>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
