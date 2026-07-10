// ═══════════════════════════════════════════════════════════════════
// PLUS IA — Agente completo con acceso total a la carta
// Lee productos/categorías en contexto y ejecuta cambios en Supabase
// ═══════════════════════════════════════════════════════════════════

const SB_URL = process.env.SUPABASE_URL || 'https://fwovflsaghnutysjyaus.supabase.co'
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3b3ZmbHNhZ2hudXR5c2p5YXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2NzQ3NSwiZXhwIjoyMDk2MjQzNDc1fQ.EEtIVeMFSPt3xgIBy0aPm0O1IRPFOp7zpKZRSET7Otw'

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
  const text = await r.text()
  try { return { ok: r.ok, status: r.status, data: JSON.parse(text) } }
  catch { return { ok: r.ok, status: r.status, data: text } }
}

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function findProduct(name, products) {
  const n = normalize(name)
  let match = products.find(p => normalize(p.nombre || p.name) === n)
  if (match) return match
  match = products.find(p => normalize(p.nombre || p.name).includes(n))
  if (match) return match
  match = products.find(p => n.includes(normalize(p.nombre || p.name).split(' ')[0]) && normalize(p.nombre || p.name).split(' ')[0].length > 3)
  return match || null
}

function money(n) {
  return '$' + Number(n).toLocaleString('es-AR')
}

async function updateProduct(id, patch) {
  const fullPatch = {}
  if (patch.precio      != null) { fullPatch.precio = patch.precio; fullPatch.price = patch.precio }
  if (patch.nombre      != null) { fullPatch.nombre = patch.nombre; fullPatch.name  = patch.nombre }
  if (patch.descripcion != null) { fullPatch.descripcion = patch.descripcion; fullPatch['desc'] = patch.descripcion }
  if (patch.sin_stock   != null) { fullPatch.sin_stock = patch.sin_stock }
  if (patch.activo      != null) { fullPatch.activo = patch.activo; fullPatch.active = patch.activo }
  if (patch.foto_url    != null) { fullPatch.foto_url = patch.foto_url }
  if (patch.precio_original != null) { fullPatch.precio_original = patch.precio_original }
  return sb('PATCH', `productos?id=eq.${id}`, fullPatch)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages = [], restaurantName, restaurantId, context = {} } = req.body

  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || ''
  const products    = context.productos  || []
  const categories  = context.categorias || []
  const msg         = normalize(lastUserMsg)
  const raw         = lastUserMsg

  const actions = []
  let content   = ''
  let needsReload = false

  // ── CAMBIAR PRECIO ────────────────────────────────────────────────
  const precioPatterns = [
    /(?:cambi[aáe]|modific[aáe]|pon[eé]|actualiz[aáe])(?:me|le|s)?\s+(?:el\s+)?precio\s+(?:de[l]?\s+(?:(?:la|el)\s+)?)?(.+?)\s+(?:a|en|por)\s+\$?\s*([\d.,]+)/i,
    /(?:precio|cost[aáe])\s+(?:de[l]?\s+(?:(?:la|el)\s+)?)?(.+?)\s+(?:a|=|es)\s+\$?\s*([\d.,]+)/i,
  ]
  for (const pat of precioPatterns) {
    const m = raw.match(pat)
    if (m && !content) {
      const productName = m[1].trim()
      const newPrice    = parseFloat(m[2].replace(/\./g, '').replace(',', '.'))
      if (!isNaN(newPrice) && newPrice > 0) {
        const prod = findProduct(productName, products)
        if (prod) {
          await updateProduct(prod.id, { precio: newPrice })
          actions.push({ type: 'price_update', productId: prod.id, newPrice })
          needsReload = true
          content = `✅ Precio de **${prod.nombre || prod.name}** actualizado a ${money(newPrice)}. Ya está en la carta.`
        } else {
          content = `No encontré "${productName}". Revisá el nombre — los productos son:\n${products.slice(0, 8).map(p => `• ${p.nombre || p.name}`).join('\n')}${products.length > 8 ? `\n...y ${products.length - 8} más` : ''}`
        }
      }
      break
    }
  }

  // ── DESCUENTO % ───────────────────────────────────────────────────
  if (!content) {
    const m = raw.match(/(\d+)\s*%\s*(?:de\s+)?(?:descuento|off|rebaj[ae])\s+(?:(?:a[l]?|en|para)\s+(?:(?:la|el)\s+)?)?(.+)/i)
           || raw.match(/(?:aplic[aáe]|hac[eé]|pon[eé])\s+(?:un\s+)?(\d+)\s*%\s*(?:de\s+)?(?:descuento|off)\s+(?:(?:a[l]?|en)\s+(?:(?:la|el)\s+)?)?(.+)/i)
    if (m) {
      const pct   = parseInt(m[1])
      const pName = m[2].trim()
      const prod  = findProduct(pName, products)
      if (prod) {
        const orig     = prod.precio || prod.price || 0
        const newPrice = Math.round(orig * (1 - pct / 100))
        await updateProduct(prod.id, { precio: newPrice, precio_original: orig })
        actions.push({ type: 'discount', productId: prod.id, newPrice, originalPrice: orig, pct })
        needsReload = true
        content = `✅ ${pct}% de descuento en **${prod.nombre || prod.name}**.\n${money(orig)} → **${money(newPrice)}**. El original queda guardado para revertir.`
      } else {
        content = `No encontré "${pName}". ¿Podés especificar el nombre completo?`
      }
    }
  }

  // ── SUBIR PRECIO EN % ─────────────────────────────────────────────
  if (!content) {
    const m = raw.match(/(?:sub[ií]|increment[aáe]|aument[aáe])\s+(?:el\s+precio\s+(?:de[l]?\s+(?:(?:la|el)\s+)?)?)?(.+?)\s+(?:en|un|un\s+)\s*(\d+)\s*%/i)
    if (m) {
      const pName = m[1].trim()
      const pct   = parseInt(m[2])
      const prod  = findProduct(pName, products)
      if (prod) {
        const orig     = prod.precio || prod.price || 0
        const newPrice = Math.round(orig * (1 + pct / 100))
        await updateProduct(prod.id, { precio: newPrice })
        actions.push({ type: 'price_increase', productId: prod.id, newPrice, originalPrice: orig })
        needsReload = true
        content = `✅ Precio de **${prod.nombre || prod.name}** subido ${pct}%.\n${money(orig)} → **${money(newPrice)}**.`
      } else {
        cont