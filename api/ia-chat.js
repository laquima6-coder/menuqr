// ═══════════════════════════════════════════════════════════
// PLUS IA — Agente completo con acceso total a la app
// Ejecuta cambios reales en Supabase al instante
// ═══════════════════════════════════════════════════════════
/* eslint-disable */

const SB_URL = process.env.SUPABASE_URL || 'https://fwovflsaghnutysjyaus.supabase.co'
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3b3ZmbHNhZ2hudXR5c2p5YXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2NzQ3NSwiZXhwIjoyMDk2MjQzNDc1fQ.EEtIVeMFSPt3xgIBy0aPm0O1IRPFOp7zpKZRSET7Otw'

const COLORS = {
  rojo:'#E53E3E', roja:'#E53E3E', red:'#E53E3E',
  azul:'#3182CE', blue:'#3182CE',
  verde:'#38A169', green:'#38A169',
  naranja:'#DD6B20', orange:'#DD6B20',
  purpura:'#805AD5', violeta:'#805AD5', morado:'#805AD5', purple:'#805AD5',
  dorado:'#C9A84C', gold:'#C9A84C', amarillo:'#D69E2E',
  rosa:'#D53F8C', pink:'#D53F8C',
  turquesa:'#0D9488', teal:'#0D9488', celeste:'#0284C7',
  negro:'#1A202C', black:'#1A202C',
  blanco:'#F7FAFC', white:'#F7FAFC',
  gris:'#718096', gray:'#718096',
  bordeaux:'#9B2335', bordo:'#9B2335',
}

async function sbReq(method, path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  try { return { ok: r.ok, status: r.status, data: JSON.parse(text) } }
  catch { return { ok: r.ok, status: r.status, data: text } }
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
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

  // ══ 1. CAMBIAR PRECIO ═══════════════════════════════════════
  if (!content) {
    const pats = [
      /(?:cambi[aáe]|modific[aáe]|pon[eé]|actualiz[aáe])(?:me|le)?\s+(?:el\s+)?precio\s+(?:de[l]?\s+)?(?:(?:la|el)\s+)?(.+?)\s+(?:a|en|por)\s+\$?\s*([\d.,]+)/i,
      /(?:precio|costo)\s+(?:de[l]?\s+)?(?:(?:la|el)\s+)?(.+?)\s+(?:a|=)\s+\$?\s*([\d.,]+)/i,
    ]
    for (const pat of pats) {
      const m = raw.match(pat)
      if (m) {
        const newP = parseFloat(m[2].replace(/\./g,'').replace(',','.'))
        const prod = findProd(m[1].trim(), products)
        if (prod && newP > 0) {
          await patchProd(prod.id, { precio: newP })
          actions.push({ type: 'price_update' })
          needsReload = true
          content = `✅ Precio de **${prod.nombre||prod.name}** → ${money(newP)}. Ya está en la carta.`
        } else if (!prod) {
          content = `No encontré "${m[1].trim()}". Productos disponibles:\n${products.slice(0,8).map(p=>`• ${p.nombre||p.name}`).join('\n')}`
        }
        break
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
        content = `✅ ${pct}% de descuento en **${prod.nombre||prod.name}**.\n${money(orig)} → **${money(np)}**. Precio original guardado para revertir.`
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
        content = `✅ Precio de **${prod.nombre||prod.name}** subido ${pct}%.\n${money(orig)} → **${money(np)}**.`
      } else {
        content = `No encontré "${m[1].trim()}".`
      }
    }
  }

  // ══ 4. REVERTIR DESCUENTO ══════════════════