import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, getRestaurante, getCategorias, getProductos } from '../lib/supabase.js'
import { INIT_LOCAL, INIT_CATS, INIT_PRODS, GS, ClientApp } from '../MenuQR.jsx'

export default function MenuPublico({ vitrina = false }) {
  const { slug, mesa } = useParams()
  const [local, setLocal]   = useState(null)
  const [cats,  setCats]    = useState([])
  const [prods, setProds]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => { load(true) }, [slug, mesa])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load(false) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [slug, mesa])

  async function load(showSpinner = true) {
    if (showSpinner) { setLoading(true); setError(null) }

    if (!supabase) {
      setLocal({ ...INIT_LOCAL, slug })
      setCats(INIT_CATS)
      setProds(INIT_PRODS)
      if (showSpinner) setLoading(false)
      return
    }

    try {
      const restaurante = await getRestaurante(slug)
      if (!restaurante) {
        if (showSpinner) { setError('Restaurante no encontrado'); setLoading(false) }
        return
      }
      if (!restaurante.activo) {
        if (showSpinner) { setError('Este menú no está disponible en este momento'); setLoading(false) }
        return
      }

      const [categorias, productos] = await Promise.all([
        getCategorias(restaurante.id),
        getProductos(restaurante.id),
      ])

      setLocal({
        nombre:        restaurante.nombre,
        descripcion:   restaurante.descripcion   || '',
        direccion:     restaurante.direccion     || '',
        telefono:      restaurante.telefono      || '',
        email:         restaurante.email         || '',
        color:         restaurante.color         || '#C9A84C',
        mesas:         restaurante.mesas         || 10,
        logo_url:      restaurante.logo_url      || '',
        restauranteId: restaurante.id,
        slug,
        mesa: mesa ? parseInt(mesa) : null,
        delivery_config: restaurante.delivery_config || null,
        metodos_pago:    restaurante.metodos_pago    || ["efectivo","tarjeta","mercadopago"],
        alias_pago:      restaurante.alias_pago      || restaurante.mp_alias || "",
        alias_titular:   restaurante.alias_titular   || "",
        mp_alias:        restaurante.mp_alias        || restaurante.alias_pago || "",
        mp_mostrar_alias: !!(restaurante.mp_mostrar_alias || (restaurante.mp_alias && restaurante.mp_alias.length > 0)),
        wifi_ssid:       restaurante.wifi_ssid       || "",
        wifi_pass:       restaurante.wifi_pass        || "",
        pausa_pedidos:   restaurante.pausa_pedidos   || false,
        delivery_habilitado: restaurante.delivery_habilitado || false,
        delivery_precio: restaurante.delivery_precio || 0,
        delivery_horario: restaurante.delivery_horario || "",
        promo_desc:      restaurante.promo_desc      || "",
        whatsapp_vitrina_numero: restaurante.telefono || "",
        ...(restaurante.config || {}),
      })
      setCats(categorias.map(c => ({ id: c.id, label: c.label, icon: c.icon, activa: c.activa })))
      setProds(productos.map(p => ({
        id:        p.id,
        cat:       p.categoria_id,
        categoria_id: p.categoria_id,
        name:      p.nombre  || p.name  || "",
        nombre:    p.nombre  || p.name  || "",
        desc:      p.descripcion || p.desc || "",
        descripcion: p.descripcion || p.desc || "",
        price:     p.precio  || p.price  || 0,
        precio:    p.precio  || p.price  || 0,
        orig:      p.orig    || null,
        emoji:     p.emoji   || null,
        tag:       p.tag     || null,
        active:    p.activo  ?? p.active ?? true,
        activo:    p.activo  ?? p.active ?? true,
        imagen:    p.imagen  || p.foto_url || null,
        foto_url:  p.foto_url || p.imagen  || null,
        sin_stock: p.sin_stock || false,
      })))
    } catch (e) {
      if (showSpinner) setError('Error al cargar el menú')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  if (loading) return (
    <div style={{background:'#011A16',minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',flexDirection:'column',gap:16}}>
      <GS/>
      <div style={{width:48,height:48,border:'4px solid #0A5C50',
        borderTopColor:'#C9A84C',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <div style={{color:'#7AC4B8',fontFamily:'Outfit,sans-serif'}}>Cargando menú...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{background:'#011A16',minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',flexDirection:'column',gap:16,padding:24}}>
      <GS/>
      <div style={{fontSize:'3rem'}}>🍽️</div>
      <div style={{color:'#A8D4CF',fontFamily:'Outfit,sans-serif',fontSize:'1.1rem',
        textAlign:'center'}}>{error}</div>
      <div style={{color:'#0A5C50',fontFamily:'Outfit,sans-serif',fontSize:'.85rem'}}>/{slug}</div>
    </div>
  )

  // Render ClientApp directly — no auth check needed for public menu
  return (
    <>
      <GS/>
      <ClientApp
        local={local}
        cats={cats}
        prods={prods}
        vitrina={vitrina}
        sinPedidos={!!local?.feat_sin_pedidos}
      />
    </>
  )
}
