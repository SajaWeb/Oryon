/**
 * Avisos por WhatsApp con enlaces wa.me: abren WhatsApp (app o web) con el
 * número y el mensaje ya escritos. No se envía nada solo: la persona revisa y
 * pulsa enviar. Sin API, sin costos y sin guardar credenciales.
 */

/** Indicativo por defecto: los teléfonos de 10 dígitos se asumen de Colombia. */
const DEFAULT_COUNTRY = '57'

/**
 * Número en formato internacional sin signos (lo que pide wa.me), o null si no
 * parece un celular válido.
 *   "300 123 4567"     → "573001234567"
 *   "+57 300 123 4567" → "573001234567"
 *   "+1 (305) 555-1234"→ "13055551234"
 */
export function toWhatsAppNumber(phone?: string | null, country = DEFAULT_COUNTRY): string | null {
  const raw = String(phone ?? '').trim()
  if (!raw) return null
  const hasPlus = raw.startsWith('+') || raw.startsWith('00')
  let digits = raw.replace(/\D/g, '')
  if (raw.startsWith('00')) digits = digits.slice(2)
  if (!digits) return null
  if (hasPlus) return digits.length >= 8 && digits.length <= 15 ? digits : null
  // Ya trae el indicativo del país.
  if (digits.startsWith(country) && digits.length === country.length + 10) return digits
  // Celular nacional de 10 dígitos.
  if (digits.length === 10) return `${country}${digits}`
  return null
}

export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

/** Página pública de seguimiento de una orden (la misma del QR impreso). */
export function trackingUrl(companyId: number | string, repairId: number | string): string {
  return `${window.location.origin}/tracking/${companyId}/${repairId}`
}

/** Mensaje de cambio de estado. Negrita con *…*, que WhatsApp interpreta. */
export function statusUpdateMessage(p: {
  customerName?: string
  companyName?: string
  orderId: number | string
  assetLabel: string
  assetDescription?: string
  statusLabel: string
  notes?: string
  url: string
}): string {
  const firstName = String(p.customerName ?? '').trim().split(/\s+/)[0]
  const lines = [
    `Hola${firstName ? ` ${firstName}` : ''}, te escribimos de ${p.companyName?.trim() || 'tu taller'}.`,
    '',
    `Tu ${p.assetLabel}${p.assetDescription ? ` ${p.assetDescription}` : ''} (orden #${p.orderId}) cambió de estado:`,
    `*${p.statusLabel}*`,
  ]
  const notes = String(p.notes ?? '').trim()
  if (notes) lines.push('', `Nota: ${notes}`)
  lines.push('', 'Puedes ver el estado y el historial aquí:', p.url)
  return lines.join('\n')
}
