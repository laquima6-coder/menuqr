// Fix RLS en tabla mesas via conexion directa
// URL: https://menuqr-ten.vercel.app/api/fix-rls?secret=menuqr2026

export default async function handler(req, res) {
  if (req.query.secret !== 'menuqr2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check available env vars (names only, not values)
  const envKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes('postgres') ||
    k.toLowerCase().includes('database') ||
    k.toLowerCase().includes('supabase') ||
    k.toLowerCase().includes('db_')
  )

  const dbUrl = process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.DB_URL ||
    null

  if (!dbUrl) {
    return res.status(200).json({
      status: 'no_db_url',
      availableEnvKeys: envKeys,
      message: 'No direct DB URL found. Need POSTGRES_URL or DATABASE_URL with credentials.'
    })
  }

  // Try connecting via postgres package (if available)
  try {
    const { Client } = await import('pg')
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
    await client.connect()

    const sqls = [
      `ALTER TABLE mesas ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mesas' AND policyname='public_select_mesas') THEN
          CREATE POLICY "public_select_mesas" ON mesas FOR SELECT USING (true);
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mesas' AND policyname='public_insert_mesas') THEN
          CREATE POLICY "public_insert_mesas" ON mesas FOR INSERT WITH CHECK (true);
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mesas' AND policyname='public_update_mesas') THEN
          CREATE POLICY "public_update_mesas" ON mesas FOR UPDATE USING (true);
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mesas' AND policyname='public_delete_mesas') THEN
          CREATE POLICY "public_delete_mesas" ON mesas FOR DELETE USING (true);
        END IF;
      END $$`,
      `SELECT policyname, cmd FROM pg_policies WHERE tablename='mesas'`
    ]

    const results = []
    for (const sql of sqls) {
      try {
        const r = await client.query(sql)
        results.push({ sql: sql.slice(0, 60) + '...', ok: true, rows: r.rows })
      } catch (e) {
        results.push({ sql: sql.slice(0, 60) + '...', error: e.message })
      }
    }

    await client.end()
    return res.status(200).json({ status: 'done', results })

  } catch (e) {
    return res.status(200).json({
      status: 'pg_failed',
      error: e.message,
      availableEnvKeys: envKeys
    })
  }
}
