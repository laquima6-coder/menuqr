// PLUS IA — Chat endpoint powered by Claude
// Requires ANTHROPIC_API_KEY env var in Vercel

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, restaurantName } = req.body
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return res.status(200).json({
      content: '⚠️ El asistente de IA no está configurado todavía. Contactá al soporte para activarlo.',
      configured: false
    })
  }

  try {
    const systemPrompt = `Sos un asistente experto en gestión de restaurantes para "${restaurantName || 'este restaurante'}". 
Ayudás con: análisis de menús, sugerencias de precios, ideas para promociones, gestión de pedidos, atención al cliente y estrategias para aumentar ventas.
Respondé siempre en español, de forma concisa y práctica. Usá emojis cuando aporte claridad.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages || []
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(500).json({ error: 'Error de IA: ' + err })
    }

    const data = await response.json()
    return res.status(200).json({
      content: data.content?.[0]?.text || 'Sin respuesta',
      configured: true
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
