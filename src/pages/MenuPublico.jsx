import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, getRestaurante, getCategorias, getProductos } from '../lib/supabase.js'
import { INIT_LOCAL, INIT_CATS, INIT_PRODS } from '../MenuQR.jsx'
import MenuQR from '../MenuQR.jsx'

export default function MenuPublico({ vitrina = false }) {
  const { slug, mesa } = useParams()
  const [local, setLocal]   = useState(null)
  const [cats,  setCats]    = useState([])
  const [prods, setProds]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    load()
  }, [slug])

  async function load() {
    setLoading(true)
    setError(null)

    if (!supabase) {
      setLocal({ ...INIT_LOCAL, slug })
      setCats(INIT_CATS)
      setProds(INIT_PRODS)
      setLoading(false)
      return
    }

    try {
      const restaurante = await getRestaurante(slug)
      if (!restaurante) { setError('Restaurante no encontrado'); setLoading(false); return }
      if (!restaurante.activo) { setError('Este menu no esta disponible en este momento'); setLoading(false); return }

      const [categorias, productos] = await Promise.all([
        getCategorias(restaurante.id),
        getProductos(restaurante.id),
      ])

      setLocal({
        nombre:      restaurante.nombre,
        descripcion: restaurante.descripcion || '',
        direccion:   restaurante.direccion   || '',
        telefono:    restaurante.telefono    || '',
        email:       restaurante.email       || '',
        color:       restaurante.color       || '#C9A84C',
        mesas:       restaurante.mesas       || 10,
        restauranteId: restaurante.id,
        slug,
        mesa: mesa ? parseInt(mesa) : null,
        ...(restaurante.config || {}),
      })
      setCats(categorias.map(c => ({ id: c.id, label: c.label, icon: c.icon, activa: c.activa })))
      setProds(productos.map(p => ({
        id: p.id, cat: p.categoria_id, name: p.name,
        desc: p.desc, price: p.price, orig: p.orig,
        emoji: p.emoji, tag: p.tag, active: p.active, foto_url: p.foto_url,
      })))
    } catch (e) {
      setError('Error al cargar el menu')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{background:'#0A0806',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:48,height:48,border:'4px solid #2C2010',borderTopColor:'#C9A84C',borderRadius:'50%',animation:'spin .8s linear infinite'}}></div>
      <div style={{color:'#7A6A50',fontFamily:'Outfit,sans-serif'}}>Cargando menu...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{background:'#0A0806',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,padding:24}}>
      <div style={{fontSize:'3rem'}}>🍽️</div>
      <div style={{color:'#C8B898',fontFamily:'Outfit,sans-serif',fontSize:'1.1rem',textAlign:'center'}}>{error}</div>
      <div style={{color:'#5A4A30',fontFamily:'Outfit,sans-serif',fontSize:'.85rem'}}>/{slug}</div>
    </div>
  )

  return (
    <MenuQR
      local={local}   setLocal={setLocal}
      cats={cats}     setCats={setCats}
      prods={prods}   setProds={setProds}
      forceMode={vitrina ? "vitrina" : "client"}
      mesaInicial={mesa ? parseInt(mesa) : null}
    />
  )
}
