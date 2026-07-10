// PLUS IA — Asistente de restaurante con respuestas inteligentes
// Sin API key externa — funciona solo

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, restaurantName, context } = req.body
  const lastMsg = (messages || []).filter(m => m.role === 'user').pop()?.content?.toLowerCase() || ''

  const name = restaurantName || 'tu restaurante'
  const prods = context?.productos || []
  const cats  = context?.categorias || []
  const pedidoCount = context?.pedidoCount || 0

  function responder() {
    // Análisis de ventas
    if (lastMsg.match(/vend|más pedid|popular|top|mejor/)) {
      if (prods.length === 0) return `📊 Todavía no tenés productos cargados en ${name}. Cargá tu carta primero y volvé a preguntarme — voy a poder decirte qué conviene destacar.`
      const topProds = prods.filter(p => p.activo !== false).slice(0, 3).map(p => `• ${p.nombre || p.name} ($${(p.precio || p.price || 0).toLocaleString('es-AR')})`).join('\n')
      return `📊 **Los productos que tenés activos en ${name}:**\n${topProds}\n\nPara saber cuáles venden más, revisá el Dashboard → sección de pedidos de hoy. También podés destacar los más rentables poniéndolos primero en su categoría.`
    }

    // Precios
    if (lastMsg.match(/precio|caro|barato|cobr|valor/)) {
      const avgPrice = prods.length ? Math.round(prods.reduce((s, p) => s + (p.precio || p.price || 0), 0) / prods.length) : 0
      return `💰 **Análisis de precios para ${name}:**\n\nTu precio promedio actual es $${avgPrice.toLocaleString('es-AR')}.\n\n✅ **Recomendaciones:**\n• Revisá precios cada 15-30 días según inflación\n• El plato más caro debería ser 3-4x el más barato (ancla de precio)\n• Agregá una opción "premium" para subir el ticket promedio\n• Si un producto no se pide, probá bajarlo 10-15%`
    }

    // Promociones
    if (lastMsg.match(/promo|descuent|oferta|happy|2x1/)) {
      return `🎯 **Ideas de promociones para ${name}:**\n\n• **Happy Hour** (ej: 18-20hs) — 20% off en bebidas\n• **Combo mesa** — plato + bebida + postre con descuento\n• **2x1 los martes** — el día más flojo de la semana\n• **Cumpleañero** — postre gratis con comprobante\n• **QR exclusivo** — descuento especial para quien escanea la vitrina\n\n💡 Podés configurar el Happy Hour y el descuento QR directamente desde Ajustes del panel.`
    }

    // Delivery
    if (lastMsg.match(/delivery|envío|reparto|zona|domicilio/)) {
      return `🛵 **Optimización de delivery para ${name}:**\n\n• Definí una zona máxima de entrega (15-20 min en moto)\n• Establecé un mínimo de pedido para delivery ($X)\n• Respondé los pedidos en menos de 2 min — es clave para la experiencia\n• Usá WhatsApp para notificar cuando el pedido sale\n• Si hay demoras, avisale al cliente antes de que pregunte\n\n¿Querés que te ayude a configurar el precio de delivery o la zona?`
    }

    // Menú / carta
    if (lastMsg.match(/menú|carta|categori|producto|plato/)) {
      return `🍽️ **Consejos para la carta de ${name}:**\n\n• Limitá el menú a 20-30 productos — menos opciones = más ventas\n• Organizá por: Entradas → Principales → Acompañamientos → Postres → Bebidas\n• Poné foto a al menos el 50% de los platos (aumenta 30% las ventas)\n• El nombre del plato vende tanto como el precio — sé descriptivo\n• Destacá 2-3 "recomendados del chef"\n\n${cats.length > 0 ? `Tenés ${cats.length} categorías activas. ¿Querés sugerencias para alguna en particular?` : ''}`
    }

    // Pedidos / operaciones
    if (lastMsg.match(/pedido|orden|cocina|tiempo|demor|espera/)) {
      return `⚡ **Optimización de operaciones para ${name}:**\n\n• Meta: aceptar pedido en <2 min, preparar en <15 min\n• Usá la pantalla de Cocina para que el equipo vea los pedidos en tiempo real\n• Los pedidos "NUEVO" suenan alarma — no los dejés esperar\n• Si un plato tarda, marcalo sin stock temporalmente y ponelo de nuevo después\n• Revisá el historial de hoy para ver a qué hora llegó el pico de pedidos\n\n${pedidoCount > 0 ? `Hoy llevás **${pedidoCount} pedidos** registrados. ¡Sigan así! 💪` : 'Todavía no hay pedidos hoy — compartí el QR de la mesa para arrancar.'}`
    }

    // Stock
    if (lastMsg.match(/stock|ingrediente|inventari|falt/)) {
      return `📦 **Gestión de stock para ${name}:**\n\n• Revisá el stock todos los días antes de abrir\n• Los items en ROJO = crítico, pedí hoy\n• Los items en AMARILLO = bajo, pedí esta semana\n• Si algo se termina → marcá el producto como "sin stock" en el panel para que no lo pidan\n• Configurá cantidades mínimas realistas (lo que usás en 3 días)\n\n¿Querés que te ayude a definir stocks mínimos para tus ingredientes?`
    }

    // Clientes
    if (lastMsg.match(/cliente|fideliz|retención|satisf|reseñ|review/)) {
      return `👥 **Fidelización de clientes para ${name}:**\n\n• Respondé todos los pedidos rápido — la velocidad = satisfacción\n• El estado del pedido en tiempo real (Cocina → Listo → Entregado) reduce los reclamos 80%\n• Pedí reseña en Google al terminar cada mesa (un código QR en la mesa funciona muy bien)\n• Clientes recurrentes = pedidos delivery con el mismo teléfono → analizalos en la sección Clientes\n• Un pequeño detalle (postre, bebida de cortesía) convierte a un cliente en promotor`
    }

    // Hola / inicio
    if (lastMsg.match(/hola|buenas|buenos|inicio|empez|ayud|qué pod/)) {
      return `¡Hola! 👋 Soy el asistente IA de **${name}**.\n\nPuedo ayudarte con:\n📊 **Análisis** — qué vendés más, precios, tendencias\n🎯 **Promociones** — ideas para aumentar ventas\n🛵 **Delivery** — optimizar entregas y zonas\n🍽️ **Carta** — estructura del menú, fotos, categorías\n⚡ **Operaciones** — tiempos, cocina, stock\n👥 **Clientes** — fidelización y retención\n\n¿Por dónde arrancamos?`
    }

    // Genérico inteligente
    const temas = ['ventas', 'precios', 'delivery', 'menú', 'stock', 'clientes', 'promociones', 'operaciones']
    return `Entendí tu consulta sobre **${name}**. Puedo ayudarte con: ${temas.join(', ')}.\n\nSé más específico y te doy recomendaciones concretas. Por ejemplo: *"¿Cómo mejoro mis ventas de delivery?"* o *"¿Qué promoción me conviene hacer?"*`
  }

  // Simular delay natural
  await new Promise(r => setTimeout(r, 400 + Math.random() * 600))

  return res.status(200).json({
    content: responder(),
    configured: true,
    mode: 'smart-local'
  })
}
