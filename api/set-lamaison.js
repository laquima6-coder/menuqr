// Endpoint temporal: activa plantilla La Maison en la carta
// URL: https://menuqr-ten.vercel.app/api/set-lamaison?secret=menuqr2026

export default async function handler(req, res) {
  if (req.query.secret !== 'menuqr2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const SUPABASE_URL = 'https://fwovflsaghnutysjyaus.supabase.co'
  const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3b3ZmbHNhZ2hudXR5c2p5YXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2NzQ3NSwiZXhwIjoyMDk2MjQzNDc1fQ.EEtIVeMFSPt3xgIBy0aPm0O1IRPFOp7zpKZRSET7Otw'
  const REST_ID      = '5b52b06e-7aa8-4cf1-be4c-3646611dacaa'

  try {
    // Leer config actual
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurantes?id=eq.${REST_ID}&select=config`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const rows = await getRes.json()
    const existing = rows[0]?.config || {}

    // La Maison config
    const carta_v3 = {
      templateId: 'lamaison',
      bgColor: '#0d0d08',
      accentColor: '#C9A84C',
      fontFamily: "'Raleway','Helvetica Neue',sans-serif",
      fontSize: 'normal',
      titulo: '',
      catConfigs: {},
      blocks: [
        { id: 'hero',     type: 'hero',       on: false, data: { titulo: '', sub: '', logo: '' } },
        { id: 'cats',     type: 'categorias', on: true,  data: {} },
        { id: 'contacto', type: 'contacto',   on: false, data: { tel: '', dir: '', hs: '' } },
        { id: 'pago',     type: 'pago',       on: false, data: { alias: '', titular: '', lbl: '' } },
        { id: 'qr',       type: 'qr',         on: false, data: { url: '', lbl: '' } },
      ]
    }
    const carta_publicada_en = { mesa: true, vitrina: true, caja: false, delivery: false }

    const newConfig = { ...existing, carta_v3, carta_publicada_en }

    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurantes?id=eq.${REST_ID}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ config: newConfig })
      }
    )

    if (patchRes.ok) {
      return res.status(200).json({
        ok: true,
        message: '✅ Plantilla La Maison aplicada. Abrí el menú para verla.',
        templateId: 'lamaison',
        carta_publicada_en
      })
    } else {
      const err = await patchRes.text()
      return res.status(500).json({ ok: false, error: err })
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
