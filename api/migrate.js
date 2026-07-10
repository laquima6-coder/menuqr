// Vercel serverless function — runs DB migration
// URL: https://menuqr-ten.vercel.app/api/migrate?secret=menuqr2026

export default async function handler(req, res) {
  if (req.query.secret !== 'menuqr2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
  const SERVICE_KEY  = process.env.VITE_SUPABASE_ANON_KEY || ''

  // Each ALTER TABLE as a separate RPC call won't work for DDL.
  // Instead, return instructions with the SQL to run.
  // But we CAN check current table structure.
  
  const checks = []
  
  try {
    // Check if mp_alias column exists by fetching restaurantes
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/restaurantes?select=mp_alias,mp_mostrar_alias,alias_pago&limit=1`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    })
    const d1 = await r1.text()
    checks.push({ test: 'mp_alias column', status: r1.status, data: d1 })

    // Check if pedidos INSERT works
    const testId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ id: testId, restaurante_id: '5b52b06e-7aa8-4cf1-be4c-3646611dacaa', mesa_numero: 99, total: 1, nota: 'TEST' })
    })
    const d2 = await r2.text()
    checks.push({ test: 'pedidos INSERT', status: r2.status, data: d2 })
    
    // Clean up test row
    if (r2.status < 300) {
      await fetch(`${SUPABASE_URL}/rest/v1/pedidos?id=eq.${testId}`, {
        method: 'DELETE',
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
      })
    }
    
    return res.status(200).json({ checks })
  } catch (e) {
    return res.status(500).json({ error: e.message, checks })
  }
}
