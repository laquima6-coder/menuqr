-- ══════════════════════════════════════════════════════════════
-- MenuQR — Migración completa
-- Correr en: Supabase Dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- 1. COLUMNAS FALTANTES EN restaurantes
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

-- 2. COLUMNAS FALTANTES EN productos (por si el DB usa nombres en español)
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS nombre          text,
  ADD COLUMN IF NOT EXISTS descripcion     text,
  ADD COLUMN IF NOT EXISTS precio          int,
  ADD COLUMN IF NOT EXISTS activo          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS precio_original int,
  ADD COLUMN IF NOT EXISTS sin_stock       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS imagen          text,
  ADD COLUMN IF NOT EXISTS foto_url        text;

-- 3. HABILITAR RLS (no hace nada si ya está habilitado)
ALTER TABLE restaurantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items  ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS — SELECT público (menú accesible sin login)
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

-- 5. POLÍTICAS RLS — pedidos: INSERT público + SELECT para cocina y dueño
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos' AND policyname='public_insert_pedidos') THEN
    CREATE POLICY "public_insert_pedidos" ON pedidos FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos' AND policyname='public_select_pedidos') THEN
    CREATE POLICY "public_select_pedidos" ON pedidos FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos' AND policyname='owner_update_pedidos') THEN
    CREATE POLICY "owner_update_pedidos" ON pedidos FOR UPDATE USING (true);
  END IF;
END $$;

-- 6. POLÍTICAS RLS — pedido_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedido_items' AND policyname='public_insert_pedido_items') THEN
    CREATE POLICY "public_insert_pedido_items" ON pedido_items FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedido_items' AND policyname='public_select_pedido_items') THEN
    CREATE POLICY "public_select_pedido_items" ON pedido_items FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedido_items' AND policyname='owner_update_pedido_items') THEN
    CREATE POLICY "owner_update_pedido_items" ON pedido_items FOR UPDATE USING (true);
  END IF;
END $$;

-- 7. VERIFICACIÓN — mostrar políticas activas
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('restaurantes','categorias','productos','pedidos','pedido_items')
ORDER BY tablename, policyname;
