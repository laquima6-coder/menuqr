/* eslint-disable */
// GASTRO AI — Agente Claude Sonnet con tool_use real
// Experto en negocios gastronómicos, diseño de cartas, marketing, costos, tendencias

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const SB_URL = process.env.SUPABASE_URL || 'https://fwovflsaghnutysjyaus.supabase.co'
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3b3ZmbHNhZ2hudXR5c2p5YXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2NzQ3NSwiZXhwIjoyMDk2MjQzNDc1fQ.EEtIVeMFSPt3xgIBy0aPm0O1IRPFOp7zpKZRSET7Otw'

// ── Supabase helper ─────────────────────────────────────────────────────────
async function sb(method, path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const txt = await r.text()
  try { return { ok: r.ok, status: r.status, data: JSON.parse(txt) } }
  catch { return { ok: r.ok, status: r.status, data: txt } }
}

// ── Normalizer ───────────────────────────────────────────────────────────────
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// ── Patch product helper (sync bilingual columns) ───────────────────────────
async function patchProd(id, patch) {
  const p = {}
  if (patch.precio      != null) { p.precio = patch.precio; p.price = patch.precio }
  if (patch.nombre      != null) { p.nombre = patch.nombre; p.name  = patch.nombre }
  if (patch.descripcion != null) { p.descripcion = patch.descripcion; p.desc = patch.descripcion }
  if (patch.sin_stock   != null)  p.sin_stock = patch.sin_stock
  if (patch.activo      != null) { p.activo = patch.activo; p.active = patch.activo }
  if (patch.foto_url    != null) { p.foto_url = patch.foto_url; p.imagen = patch.foto_url }
  if (patch.precio_original != null) p.precio_original = patch.precio_original
  if (patch.categoria_id != null) p.categoria_id = patch.categoria_id
  return sb('PATCH', `productos?id=eq.${id}`, p)
}

