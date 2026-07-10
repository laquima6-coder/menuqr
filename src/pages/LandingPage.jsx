import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/* ══════════════════════════════════════════════════════
   LANDING PAGE — PedidosQR
   Página de ventas / marketing
══════════════════════════════════════════════════════ */

const G = '#C9A84C'   // gold
const G2 = '#E8C97A'  // gold light
const BG = '#0A0806'  // background

const FEATS = [
  { icon:'🪑', title:'QR por mesa',       desc:'Cada mesa con su código único. El cliente escanea y pide sin llamar al mozo.' },
  { icon:'🪟', title:'Vitrina digital',   desc:'Un QR para la entrada o vidrio. La carta completa visible sin necesidad de estar sentado.' },
  { icon:'👨‍🍳', title:'Pantalla de cocina', desc:'Los pedidos llegan al instante a la pantalla de cocina, ordenados y sin errores.' },
  { icon:'📶', title:'QR de WiFi',        desc:'El cliente se conecta al WiFi del local solo escaneando. Sin contraseñas difíciles.' },
  { icon:'💬', title:'WhatsApp directo',  desc:'Un QR que abre tu WhatsApp con un mensaje predefinido. Fácil para consultas o delivery.' },
  { icon:'🌍', title:'9 idiomas',         desc:'Tu carta en español, inglés, portugués, italiano, francés, alemán, chino, japonés y coreano.' },
  { icon:'🔥', title:'Happy Hour',        desc:'Activá descuentos automáticos con temporizador visible. El cliente ve la cuenta regresiva.' },
  { icon:'🛎️', title:'Solicitudes',       desc:'El cliente pide la cuenta, hielo, cubiertos o al mozo desde la mesa, sin moverse.' },
  { icon:'📊', title:'Panel completo',    desc:'Gestioná tu carta, mesas, pedidos y caja desde un solo lugar. En cualquier celular.' },
]

const STEPS = [
  { n:'01', icon:'✍️', title:'Registrás tu local',     desc:'30 segundos. Solo el nombre, tu mail y contraseña. Sin tarjeta de crédito.' },
  { n:'02', icon:'📸', title:'Cargás tu carta',         desc:'Agregás categorías y productos con foto, precio y descripción. Desde el celular.' },
  { n:'03', icon:'🖨️', title:'Imprimís el QR y listo', desc:'Generás los QRs por mesa, los imprimís y tus clientes ya pueden pedir.' },
]

const PLANS = [
  {
    name: 'Gratis',
    price: '$0',
    period: 'para siempre',
    color: '#2A2A2A',
    border: '#333',
    features: [
      '✓ Hasta 20 productos',
      '✓ QR de mesa y vitrina',
      '✓ WiFi y WhatsApp QR',
      '✓ Solicitudes (mozo, cuenta)',
      '✓ Multilenguaje',
      '✗ Pantalla de cocina',
      '✗ Happy Hour',
      '✗ Soporte prioritario',
    ],
    cta: 'Empezar gratis',
    ctaTo: '/registro',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$9.990',
    period: 'por mes · ARS',
    color: `${G}18`,
    border: `${G}88`,
    features: [
      '✓ Productos ilimitados',
      '✓ QR de mesa y vitrina',
      '✓ WiFi y WhatsApp QR',
      '✓ Solicitudes (mozo, cuenta)',
      '✓ Multilenguaje',
      '✓ Pantalla de cocina',
      '✓ Happy Hour con temporizador',
      '✓ Soporte prioritario por WA',
    ],
    cta: 'Empezar Pro',
    ctaTo: '/registro',
    highlight: true,
  },
]

