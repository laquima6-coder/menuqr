-- ══════════════════════════════════════════════════════════════
--  MenuQR — Políticas RLS (Row Level Security)
--  Ejecutar en Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════

-- ── 1. RESTAURANTES ───────────────────────────────────────────
ALTER TABLE restaurantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurantes_select_public"  ON restaurantes;
DROP POLICY IF EXISTS "restaurantes_insert_owner"   ON restaurantes;
DROP POLICY IF EXISTS "restaurantes_update_owner"   ON restaurantes;
DROP POLICY IF EXISTS "restaurantes_delete_owner"   ON restaurantes;

-- Lectura pública: necesario para menú público y SuperAdmin
CREATE POLICY "restaurantes_select_public"
  ON restaurantes FOR SELECT USING (true);

-- Solo el dueño puede crear/editar/borrar su restaurante
CREATE POLICY "restaurantes_insert_owner"
  ON restaurantes FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "restaurantes_update_owner"
  ON restaurantes FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "restaurantes_delete_owner"
  ON restaurantes FOR DELETE USING (auth.uid() = owner_id);


-- ── 2. CATEGORIAS ─────────────────────────────────────────────
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categorias_select_public"  ON categorias;
DROP POLICY IF EXISTS "categorias_insert_owner"   ON categorias;
DROP POLICY IF EXISTS "categorias_update_owner"   ON categorias;
DROP POLICY IF EXISTS "categorias_delete_owner"   ON categorias;

CREATE POLICY "categorias_select_public"
  ON categorias FOR SELECT USING (true);

CREATE POLICY "categorias_insert_owner"
  ON categorias FOR INSERT WITH CHECK (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );

CREATE POLICY "categorias_update_owner"
  ON categorias FOR UPDATE USING (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );

CREATE POLICY "categorias_delete_owner"
  ON categorias FOR DELETE USING (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );


-- ── 3. PRODUCTOS ──────────────────────────────────────────────
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_select_public" ON productos;
DROP POLICY IF EXISTS "productos_insert_owner"  ON productos;
DROP POLICY IF EXISTS "productos_update_owner"  ON productos;
DROP POLICY IF EXISTS "productos_delete_owner"  ON productos;

CREATE POLICY "productos_select_public"
  ON productos FOR SELECT USING (true);

CREATE POLICY "productos_insert_owner"
  ON productos FOR INSERT WITH CHECK (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );

CREATE POLICY "productos_update_owner"
  ON productos FOR UPDATE USING (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );

CREATE POLICY "productos_delete_owner"
  ON productos FOR DELETE USING (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );


-- ── 4. PEDIDOS ────────────────────────────────────────────────
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedidos_insert_public"  ON pedidos;
DROP POLICY IF EXISTS "pedidos_select_owner"   ON pedidos;
DROP POLICY IF EXISTS "pedidos_update_owner"   ON pedidos;

-- Clientes pueden crear pedidos sin estar autenticados
CREATE POLICY "pedidos_insert_public"
  ON pedidos FOR INSERT WITH CHECK (true);

-- Solo el dueño del restaurante puede ver y cambiar estados
CREATE POLICY "pedidos_select_owner"
  ON pedidos FOR SELECT USING (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );

CREATE POLICY "pedidos_update_owner"
  ON pedidos FOR UPDATE USING (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );


-- ── 5. PEDIDO_ITEMS ───────────────────────────────────────────
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedido_items_insert_public" ON pedido_items;
DROP POLICY IF EXISTS "pedido_items_select_owner"  ON pedido_items;

CREATE POLICY "pedido_items_insert_public"
  ON pedido_items FOR INSERT WITH CHECK (true);

CREATE POLICY "pedido_items_select_owner"
  ON pedido_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      JOIN restaurantes r ON r.id = p.restaurante_id
      WHERE p.id = pedido_id AND r.owner_id = auth.uid()
    )
  );


-- ── 6. TURNOS_CAJA ────────────────────────────────────────────
ALTER TABLE turnos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "turnos_select_owner" ON turnos_caja;
DROP POLICY IF EXISTS "turnos_insert_owner" ON turnos_caja;
DROP POLICY IF EXISTS "turnos_update_owner" ON turnos_caja;

CREATE POLICY "turnos_select_owner"
  ON turnos_caja FOR SELECT USING (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );

CREATE POLICY "turnos_insert_owner"
  ON turnos_caja FOR INSERT WITH CHECK (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );

CREATE POLICY "turnos_update_owner"
  ON turnos_caja FOR UPDATE USING (
    auth.uid() = (SELECT owner_id FROM restaurantes WHERE id = restaurante_id)
  );

-- ══════════════════════════════════════════════════════════════
--  ✓ Listo — todas las tablas protegidas con RLS
-- ══════════════════════════════════════════════════════════════
