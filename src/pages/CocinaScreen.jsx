import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, getRestaurante, getPedidos, updatePedidoStatus, subscribePedidos } from '../lib/supabase.js'

const STATUSES = {
  nuevo:       { label: 'NUEVO',       color: '#FFB020', bg: 'rgba(255,176,32,.12)',  border: 'rgba(255,176,32,.3)'  },
  preparando:  { label: 'EN COCINA',   color: '#3D8EFF', bg: 'rgba(61,142,255,.12)',  border: 'rgba(61,142,255,.3)'  },
  listo:       { label: 'LISTO',       color: '#00FF88', bg: 'rgba(0,255,136,.12)',   border: 'rgba(0,255,136,.3)'   },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)  return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  return `${Math.floor(diff/3600)}h`
}

function OrderCard({ order, onStatusChange }) {
  const st = STATUSES[order.status] || STATUSES.nuevo
  const items = order.pedido_items || []
  const urgent = order.status === 'nuevo' && (Date.now() - new Date(order.created_at)) > 5 * 60 * 1000

  return (
    <div style={{
      background: st.bg,
      border: `2px solid ${urgent ? '#FF3B5C' : st.border}`,
      borderRadius: 16,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      animation: order._new ? 'popIn .3s ease' : 'none',
      boxShadow: urgent ? '0 0 20px rgba(255,59,92,.2)' : 'none',
      transition: 'border-color .3s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 800,
            color: st.color, lineHeight: 1,
          }}>#{order.numero || order.id?.slice(-4)}</span>
          {order.mesa && (
            <span style={{
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 8, padding: '3px 10px',
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#A0B8C8',
            }}>MESA {order.mesa}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
            color: urgent ? '#FF3B5C' : '#4A6080',
          }}>{timeAgo(order.created_at)}</span>
          <span style={{
            background: st.bg, border: `1px solid ${st.border}`,
            borderRadius: 20, padding: '3px 10px',
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 700,
            color: st.color, letterSpacing: 1,
          }}>{st.label}</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px',
            background: 'rgba(255,255,255,.04)',
            borderRadius: 8,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 800,
              color: '#D8ECF8', flexShrink: 0,
            }}>{item.cantidad}</span>
            <span style={{
              fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 600,
              color: '#D8ECF8', flex: 1,
            }}>{item.nombre}</span>
          </div>
        ))}
      </div>

      {/* Notas */}
      {order.notas && (
        <div style={{
          background: 'rgba(255,176,32,.08)', border: '1px solid rgba(255,176,32,.2)',
          borderRadius: 8, padding: '7px 10px',
          fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#FFB020',
          display: 'flex', gap: 6, alignItems: 'flex-start',
        }}>
          <span>📝</span><span>{order.notas}</span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        {order.status === 'nuevo' && (
          <button onClick={() => onStatusChange(order.id, 'preparando')} style={{
            flex: 1, padding: '10px 0',
            background: 'rgba(61,142,255,.15)', border: '1px solid rgba(61,142,255,.4)',
            borderRadius: 10, color: '#3D8EFF',
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700,
            cursor: 'pointer', letterSpacing: .5, transition: 'all .15s',
          }}>▶ TOMAR PEDIDO</button>
        )}
        {order.status === 'preparando' && (
          <button onClick={() => onStatusChange(order.id, 'listo')} style={{
            flex: 1, padding: '10px 0',
            background: 'rgba(0,255,136,.12)', border: '1px solid rgba(0,255,136,.35)',
            borderRadius: 10, color: '#00FF88',
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700,
            cursor: 'pointer', letterSpacing: .5, transition: 'all .15s',
          }}>✓ MARCAR LISTO</button>
        )}
        {order.status === 'listo' && (
          <div style={{
            flex: 1, padding: '10px 0', textAlign: 'center',
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#2A5040',
          }}>ENTREGADO</div>
        )}
      </div>
    </div>
  )
}