/* Mockup del celular — muestra la carta en miniatura */
function PhoneMockup() {
  const items = [
    { emoji:'🇦🇷', name:'Porteño',    price:'$2.800', color:'#C9A84C' },
    { emoji:'🇺🇸', name:'Americano',  price:'$3.200', color:'#EF4444' },
    { emoji:'🇩🇪', name:'Frankfurt',  price:'$3.400', color:'#10B981' },
  ]
  return (
    <div style={{position:'relative',width:220,flexShrink:0}}>
      {/* Phone shell */}
      <div style={{
        width:220,height:440,borderRadius:32,
        background:'linear-gradient(160deg,#1A1A1A,#0D0D0D)',
        border:'3px solid #2A2A2A',
        boxShadow:'0 32px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.05)',
        overflow:'hidden',position:'relative',
      }}>
        {/* Notch */}
        <div style={{width:80,height:18,background:'#0D0D0D',borderRadius:'0 0 14px 14px',margin:'0 auto',position:'relative',zIndex:2}}/>
        {/* Screen content */}
        <div style={{display:'flex',height:'calc(100% - 18px)',overflow:'hidden'}}>
          {/* Sidebar mini */}
          <div style={{width:44,background:'#0C0C0C',borderRight:'1px solid #1C1C1C',display:'flex',flexDirection:'column',alignItems:'center',padding:'6px 0',gap:4}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#1A0D00,#2A1A00)',border:'1.5px solid #C9A84C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,marginBottom:4}}>🌍</div>
            {['🌍','⭐','🔥','🥤'].map((ic,i)=>(
              <div key={i} style={{width:'100%',padding:'5px 0',textAlign:'center',fontSize:12,borderLeft:i===0?'2px solid #C9A84C':'2px solid transparent',background:i===0?'rgba(201,168,76,.1)':'none'}}>{ic}</div>
            ))}
            <div style={{flex:1}}/>
            <div style={{fontSize:8,color:'#2A2A2A',letterSpacing:.5,textAlign:'center',lineHeight:1.4,padding:'0 2px'}}>MESA<br/>1</div>
          </div>
          {/* Main mini */}
          <div style={{flex:1,background:'#0A0806',overflowY:'hidden'}}>
            <div style={{background:'linear-gradient(135deg,#1A0800,#0D0D0D)',padding:'6px 6px 4px',textAlign:'center',borderBottom:'1px solid #1A1A1A'}}>
              <div style={{fontFamily:'serif',fontSize:9,fontWeight:900,color:'#FFF',lineHeight:1}}>Panchos del Mundo</div>
              <div style={{fontSize:7,color:'#3A2A10',letterSpacing:1,marginTop:1}}>BIENVENIDO</div>
            </div>
            {/* Category header */}
            <div style={{display:'flex',alignItems:'center',gap:3,padding:'6px 5px 3px'}}>
              <div style={{flex:1,height:1,background:'linear-gradient(to right,transparent,#1E1E1E)'}}/>
              <span style={{fontSize:6,color:'#C9A84C',letterSpacing:1}}>◆ 🌍 PANCHOS ◆</span>
              <div style={{flex:1,height:1,background:'linear-gradient(to left,transparent,#1E1E1E)'}}/>
            </div>
            {/* Product grid mini */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:3,padding:'0 4px'}}>
              {items.map((it,i)=>(
                <div key={i} style={{background:'#111',borderRadius:5,overflow:'hidden',border:'1px solid #1C1C1C'}}>
                  <div style={{aspectRatio:'1',background:'linear-gradient(135deg,#181818,#101010)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{it.emoji}</div>
                  <div style={{padding:'2px 3px'}}>
                    <div style={{fontSize:6,fontWeight:700,color:'#EEE',lineHeight:1.1,marginBottom:1}}>{it.name}</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:7,fontWeight:800,color:'#C9A84C'}}>{it.price}</div>
                      <div style={{width:10,height:10,borderRadius:3,background:'#C9A84C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#0A0806',fontWeight:900}}>+</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Glow */}
      <div style={{position:'absolute',top:'30%',left:'50%',transform:'translate(-50%,-50%)',width:160,height:160,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,.15),transparent 70%)',pointerEvents:'none',zIndex:-1}}/>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [activeFaq, setActiveFaq] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const FAQS = [
    { q:'¿Necesito saber de tecnología?', a:'Para nada. Si podés usar WhatsApp, podés usar PedidosQR. Todo es desde el celular, sin instalaciones.' },
    { q:'¿Cuánto tarda en estar listo?', a:'En menos de 10 minutos podés tener tu primera carta online con QR listo para imprimir.' },
    { q:'¿Qué pasa si se me va la luz o el WiFi?', a:'La carta se guarda en el celular de cada cliente. Aunque se corte el WiFi, los clientes que ya la abrieron la siguen viendo.' },
    { q:'¿Puedo cambiar los precios fácil?', a:'Sí. Entrás al panel, tocás el producto, cambiás el precio y listo — se actualiza en tiempo real para todos los clientes.' },
    { q:'¿Funciona sin que el cliente descargue nada?', a:'Exacto. El cliente escanea el QR con la cámara del celular y la carta abre en el navegador. Sin apps, sin descargas.' },
  ]

  return (
    <div style={{background:BG,minHeight:'100vh',fontFamily:"'DM Sans',sans-serif",color:'#FFF',overflowX:'hidden'}}>

      {/* ── GOOGLE FONTS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Outfit:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#0D0D0D}
        ::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:3px}
        .btn-gold{background:${G};color:#0A0806;border:none;border-radius:12px;padding:13px 28px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:800;cursor:pointer;transition:all .2s;letter-spacing:.3px}
        .btn-gold:hover{background:${G2};transform:translateY(-1px);box-shadow:0 8px 24px rgba(201,168,76,.35)}
        .btn-ghost{background:transparent;color:${G};border:1.5px solid ${G}44;border-radius:12px;padding:12px 26px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s}
        .btn-ghost:hover{border-color:${G}88;background:rgba(201,168,76,.06)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .float{animation:float 4s ease-in-out infinite}
        .fade-up{animation:fadeUp .6s ease forwards}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:100,
        background:scrolled?'rgba(10,8,6,.92)':'transparent',
        backdropFilter:scrolled?'blur(12px)':'none',
        borderBottom:scrolled?'1px solid #1A1A1A':'none',
        transition:'all .3s',padding:'0 24px',
      }}>
        <div style={{maxWidth:1100,margin:'0 auto',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>window.scrollTo(0,0)}>
            <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${G},#8B6914)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🍽️</div>
            <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:18,color:'#FFF',letterSpacing:-.3}}>Pedidos<span style={{color:G}}>QR</span></span>
          </div>
          {/* Nav links */}
          <div style={{display:'flex',gap:28,alignItems:'center'}}>
            <a href="#problemas" style={{color:'#888',fontSize:14,fontWeight:600,textDecoration:'none',transition:'color .2s'}}
              onMouseEnter={e=>e.target.style.color='#FFF'} onMouseLeave={e=>e.target.style.color='#888'}>El Problema</a>
            <a href="#features" style={{color:'#888',fontSize:14,fontWeight:600,textDecoration:'none',transition:'color .2s'}}
              onMouseEnter={e=>e.target.style.color='#FFF'} onMouseLeave={e=>e.target.style.color='#888'}>Funciones</a>
            <a href="#pricing" style={{color:'#888',fontSize:14,fontWeight:600,textDecoration:'none',transition:'color .2s'}}
              onMouseEnter={e=>e.target.style.color='#FFF'} onMouseLeave={e=>e.target.style.color='#888'}>Precios</a>
            <a href="#demo" style={{color:'#888',fontSize:14,fontWeight:600,textDecoration:'none',transition:'color .2s'}}
              onMouseEnter={e=>e.target.style.color='#FFF'} onMouseLeave={e=>e.target.style.color='#888'}>Demo</a>
            <button className="btn-ghost" style={{padding:'8px 18px',fontSize:13}} onClick={()=>navigate('/panel')}>Acceder</button>
            <button className="btn-gold" style={{padding:'9px 20px',fontSize:13}} onClick={()=>navigate('/registro')}>Empezar gratis</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{minHeight:'100vh',display:'flex',alignItems:'center',paddingTop:100,paddingBottom:80,padding:'100px 24px 80px',position:'relative',overflow:'hidden'}}>
        {/* Background glow effects */}
        <div style={{position:'absolute',top:'10%',left:'5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,.06),transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'10%',right:'10%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,.04),transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,.015) 1px,transparent 0)',backgroundSize:'32px 32px',pointerEvents:'none'}}/>

        <div style={{maxWidth:1100,margin:'0 auto',width:'100%',display:'flex',gap:60,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
          {/* Text */}
          <div style={{flex:'1 1 400px',maxWidth:560}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.2)',borderRadius:100,padding:'6px 14px',marginBottom:24}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:G,display:'inline-block'}}/>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:G,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase'}}>Carta digital para restaurantes</span>
            </div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(36px,5vw,62px)',fontWeight:900,lineHeight:1.05,color:'#FFF',marginBottom:20}}>
              Tu menú digital.<br/>
              <span style={{background:`linear-gradient(90deg,${G},${G2})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Listo en 10 minutos.</span>
            </h1>
            <p style={{fontSize:18,color:'#666',lineHeight:1.65,marginBottom:32,maxWidth:480}}>
              QR codes por mesa, pedidos online, pantalla de cocina y carta multilenguaje para tu restaurante. Sin apps, sin contratos, sin complicaciones.
            </p>
            <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:40}}>
              <button className="btn-gold" style={{fontSize:16,padding:'15px 32px'}} onClick={()=>navigate('/registro')}>
                Empezar gratis →
              </button>
              <button className="btn-ghost" style={{fontSize:15,padding:'14px 28px'}} onClick={()=>window.open('/menu/mi-restaurante','_blank')}>
                🍽️ Ver demo en vivo
              </button>
            </div>
            {/* Trust badges */}
            <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
              {['✓ Sin tarjeta de crédito','✓ Gratis para siempre','✓ Listo en 10 min'].map(t=>(
                <span key={t} style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'#555',fontWeight:600}}>{t}</span>
              ))}
            </div>
          </div>
          {/* Phone mockup */}
          <div className="float" style={{flex:'0 0 auto',display:'flex',justifyContent:'center'}}>
            <PhoneMockup/>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{borderTop:'1px solid #1A1A1A',borderBottom:'1px solid #1A1A1A',background:'#0D0D0D',padding:'28px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:20}}>
          {[
            {n:'10 min',  l:'para tener tu carta online'},
            {n:'0 apps',  l:'el cliente no descarga nada'},
            {n:'9 idiomas',l:'traducción automática'},
            {n:'100%',    l:'desde el celular'},
          ].map(s=>(
            <div key={s.n} style={{textAlign:'center'}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:G,lineHeight:1}}>{s.n}</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'#555',marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>


      {/* ── PROBLEMAS ── */}
      <section id="problemas" style={{padding:'96px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'#EF4444',letterSpacing:3,textTransform:'uppercase',marginBottom:12}}>¿Te suena familiar?</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(28px,4vw,48px)',fontWeight:900,color:'#FFF',lineHeight:1.1,marginBottom:16}}>Los dolores de tu restaurante</h2>
            <p style={{fontSize:17,color:'#555',maxWidth:520,margin:'0 auto',lineHeight:1.6}}>Problemas que cuestan dinero, clientes y reputación todos los días.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
            {[
              { icon:'😤', title:'Errores en pedidos',      desc:'Los mozos anotan mal → Cocina prepara equivocado → Clientes insatisfechos → Pérdida de dinero y reputación.' },
              { icon:'⏰', title:'Pérdida de tiempo',       desc:'El cliente espera sin saber qué pasa → El mozo va y viene → Cocina no sabe prioridades → Gente molesta.' },
              { icon:'📋', title:'Menús desactualizados',   desc:'Cambiás precios y quedan impresos viejos → El cliente pide lo que no tenés → Conflictos innecesarios.' },
              { icon:'💰', title:'Ventas perdidas',         desc:'Clientes en la puerta ven espera → Se van a la competencia → Mesas libres sin ganancias.' },
              { icon:'📱', title:'Sin delivery eficiente',  desc:'Entregas tarde → Clientes llaman sin información → Reputación dañada en apps.' },
              { icon:'📊', title:'Sin datos de tu negocio', desc:'No sabés qué productos venden más → Sin análisis → Tomás decisiones a ciegas.' },
            ].map((p,i)=>(
              <div key={i} style={{
                background:'#0D0D0D',border:'1px solid rgba(239,68,68,.15)',borderRadius:16,padding:'24px 20px',
                transition:'border-color .2s,transform .2s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(239,68,68,.35)';e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(239,68,68,.15)';e.currentTarget.style.transform='translateY(0)'}}>
                <div style={{fontSize:32,marginBottom:12}}>{p.icon}</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:'#FFF',marginBottom:8}}>{p.title}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#555',lineHeight:1.6}}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUCION ── */}
      <section id="solucion" style={{padding:'96px 24px',background:'#0D0D0D',borderTop:'1px solid #1A1A1A',borderBottom:'1px solid #1A1A1A'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:G,letterSpacing:3,textTransform:'uppercase',marginBottom:12}}>La respuesta</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(28px,4vw,48px)',fontWeight:900,color:'#FFF',lineHeight:1.1,marginBottom:16}}>
              La solución: <span style={{background:`linear-gradient(90deg,${G},${G2})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>PedidosQR</span>
            </h2>
            <p style={{fontSize:17,color:'#555',maxWidth:520,margin:'0 auto',lineHeight:1.6}}>Todo lo que necesitás para digitalizar tu restaurante, en un solo lugar.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
            {[
              { icon:'📱', title:'Pedidos sin errores',      desc:'El cliente elige desde su teléfono → 0 errores de anotación → Pedido perfecto en cocina → Cliente feliz.' },
              { icon:'👁️', title:'Transparencia total',      desc:'El cliente ve en tiempo real: Confirmado → Preparando → Listo → Entregado. Sin incertidumbre, sin reclamos.' },
              { icon:'🎨', title:'Tu carta personalizada',   desc:'Tus propias fotos de tus platos → Diseño profesional al instante → Cambios en tiempo real.' },
              { icon:'🚀', title:'Más ventas automático',    desc:'Clientes piden más rápido → Sin tiempo de espera → Más mesas por hora → Más dinero al final del día.' },
              { icon:'📍', title:'Delivery con mapas',       desc:'Google Maps + TomTom integrados → El cliente ve dónde está su pedido → Menos llamadas, más entregas exitosas.' },
              { icon:'📈', title:'Dashboard inteligente',    desc:'Datos en tiempo real: qué vende, cuándo, cuánto ganás → Decisiones con información, no intuición.' },
            ].map((s,i)=>(
              <div key={i} style={{
                background:'#0A0806',border:`1px solid ${G}18`,borderRadius:16,padding:'24px 20px',
                transition:'border-color .2s,transform .2s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=`${G}44`;e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=`${G}18`;e.currentTarget.style.transform='translateY(0)'}}>
                <div style={{fontSize:32,marginBottom:12}}>{s.icon}</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:'#FFF',marginBottom:8}}>{s.title}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#555',lineHeight:1.6}}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:48}}>
            <button className="btn-gold" style={{fontSize:16,padding:'15px 36px'}} onClick={()=>navigate('/registro')}>
              Quiero esto para mi restaurante →
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{padding:'96px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:G,letterSpacing:3,textTransform:'uppercase',marginBottom:12}}>Todo incluido</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(28px,4vw,48px)',fontWeight:900,color:'#FFF',lineHeight:1.1,marginBottom:16}}>Todo lo que tu restaurante necesita</h2>
            <p style={{fontSize:17,color:'#555',maxWidth:520,margin:'0 auto',lineHeight:1.6}}>Sin módulos extra. Sin costos ocultos. Todo viene incluido desde el primer día.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
            {FEATS.map((f,i)=>(
              <div key={i} style={{
                background:'#0D0D0D',border:'1px solid #1C1C1C',borderRadius:16,padding:'22px 20px',
                transition:'border-color .2s,transform .2s',cursor:'default',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#2A2A2A';e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#1C1C1C';e.currentTarget.style.transform='translateY(0)'}}>
                <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:'#FFF',marginBottom:6}}>{f.title}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#555',lineHeight:1.55}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{padding:'80px 24px',background:'#0D0D0D',borderTop:'1px solid #1A1A1A',borderBottom:'1px solid #1A1A1A'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:G,letterSpacing:3,textTransform:'uppercase',marginBottom:12}}>Simple como tiene que ser</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(26px,4vw,44px)',fontWeight:900,color:'#FFF'}}>Tres pasos y ya estás vendiendo</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:24}}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{position:'relative',textAlign:'center',padding:'32px 24px'}}>
                {i < STEPS.length-1 && (
                  <div style={{position:'absolute',top:50,right:-12,width:24,height:2,background:'linear-gradient(to right,#2A2A2A,transparent)',display:'none'}}/>
                )}
                <div style={{width:64,height:64,borderRadius:'50%',background:`linear-gradient(135deg,${G}22,${G}08)`,border:`1.5px solid ${G}44`,margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>{s.icon}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:G,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>{s.n}</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:700,color:'#FFF',marginBottom:8}}>{s.title}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#555',lineHeight:1.6}}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:40}}>
            <button className="btn-gold" style={{fontSize:16,padding:'15px 36px'}} onClick={()=>navigate('/registro')}>
              Crear mi carta ahora →
            </button>
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <section id="demo" style={{padding:'96px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',gap:60,alignItems:'center',flexWrap:'wrap',justifyContent:'space-between'}}>
          <div style={{flex:'1 1 380px',maxWidth:520}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:G,letterSpacing:3,textTransform:'uppercase',marginBottom:12}}>Demo en vivo</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(26px,4vw,44px)',fontWeight:900,color:'#FFF',lineHeight:1.1,marginBottom:16}}>Probalo antes de registrarte</h2>
            <p style={{fontSize:17,color:'#555',lineHeight:1.65,marginBottom:28}}>
              Abrí la carta de <strong style={{color:'#CCC'}}>Panchos del Mundo</strong> — nuestro restaurante demo — desde tu celular. Navegá el menú, simulá un pedido y comprobá cómo lo ve tu cliente.
            </p>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <button className="btn-gold" style={{fontSize:15,padding:'13px 28px'}} onClick={()=>window.open('/menu/mi-restaurante','_blank')}>
                🍽️ Ver carta demo
              </button>
              <button className="btn-ghost" style={{fontSize:14,padding:'12px 22px'}} onClick={()=>window.open('/menu/mi-restaurante/vitrina','_blank')}>
                🪟 Ver modo vitrina
              </button>
            </div>
            <div style={{marginTop:28,padding:'16px 20px',background:'#0D0D0D',border:'1px solid #1C1C1C',borderRadius:12}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'#3A3A3A',letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>URL de la demo</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:G,wordBreak:'break-all'}}>pedidosqr-ten.vercel.app/menu/mi-restaurante</div>
            </div>
          </div>
          {/* Mini screens */}
          <div style={{flex:'0 0 auto',display:'flex',gap:16,alignItems:'flex-start'}}>
            <PhoneMockup/>
            <div style={{width:2,height:320,background:'linear-gradient(to bottom,transparent,#1E1E1E,transparent)',alignSelf:'center'}}/>
            {/* QR phone */}
            <div style={{width:150,height:300,borderRadius:24,background:'linear-gradient(160deg,#1A1A1A,#0D0D0D)',border:'2px solid #2A2A2A',overflow:'hidden',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:16}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:'#3A3A3A',letterSpacing:1.5,textTransform:'uppercase',textAlign:'center'}}>Pedí desde tu mesa</div>
              <div style={{width:80,height:80,background:'#FFF',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#333',border:`3px solid ${G}`}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:1}}>
                  {Array.from({length:25}).map((_,i)=>(
                    <div key={i} style={{width:10,height:10,background:[0,1,2,5,10,12,14,20,22,24,6,7,8,17,18,19].includes(i)?'#0A0806':'transparent',borderRadius:1}}/>
                  ))}
                </div>
              </div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:8,color:'#555',textAlign:'center',lineHeight:1.4}}>Escaneá y pedí<br/>desde la mesa</div>
              <div style={{width:'100%',background:`${G}22`,border:`1px solid ${G}44`,borderRadius:8,padding:'8px 0',textAlign:'center'}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:9,fontWeight:700,color:G}}>🛎️ Mesa 1</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{padding:'80px 24px',background:'#0D0D0D',borderTop:'1px solid #1A1A1A',borderBottom:'1px solid #1A1A1A'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:G,letterSpacing:3,textTransform:'uppercase',marginBottom:12}}>Precios</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(26px,4vw,44px)',fontWeight:900,color:'#FFF',marginBottom:12}}>Simple y transparente</h2>
            <p style={{fontSize:16,color:'#555'}}>Sin sorpresas. Sin comisiones por pedido.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:24,maxWidth:680,margin:'0 auto'}}>
            {PLANS.map((p,i)=>(
              <div key={i} style={{
                background:p.color,border:`1.5px solid ${p.border}`,borderRadius:20,padding:'32px 28px',
                position:'relative',boxShadow:p.highlight?`0 0 40px ${G}15`:'none',
              }}>
                {p.highlight && (
                  <div style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:G,color:'#0A0806',borderRadius:100,padding:'5px 18px',fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:800,whiteSpace:'nowrap',letterSpacing:.5}}>MÁS POPULAR ⭐</div>
                )}
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:700,color:'#FFF',marginBottom:4}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:900,color:p.highlight?G:'#FFF'}}>{p.price}</span>
                </div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'#555',marginBottom:24}}>{p.period}</div>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28}}>
                  {p.features.map((f,fi)=>(
                    <div key={fi} style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:f.startsWith('✓')?'#CCC':'#3A3A3A',display:'flex',gap:8}}>
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  className={p.highlight?'btn-gold':'btn-ghost'}
                  style={{width:'100%',padding:'13px 0',fontSize:15}}
                  onClick={()=>navigate(p.ctaTo)}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{padding:'80px 24px'}}>
        <div style={{maxWidth:680,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:G,letterSpacing:3,textTransform:'uppercase',marginBottom:12}}>Preguntas frecuentes</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(24px,4vw,40px)',fontWeight:900,color:'#FFF'}}>Dudas comunes</h2>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {FAQS.map((faq,i)=>(
              <div key={i} style={{background:'#0D0D0D',border:'1px solid #1C1C1C',borderRadius:14,overflow:'hidden',cursor:'pointer'}}
                onClick={()=>setActiveFaq(activeFaq===i?null:i)}>
                <div style={{padding:'18px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,color:'#DDD'}}>{faq.q}</span>
                  <span style={{color:G,fontSize:18,fontWeight:700,transition:'transform .2s',transform:activeFaq===i?'rotate(45deg)':'none',flexShrink:0,marginLeft:12}}>+</span>
                </div>
                {activeFaq===i && (
                  <div style={{padding:'0 20px 18px',fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#555',lineHeight:1.65}}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{padding:'80px 24px',background:'linear-gradient(135deg,#0F0800,#0D0D0D)',borderTop:'1px solid #1A1A1A'}}>
        <div style={{maxWidth:640,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>🍽️</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(26px,4vw,44px)',fontWeight:900,color:'#FFF',marginBottom:16,lineHeight:1.1}}>
            Tu restaurante merece<br/>
            <span style={{background:`linear-gradient(90deg,${G},${G2})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>una carta a la altura</span>
          </h2>
          <p style={{fontSize:17,color:'#555',marginBottom:36,lineHeight:1.6}}>Registrarte es gratis y tarda 30 segundos. Sin tarjeta, sin contrato, sin letra chica.</p>
          <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn-gold" style={{fontSize:17,padding:'16px 40px'}} onClick={()=>navigate('/registro')}>
              Crear mi carta gratis →
            </button>
            <button className="btn-ghost" style={{fontSize:15,padding:'15px 28px'}} onClick={()=>window.open('/menu/mi-restaurante','_blank')}>
              Ver demo primero
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:'1px solid #1A1A1A',padding:'40px 24px',background:'#0A0806'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${G},#8B6914)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🍽️</div>
            <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:15,color:'#FFF'}}>Pedidos<span style={{color:G}}>QR</span></span>
          </div>
          <div style={{display:'flex',gap:24}}>
            <button onClick={()=>navigate('/registro')} style={{background:'none',border:'none',color:'#555',fontSize:13,cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>Registrarse</button>
            <button onClick={()=>navigate('/panel')} style={{background:'none',border:'none',color:'#555',fontSize:13,cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>Panel</button>
            <button onClick={()=>window.open('/menu/mi-restaurante','_blank')} style={{background:'none',border:'none',color:'#555',fontSize:13,cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>Demo</button>
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:'#2A2A2A'}}>© 2026 PedidosQR</div>
        </div>
      </footer>

    </div>
  )
}
