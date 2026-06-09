import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import MenuQR, { INIT_LOCAL, INIT_CATS, INIT_PRODS } from './MenuQR.jsx'
import MenuPublico from './pages/MenuPublico.jsx'
import Registro from './pages/Registro.jsx'
import SuperAdmin from './pages/SuperAdmin.jsx'

export default function App() {
  const [local, setLocal] = useState(() => {
    try { const s = localStorage.getItem('menuqr_local'); return s ? JSON.parse(s) : INIT_LOCAL } catch { return INIT_LOCAL }
  })
  const [cats, setCats] = useState(() => {
    try { const s = localStorage.getItem('menuqr_cats'); return s ? JSON.parse(s) : INIT_CATS } catch { return INIT_CATS }
  })
  const [prods, setProds] = useState(() => {
    try { const s = localStorage.getItem('menuqr_prods'); return s ? JSON.parse(s) : INIT_PRODS } catch { return INIT_PRODS }
  })

  useEffect(() => { try { localStorage.setItem('menuqr_local', JSON.stringify(local)) } catch {} }, [local])
  useEffect(() => { try { localStorage.setItem('menuqr_cats',  JSON.stringify(cats))  } catch {} }, [cats])
  useEffect(() => { try { localStorage.setItem('menuqr_prods', JSON.stringify(prods)) } catch {} }, [prods])

  return (
    <BrowserRouter>
      <Routes>
        {/* Carta pública — clientes escanean el QR */}
        <Route path="/menu/:slug" element={<MenuPublico />} />
        <Route path="/menu/:slug/mesa/:mesa" element={<MenuPublico />} />

        {/* Registro de nuevo restaurante */}
        <Route path="/registro" element={<Registro />} />

        {/* Panel super-admin (solo vos) */}
        <Route path="/superadmin" element={<SuperAdmin />} />
        <Route path="/superadmin/:section" element={<SuperAdmin />} />

        {/* Panel del dueño + landing */}
        <Route path="/*" element={
          <MenuQR
            local={local}   setLocal={setLocal}
            cats={cats}     setCats={setCats}
            prods={prods}   setProds={setProds}
          />
        } />
      </Routes>
    </BrowserRouter>
  )
}