export default function CocinaScreen() {
  const { slug } = useParams()
  const [rest,    setRest]    = useState(null)
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [clock,   setClock]   = useState(new Date())
  const audioCtx  = useRef(null)

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Sonido para nuevos pedidos
  function playBeep() {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtx.current
      const pairs = [[660, 0, .1], [880, .15, .1], [660, .3, .08]]
      pairs.forEach(([freq, delay, dur]) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq; osc.type = 'sine'
        gain.gain.setValueAtTime(0, ctx.currentTime + delay)
        gain.gain.linearRampToValueAtTime(.4, ctx.currentTime + delay + .01)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + dur + .05)
      })
    } catch {}
  }

  useEffect(() => {
    if (!slug) return
    load()
  }, [slug])

  async function load() {
    setLoading(true)
    try {
      const restaurante = await getRestaurante(slug)
      if (!restaurante) { setError('Restaurante no encontrado'); setLoading(false); return }
      setRest(restaurante)

      // Pedidos de hoy
      const today = new Date().toISOString().split('T')[0]
      const data = await getPedidos(restaurante.id, today)
      const active = data.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
      setOrders(active)
      setLoading(false)

      // Suscribir realtime
      const unsub = subscribePedidos(
        restaurante.id,
        (newOrder) => {
          // Nuevo pedido
          playBeep()
          // Fetch con items
          supabase.from('pedidos').select('*, pedido_items(*)').eq('id', newOrder.id).single()
            .then(({ data }) => {
              if (data) setOrders(prev => [{ ...data, _new: true }, ...prev])
            })
        },
        (updated) => {
          // Pedido actualizado
          if (updated.status === 'entregado' || updated.status === 'cancelado') {
            setOrders(prev => prev.filter(o => o.id !== updated.id))
          } else {
            setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
          }
        }
      )
      return unsub
    } catch(e) {
      setError('Error al conectar')
      setLoading(false)
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    await updatePedidoStatus(orderId, newStatus)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  const nuevos     = orders.filter(o => o.status === 'nuevo')
  const preparando = orders.filter(o => o.status === 'preparando')
  const listos     = orders.filter(o => o.status === 'listo')

  if (loading) return (
    <div style={{ background: '#0d1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '4px solid #1c2128', borderTopColor: '#FFB020', borderRadius: '50%', animation: 'spin .8s linear infinite' }}></div>
      <div style={{ color: '#4A6080', fontFamily: "'Outfit',sans-serif" }}>Conectando cocina...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ background: '#0d1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24 }}>
      <div style={{ fontSize: '3rem' }}>👨‍🍳</div>
      <div style={{ color: '#FF3B5C', fontFamily: "'Outfit',sans-serif", fontSize: '1.1rem' }}>{error}</div>
      <div style={{ color: '#4A6080', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.85rem' }}>/{slug}/cocina</div>
    </div>
  )

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d1117; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes popIn { from { transform: scale(.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: #0d1117 }
        ::-webkit-scrollbar-thumb { background: #2a3441; border-radius: 2px }
      `}</style>

      {/* Header */}
      <div style={{
        background: '#161b22', borderBottom: '2px solid #2a3441',
        padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>👨‍🍳</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#D8ECF8' }}>COCINA</div>
            <div style={{ fontSize: '.75rem', color: '#4A6080', fontFamily: "'IBM Plex Mono',monospace" }}>{rest?.nombre || slug}</div>
          </div>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: 16 }}>
          {nuevos.length > 0 && (
            <div style={{
              background: 'rgba(255,59,92,.15)', border: '1px solid rgba(255,59,92,.4)',
              borderRadius: 20, padding: '4px 12px',
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#FF3B5C', fontWeight: 700,
              animation: 'pulse 1s infinite',
            }}>{nuevos.length} NUEVO{nuevos.length > 1 ? 'S' : ''}</div>
          )}
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 700, color: '#D8ECF8' }}>
            {clock.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 0,
        minHeight: 'calc(100vh - 64px)',
      }}>
        {/* NUEVOS */}
        <div style={{ borderRight: '1px solid #1c2128', padding: '16px 14px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            paddingBottom: 10, borderBottom: '1px solid #1c2128',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB020', boxShadow: '0 0 8px #FFB020' }}></div>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: '#FFB020', letterSpacing: 1 }}>NUEVOS</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#4A6080', marginLeft: 'auto' }}>{nuevos.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {nuevos.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#2a3441', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, paddingTop: 40 }}>
                Sin pedidos nuevos
              </div>
            ) : nuevos.map(o => (
              <OrderCard key={o.id} order={o} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>

        {/* EN COCINA */}
        <div style={{ borderRight: '1px solid #1c2128', padding: '16px 14px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            paddingBottom: 10, borderBottom: '1px solid #1c2128',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3D8EFF', boxShadow: '0 0 8px #3D8EFF' }}></div>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: '#3D8EFF', letterSpacing: 1 }}>EN COCINA</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#4A6080', marginLeft: 'auto' }}>{preparando.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {preparando.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#2a3441', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, paddingTop: 40 }}>
                Nada en preparacion
              </div>
            ) : preparando.map(o => (
              <OrderCard key={o.id} order={o} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>

        {/* LISTOS */}
        <div style={{ padding: '16px 14px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            paddingBottom: 10, borderBottom: '1px solid #1c2128',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 8px #00FF88' }}></div>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: '#00FF88', letterSpacing: 1 }}>LISTOS</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#4A6080', marginLeft: 'auto' }}>{listos.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listos.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#2a3441', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, paddingTop: 40 }}>
                Nada listo aun
              </div>
            ) : listos.map(o => (
              <OrderCard key={o.id} order={o} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
