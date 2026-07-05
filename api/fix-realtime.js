// Habilita REPLICA IDENTITY FULL en pedidos para que Realtime funcione con filtros
// URL: https://menuqr-ten.vercel.app/api/fix-realtime?secret=menuqr2026

export default async function handler(req, res) {
  if (req.query.secret !== 'menuqr2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const SUPABASE_URL = 'https://fwovflsaghnutysjyaus.supabase.co'
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY
  const PROJECT_REF  = 'fwovflsaghnutysjyaus'

  // Supabase Management API — endpoint para ejecutar SQL
  // Requiere el mismo service role key via Authorization
  const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

  const sqls = [
    'ALTER TABLE public.pedidos REPLICA IDENTITY FULL',
    'ALTER TABLE public.pedido_items REPLICA IDENTITY FULL',
    'ALTER TABLE public.solicitudes REPLICA IDENTITY FULL',
    'ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.pedidos',
    'ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.pedido_items',
    'ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.solicitudes',
  ]

  const results = []

  for (const query of sqls) {
    try {
      const r = await fetch(mgmtUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      const text = await r.text()
      let body
      try { body = JSON.parse(text) } catch { body = text }
      results.push({ query, status: r.status, body })
    } catch (e) {
      results.push({ query, error: e.message })
    }
  }

  return res.status(200).json({ ok: true, results })
}
