import { createClient } from '@supabase/supabase-js'

// ── Estas variables van en el archivo .env
// Cuando tengas tu proyecto de Supabase creado,
// reemplazá estos valores con los tuyos
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || ''
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Cliente de Supabase
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// ── HELPERS DE BASE DE DATOS ──────────────────

/* RESTAURANTE */
export const getRestaurante = async (slug) => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) { console.error('getRestaurante:', error); return null }
  return data
}

export const updateRestaurante = async (id, updates) => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('restaurantes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('updateRestaurante:', error); return null }
  return data
}

/* CATEGORÍAS */
export const getCategorias = async (restauranteId) => {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('restaurante_id', restauranteId)
    .order('orden')
  if (error) { console.error('getCategorias:', error); return [] }
  return data
}

export const upsertCategoria = async (categoria) => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('categorias')
    .upsert(categoria)
    .select()
    .single()
  if (error) { console.error('upsertCategoria:', error); return null }
  return data
}

export const deleteCategoria = async (id) => {
  if (!supabase) return false
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteCategoria:', error); return false }
  return true
}

/* PRODUCTOS */
export const getProductos = async (restauranteId) => {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('restaurante_id', restauranteId)
    .order('orden')
  if (error) { console.error('getProductos:', error); return [] }
  return data
}

export const upsertProducto = async (producto) => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('productos')
    .upsert(producto)
    .select()
    .single()
  if (error) { console.error('upsertProducto:', error); return null }
  return data
}

export const deleteProducto = async (id) => {
  if (!supabase) return false
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteProducto:', error); return false }
  return true
}

export const toggleProducto = async (id, activo) => {
  if (!supabase) return false
  const { error } = await supabase
    .from('productos')
    .update({ activo })
    .eq('id', id)
  if (error) { console.error('toggleProducto:', error); return false }
  return true
}

/* PEDIDOS */
export const createPedido = async (pedido, items) => {
  if (!supabase) return null
  // Insertar pedido
  const { data: pedidoData, error: pedidoError } = await supabase
    .from('pedidos')
    .insert(pedido)
    .select()
    .single()
  if (pedidoError) { console.error('createPedido:', pedidoError); return null }

  // Insertar items del pedido
  const pedidoItems = items.map(item => ({
    pedido_id:   pedidoData.id,
    producto_id: item.id,
    nombre:      item.name,
    precio:      item.price * 100, // en centavos
    cantidad:    item.qty,
  }))
  const { error: itemsError } = await supabase
    .from('pedido_items')
    .insert(pedidoItems)
  if (itemsError) { console.error('createPedido items:', itemsError) }

  return pedidoData
}

export const getPedidos = async (restauranteId, fecha) => {
  if (!supabase) return []
  let query = supabase
    .from('pedidos')
    .select('*, pedido_items(*)')
    .eq('restaurante_id', restauranteId)
    .order('created_at', { ascending: false })
  if (fecha) {
    query = query.gte('created_at', `${fecha}T00:00:00`)
                 .lte('created_at', `${fecha}T23:59:59`)
  }
  const { data, error } = await query
  if (error) { console.error('getPedidos:', error); return [] }
  return data
}

export const updatePedidoStatus = async (id, status) => {
  if (!supabase) return false
  const { error } = await supabase
    .from('pedidos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) { console.error('updatePedidoStatus:', error); return false }
  return true
}

/* REALTIME — pedidos en tiempo real */
export const subscribePedidos = (restauranteId, onNew, onUpdate) => {
  if (!supabase) return () => {}

  const channel = supabase
    .channel(`pedidos-${restauranteId}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'pedidos',
      filter: `restaurante_id=eq.${restauranteId}`,
    }, payload => onNew?.(payload.new))
    .on('postgres_changes', {
      event:  'UPDATE',
      schema: 'public',
      table:  'pedidos',
      filter: `restaurante_id=eq.${restauranteId}`,
    }, payload => onUpdate?.(payload.new))
    .subscribe()

  // Retorna función para desuscribirse
  return () => supabase.removeChannel(channel)
}

/* CAJA — turnos */
export const createTurno = async (turno) => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('turnos_caja')
    .insert(turno)
    .select()
    .single()
  if (error) { console.error('createTurno:', error); return null }
  return data
}

export const closeTurno = async (id, arqueoFinal, horaCierre) => {
  if (!supabase) return false
  const { error } = await supabase
    .from('turnos_caja')
    .update({ arqueo_cierre: arqueoFinal, hora_cierre: horaCierre, estado: 'cerrado' })
    .eq('id', id)
  if (error) { console.error('closeTurno:', error); return false }
  return true
}

export const getTurnos = async (restauranteId) => {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('turnos_caja')
    .select('*')
    .eq('restaurante_id', restauranteId)
    .order('hora_apertura', { ascending: false })
    .limit(10)
  if (error) { console.error('getTurnos:', error); return [] }
  return data
}

/* AUTH */
export const loginAdmin = async (email, password) => {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const logoutAdmin = async () => {
  if (!supabase) return
  await supabase.auth.signOut()
}

export const getSession = async () => {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
