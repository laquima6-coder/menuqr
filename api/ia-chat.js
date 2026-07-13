// PLUS IA — Agente completo PedidosQR
/* eslint-disable */

const SB_URL = process.env.SUPABASE_URL || 'https://fwovflsaghnutysjyaus.supabase.co'
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3b3ZmbHNhZ2hudXR5c2p5YXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2NzQ3NSwiZXhwIjoyMDk2MjQzNDc1fQ.EEtIVeMFSPt3xgIBy0aPm0O1IRPFOp7zpKZRSET7Otw'

const COLORS = {
  rojo:'#E53E3E',roja:'#E53E3E',azul:'#3182CE',verde:'#38A169',naranja:'#DD6B20',
  purpura:'#805AD5',violeta:'#805AD5',morado:'#805AD5',dorado:'#C9A84C',gold:'#C9A84C',
  amarillo:'#D69E2E',rosa:'#D53F8C',turquesa:'#0D9488',celeste:'#0284C7',
  negro:'#1A202C',blanco:'#F7FAFC',gris:'#718096',bordeaux:'#9B2335',bordo:'#9B2335',
}

const RECETAS = {
  // CARNES
  'bife de chorizo': {
    porciones: 1,
    ingredientes: ['300g bife de chorizo','sal gruesa','pimienta negra','aceite de oliva','chimichurri (opcional)'],
    pasos: [
      'Sacar la carne de la heladera 30 min antes de cocinar.',
      'Secar bien con papel. Salar generosamente de ambos lados.',
      'Calentar plancha o parrilla al máximo 5 minutos.',
      'Cocinar 3-4 min por lado para punto jugoso, 5-6 min para bien cocido.',
      'Dejar reposar 3 min antes de cortar. Servir con chimichurri.'
    ],
    tip: 'No presionar la carne al cocinar — pierde jugos.'
  },
  'milanesa': {
    porciones: 4,
    ingredientes: ['4 bifes finos de nalga (150g c/u)','2 huevos','pan rallado','ajo y perejil picado','sal y pimienta','aceite para freir'],
    pasos: [
      'Golpear los bifes para tiernizarlos. Salpimentar.',
      'Mezclar huevos con ajo, perejil, sal y pimienta.',
      'Pasar los bifes por huevo y luego por pan rallado. Presionar bien.',
      'Freir en aceite caliente (170°C) 2-3 min por lado hasta dorar.',
      'Escurrir en papel de cocina. Servir inmediatamente.'
    ],
    tip: 'Para más crocante: empanizar, refrigerar 30 min y volver a empanizar.'
  },
  'asado': {
    porciones: 6,
    ingredientes: ['2kg tira de asado','sal gruesa','carbón o leña'],
    pasos: [
      'Prender el fuego con anticipación — necesita brasas bien rojas, sin llamas.',
      'Colocar la carne con el hueso hacia abajo a altura media.',
      'Salar con sal gruesa al momento de poner.',
      'Cocinar sin dar vuelta 45-60 min hasta que los huesos blanqueen.',
      'Dar vuelta y cocinar 20-30 min más hasta dorar la parte carnosa.',
      'Retirar y dejar reposar 5 min antes de cortar.'
    ],
    tip: 'El secreto es paciencia: fuego suave y constante, nunca llama directa.'
  },
  'empanadas': {
    porciones: 24,
    ingredientes: ['Tapas para empanadas x24','500g carne picada','2 cebollas grandes','2 cebollas de verdeo','2 huevos duros','aceitunas verdes','1 cdita pimentón dulce','1 cdita comino','sal y pimienta','aceite'],
    pasos: [
      'Sofreir la cebolla en aceite hasta transparente. Agregar verdeo.',
      'Añadir carne picada, romper bien. Cocinar 10 min.',
      'Condimentar con pimentón, comino, sal y pimienta. Enfriar.',
      'Mezclar con huevo duro picado y aceitunas en rodajas.',
      'Rellenar tapas, doblar y repasar el borde. Pintar con huevo.',
      'Horno 200°C por 20 min hasta dorar.'
    ],
    tip: 'El relleno tiene que estar frío para que la empanada no se abra.'
  },
  // PASTAS
  'ravioles': {
    porciones: 4,
    ingredientes: ['Masa: 400g harina 0000, 4 huevos, sal, oliva','Relleno: 500g ricota, 1 huevo, nuez moscada, sal, pimienta','Salsa: manteca, salvia, parmesano rallado'],
    pasos: [
      'Masa: mezclar harina con huevos y sal hasta lisa. Descansar 30 min cubierta.',
      'Relleno: mezclar ricota, huevo, nuez moscada, sal y pimienta.',
      'Estirar masa muy fina (2mm). Colocar bolitas de relleno cada 4cm.',
      'Cubrir con otra capa de masa. Cortar con ruedita o cuchillo.',
      'Hervir en agua con sal 3-4 min hasta que floten.',
      'Saltear manteca con salvia. Escurrir ravioles y terminar en la sartén.',
      'Servir con parmesano rallado abundante.'
    ],
    tip: 'Sellar bien los bordes presionando para que no se abran al hervir.'
  },
  'tallarines al pesto': {
    porciones: 4,
    ingredientes: ['400g fideos tallarines','2 tazas albahaca fresca','50g piñones o nueces','2 dientes ajo','80ml aceite de oliva','50g parmesano rallado','sal y pimienta'],
    pasos: [
      'Procesar albahaca, ajo y frutos secos hasta picar fino.',
      'Agregar aceite de oliva en hilo mientras procesa.',
      'Incorporar parmesano, salpimentar. Reservar.',
      'Hervir tallarines al dente según indicación del paquete.',
      'Escurrir reservando 1/2 taza del agua de cocción.',
      'Mezclar pasta con pesto, agregar agua de cocción si se necesita soltura.'
    ],
    tip: 'No calentar el pesto — se oscurece. Mezclar con la pasta fuera del fuego.'
  },
  // POSTRES
  'flan': {
    porciones: 8,
    ingredientes: ['Caramelo: 150g azúcar, 3 cdas agua','Flan: 1 litro leche, 6 huevos, 200g azúcar, 1 cdita esencia vainilla'],
    pasos: [
      'Caramelo: derretir azúcar con agua a fuego medio sin revolver hasta ámbar dorado.',
      'Verter rápido en budinera y girar para cubrir fondo y laterales.',
      'Flan: calentar leche sin hervir. Batir huevos con azúcar y vainilla.',
      'Mezclar leche tibia con los huevos. Colar y verter sobre el caramelo.',
      'Cocinar a baño María: horno 160°C por 60-75 min hasta que no tiemble el centro.',
      'Enfriar completamente. Desmoldar sobre fuente con borde para contener caramelo.'
    ],
    tip: 'Probar con palillo: si sale limpio, está listo. Mejor de un día para el otro.'
  },
  'panqueques': {
    porciones: 12,
    ingredientes: ['200g harina','2 huevos','500ml leche','1 cda manteca derretida','pizca de sal','1 cda azúcar (opcional)'],
    pasos: [
      'Mezclar harina, sal y azúcar. Hacer un hueco en el centro.',
      'Agregar huevos y leche de a poco mezclando sin grumos. Agregar manteca.',
      'Dejar reposar la masa 30 min.',
      'Calentar sartén antiadherente con manteca a fuego medio.',
      'Verter 1 cucharón de masa, inclinar para cubrir toda la base.',
      'Cocinar 1-2 min hasta que los bordes se despegan. Dar vuelta 30 seg.'
    ],
    tip: 'El primer panqueque siempre se descarta — sirve para calibrar el fuego.'
  },
  'alfajores': {
    porciones: 20,
    ingredientes: ['Tapas: 300g maicena, 100g harina, 150g manteca, 100g azúcar impalpable, 3 yemas, 1 cdita polvo hornear, esencia vainilla','Relleno: 400g dulce de leche repostero','Cobertura: coco rallado o chocolate'],
    pasos: [
      'Batir manteca con azúcar hasta cremar. Agregar yemas y vainilla.',
      'Tamizar maicena, harina y polvo. Unir con la mezcla hasta masa tierna.',
      'Estirar 5mm. Cortar círculos de 5cm. Refrigerar 30 min.',
      'Hornear 160°C por 12-15 min — tienen que quedar blancos, no dorados.',
      'Enfriar completamente. Rellenar con dulce de leche generoso.',
      'Unir dos tapas, presionar suave. Pasar los bordes por coco o bañar en chocolate.'
    ],
    tip: 'La maicena es el secreto del alfajor que se deshace en la boca.'
  },
  'torta de chocolate': {
    porciones: 10,
    ingredientes: ['200g chocolate negro','200g manteca','4 huevos','200g azúcar','150g harina','1 cdita polvo hornear','pizca de sal','Ganache: 200g chocolate, 200ml crema'],
    pasos: [
      'Derretir chocolate con manteca a baño María. Enfriar.',
      'Batir huevos con azúcar hasta espumar. Incorporar chocolate.',
      'Agregar harina tamizada con polvo y sal. Mezclar suave.',
      'Volcar en molde 22cm enmantecado. Hornear 170°C por 35-40 min.',
      'Ganache: calentar crema sin hervir, volcar sobre chocolate picado. Mezclar.',
      'Cubrir la torta fría con ganache. Dejar enfriar 1 hora.'
    ],
    tip: 'Usar chocolate 70% cacao para un sabor más intenso y menos dulce.'
  },
  'churros': {
    porciones: 20,
    ingredientes: ['250ml agua','100g manteca','1 cdita sal','1 cda azúcar','200g harina','2 huevos','aceite para freir','azúcar y canela para espolvorear'],
    pasos: [
      'Hervir agua con manteca, sal y azúcar. Retirar del fuego.',
      'Agregar harina de golpe y mezclar vigorosamente hasta que se despegue de los bordes.',
      'Enfriar un poco. Incorporar huevos de a uno, batiendo bien.',
      'Poner en manga con boquilla estrella.',
      'Freir en aceite a 170°C, formando tiras de 12cm. Dorar de ambos lados.',
      'Escurrir y pasar por azúcar con canela. Servir con chocolate caliente.'
    ],
    tip: 'El aceite tiene que estar a temperatura exacta — si humea, está muy caliente.'
  },
  'medialunas': {
    porciones: 16,
    ingredientes: ['500g harina 000','50g azúcar','10g sal','25g levadura fresca','250ml leche tibia','200g manteca','2 huevos','Almíbar: 100g azúcar, 100ml agua'],
    pasos: [
      'Disolver levadura en leche tibia con azúcar. Dejar espumar 10 min.',
      'Mezclar harina con sal. Agregar levadura, 1 huevo y unir hasta masa lisa.',
      'Dejar levar 1 hora tapado.',
      'Estirar en rectángulo fino. Distribuir manteca en pomada. Doblar y refrigerar 30 min.',
      'Repetir 3 veces. Estirar final, cortar triángulos. Enrollar desde la base.',
      'Curvar en forma de media luna. Dejar levar 45 min. Pintar con huevo.',
      'Hornear 190°C 15-18 min. Pintar con almíbar caliente al salir.'
    ],
    tip: 'El secreto es el frío entre vuelta y vuelta para que la manteca no se derrita.'
  },
  'helado de dulce de leche': {
    porciones: 8,
    ingredientes: ['500ml crema de leche','200g dulce de leche','4 yemas','100g azúcar','1 cdita esencia vainilla'],
    pasos: [
      'Batir yemas con azúcar hasta blanquear.',
      'Calentar 250ml crema sin hervir. Volcar sobre yemas batiendo.',
      'Cocinar a fuego bajo revolviendo hasta espesar (crema inglesa). Enfriar.',
      'Batir los otros 250ml de crema a punto firme.',
      'Mezclar crema inglesa con dulce de leche. Incorporar crema batida con movimientos envolventes.',
      'Verter en recipiente. Congelar 2 horas, mezclar con tenedor. Repetir 2 veces.',
      'Congelar 4 horas más hasta firme.'
    ],
    tip: 'Mezclar durante el congelado rompe los cristales de hielo — textura más cremosa.'
  },
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function findReceta(msg) {
  const n = norm(msg)
  for (const [key, receta] of Object.entries(RECETAS)) {
    if (n.includes(norm(key))) return { nombre: key, ...receta }
  }
  return null
}

function formatReceta(r) {
  let out = `## Receta: ${r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1)}\n`
  if (r.porciones) out += `*Rinde ${r.porciones} porciones*\n\n`
  out += `**Ingredientes:**\n${r.ingredientes.map(i => `• ${i}`).join('\n')}\n\n`
  out += `**Preparación:**\n${r.pasos.map((p, i) => `${i+1}. ${p}`).join('\n')}\n`
  if (r.tip) out += `\n💡 **Tip:** ${r.tip}`
  return out
}

async function sbReq(method, path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const txt = await r.text()
  try { return { ok: r.ok, status: r.status, data: JSON.parse(txt) } }
  catch { return { ok: r.ok, status: r.status, data: txt } }
}

function findProd(name, products) {
  const n = norm(name)
  return products.find(p => norm(p.nombre || p.name) === n)
    || products.find(p => norm(p.nombre || p.name).includes(n))
    || products.find(p => n.includes(norm(p.nombre || p.name).split(' ')[0]) && norm(p.nombre || p.name).split(' ')[0].length > 3)
    || null
}

function money(n) { return '$' + Number(n).toLocaleString('es-AR') }

async function patchProd(id, patch) {
  const p = {}
  if (patch.precio      != null) { p.precio = patch.precio; p.price = patch.precio }
  if (patch.nombre      != null) { p.nombre = patch.nombre; p.name  = patch.nombre }
  if (patch.descripcion != null) { p.descripcion = patch.descripcion; p['desc'] = patch.descripcion }
  if (patch.sin_stock   != null) { p.sin_stock = patch.sin_stock }
  if (patch.activo      != null) { p.activo = patch.activo; p.active = patch.activo }
  if (patch.foto_url    != null) { p.foto_url = patch.foto_url }
  if (patch.precio_original != null) { p.precio_original = patch.precio_original }
  return sbReq('PATCH', `productos?id=eq.${id}`, p)
}

async function patchRest(id, patch) {
  return sbReq('PATCH', `restaurantes?id=eq.${id}`, patch)
}

async function getRestConfig(id) {
  const r = await sbReq('GET', `restaurantes?id=eq.${id}&select=config,color`)
  return r.data?.[0] || {}
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages = [], restaurantName, restaurantId, context = {} } = req.body
  const lastMsg  = messages.filter(m => m.role === 'user').pop()?.content || ''
  const products = context.productos  || []
  const cats     = context.categorias || []
  const msg      = norm(lastMsg)
  const raw      = lastMsg

  let content = ''
  let needsReload = false
  const actions = []

  // ══ 0. RECETAS ══════════════════════════════════════════════
  if (!content) {
    const esReceta = /receta|como\s+(?:hago|hac[eé]r?|prepar[ao]|cocin[ao])|preparaci[oó]n\s+de|ingredientes\s+(?:de|para)/i.test(raw)
    if (esReceta) {
      const receta = findReceta(msg)
      if (receta) {
        content = formatReceta(receta)
      } else {
        const disponibles = Object.keys(RECETAS).join(', ')
        content = `No tengo esa receta todavía. Recetas disponibles:\n${disponibles.split(', ').map(r => `• ${r}`).join('\n')}`
      }
    }
  }

  // ══ 1. CAMBIAR PRECIO ═══════════════════════════════════════
  if (!content) {
    const pats = [
      /(?:cambi[aáe]|modific[aáe]|actualiz[aáe])(?:me|le)?\s+(?:el\s+)?precio\s+(?:de[l]?(?:\s+los?)?\s+)?(.+?)\s+(?:a|en|por|ponele)\s+\$?\s*([\d.,]+)/i,
      /(?:precio|costo)\s+(?:de[l]?(?:\s+los?)?\s+)?(.+?)\s+(?:a|=)\s+\$?\s*([\d.,]+)/i,
      /(?:pon[eé]le|pone|pon)\s+\$?\s*([\d.,]+)\s+(?:a[l]?\s+)?(?:(?:los?|las?)\s+)?(.+)/i,
      /(.+?)\s+(?:ponele|precio|vale|cuesta|a)\s+\$?\s*([\d.,]+)/i,
    ]
    for (const pat of pats) {
      const m = raw.match(pat)
      if (m) {
        // pattern 3 has reversed groups (price first, then product)
        const isReversed = pat.source.startsWith('(?:pon')
        const prodStr = isReversed ? m[2] : m[1]
        const priceStr = isReversed ? m[1] : m[2]
        const newP = parseFloat(priceStr.replace(/\./g,'').replace(',','.'))
        const prod = findProd(prodStr.trim(), products)
        if (prod && newP > 0) {
          await patchProd(prod.id, { precio: newP })
          actions.push({ type: 'price_update' })
          needsReload = true
          content = `Precio de **${prod.nombre||prod.name}** actualizado a ${money(newP)}. Ya está en la carta.`
        } else if (!prod) {
          content = `No encontré "${prodStr.trim()}". Productos:\n${products.slice(0,8).map(p=>`• ${p.nombre||p.name}`).join('\n')}`
        }
        break
      }
    }
  }


  // ══ 1b. CAMBIAR FOTO/IMAGEN ════════════════════════════════
  if (!content) {
    const mPhoto = raw.match(/(?:cambi[aáe]|pon[eé]|actualiz[aáe])\s+(?:la\s+)?(?:foto|imagen|image|photo)\s+(?:de[l]?(?:\s+los?)?\s+)?(.+)/i)
    if (mPhoto) {
      const prodStr = mPhoto[1].replace(/\s+(?:con|por|a)\s+.+$/i,'').trim()
      const prod = findProd(prodStr, products)
      if (prod) {
        // Map product to best Unsplash photo
        // ── FOTO_MAP ── 30+ fotos por categoría ──────────────────────
        // Cada key es una palabra clave que puede aparecer en el nombre del producto
        const FOTO_MAP = {
          // ── CARNES ──
          'bife':             'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&q=80&auto=format&fit=crop',
          'entrecot':         'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&q=80&auto=format&fit=crop',
          'lomo':             'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&q=80&auto=format&fit=crop',
          'vacío':            'https://images.unsplash.com/photo-1548940740-204726a19be3?w=600&q=80&auto=format&fit=crop',
          'vacio':            'https://images.unsplash.com/photo-1548940740-204726a19be3?w=600&q=80&auto=format&fit=crop',
          'asado':            'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80&auto=format&fit=crop',
          'parrilla':         'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80&auto=format&fit=crop',
          'costilla':         'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80&auto=format&fit=crop',
          'chorizo':          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80&auto=format&fit=crop',
          'morcilla':         'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80&auto=format&fit=crop',
          'bondiola':         'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&q=80&auto=format&fit=crop',

          // ── MILANESA ──
          'milanesa':         'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=600&q=80&auto=format&fit=crop',
          'suprema':          'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80&auto=format&fit=crop',
          'napolitana':       'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=600&q=80&auto=format&fit=crop',

          // ── POLLO ──
          'pollo':            'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=600&q=80&auto=format&fit=crop',
          'pechuga':          'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80&auto=format&fit=crop',

          // ── PASTAS ──
          'raviole':          'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80&auto=format&fit=crop',
          'ravioli':          'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80&auto=format&fit=crop',
          'pasta':            'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80&auto=format&fit=crop',
          'spaghetti':        'https://images.unsplash.com/photo-1551183053-bf91798d047e?w=600&q=80&auto=format&fit=crop',
          'spaguetti':        'https://images.unsplash.com/photo-1551183053-bf91798d047e?w=600&q=80&auto=format&fit=crop',
          'tallar':           'https://images.unsplash.com/photo-1551183053-bf91798d047e?w=600&q=80&auto=format&fit=crop',
          'fideo':            'https://images.unsplash.com/photo-1551183053-bf91798d047e?w=600&q=80&auto=format&fit=crop',
          'ñoqui':            'https://images.unsplash.com/photo-1563379236017-4eec2ebf9cfe?w=600&q=80&auto=format&fit=crop',
          'gnochi':           'https://images.unsplash.com/photo-1563379236017-4eec2ebf9cfe?w=600&q=80&auto=format&fit=crop',
          'lasaña':           'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&q=80&auto=format&fit=crop',
          'lasagna':          'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&q=80&auto=format&fit=crop',
          'canelone':         'https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=600&q=80&auto=format&fit=crop',

          // ── PIZZA ──
          'pizza':            'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80&auto=format&fit=crop',
          'fugazza':          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&auto=format&fit=crop',
          'muzarella':        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80&auto=format&fit=crop',

          // ── HAMBURGUESAS ──
          'hamburguesa':      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format&fit=crop',
          'burger':           'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format&fit=crop',
          'smash':            'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80&auto=format&fit=crop',

          // ── SÁNDWICHES ──
          'sandwich':         'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80&auto=format&fit=crop',
          'sánguche':         'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80&auto=format&fit=crop',
          'sanguche':         'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80&auto=format&fit=crop',
          'pancho':           'https://images.unsplash.com/photo-1597933051710-d2e5f4b3f58b?w=600&q=80&auto=format&fit=crop',
          'hotdog':           'https://images.unsplash.com/photo-1597933051710-d2e5f4b3f58b?w=600&q=80&auto=format&fit=crop',
          'wrap':             'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80&auto=format&fit=crop',
          'taco':             'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&auto=format&fit=crop',

          // ── EMPANADAS ──
          'empanada':         'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80&auto=format&fit=crop',

          // ── PESCADOS / SUSHI ──
          'salmon':           'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80&auto=format&fit=crop',
          'salmón':           'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80&auto=format&fit=crop',
          'pescado':          'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=600&q=80&auto=format&fit=crop',
          'trucha':           'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80&auto=format&fit=crop',
          'sushi':            'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&q=80&auto=format&fit=crop',
          'roll':             'https://images.unsplash.com/photo-1617196034183-421b4040d20d?w=600&q=80&auto=format&fit=crop',

          // ── ENSALADAS ──
          'ensalada':         'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80&auto=format&fit=crop',
          'cesar':            'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&q=80&auto=format&fit=crop',
          'caprese':          'https://images.unsplash.com/photo-1608032364895-84f4f5a98e7d?w=600&q=80&auto=format&fit=crop',

          // ── SOPAS / GUISOS ──
          'sopa':             'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80&auto=format&fit=crop',
          'locro':            'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80&auto=format&fit=crop',
          'guiso':            'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80&auto=format&fit=crop',

          // ── POSTRES ──
          'flan':             'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80&auto=format&fit=crop',
          'torta':            'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80&auto=format&fit=crop',
          'cake':             'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80&auto=format&fit=crop',
          'cheesecake':       'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80&auto=format&fit=crop',
          'helado':           'https://images.unsplash.com/photo-1560008581-09826d1de69e?w=600&q=80&auto=format&fit=crop',
          'ice cream':        'https://images.unsplash.com/photo-1560008581-09826d1de69e?w=600&q=80&auto=format&fit=crop',
          'alfajor':          'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80&auto=format&fit=crop',
          'brownie':          'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80&auto=format&fit=crop',
          'mousse':           'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=600&q=80&auto=format&fit=crop',
          'tiramisu':         'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80&auto=format&fit=crop',
          'tiramisú':         'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80&auto=format&fit=crop',
          'churro':           'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&q=80&auto=format&fit=crop',
          'postre':           'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80&auto=format&fit=crop',
          'chocolate':        'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600&q=80&auto=format&fit=crop',

          // ── PANADERÍA / DESAYUNO ──
          'medialuna':        'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&q=80&auto=format&fit=crop',
          'croissant':        'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&q=80&auto=format&fit=crop',
          'facturas':         'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&q=80&auto=format&fit=crop',
          'tostada':          'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80&auto=format&fit=crop',
          'pan':              'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80&auto=format&fit=crop',
          'waffles':          'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&q=80&auto=format&fit=crop',
          'pancake':          'https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?w=600&q=80&auto=format&fit=crop',

          // ── BEBIDAS ──
          'café':             'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop',
          'cafe':             'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop',
          'cortado':          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop',
          'latte':            'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=80&auto=format&fit=crop',
          'capuccino':        'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=80&auto=format&fit=crop',
          'cappuccino':       'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=80&auto=format&fit=crop',
          'té':               'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=600&q=80&auto=format&fit=crop',
          'te ':              'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=600&q=80&auto=format&fit=crop',
          'mate':             'https://images.unsplash.com/photo-1589209773573-b3f7e7ef3a9e?w=600&q=80&auto=format&fit=crop',
          'cerveza':          'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&auto=format&fit=crop',
          'birra':            'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&auto=format&fit=crop',
          'vino':             'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80&auto=format&fit=crop',
          'champagne':        'https://images.unsplash.com/photo-1504474298436-f5f5f85a4695?w=600&q=80&auto=format&fit=crop',
          'agua':             'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80&auto=format&fit=crop',
          'gaseosa':          'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80&auto=format&fit=crop',
          'coca':             'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80&auto=format&fit=crop',
          'jugo':             'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80&auto=format&fit=crop',
          'limonada':         'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&q=80&auto=format&fit=crop',
          'smoothie':         'https://images.unsplash.com/photo-1553530666-ba11a90bb099?w=600&q=80&auto=format&fit=crop',
          'milkshake':        'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&auto=format&fit=crop',
        }
        const prodNorm = norm(prod.nombre||prod.name)
        let photoUrl = null
        for (const [key, url] of Object.entries(FOTO_MAP)) {
          if (prodNorm.includes(norm(key))) { photoUrl = url; break }
        }
        if (photoUrl) {
          await patchProd(prod.id, { foto_url: photoUrl, imagen: photoUrl })
          actions.push({ type: 'foto_update' })
          needsReload = true
          content = `✅ Foto de **${prod.nombre||prod.name}** actualizada.`
        } else {
          content = `No tengo una foto predefinida para ese plato. Podés pegarme una URL de imagen directamente, ej: "Cambiá la foto de [producto] a https://..."`
        }
      } else {
        content = `No encontré "${prodStr}" para cambiar la foto.`
      }
    }
  }

  // ══ 2. DESCUENTO % ══════════════════════════════════════════
  if (!content) {
    const m = raw.match(/(\d+)\s*%\s*(?:de\s+)?(?:descuento|off|rebaj[ae])\s+(?:[a-z]+\s+)?(.+)/i)
           || raw.match(/(?:aplic[aáe]|hac[eé]|pon[eé])\s+(?:un\s+)?(\d+)\s*%\s*(?:de\s+)?(?:descuento|off)\s+(?:[a-z]+\s+)?(.+)/i)
    if (m) {
      const pct  = parseInt(m[1])
      const prod = findProd(m[2].trim(), products)
      if (prod) {
        const orig = prod.precio || prod.price || 0
        const np   = Math.round(orig * (1 - pct/100))
        await patchProd(prod.id, { precio: np, precio_original: orig })
        actions.push({ type: 'discount' })
        needsReload = true
        content = `${pct}% de descuento en **${prod.nombre||prod.name}**.\n${money(orig)} → **${money(np)}**. Precio original guardado.`
      } else {
        content = `No encontré "${m[2].trim()}".`
      }
    }
  }

  // ══ 3. SUBIR PRECIO % ═══════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:sub[ií]|increment[aáe]|aument[aáe])\s+(?:el\s+precio\s+de\s+)?(?:(?:la|el)\s+)?(.+?)\s+(?:en|un)\s+(\d+)\s*%/i)
    if (m) {
      const prod = findProd(m[1].trim(), products)
      const pct  = parseInt(m[2])
      if (prod) {
        const orig = prod.precio || prod.price || 0
        const np   = Math.round(orig * (1 + pct/100))
        await patchProd(prod.id, { precio: np })
        actions.push({ type: 'price_increase' })
        needsReload = true
        content = `Precio de **${prod.nombre||prod.name}** subido ${pct}%.\n${money(orig)} → **${money(np)}**.`
      } else {
        content = `No encontré "${m[1].trim()}".`
      }
    }
  }

  // ══ 4. REVERTIR DESCUENTO ═══════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:revert[ií]|quit[aáe]|sac[aáe])\s+(?:el\s+)?descuento\s+(?:de[l]?\s+)?(?:(?:la|el)\s+)?(.+)/i)
    if (m) {
      const prod = findProd(m[1].trim(), products)
      if (prod && (prod.precio_original || 0) > 0) {
        await patchProd(prod.id, { precio: prod.precio_original, precio_original: 0 })
        actions.push({ type: 'revert_discount' })
        needsReload = true
        content = `Descuento revertido en **${prod.nombre||prod.name}**. Precio vuelve a ${money(prod.precio_original)}.`
      } else if (!prod) {
        content = `No encontré "${m[1].trim()}".`
      } else {
        content = `**${prod.nombre||prod.name}** no tiene descuento activo.`
      }
    }
  }

  // ══ 5. SIN STOCK ════════════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:marc[aáe]|pon[eé]|marc[aáe])\s+(?:(?:la|el)\s+)?(.+?)\s+(?:sin\s+stock|agotad[ao]|no\s+hay)/i)
           || (msg.includes('sin stock') || msg.includes('agotado') || msg.includes('no hay')) && raw.match(/(.+?)\s+(?:sin\s+stock|agotad|no\s+hay)/i)
    if (m) {
      const prod = findProd(m[1].trim(), products)
      if (prod) {
        await patchProd(prod.id, { sin_stock: true })
        actions.push({ type: 'sin_stock' })
        needsReload = true
        content = `**${prod.nombre||prod.name}** marcado sin stock. Aparece en la carta pero no se puede pedir.`
      } else {
        content = `No encontré "${m[1].trim()}".`
      }
    }
  }

  // ══ 6. REPONER STOCK ════════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:repon[eé]|hay|tenemos|llegó|lleg[oó]|agreg[aáe])\s+(?:(?:la|el)\s+)?(.+)/i)
           || raw.match(/(.+?)\s+(?:con\s+stock|disponible|repuesto)/i)
    if (m && (msg.includes('stock') || msg.includes('hay ') || msg.includes('llegó') || msg.includes('disponible'))) {
      const prod = findProd(m[1].trim(), products)
      if (prod && prod.sin_stock) {
        await patchProd(prod.id, { sin_stock: false })
        actions.push({ type: 'restock' })
        needsReload = true
        content = `**${prod.nombre||prod.name}** vuelve a estar disponible.`
      }
    }
  }

  // ══ 7. OCULTAR PRODUCTO ═════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:ocult[aáe]|desactiv[aáe]|escond[eé])\s+(?:(?:la|el)\s+)?(.+)/i)
    if (m) {
      const prod = findProd(m[1].trim(), products)
      if (prod) {
        await patchProd(prod.id, { activo: false })
        actions.push({ type: 'hide' })
        needsReload = true
        content = `**${prod.nombre||prod.name}** ocultado de la carta.`
      } else {
        content = `No encontré "${m[1].trim()}".`
      }
    }
  }

  // ══ 8. MOSTRAR PRODUCTO ═════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:mostr[aáe]|activ[aáe]|vuelv[eé])\s+(?:a\s+)?(?:(?:la|el)\s+)?(.+)/i)
    if (m) {
      const prod = findProd(m[1].trim(), products)
      if (prod && !prod.activo) {
        await patchProd(prod.id, { activo: true })
        actions.push({ type: 'show' })
        needsReload = true
        content = `**${prod.nombre||prod.name}** visible en la carta otra vez.`
      }
    }
  }

  // ══ 9. RENOMBRAR PRODUCTO ═══════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:cambi[aáe]|renombr[aáe])\s+(?:el\s+nombre\s+de\s+)?(?:(?:la|el)\s+)?(.+?)\s+(?:a|por|como)\s+["']?(.+?)["']?$/i)
    if (m) {
      const prod = findProd(m[1].trim(), products)
      if (prod) {
        await patchProd(prod.id, { nombre: m[2].trim() })
        actions.push({ type: 'rename' })
        needsReload = true
        content = `Nombre cambiado: **${prod.nombre||prod.name}** → **${m[2].trim()}**.`
      }
    }
  }

  // ══ 10. PAUSAR PEDIDOS ══════════════════════════════════════
  if (!content) {
    if (/paus[aáe]\s+pedidos|cerr[aáe]\s+pedidos|no\s+aceptar\s+pedidos/i.test(raw)) {
      if (restaurantId) {
        await patchRest(restaurantId, { pausa_pedidos: true })
        actions.push({ type: 'pause_orders' })
        content = `Pedidos pausados. Los clientes ven la carta pero no pueden hacer pedidos hasta que los reactives.`
      }
    }
  }

  // ══ 11. REANUDAR PEDIDOS ════════════════════════════════════
  if (!content) {
    if (/reanudar?\s+pedidos|abr[ií]\s+pedidos|activar?\s+pedidos|acepta[rn]\s+pedidos/i.test(raw)) {
      if (restaurantId) {
        await patchRest(restaurantId, { pausa_pedidos: false })
        actions.push({ type: 'resume_orders' })
        content = `Pedidos reactivados. Los clientes ya pueden pedir.`
      }
    }
  }

  // ══ 12. CAMBIAR COLOR ═══════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:cambi[aáe]|pon[eé]|us[aáe])\s+(?:el\s+)?color\s+(?:a\s+|en\s+)?(\w+)/i)
           || raw.match(/color\s+(\w+)/i)
    if (m) {
      const colorName = norm(m[1])
      const hex = COLORS[colorName] || (m[1].startsWith('#') ? m[1] : null)
      if (hex && restaurantId) {
        await patchRest(restaurantId, { color: hex })
        actions.push({ type: 'color_change' })
        content = `Color cambiado a **${m[1]}** (${hex}). La carta ya se ve con el nuevo color.`
      } else {
        content = `No conozco ese color. Colores disponibles: ${Object.keys(COLORS).join(', ')}.`
      }
    }
  }

  // ══ 13. QR PROMO ════════════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:pon[eé]|agreg[aáe]|configur[aáe])\s+(?:un\s+)?(?:banner|promo|qr\s+promo|anuncio)[:\s]+(.+)/i)
    if (m) {
      const texto = m[1].trim()
      if (restaurantId) {
        const current = await getRestConfig(restaurantId)
        const newConfig = { ...(current.config || {}), qr_promo: { activo: true, texto, emoji: '🎉' } }
        await patchRest(restaurantId, { config: newConfig })
        actions.push({ type: 'qr_promo' })
        content = `Banner QR activado: "${texto}". Los clientes lo verán al escanear el QR.`
      }
    }
  }

  // ══ 14. QUITAR QR PROMO ═════════════════════════════════════
  if (!content) {
    if (/quit[aáe]\s+(?:el\s+)?(?:banner|promo)|desactiv[aáe]\s+(?:el\s+)?(?:qr\s+promo|banner)/i.test(raw)) {
      if (restaurantId) {
        const current = await getRestConfig(restaurantId)
        const newConfig = { ...(current.config || {}), qr_promo: { activo: false } }
        await patchRest(restaurantId, { config: newConfig })
        actions.push({ type: 'qr_promo_remove' })
        content = `Banner QR desactivado.`
      }
    }
  }

  // ══ 15. WIFI ════════════════════════════════════════════════
  if (!content) {
    const m = raw.match(/wifi[:\s]+(?:red\s+)?["']?(.+?)["']?\s+(?:y\s+)?(?:contrase[nñ]a|clave|pass)[:\s]+["']?(.+?)["']?$/i)
    if (m && restaurantId) {
      await patchRest(restaurantId, { wifi_ssid: m[1].trim(), wifi_pass: m[2].trim() })
      actions.push({ type: 'wifi' })
      content = `WiFi configurado.\nRed: **${m[1].trim()}** · Clave: **${m[2].trim()}**`
    }
  }

  // ══ 16. DELIVERY PRECIO ═════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:delivery|env[ií]o)\s+(?:a\s+)?\$?\s*([\d.,]+)/i)
    if (m && restaurantId) {
      const precio = parseFloat(m[1].replace(/\./g,'').replace(',','.'))
      await patchRest(restaurantId, { delivery_precio: precio })
      actions.push({ type: 'delivery_price' })
      content = `Costo de delivery actualizado a ${money(precio)}.`
    }
  }

  // ══ 17. DESCRIPCIÓN RESTAURANTE ══════════════════════════════
  if (!content) {
    const m = raw.match(/(?:descripci[oó]n|descripcion|sobre\s+nosotros|bienvenida)[:\s]+(.+)/i)
    if (m && restaurantId) {
      const desc = m[1].trim()
      await patchRest(restaurantId, { descripcion: desc })
      actions.push({ type: 'description' })
      content = `Descripción del restaurante actualizada: "${desc}"`
    }
  }

  // ══ 18. ESTADÍSTICAS ════════════════════════════════════════
  if (!content) {
    if (/estad[ií]sticas|cu[aá]ntos\s+productos|resumen|stats/i.test(raw)) {
      const total   = products.length
      const activos = products.filter(p => p.activo !== false).length
      const sinStock = products.filter(p => p.sin_stock).length
      const precios = products.map(p => p.precio || p.price || 0).filter(Boolean)
      const avg     = precios.length ? Math.round(precios.reduce((a,b)=>a+b,0)/precios.length) : 0
      content = `**${restaurantName || 'Tu restaurante'}**\n• Productos totales: ${total}\n• Activos: ${activos}\n• Sin stock: ${sinStock}\n• Precio promedio: ${money(avg)}\n• Categorías: ${cats.length}`
    }
  }

  // ══ 19. LISTAR CARTA ════════════════════════════════════════
  if (!content) {
    if (/(?:list[aáe]|most[raáe]|qu[eé]\s+(?:hay|tenemos)|toda\s+la\s+carta)/i.test(raw)) {
      const lines = cats.map(c => {
        const prods = products.filter(p => p.categoria_id === c.id)
        if (!prods.length) return null
        return `**${c.label||c.nombre}**\n${prods.map(p=>`• ${p.nombre||p.name} — ${money(p.precio||p.price||0)}`).join('\n')}`
      }).filter(Boolean)
      content = lines.length ? lines.join('\n\n') : `Tenés ${products.length} productos. Pedime uno específico para más detalle.`
    }
  }

  // ══ 20. BUSCAR PRODUCTO ═════════════════════════════════════
  if (!content) {
    const m = raw.match(/(?:busc[aáe]|encontr[aáe]|d[oó]nde\s+est[aáe])\s+(?:(?:la|el)\s+)?(.+)/i)
    if (m) {
      const prod = findProd(m[1].trim(), products)
      if (prod) {
        const cat = cats.find(c => c.id === prod.categoria_id)
        content = `**${prod.nombre||prod.name}** — ${money(prod.precio||prod.price||0)}\nCategoría: ${cat?.label||cat?.nombre||'Sin categoría'}${prod.sin_stock?' — ⚠️ Sin stock':''}`
      } else {
        content = `No encontré "${m[1].trim()}" en la carta.`
      }
    }
  }

  // ══ 21. SALUDO / HELP ═══════════════════════════════════════
  if (!content) {
    if (/^(?:hola|holi|hey|buenas|buen[ao]s?|que\s+tal|como\s+estas?|help|ayuda|qu[eé]\s+pod[eé]s|qu[eé]\s+hac[eé]s)/i.test(msg)) {
      content = `¡Hola! Soy tu asistente IA de PedidosQR 🤖\n\nPuedo hacer cambios en tu carta al instante. Probá con:\n• "Cambiá el precio del Bife de Chorizo a $4500"\n• "Aplicá 20% de descuento a las Empanadas"\n• "Marcá las Rabas sin stock"\n• "Pausar pedidos"\n• "Dame la receta de alfajores"\n\n¿Qué necesitás?`
    }
  }

  // ══ 22. AGREGAR PRODUCTO ═══════════════════════════════════
  if (!content) {
    const mAdd = raw.match(/(?:agre[gh]|sum[aáe]|cre[aáe]|new)\s+(?:producto|plato|item|dish)?\s*[:\-]?\s*(.+?)(?:\s+(?:precio|a)\s*\$?\s*([\d.,]+))?$/i)
    if (mAdd && mAdd[1] && mAdd[1].length > 2) {
      const nombre = mAdd[1].replace(/\s+(?:precio|a)\s*\$?.*/i,'').trim()
      const precio = mAdd[2] ? parseInt(mAdd[2].replace(/\D/g,'')) : 0
      content = `Para agregar **${nombre}** necesito que uses el panel de Productos (botón "+" azul).`
      if (precio) content += ` El precio sería ${money(precio)}.`
      content += `

💡 *Tip: también podés pedirme "cambiá el precio de ${nombre} a $X" una vez que lo hayas creado.*`
    }
  }

  // ══ 23. CAMBIAR DESCRIPCIÓN ═════════════════════════════════
  if (!content) {
    const mDesc = raw.match(/(?:cambi[aáe]|modific[aáe]|actualiz[aáe]|pon[eé]le?)\s+(?:la\s+)?descripci[oó]n\s+(?:de[l]?(?:\s+(?:los?|las?))?\s+)?(.+?)\s+(?:a|por|con)[\s:]+(.+)/i)
    if (mDesc) {
      const prod = findProd(mDesc[1].trim(), products)
      if (prod) {
        await patchProd(prod.id, { descripcion: mDesc[2].trim(), desc: mDesc[2].trim() })
        actions.push({ type:'desc_update', id:prod.id })
        needsReload = true
        content = `✅ Descripción de **${prod.nombre||prod.name}** actualizada.`
      } else {
        content = `No encontré el producto "${mDesc[1].trim()}".`
      }
    }
  }

  // ══ 24. DUPLICAR PRECIO ══════════════════════════════════════
  if (!content) {
    const mDup = raw.match(/(?:duplic[aáe]|dobl[aáe])\s+(?:el\s+)?precio\s+(?:de[l]?(?:\s+(?:los?|las?))?\s+)?(.+)/i)
    if (mDup) {
      const prod = findProd(mDup[1].trim(), products)
      if (prod) {
        const np = (prod.precio||prod.price||0)*2
        await patchProd(prod.id, { precio: np, price: np })
        actions.push({ type:'price_update', id:prod.id })
        needsReload = true
        content = `✅ Precio de **${prod.nombre||prod.name}** duplicado a **${money(np)}**.`
      }
    }
  }

  // ══ 25. MOSTRAR/OCULTAR CATEGORÍA ═══════════════════════════
  if (!content) {
    const mHideCat = raw.match(/(?:ocult[aáe]|desactiv[aáe]|escond[eéeé]|borr[aáe])\s+(?:la\s+)?categor[ií]a\s+(?:de\s+)?(.+)/i)
    if (mHideCat) {
      const catName = mHideCat[1].trim()
      const cat = cats.find(c => norm(c.label||c.nombre||'').includes(norm(catName)))
      if (cat) {
        content = `Para ocultar la categoría **${cat.label||cat.nombre}** vas a Categorías en el panel → click en el ojo 👁. Los productos quedan guardados.`
      } else {
        content = `No encontré la categoría "${catName}".`
      }
    }
  }

  // ══ 26. PRECIO DE TODO ═══════════════════════════════════════
  if (!content) {
    const mAll = raw.match(/(?:sub[ií]|baj[aáe])\s+(?:todos?\s+los?\s+)?precios?\s+(?:un\s+)?(\d+)\s*%/i)
    if (mAll) {
      const pct = parseInt(mAll[1])
      const isUp = /sub[ií]/i.test(raw)
      let updated = 0
      for (const p of products) {
        const base = p.precio_original || p.precio || p.price || 0
        const np = isUp ? Math.round(base*(1+pct/100)) : Math.round(base*(1-pct/100))
        if (np > 0) { await patchProd(p.id, { precio: np, price: np }); updated++ }
      }
      needsReload = true
      actions.push({ type:'bulk_price' })
      content = `✅ ${isUp?'Subí':'Bajé'} el precio de **${updated} productos** un **${pct}%**.`
    }
  }

  // ══ 27. CONSULTA DE PRECIO ═══════════════════════════════════
  if (!content) {
    const mQuery = raw.match(/(?:cu[aá]nto\s+(?:cuesta|vale|sale)|precio\s+de[l]?\s+(?:la|el|los?|las?)?)\s+(.+)/i)
    if (mQuery) {
      const prod = findProd(mQuery[1].trim(), products)
      if (prod) {
        content = `**${prod.nombre||prod.name}** cuesta **${money(prod.precio||prod.price||0)}**${prod.sin_stock?' — ⚠️ Sin stock actualmente':''}.`
      } else {
        content = `No encontré "${mQuery[1].trim()}" en la carta.`
      }
    }
  }

  // ══ 28. ACTIVAR/DESACTIVAR DELIVERY ═════════════════════════
  if (!content) {
    if (/(?:activ[aáe]|habilit[aáe]|turn[aáe]\s+on)\s+(?:el\s+)?delivery/i.test(raw)) {
      content = `Para habilitar el delivery andá a **Configuración → Delivery** en el panel. Ahí podés activarlo y configurar el precio de envío.`
    } else if (/(?:desactiv[aáe]|deshabilit[aáe]|turn[aáe]\s+off)\s+(?:el\s+)?delivery/i.test(raw)) {
      content = `Para deshabilitar el delivery andá a **Configuración → Delivery** en el panel y desactivalo.`
    }
  }

  // ══ 29. HORARIOS ═════════════════════════════════════════════
  if (!content) {
    if (/horario|abre|cierra|hora\s+de|cuando\s+abr/i.test(raw)) {
      content = `Podés configurar los horarios del local en **Configuración** en el panel. Actualmente no tengo acceso a los horarios cargados.`
    }
  }

  // ══ 30. NOMBRE DEL LOCAL ═════════════════════════════════════
  if (!content) {
    const mNombre = raw.match(/(?:cambi[aáe]|actualiz[aáe])\s+(?:el\s+)?(?:nombre|titulo)\s+(?:del?\s+)?(?:local|restaurante|negocio)?\s+(?:a|por|con)[\s:]+(.+)/i)
    if (mNombre) {
      content = `Para cambiar el nombre del restaurante andá a **Configuración** en el panel. El nombre también aparece en la carta pública.`
    }
  }

  // ══ FALLBACK — Claude API (lenguaje natural) ════════════════
  if (!content) {
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
    if (ANTHROPIC_KEY) {
      try {
        const cartaSummary = products.slice(0,40).map(p =>
          `- ${p.nombre||p.name} ($${p.precio||p.price||0})${p.sin_stock?' [SIN STOCK]':''}${(p.activo===false||p.active===false)?' [OCULTO]':''}`
        ).join('\n')
        const catsSummary = cats.map(c => c.label||c.nombre).join(', ')

        const systemPrompt = `Sos el asistente IA de PedidosQR para el restaurante "${restaurantName||'este restaurante'}".
Ayudás al dueño a gestionar su carta digital. Respondé siempre en español rioplatense, de forma concisa (máximo 4 líneas).

CARTA ACTUAL (${products.length} productos en ${cats.length} categorías):
${cartaSummary||'Sin productos cargados.'}
CATEGORÍAS: ${catsSummary||'ninguna'}

ACCIONES DISPONIBLES — decile al usuario EXACTAMENTE cómo escribirlo:
• Cambiar precio: "Cambiá el precio de [producto] a $[precio]" o "Ponele $X a [producto]"
• Descuento: "Aplicá [X]% de descuento a [producto]"
• Quitar descuento: "Sacá el descuento de [producto]"
• Sin stock: "Marcá [producto] sin stock"
• Reponer: "Reponer [producto]"
• Ocultar/mostrar: "Ocultá [producto]" / "Mostrá [producto]"
• Cambiar foto: "Cambiá la foto de [producto]"
• Cambiar descripción: "Cambiá la descripción de [producto] a [texto]"
• Renombrar: "Renombrá [producto] a [nuevo nombre]"
• Subir/bajar todos: "Subí todos los precios un 10%"
• Pausar pedidos: "Pausar pedidos"
• Recetas: "Dame la receta de [plato]"
• Consulta precio: "Cuánto cuesta [producto]"
• Ver carta: "Mostrá toda la carta"
• Wifi: "El wifi es [nombre] contraseña [pass]"

Si te piden algo que no podés hacer automáticamente, guialos al lugar del panel con un emoji.`

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: systemPrompt,
            messages: [{ role: 'user', content: lastMsg }]
          })
        })
        if (claudeRes.ok) {
          const claudeData = await claudeRes.json()
          content = claudeData.content?.[0]?.text || msgFallback()
        } else {
          console.error('Claude API error:', claudeRes.status, await claudeRes.text())
          content = msgFallback()
        }
      } catch(e) {
        console.error('Claude fetch error:', e.message)
        content = msgFallback()
      }
    } else {
      // Sin API key: fallback inteligente por producto
      const anyProd = products.find(p => norm(raw).includes(norm(p.nombre||p.name||'').replace(/\s+/g,' ').trim()))
      content = anyProd
        ? `Encontré **${anyProd.nombre||anyProd.name}** pero no entendí qué querés hacer con él.\n• "Cambiá el precio a $X"\n• "Marcá sin stock"\n• "Cambiá la foto"`
        : msgFallback()
    }
  }

  return res.status(200).json({ content, actions, needsReload })
}

function msgFallback() {
  return `No entendí bien. Probá con:\n• "Cambiá el precio de [producto] a $[precio]"\n• "Aplicá 20% de descuento a [producto]"\n• "Marcá [producto] sin stock"\n• "Subí todos los precios un 10%"\n• "Cuánto cuesta [producto]"\n\n¿Qué necesitás?`
}
