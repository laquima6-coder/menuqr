import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import MenuQR, { INIT_LOCAL, INIT_CATS, INIT_PRODS } from './MenuQR.jsx'
import MenuPublico from './pages/MenuPublico.jsx'
import Registro from './pages/Registro.jsx'
import SuperAdmin from './pages/SuperAdmin.jsx'
import LandingPage from './pages/LandingPage.jsx'
import CocinaScreen from './pages/CocinaScreen.jsx'
import PedidoStatus from './pages/PedidoStatus.jsx'
import DeliveryPage from './pages/DeliveryPage.jsx'

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
        {/* Carta publica - clientes escanean el QR */}
        <Route path="/menu/:slug" element={<MenuPublico />} />
        <Route path="/menu/:slug/mesa/:mesa" element={<MenuPublico />} />
        <Route path="/menu/:slug/vitrina" element={<MenuPublico vitrina />} />
        <Route path="/menu/:slug/delivery" element={<DeliveryPage />} />

        {/* Registro de nuevo restaurante */}
        <Route path="/registro" element={<Registro />} />

        {/* Panel super-admin (solo vos) */}
        <Route path="/superadmin" element={<SuperAdmin />} />
        <Route path="/superadmin/:section" element={<SuperAdmin />} />

        {/* Carta publica por slug corto */}
        <Route path="/:slug/cocina" element={<CocinaScreen />} />
        <Route path="/:slug/pedido/:id" element={<PedidoStatus />} />
        <Route path="/menu/:slug/cocina" element={<CocinaScreen />} />
        <Route path="/:slug" element={<MenuPublico />} />
        <Route path="/:slug/mesa/:mesa" element={<MenuPublico />} />
        <Route path="/:slug/vitrina" element={<MenuPublico vitrina />} />

        {/* Panel del dueno - acceso directo */}
        <Route path="/panel" element={
          <MenuQR
            local={local}   setLocal={setLocal}
            cats={cats}     setCats={setCats}
            prods={prods}   setProds={setProds}
          />
        } />
        <Route path="/panel/*" element={
          <MenuQR
            local={local}   setLocal={setLocal}
            cats={cats}     setCats={setCats}
            prods={prods}   setProds={setProds}
          />
        } />

        {/* Landing page de ventas - raiz */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  )
}
