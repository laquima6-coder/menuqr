-- ══════════════════════════════════════════════════════════════
-- MenuQR — Migración completa v2
-- Correr en: Supabase Dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- ─── 1. COLUMNAS FALTANTES EN restaurantes ───────────────────
ALTER TABLE restaurantes
  ADD COLUMN IF NOT EXISTS logo_url          text          DEFAULT '',
  ADD COLUMN IF NOT EXISTS alias_pago        text          DEFAULT '',
  ADD COLUMN IF NOT EXISTS alias_titular     text          DEFAULT '',
  ADD COLUMN IF NOT EXISTS alias_trans       text          DEFAULT '',
  ADD COLUMN IF NOT EXISTS mp_alias          text          DEFAULT '',
  ADD COLUMN IF NOT EXISTS mp_mostrar_alias  boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS metodos_pago      jsonb         DEFAULT '["efectivo","tarjeta","mercadopago"]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_habilitado boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_precio   int           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_horario  text          DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_config   jsonb,
  ADD COLUMN IF NOT EXISTS delivery_zonas    jsonb,
  ADD COLUMN IF NOT EXISTS pausa_pedidos     boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_desc        text          DEFAULT '',
  ADD COLUMN IF NOT EXISTS wifi_ssid         text          DEFAULT '';

-- ─── 2. COLUMNAS FALTANTES EN productos ─────────────────────
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS nombre          text,
  ADD COLUMN IF NOT EXISTS descripcion     text,
  ADD COLUMN IF NOT EXISTS precio          int,
  ADD COLUMN IF NOT EXISTS activo          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS precio_original int,
  ADD COLUMN IF NOT EXISTS sin_stock       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS imagen          text,
  ADD COLUMN IF NOT EXISTS foto_url        text;

-- ─── 3. TABLA solicitudes (campanita de llamada al mozo) ──────
CREATE TABLE IF NOT EXISTS solicitudes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid REFERENCES restaurantes ON DELETE CASCADE,
  mesa            text NOT NULL,
  tipo            text NOT NULL DEFAULT 'mozo',
  estado          text NOT NULL DEFAULT 'pendiente',
  created_at      timestamptz DEFAULT now()
);

-- ─── 4. TABLA mesas (estado de mesas en vitrina) ─────────────
CREATE TABLE IF NOT EXISTS mesas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid REFERENCES restaurantes ON DELETE CASCADE,
  numero          int NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'libre',
  updated_at      timestamptz DEFAULT now()
);

-- ─── 5. STORAGE BUCKETS ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('fotos', 'fotos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ─── 6. RLS — habilitar en todas las tablas ───────────────────
ALTER TABLE restaurantes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas          ENABLE ROW LEVEL SECURITY;

-- ─── 7. POLÍTICAS RLS — SELECT público (menú accesible sin login) ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurantes' AND policyname='public_select_restaurantes') THEN
    CREATE POLICY "public_select_restaurantes" ON restaurantes FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categorias' AND policyname='public_select_categorias') THEN
    CREATE POLICY "public_select_categorias" ON categorias FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='productos' AND policyname='public_select_productos') THEN
    CREATE POLICY "public_select_productos" ON productos FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos' AND policyname='public_select_pedidos') THEN
    CREATE POLICY "public_select_pedidos" ON pedidos FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedido_items' AND policyname='public_select_pedido_items') THEN
    CREATE POLICY "public_select_pedido_items" ON pedido_items FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mesas' AND policyname='public_select_mesas') THEN
    CREATE POLICY "public_select_mesas" ON mesas FOR SELECT USING (true);
  END IF;
END $$;

-- ─── 8. POLÍTICAS RLS — INSERT público (clientes pueden crear pedidos/solicitudes) ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos' AND policyname='public_insert_pedidos') THEN
    CREATE POLICY "public_insert_pedidos" ON pedidos FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedido_items' AND policyname='public_insert_pedido_items') THEN
    CREATE POLICY "public_insert_pedido_items" ON pedido_items FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='solicitudes' AND policyname='public_insert_solicitudes') THEN
    CREATE POLICY "public_insert_solicitudes" ON solicitudes FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='solicitudes' AND policyname='public_update_solicitudes') THEN
    CREATE POLICY "public_update_solicitudes" ON solicitudes FOR UPDATE USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mesas' AND policyname='public_update_mesas') THEN
    CREATE POLICY "public_update_mesas" ON mesas FOR UPDATE USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos' AND policyname='public_update_pedidos') THEN
    CREATE POLICY "public_update_pedidos" ON pedidos FOR UPDATE USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedido_items' AND policyname='public_update_pedido_items') THEN
    CREATE POLICY "public_update_pedido_items" ON pedido_items FOR UPDATE USING (true);
  END IF;
END $$;

-- ─── 9. STORAGE POLICIES ─────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='public_read_fotos') THEN
    CREATE POLICY "public_read_fotos" ON storage.objects FOR SELECT USING (bucket_id IN ('fotos','product-images'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='public_upload_fotos') THEN
    CREATE POLICY "public_upload_fotos" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('fotos','product-images'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='public_update_fotos') THEN
    CREATE POLICY "public_update_fotos" ON storage.objects FOR UPDATE USING (bucket_id IN ('fotos','product-images'));
  END IF;
END $$;

-- ─── 10. REALTIME — habilitar para tablas que usan postgres_changes ──
ALTER PUBLICATION supabase_realtime ADD TABLE solicitudes;
ALTER PUBLICATION supabase_realtime ADD TABLE mesas;
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE pedido_items;

-- ─── VERIFICACIÓN FINAL ───────────────────────────────────────
SELECT 'TABLAS:' as check_type, table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('restaurantes','categorias','productos','pedidos','pedido_items','solicitudes','mesas','turnos_caja')
UNION ALL
SELECT 'BUCKETS:', name FROM storage.buckets WHERE id IN ('fotos','product-images');
