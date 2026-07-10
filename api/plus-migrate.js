// Endpoint temporal para agregar columnas plus_ia y plus_figma
// URL: https://menuqr-ten.vercel.app/api/plus-migrate?secret=menuqr2026

export default async function handler(req, res) {
  if (req.query.secret !== 'menuqr2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const SUPABASE_URL = 'https://fwovflsaghnutysjyaus.supabase.co'
  const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3b3ZmbHNhZ2hudXR5c2p5YXVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2NzQ3NSwiZXhwIjoyMDk2MjQzNDc1fQ.EEtIVeMFSPt3xgIBy0aPm0O1IRPFOp7zpKZRSET7Otw'

  const results = []

  // Check if columns already exist
  const check = await fetch(`${SUPABASE_URL}/rest/v1/restaurantes?select=plus_ia,plus_figma&limit=1`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  })
  
  if (check.status === 200) {
    return res.status(200).json({ 
      status: 'already_exists', 
      message: 'Columns plus_ia and plus_figma already exist ✅' 
    })
  }

  // Columns don't exist - use pg to create them
  // Supabase exposes a way to run SQL via the management API
  const mgmt = await fetch(`https://api.supabase.com/v1/projects/fwovflsaghnutysjyaus/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify({ 
      query: `ALTER TABLE restaurantes ADD COLUMN IF NOT EXISTS plus_ia BOOLEAN DEFAULT false; ALTER TABLE restaurantes ADD COLUMN IF NOT EXISTS plus_figma BOOLEAN DEFAULT false;`
    })
  })

  const mgmtData = await mgmt.text()
  results.push({ management_api: mgmt.status, body: mgmtData })

  return res.status(200).json({ results, check_status: check.status })
}
