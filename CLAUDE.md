# MenuQR — Contexto para Claude Code

> **Leé esto primero.** Este archivo te da todo el contexto del proyecto para que puedas trabajar sin que Tincho tenga que explicarte nada.

---

## Stack

- **Frontend**: React + Vite — archivo principal `src/MenuQR.jsx` (~8600+ líneas, un solo archivo gigante)
- **Deploy**: Vercel → `https://menuqr-ten.vercel.app`
- **Backend**: Supabase (proyecto `fwovflsaghnutysjyaus`) — multi-tenant
- **Repo**: `https://github.com/laquima6-coder/menuqr.git`
- **Token git**: `TU_GITHUB_TOKEN`
- **Remote con token**: `https://TU_GITHUB_TOKEN@github.com/laquima6-coder/menuqr.git`

---

## Restaurante de prueba

| Campo | Valor |
|-------|-------|
| Nombre | Los amigos |
| Slug | `mi-restaurante` |
| Email dueño | `laquima6@gmail.com` |
| restauranteId | `5b52b06e-7aa8-4cf1-be4c-3646611dacaa` |

---

## URLs de la app

| Pantalla | URL |
|----------|-----|
| Carta pública mesa | `https://menuqr-ten.vercel.app/menu/mi-restaurante/mesa/1` |
| Carta pública vitrina | `https://menuqr-ten.vercel.app/menu/mi-restaurante/vitrina` |
| Pantalla cocina | `https://menuqr-ten.vercel.app/mi-restaurante/cocina` |
| Panel dueño | `https://menuqr-ten.vercel.app/panel` |
| Panel SuperAdmin | `https://menuqr-ten.vercel.app/superadmin` |
| Landing | `https://menuqr-ten.vercel.app/` |

---

## Rutas React Router (en `src/App.jsx`)

```
/menu/:slug              → MenuPublico
/menu/:slug/mesa/:mesa   → MenuPublico
/menu/:slug/vitrina      → MenuPublico vitrina
/:slug                   → MenuPublico
/:slug/mesa/:mesa        → MenuPublico
/:slug/vitrina           → MenuPublico vitrina
/:slug/cocina            → CocinaScreen
/:slug/pedido/:id        → PedidoStatus
/panel                   → MenuQR (admin)
/registro                → Registro
/superadmin              → SuperAdmin
/                        → LandingPage
```

---

## Exports de `src/MenuQR.jsx`

- `export const GS` — estilos globales (aprox línea 8)
- `export function ClientApp` — carta pública del restaurante (aprox línea 1535)
- `export default MenuQR` — panel admin del dueño

---

## Tema visual (CSS variables)

```
--ab:#011A16; --as:#022E28; --ac:#033D35; --abr:#0A5C50;
--am:#7AC4B8; --ad:#A8D4CF; --at:#FFFFFF; --abri:#FFFFFF;
--ag:#0D6B5E; --aam:#C9A84C; --ar:#E57373; --abl:#64B5F6;
body { background:#011A16 }
```

---

## Reglas CRITICAS de desarrollo

1. **NUNCA usar el Edit tool en `src/MenuQR.jsx`** — es un archivo de 8600+ líneas y el Edit tool lo corrompe. Siempre usar Python string replacement via bash:

```bash
python3 -c "
with open('src/MenuQR.jsx', 'r') as f: content = f.read()
content = content.replace('TEXTO_VIEJO', 'TEXTO_NUEVO')
with open('src/MenuQR.jsx', 'w') as f: f.write(content)
"
```

2. **Git siempre desde la raíz del repo** con el remote que incluye el token.

3. **Probar antes de reportar como listo** — verificar que el build de Vercel pase y la URL funcione.

4. **Entregar completo de una sola vez** — no preguntar a cada paso.

5. **Dar siempre una recomendación** al final de cada respuesta.

6. **Comportarse como senior**: explicar objetivo → apuntar a archivos → UNA pregunta de confirmación → ejecutar → revisar diff antes de reportar listo.

---

## Workflow git

```bash
# Configurar remote con token
git remote set-url origin https://TU_GITHUB_TOKEN@github.com/laquima6-coder/menuqr.git

# Ver estado
git log --oneline -5
git status

# Push
git add -A
git commit -m "feat: descripción del cambio"
git push origin main
```

Vercel hace deploy automático al push a `main`. Tarda ~1-2 minutos.

---

## Estado actual (2026-06-28)

- QR carta pública funciona en mobile
- MenuPublico importa ClientApp directo, sin auth check
- Supabase responde correctamente
- Último commit: `cbb5284 fix: eliminar campo fuente de inserts`

---

## Archivos clave

```
src/
  MenuQR.jsx        ← ARCHIVO PRINCIPAL (8600+ líneas)
  App.jsx           ← React Router — todas las rutas
  lib/supabase.js   ← cliente Supabase
  pages/
    MenuPublico.jsx ← wrapper carta pública QR
    CocinaScreen.jsx
    Registro.jsx
    SuperAdmin.jsx
```

---

Dueño del producto: Tincho (laquima6@gmail.com)
