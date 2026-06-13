# MenuQR 🍽️

Carta digital con QR para restaurantes. El cliente escanea, ve el menú y hace su pedido desde la mesa.

## Stack
- **Frontend:** React + Vite (PWA)
- **Base de datos:** Supabase (realtime)
- **Hosting:** Netlify
- **QR:** api.qrserver.com

---

## Instalación y primer arranque

### 1. Clonar o copiar el proyecto
```bash
cd menuqr
npm install
```

### 2. Configurar variables de entorno
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus claves de Supabase
# (las obtenés en supabase.com → tu proyecto → Settings → API)
```

### 3. Correr en desarrollo
```bash
npm run dev
# Abre http://localhost:5173
```

---

## Configurar Supabase

### 1. Crear proyecto
- Entrá a supabase.com
- New project → región **South America**
- Esperá que termine de crear (~2 minutos)

### 2. Ejecutar el schema
- Supabase → SQL Editor → New query
- Pegá todo el contenido de `supabase-schema.sql`
- Click "Run"

### 3. Copiar las claves
- Supabase → Settings → API
- Copiá `Project URL` y `anon public`
- Pegálas en tu archivo `.env`

---

## Deploy en Netlify

### Opción A — Drag & Drop (más fácil)
```bash
npm run build
# Arrastrá la carpeta /dist a netlify.com/drop
```

### Opción B — Desde GitHub (recomendado)
1. Subí el repo a GitHub
2. En Netlify: "Import from Git"
3. En "Environment variables" agregá:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático en cada push

---

## Estructura del proyecto

```
menuqr/
├── index.html              ← entrada HTML con meta tags PWA
├── vite.config.js          ← config Vite + PWA plugin
├── package.json            ← dependencias
├── netlify.toml            ← config deploy + redirects
├── .env.example            ← template de variables de entorno
├── .gitignore
├── supabase-schema.sql     ← SQL para crear las tablas
└── src/
    ├── main.jsx            ← arranca React
    ├── App.jsx             ← estado global + localStorage temporal
    ├── MenuQR.jsx          ← toda la app (UI completa)
    └── lib/
        └── supabase.js     ← cliente y helpers de Supabase
```

---

## Flujo de la app

```
Cliente escanea QR de mesa 7
  → Abre turestaurante.netlify.app/mesa/7
  → Ve la carta (datos de Supabase)
  → Hace su pedido
  → Pedido se guarda en Supabase
  → El dueño lo ve en tiempo real en el panel admin
```

---

## Notas importantes

- El archivo `.env` **nunca** se sube a GitHub (está en .gitignore)
- En producción las variables van en Netlify → Site settings → Environment variables
- Mientras no tengas Supabase configurado, los datos se guardan en localStorage (se pierden al limpiar el navegador)
- Los QR generados apuntan a la URL configurada en el panel admin → Gestión → Local → URL de tu carta