// ── Money formatter ──────────────────────────────────────────────────────────
function money(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

// ══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS (lo que Claude puede usar)
// ══════════════════════════════════════════════════════════════════════════════
const TOOLS = [
  {
    name: 'buscar_web',
    description: 'Buscar información actualizada en internet: tendencias gastronómicas, precios de mercado, ideas de platos, estrategias de marketing, normativas, competencia, etc. Usar cuando el usuario pide info externa o actual.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Qué buscar (en español o inglés)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_imagenes_comida',
    description: 'Obtener URLs de imágenes profesionales de comida/platos para usar en la carta del restaurante. Devuelve URLs listas para asignar a productos.',
    input_schema: {
      type: 'object',
      properties: {
        plato: { type: 'string', description: 'Nombre del plato en inglés (ej: "beef tenderloin", "margherita pizza", "chocolate mousse")' },
        cantidad: { type: 'number', description: 'Cuántas opciones traer (1-6)', default: 3 },
      },
      required: ['plato'],
    },
  },
  {
    name: 'ver_carta_completa',
    description: 'Ver todos los productos del menú del restaurante con precios, categorías, estado de stock.',
    input_schema: {
      type: 'object',
      properties: {
        restaurante_id: { type: 'string' },
      },
      required: ['restaurante_id'],
    },
  },
  {
    name: 'ver_estadisticas',
    description: 'Ver pedidos, ventas, productos más vendidos y estadísticas del restaurante para el período indicado.',
    input_schema: {
      type: 'object',
      properties: {
        restaurante_id: { type: 'string' },
        periodo: { type: 'string', enum: ['hoy', 'semana', 'mes'], description: 'Período a analizar' },
      },
      required: ['restaurante_id', 'periodo'],
    },
  },
  {
    name: 'actualizar_producto',
    description: 'Actualizar campos de un producto del menú: precio, nombre, descripción, foto, stock, visibilidad.',
    input_schema: {
      type: 'object',
      properties: {
        producto_id: { type: 'string', description: 'ID del producto a actualizar' },
        cambios: {
          type: 'object',
          description: 'Campos a cambiar',
          properties: {
            nombre:      { type: 'string' },
            descripcion: { type: 'string' },
            precio:      { type: 'number' },
            foto_url:    { type: 'string' },
            sin_stock:   { type: 'boolean' },
            activo:      { type: 'boolean' },
            precio_original: { type: 'number' },
          },
        },
      },
      required: ['producto_id', 'cambios'],
    },
  },
  {
    name: 'crear_producto',
    description: 'Crear un nuevo producto/plato en la carta del restaurante.',
    input_schema: {
      type: 'object',
      properties: {
        restaurante_id: { type: 'string' },
        nombre:      { type: 'string', description: 'Nombre del plato' },
        descripcion: { type: 'string', description: 'Descripción atractiva del plato' },
        precio:      { type: 'number', description: 'Precio en pesos' },
        foto_url:    { type: 'string', description: 'URL de imagen del plato (opcional)' },
        categoria_id: { type: 'string', description: 'ID de la categoría (opcional)' },
      },
      required: ['restaurante_id', 'nombre', 'precio'],
    },
  },
  {
    name: 'actualizar_restaurante',
    description: 'Actualizar configuración del restaurante: color, wifi, delivery, descripción, pausa de pedidos.',
    input_schema: {
      type: 'object',
      properties: {
        restaurante_id: { type: 'string' },
        cambios: {
          type: 'object',
          properties: {
            color:          { type: 'string', description: 'Color hex ej: #FF5722' },
            descripcion:    { type: 'string' },
            wifi_ssid:      { type: 'string' },
            wifi_pass:      { type: 'string' },
            pausa_pedidos:  { type: 'boolean' },
            delivery_precio: { type: 'number' },
            delivery_habilitado: { type: 'boolean' },
          },
        },
      },
      required: ['restaurante_id', 'cambios'],
    },
  },
  {
    name: 'aplicar_descuento_masivo',
    description: 'Aplicar o revertir un % de descuento/aumento en todos los productos o en una categoría específica.',
    input_schema: {
      type: 'object',
      properties: {
        restaurante_id: { type: 'string' },
        tipo:           { type: 'string', enum: ['subir', 'bajar'], description: 'Subir o bajar precios' },
        porcentaje:     { type: 'number', description: 'Porcentaje (ej: 10 para 10%)' },
        categoria_id:   { type: 'string', description: 'Si se quiere aplicar solo a una categoría (opcional)' },
      },
      required: ['restaurante_id', 'tipo', 'porcentaje'],
    },
  },
  {
    name: 'disenar_carta_sugerida',
    description: 'Generar una propuesta completa de carta/menú optimizada con categorías, nombres de platos, descripciones y precios sugeridos basados en el tipo de restaurante y mercado local.',
    input_schema: {
      type: 'object',
      properties: {
        tipo_restaurante: { type: 'string', description: 'Tipo de restaurante (ej: parrilla argentina, cafetería, pizzería, sushi, etc.)' },
        rango_precio:     { type: 'string', enum: ['economico', 'medio', 'premium'], description: 'Rango de precios objetivo' },
        estilo:           { type: 'string', description: 'Estilo o concepto del local (ej: familiar, gourmet, rápido, romántico)' },
        carta_actual:     { type: 'string', description: 'Resumen de la carta actual si hay (opcional)' },
      },
      required: ['tipo_restaurante', 'rango_precio'],
    },
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// IMPLEMENTACIÓN DE CADA TOOL
// ══════════════════════════════════════════════════════════════════════════════
async function runTool(name, input, context) {
  const { restaurante_id, productos, categorias } = context

  switch (name) {

    // ── BUSCAR WEB ──────────────────────────────────────────────────────────
    case 'buscar_web': {
      try {
        const q = encodeURIComponent(input.query)
        const r = await fetch(
          `https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1&t=menuqr`,
          { headers: { 'User-Agent': 'MenuQR-GastroAI/1.0' } }
        )
        const d = await r.json()
        const results = []

        if (d.Abstract && d.Abstract.length > 30) {
          results.push({
            titulo: d.Heading || 'Resumen',
            texto: d.Abstract,
            url: d.AbstractURL || '',
            fuente: d.AbstractSource || '',
          })
        }
        ;(d.RelatedTopics || []).slice(0, 6).forEach(t => {
          if (t.Text && t.Text.length > 20) {
            results.push({
              titulo: t.Text.split(' - ')[0].slice(0, 80),
              texto: t.Text,
              url: t.FirstURL || '',
            })
          }
        })
        ;(d.Results || []).slice(0, 3).forEach(t => {
          if (t.Text) {
            results.push({ titulo: t.Title || '', texto: t.Text, url: t.FirstURL || '' })
          }
        })

        if (results.length === 0) {
          return {
            aviso: 'Búsqueda sin resultados directos en DuckDuckGo.',
            sugerencia: `Respondé con conocimiento propio sobre: "${input.query}"`,
          }
        }
        return { query: input.query, resultados: results }
      } catch (e) {
        return { error: 'No se pudo conectar con el motor de búsqueda.', query: input.query }
      }
    }

    // ── BUSCAR IMÁGENES ─────────────────────────────────────────────────────
    case 'buscar_imagenes_comida': {
      const cant = Math.min(input.cantidad || 3, 6)
      const slug = encodeURIComponent(input.plato.toLowerCase().replace(/\s+/g, '-'))
      // Unsplash source CDN — no API key needed, returns high-quality food photos
      const imagenes = Array.from({ length: cant }, (_, i) => ({
        url: `https://source.unsplash.com/800x600/?${encodeURIComponent(input.plato + ' food photography')}&sig=${i + Date.now()}`,
        descripcion: `Foto de ${input.plato} #${i + 1}`,
        fuente: 'Unsplash',
        lista_para_usar: true,
      }))
      // También agregar algunas URLs conocidas de alta calidad para platos comunes
      const FOTO_MAP = {
        pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85&auto=format&fit=crop',
        burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=85&auto=format&fit=crop',
        hamburguesa: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=85&auto=format&fit=crop',
        pasta: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=85&auto=format&fit=crop',
        steak: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800&q=85&auto=format&fit=crop',
        beef: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800&q=85&auto=format&fit=crop',
        sushi: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=85&auto=format&fit=crop',
        salmon: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=85&auto=format&fit=crop',
        salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=85&auto=format&fit=crop',
        coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=85&auto=format&fit=crop',
        cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=85&auto=format&fit=crop',
        chocolate: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=85&auto=format&fit=crop',
        ice_cream: 'https://images.unsplash.com/photo-1560008581-09826d1de69e?w=800&q=85&auto=format&fit=crop',
        croissant: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=85&auto=format&fit=crop',
        empanada: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=800&q=85&auto=format&fit=crop',
        tacos: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=85&auto=format&fit=crop',
        wine: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=85&auto=format&fit=crop',
        beer: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=85&auto=format&fit=crop',
        cheesecake: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=85&auto=format&fit=crop',
        brownie: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=85&auto=format&fit=crop',
        flan: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=85&auto=format&fit=crop',
        soup: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=85&auto=format&fit=crop',
        sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=85&auto=format&fit=crop',
        waffles: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=85&auto=format&fit=crop',
        pancakes: 'https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?w=800&q=85&auto=format&fit=crop',
        tiramisu: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=85&auto=format&fit=crop',
        chicken: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=800&q=85&auto=format&fit=crop',
        fish: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&q=85&auto=format&fit=crop',
        risotto: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=85&auto=format&fit=crop',
        nachos: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800&q=85&auto=format&fit=crop',
        wrap: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=85&auto=format&fit=crop',
      }

      const platoLow = input.plato.toLowerCase()
      const match = Object.entries(FOTO_MAP).find(([k]) => platoLow.includes(k))
      const fijas = match
        ? [{ url: match[1], descripcion: `${input.plato} — foto curada`, fuente: 'Unsplash curada', lista_para_usar: true, recomendada: true }]
        : []

      return {
        plato: input.plato,
        imagenes: [...fijas, ...imagenes.slice(0, cant - fijas.length)],
        instruccion: 'Usá el campo foto_url del producto para asignar la URL elegida.',
      }
    }

    // ── VER CARTA ───────────────────────────────────────────────────────────
    case 'ver_carta_completa': {
      // Usamos el contexto ya enviado (evita Supabase calls extra)
      const prods = (productos || []).map(p => ({
        id: p.id,
        nombre: p.nombre || p.name || '—',
        descripcion: p.descripcion || p.desc || '',
        precio: p.precio || p.price || 0,
        activo: p.activo ?? p.active ?? true,
        sin_stock: !!p.sin_stock,
        foto: !!(p.foto_url || p.imagen),
        categoria_id: p.categoria_id,
        precio_original: p.precio_original || null,
      }))
      const cats = (categorias || []).map(c => ({
        id: c.id,
        nombre: c.label || c.nombre,
        cantidad: prods.filter(p => p.categoria_id === c.id).length,
      }))
      return {
        total_productos: prods.length,
        activos: prods.filter(p => p.activo).length,
        sin_stock: prods.filter(p => p.sin_stock).length,
        sin_foto: prods.filter(p => !p.foto).length,
        categorias: cats,
        productos: prods,
      }
    }

    // ── VER ESTADÍSTICAS ────────────────────────────────────────────────────
    case 'ver_estadisticas': {
      const rid = input.restaurante_id || restaurante_id
      const desde = new Date()
      if (input.periodo === 'mes')    desde.setMonth(desde.getMonth() - 1)
      else if (input.periodo === 'semana') desde.setDate(desde.getDate() - 7)
      else desde.setHours(0, 0, 0, 0)

      const pedRes = await sb('GET', `pedidos?restaurante_id=eq.${rid}&created_at=gte.${desde.toISOString()}&select=id,total,status,created_at,mesa_numero,metodo_pago&order=created_at.desc`)
      const peds = pedRes.data || []

      if (peds.length === 0) {
        return { periodo: input.periodo, mensaje: 'Sin pedidos en este período.' }
      }

      const pedIds = peds.map(p => p.id)
      const itemRes = await sb('GET', `pedido_items?pedido_id=in.(${pedIds.join(',')})&select=nombre,cantidad,precio,pedido_id`)
      const items = itemRes.data || []

      const ranking = {}
      items.forEach(i => {
        if (!ranking[i.nombre]) ranking[i.nombre] = { nombre: i.nombre, unidades: 0, ingresos: 0 }
        ranking[i.nombre].unidades += (i.cantidad || 1)
        ranking[i.nombre].ingresos += (i.precio || 0) * (i.cantidad || 1)
      })
      const top = Object.values(ranking).sort((a, b) => b.unidades - a.unidades).slice(0, 8)

      const facturacion = peds.reduce((s, p) => s + (p.total || 0), 0)
      const metodos = {}
      peds.forEach(p => { metodos[p.metodo_pago || 'no_especificado'] = (metodos[p.metodo_pago || 'no_especificado'] || 0) + 1 })

      return {
        periodo: input.periodo,
        total_pedidos: peds.length,
        facturacion_total: facturacion,
        ticket_promedio: Math.round(facturacion / peds.length),
        metodos_de_pago: metodos,
        top_productos: top,
        pedidos_recientes: peds.slice(0, 5).map(p => ({
          mesa: p.mesa_numero,
          total: p.total,
          status: p.status,
          hora: new Date(p.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        })),
      }
    }

    // ── ACTUALIZAR PRODUCTO ─────────────────────────────────────────────────
    case 'actualizar_producto': {
      const res = await patchProd(input.producto_id, input.cambios)
      if (!res.ok) return { error: 'Error al actualizar', detalle: res.data }
      const cambioDesc = Object.entries(input.cambios)
        .map(([k, v]) => {
          if (k === 'precio') return `precio → ${money(v)}`
          if (k === 'activo') return v ? 'visible en carta' : 'oculto de carta'
          if (k === 'sin_stock') return v ? 'marcado sin stock' : 'stock repuesto'
          if (k === 'foto_url') return 'foto actualizada'
          if (k === 'nombre') return `renombrado a "${v}"`
          if (k === 'descripcion') return `descripción actualizada`
          return `${k}: ${v}`
        })
        .join(', ')
      return { success: true, cambios_aplicados: cambioDesc, needsReload: true }
    }

    // ── CREAR PRODUCTO ──────────────────────────────────────────────────────
    case 'crear_producto': {
      const { restaurante_id: rid2, ...datos } = input
      const res = await sb('POST', 'productos', {
        restaurante_id: rid2 || restaurante_id,
        nombre: datos.nombre,
        name: datos.nombre,
        descripcion: datos.descripcion || '',
        desc: datos.descripcion || '',
        precio: datos.precio,
        price: datos.precio,
        activo: true,
        active: true,
        sin_stock: false,
        foto_url: datos.foto_url || null,
        imagen: datos.foto_url || null,
        categoria_id: datos.categoria_id || null,
      })
      if (!res.ok) return { error: 'Error al crear el producto', detalle: res.data }
      return { success: true, producto_creado: datos.nombre, precio: money(datos.precio), needsReload: true }
    }

    // ── ACTUALIZAR RESTAURANTE ──────────────────────────────────────────────
    case 'actualizar_restaurante': {
      const rid = input.restaurante_id || restaurante_id
      const res = await sb('PATCH', `restaurantes?id=eq.${rid}`, input.cambios)
      if (!res.ok) return { error: 'Error al actualizar restaurante', detalle: res.data }
      return { success: true, cambios: input.cambios, needsReload: true }
    }

    // ── DESCUENTO MASIVO ────────────────────────────────────────────────────
    case 'aplicar_descuento_masivo': {
      const rid = input.restaurante_id || restaurante_id
      const prodRes = await sb('GET', `productos?restaurante_id=eq.${rid}&select=id,precio,price,precio_original`)
      const prods2 = (prodRes.data || []).filter(p =>
        !input.categoria_id || p.categoria_id === input.categoria_id
      )
      let actualizado = 0
      for (const p of prods2) {
        const base = p.precio_original || p.precio || p.price || 0
        const factor = input.tipo === 'subir' ? (1 + input.porcentaje / 100) : (1 - input.porcentaje / 100)
        const np = Math.round(base * factor)
        if (np > 0) {
          await patchProd(p.id, {
            precio: np,
            precio_original: input.tipo === 'bajar' ? base : null,
          })
          actualizado++
        }
      }
      return {
        success: true,
        productos_actualizados: actualizado,
        accion: `${input.tipo === 'subir' ? 'Subido' : 'Bajado'} ${input.porcentaje}% en ${actualizado} productos`,
        needsReload: true,
      }
    }

    // ── DISEÑAR CARTA ───────────────────────────────────────────────────────
    case 'disenar_carta_sugerida': {
      // Este tool devuelve data para que Claude genere la propuesta
      const precios = {
        economico: { entrada: '800-1500', principal: '2000-4000', postre: '800-1500', bebida: '500-1200' },
        medio:     { entrada: '1500-3000', principal: '4000-8000', postre: '1500-3000', bebida: '800-2500' },
        premium:   { entrada: '3000-6000', principal: '8000-18000', postre: '2500-5000', bebida: '2000-6000' },
      }
      return {
        tipo_restaurante: input.tipo_restaurante,
        rango_precio: input.rango_precio,
        estilo: input.estilo || 'moderno',
        rangos_de_precios_sugeridos: precios[input.rango_precio] || precios.medio,
        carta_actual: input.carta_actual || 'no proporcionada',
        instruccion_para_claude: 'Generá una propuesta completa de carta con 4-6 categorías, 3-5 platos por categoría, con nombres creativos, descripciones que venden (emoción + ingredientes clave) y precios dentro del rango indicado. Incluí tips de menu engineering: estrella, vaca, perro y puzzle.',
      }
    }

    default:
      return { error: `Tool "${name}" no implementado.` }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Experto gastronómico
// ══════════════════════════════════════════════════════════════════════════════
function buildSystemPrompt(restaurantName, restaurante_id, productos, categorias) {
  const cartaResumen = (productos || []).slice(0, 50).map(p => {
    const n = p.nombre || p.name || '—'
    const pr = p.precio || p.price || 0
    const flags = [p.sin_stock && '⚠️SinStock', !(p.activo ?? p.active ?? true) && '🚫Oculto'].filter(Boolean).join(' ')
    return `  • ${n} — ${money(pr)}${flags ? ' ' + flags : ''}`
  }).join('\n')
  const catsResumen = (categorias || []).map(c => c.label || c.nombre).join(', ')

  return `Sos GASTRO AI, el asistente inteligente de MenuQR para el restaurante "${restaurantName || 'este restaurante'}".

Tenés experiencia de 20 años en:
• Ingeniería de menús y psicología de precios (menu engineering: platos estrella, vaca, puzzle, perro)
• Marketing gastronómico: redes sociales, promos, fidelización, branding
• Gestión de costos: food cost, margen, punto de equilibrio
• Tendencias del mercado gastronómico (global y argentina)
• Diseño de cartas que maximizan ventas: categorías, nombres, descripciones, presentación
• Estrategias de delivery y takeaway
• Gestión operativa: stock, personal, horarios
• Fotografía y presentación de platos

CARTA ACTUAL DE ESTE RESTAURANTE (${(productos || []).length} productos):
${cartaResumen || '  (sin productos cargados aún)'}

CATEGORÍAS: ${catsResumen || '(sin categorías)'}
RESTAURANTE ID: ${restaurante_id || 'no disponible'}

CAPACIDADES:
✅ Podés buscar en internet para dar info actualizada
✅ Podés buscar y asignar fotos a los productos
✅ Podés ver estadísticas y ventas en tiempo real
✅ Podés actualizar precios, nombres, descripciones, fotos, stock
✅ Podés crear nuevos productos en la carta
✅ Podés diseñar cartas completas y optimizadas
✅ Podés hacer cambios masivos (descuentos, aumentos)
✅ Podés pausar/reanudar pedidos y configurar el local

ESTILO DE RESPUESTA:
• Español rioplatense, tuteo, directo y concreto
• Máximo 5 líneas para respuestas simples
• Cuando hacés cambios, confirmás qué hiciste
• Si necesitás más info del usuario antes de actuar, preguntá
• Nunca inventés estadísticas — usá la tool para datos reales`
}

// ══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    messages = [],
    restaurantName,
    restaurantId,
    context = {},
  } = req.body

  if (!messages.length) return res.status(400).json({ error: 'Se requieren mensajes' })
  if (!ANTHROPIC_KEY)   return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' })

  const productos   = context.productos   || []
  const categorias  = context.categorias  || []
  const restaurante_id = restaurantId || ''

  const systemPrompt = buildSystemPrompt(restaurantName, restaurante_id, productos, categorias)

  // ── Agentic loop: hasta 8 iteraciones ──────────────────────────────────────
  // Sanitizar: la API de Anthropic requiere que el primer msg sea 'user'
  let msgs = messages
    .map(m => ({ role: m.role, content: m.content || m.text || '' }))
    .filter(m => m.role === 'user' || m.role === 'assistant')
  // Eliminar mensajes 'assistant' al inicio hasta encontrar el primer 'user'
  while (msgs.length > 0 && msgs[0].role === 'assistant') msgs.shift()
  if (msgs.length === 0) return res.status(400).json({ error: 'Se requiere al menos un mensaje de usuario' })
  let needsReload = false
  let herramientasUsadas = []
  const MAX_ITER = 4

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let claudeRes
    try {
      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          tools: TOOLS,
          messages: msgs,
        }),
      })
      if (!apiRes.ok) {
        const errText = await apiRes.text()
        console.error('Claude API error:', apiRes.status, errText)
        return res.status(500).json({ error: `Error de Claude API: ${apiRes.status}`, detalle: errText })
      }
      claudeRes = await apiRes.json()
    } catch (e) {
      console.error('Fetch error:', e.message)
      return res.status(500).json({ error: 'Error de red al llamar a Claude', detalle: e.message })
    }

    // Si Claude terminó (no hay tool_use) → devolver respuesta final
    const toolUseBlocks = (claudeRes.content || []).filter(b => b.type === 'tool_use')
    const textBlock     = (claudeRes.content || []).find(b => b.type === 'text')

    if (claudeRes.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      return res.status(200).json({
        content: textBlock?.text || '¿En qué más te puedo ayudar?',
        needsReload,
        herramientas_usadas: herramientasUsadas,
      })
    }

    // Ejecutar tools en paralelo
    const toolResults = await Promise.all(
      toolUseBlocks.map(async block => {
        herramientasUsadas.push(block.name)
        const resultado = await runTool(block.name, block.input, {
          restaurante_id,
          productos,
          categorias,
        })
        if (resultado.needsReload) needsReload = true
        return {
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(resultado),
        }
      })
    )

    // Agregar respuesta de Claude + resultados de tools a los mensajes
    msgs = [
      ...msgs,
      { role: 'assistant', content: claudeRes.content },
      { role: 'user',      content: toolResults },
    ]
  }

  // Si se agotaron las iteraciones
  return res.status(200).json({
    content: 'Procesé tu solicitud. ¿Hay algo más en lo que pueda ayudarte?',
    needsReload,
    herramientas_usadas: herramientasUsadas,
  })
}
