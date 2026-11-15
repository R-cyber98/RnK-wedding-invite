// Vercel serverless function: GET /api/whatsapp → 302 to WhatsApp chat.
// The number lives only in the WHATSAPP_NUMBER env var (server side), never in the site bundle.
export const MESSAGE = 'Hi Harsh, I saw the Rohit & Kanishka wedding invitation website and would like one too.'

export function whatsappUrl(number) {
  const digits = String(number || '').replace(/\D/g, '')
  if (!/^\d{10,15}$/.test(digits)) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(MESSAGE)}`
}

export default function handler(req, res) {
  const url = whatsappUrl(process.env.WHATSAPP_NUMBER)
  if (!url) {
    res.statusCode = 500
    res.end('WhatsApp contact is not configured.')
    return
  }
  res.statusCode = 302
  res.setHeader('Location', url)
  res.setHeader('Cache-Control', 'no-store')
  res.end()
}
