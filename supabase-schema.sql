-- ══════════════════════════════════════════════════════════
--  MenuQR — Schema de base de datos para Supabase
--  Ejecutar en: Supabase → SQL Editor → New query
-- ══════════════════════════════════════════════════════════

-- ── 1. RESTAURANTES ──────────────────────────────────────
CREATE TABLE restaurantes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid REFERENCES auth.users ON DELETE CASCADE,
  nombre      text NOT NULL,
  slug        text UNIQUE NOT NULL,
  descripcion text,
  direccion   text,
  telefono    text,
  email       text,
  base_url    text,
  color       text DEFAULT '#C9A84C',
  mesas       int  DEFAULT 10,
  config      jsonb DEFAULT '{
    "propina": true,
    "happyHour": true,
    "happyDesde": "17:00",
    "happyHasta": "21:00",
    "wifi_nombre": "",
    "wifi_pass": "",
    "whatsapp": "",
    "whatsapp_msg": ""
  }'::jsonb,
  plan        text DEFAULT 'free',
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── 2. CATEGORÍAS ────────────────────────────────────────
CREATE TABLE categorias (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid REFERENCES restaurantes ON DELETE CASCADE,
  label           text NOT NULL,
  icon            text DEFAULT '◇',
  orden           int  DEFAULT 0,
  activa          boolean DEFAULT true
);

-- ── 3. PRODUCTOS ─────────────────────────────────────────
CREATE TABLE productos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid REFERENCES restaurantes ON DELETE CASCADE,
  categoria_id    uuid REFERENCES categorias ON DELETE SET NULL,
  name            text NOT NULL,
  desc            text,
  price           int  NOT NULL,      -- en pesos (sin centavos)
  orig            int,                -- precio original para mostrar descuento
  emoji           text DEFAULT '🍽️',
  tag             text,               -- CHEF | NUEVO | VEG | SIN TACC | PICANTE
  active          boolean DEFAULT true,
  orden           int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── 4. PEDIDOS ───────────────────────────────────────────
CREATE TABLE pedidos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid REFERENCES restaurantes ON DELETE CASCADE,
  mesa_numero     int NOT NULL,
  status          text DEFAULT 'nuevo',
                  -- nuevo | preparando | listo | entregado
  metodo_pago     text,               -- mp | trans | cash | card
  propina         int DEFAULT 0,
  total           int NOT NULL,
  nota            text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 5. PEDIDO ITEMS ──────────────────────────────────────
CREATE TABLE pedido_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   uuid REFERENCES pedidos ON DELETE CASCADE,
  producto_id uuid REFERENCES productos ON DELETE SET NULL,
  nombre      text NOT NULL,          -- snapshot del nombre
  precio      int  NOT NULL,          -- snapshot del precio
  cantidad    int  NOT NULL DEFAULT 1
);

-- ── 6. TURNOS DE CAJA ────────────────────────────────────
CREATE TABLE turnos_caja (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id      uuid REFERENCES restaurantes ON DELETE CASCADE,
  cajero              text NOT NULL,
  fondo_apertura      int DEFAULT 0,
  arqueo_apertura     jsonb,          -- {10000: 2, 1000: 5, ...}
  arqueo_cierre       jsonb,
  ventas_efectivo     int DEFAULT 0,
  ventas_mp           int DEFAULT 0,
  ventas_debito       int DEFAULT 0,
  ventas_credito      int DEFAULT 0,
  ventas_transferencia int DEFAULT 0,
  estado              text DEFAULT 'abierto',  -- abierto | cerrado
  hora_apertura       timestamptz DEFAULT now(),
  hora_cierre         timestamptz
);

-- ══════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
--  Cada restaurante solo ve sus propios datos
-- ══════════════════════════════════════════════════════════

-- Habilitar RLS en todas las tablas
ALTER TABLE restaurantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_caja   ENABLE ROW LEVEL SECURITY;

-- ── Restaurantes: el dueño ve y edita solo el suyo
CREATE POLICY "owner_restaurante" ON restaurantes
  FOR ALL USING (owner_id = auth.uid());

-- ── Categorías: el dueño gestiona las suyas
CREATE POLICY "owner_categorias" ON categorias
  FOR ALL USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE owner_id = auth.uid()
    )
  );

-- ── Productos: el dueño gestiona, el público lee los activos
CREATE POLICY "owner_productos" ON productos
  FOR ALL USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "public_read_productos" ON productos
  FOR SELECT USING (active = true);

-- ── Pedidos: el dueño ve los suyos, el cliente puede insertar
CREATE POLICY "owner_pedidos" ON pedidos
  FOR SELECT USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "owner_update_pedidos" ON pedidos
  FOR UPDATE USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "public_insert_pedidos" ON pedidos
  FOR INSERT WITH CHECK (true);

-- ── Pedido items: ligado a los pedidos del dueño
CREATE POLICY "owner_pedido_items" ON pedido_items
  FOR SELECT USING (
    pedido_id IN (
      SELECT id FROM pedidos
      WHERE restaurante_id IN (
        SELECT id FROM restaurantes WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "public_insert_pedido_items" ON pedido_items
  FOR INSERT WITH CHECK (true);

-- ── Turnos de caja: solo el dueño
CREATE POLICY "owner_turnos" ON turnos_caja
  FOR ALL USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE owner_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════
--  REALTIME
--  Habilitar para que los pedidos lleguen en tiempo real
-- ══════════════════════════════════════════════════════════

-- Habilitar realtime en la tabla pedidos
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE pedido_items;

-- ══════════════════════════════════════════════════════════
--  FUNCIÓN: updated_at automático
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
