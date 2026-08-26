/**
 * Verificación de la firma de los eventos de Wompi.
 *
 * Wompi firma cada evento así:
 *
 *   checksum = SHA256( v1 + v2 + … + vN + timestamp + WOMPI_EVENTS_SECRET )
 *
 * donde v1…vN son los valores de `data` señalados —en orden— por las rutas de
 * `signature.properties` (por ejemplo "transaction.amount_in_cents"), y timestamp
 * es el del propio evento.
 *
 * Lo que esto impide es concreto: sin verificar, un POST fabricado a mano con
 * `status: "APPROVED"` y la referencia de cualquier empresa le extendía la
 * licencia gratis. La firma cubre el monto y el estado, así que tampoco se puede
 * reutilizar un evento real cambiándole cifras.
 */

export interface WompiEvent {
  timestamp?: number | string
  data?: Record<string, unknown>
  signature?: { properties?: string[]; checksum?: string }
}

/** Recorre "transaction.amount_in_cents" dentro de data. */
function pluck(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
    data
  )
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Comparar con === filtra el checksum carácter a carácter por temporización. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyWompiEvent(
  event: WompiEvent,
  secret: string | undefined
): Promise<{ ok: boolean; reason?: string }> {
  if (!secret) return { ok: false, reason: 'WOMPI_EVENTS_SECRET no configurado' }

  const properties = event.signature?.properties
  const checksum = event.signature?.checksum
  if (!Array.isArray(properties) || properties.length === 0 || !checksum) {
    return { ok: false, reason: 'El evento no trae firma' }
  }
  if (event.timestamp === undefined || event.timestamp === null) {
    return { ok: false, reason: 'El evento no trae timestamp' }
  }

  const data = event.data ?? {}
  let concatenated = ''
  for (const path of properties) {
    const value = pluck(data, path)
    // Un valor ausente haría que la firma cuadrara por casualidad con "undefined".
    if (value === undefined || value === null) {
      return { ok: false, reason: `Falta la propiedad firmada "${path}"` }
    }
    concatenated += String(value)
  }

  const expected = await sha256Hex(`${concatenated}${event.timestamp}${secret}`)
  return timingSafeEqual(expected, String(checksum).toLowerCase())
    ? { ok: true }
    : { ok: false, reason: 'Checksum no coincide' }
}
